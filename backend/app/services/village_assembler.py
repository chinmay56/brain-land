"""
Assembling a village from its own documents.

This is the piece that makes "everything from the land records, nothing
external" actually work.

A tippan gives an exact shape but no position. A 7/12 extract gives an exact
area and the four boundaries but no shape. Neither is plottable alone. Together,
across a whole village, they are a constraint network:

    every parcel's SHAPE comes from its own measurements,
    every parcel's POSITION comes from who it touches,
    and one anchored parcel places all of them.

So a village is a jigsaw that assembles itself. The department supplies no
shapefile; a single anchor — one trijunction pillar, one officer dropping two
pins on satellite imagery, or one modern record that already carries
coordinates — pins the whole mosaic to the ground.

Everything placed this way is marked `inferred` and carries a fit quality. An
inferred parcel is a working hypothesis for an officer to check, never a
statement about who owns what.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Set, Tuple

from shapely.geometry import Polygon, shape
from shapely.ops import transform as shapely_transform, unary_union

from . import crs_india as crs
from . import survey_math as sm
from .document_geometry import GeometryFlag, GeometryResult
from .survey_math import Point

# Unit vectors in a local east/north frame.
DIRECTION_VECTORS: Dict[str, Tuple[float, float]] = {
    "north": (0.0, 1.0), "south": (0.0, -1.0),
    "east": (1.0, 0.0), "west": (-1.0, 0.0),
    "northeast": (0.7071, 0.7071), "northwest": (-0.7071, 0.7071),
    "southeast": (0.7071, -0.7071), "southwest": (-0.7071, -0.7071),
}

OPPOSITE = {"north": "south", "south": "north", "east": "west", "west": "east",
            "northeast": "southwest", "southwest": "northeast",
            "northwest": "southeast", "southeast": "northwest"}

# Things that appear in a boundary column but are not parcels.
NON_PARCEL = re.compile(
    r"^\s*(road|rasta|nala|nalla|canal|kaluva|river|stream|bund|drain|railway|"
    r"government|govt|gairan|forest|village\s+\w+|boundary|open\s+land|"
    r"public|highway|path|bandh)\b", re.I)

# A survey number inside free text: 124, 124/2, 124/2/A, "S.No. 124/2".
SURVEY_IN_TEXT = re.compile(r"(\d+(?:\s*/\s*[A-Za-z0-9]+)*)")


def parse_neighbour(text: Optional[str],
                    known: Optional[Set[str]] = None) -> Optional[str]:
    """
    Pull a survey number out of a boundary description.

    'Survey No. 124/2' -> '124/2'.  'Village road' -> None, because a road is a
    real boundary but not a parcel that can be attached to.

    When the set of survey numbers in this village is known, match against it
    first. Survey numbers are not always numeric — several states use block
    letters and alphanumeric hissa suffixes — so a pattern that assumes digits
    silently drops those parcels out of the adjacency network, and a parcel
    missing from the network is a parcel that never gets placed.
    """
    if not text or not str(text).strip():
        return None
    raw = str(text).strip()
    if NON_PARCEL.match(raw):
        return None

    if known:
        tokens = {re.sub(r"\s*/\s*", "/", t) for t in re.split(r"[,\s]+", raw) if t}
        # Longest first so '124/2/A' wins over '124/2'.
        for candidate in sorted(known, key=len, reverse=True):
            if candidate in tokens:
                return candidate
        normalised = re.sub(r"\s*/\s*", "/", raw)
        for candidate in sorted(known, key=len, reverse=True):
            if re.search(rf"(?<![\w/]){re.escape(candidate)}(?![\w/])", normalised):
                return candidate

    match = SURVEY_IN_TEXT.search(raw)
    if not match:
        return None
    return re.sub(r"\s*/\s*", "/", match.group(1)).strip()


# ===========================================================================
# Adjacency graph
# ===========================================================================
@dataclass
class AdjacencyGraph:
    """Who touches whom, and on which side."""
    edges: Dict[str, Dict[str, str]] = field(default_factory=dict)  # sn -> dir -> nbr
    unresolved: Dict[str, Dict[str, str]] = field(default_factory=dict)

    def neighbours(self, survey_no: str) -> Dict[str, str]:
        return self.edges.get(survey_no, {})

    def degree(self, survey_no: str) -> int:
        return len(self.edges.get(survey_no, {}))

    def as_dict(self) -> Dict[str, Any]:
        return {"edges": self.edges, "non_parcel_boundaries": self.unresolved,
                "parcel_count": len(self.edges),
                "edge_count": sum(len(v) for v in self.edges.values())}


def build_adjacency(results: Sequence[GeometryResult]) -> AdjacencyGraph:
    """
    Build the adjacency graph from the four-boundaries column of every document.

    Reciprocal edges are added automatically: if 124/1 says its east neighbour is
    124/2, then 124/2 is west of 124/1 whether or not 124/2's own document says
    so. Old records are often one-sided, and half a statement is still a
    constraint.
    """
    graph = AdjacencyGraph()
    known: Set[str] = {r.survey_no for r in results}

    for r in results:
        graph.edges.setdefault(r.survey_no, {})
        for direction, text in (r.boundaries or {}).items():
            d = direction.strip().lower()
            if d not in DIRECTION_VECTORS:
                continue
            neighbour = parse_neighbour(text, known)
            if neighbour is None:
                graph.unresolved.setdefault(r.survey_no, {})[d] = str(text)
                continue
            graph.edges[r.survey_no][d] = neighbour
            if neighbour in known:
                graph.edges.setdefault(neighbour, {}).setdefault(OPPOSITE[d], r.survey_no)

    return graph


# ===========================================================================
# Fitting one parcel against its placed neighbours
# ===========================================================================
@dataclass
class FitResult:
    ring_metric: List[Point]
    cost: float
    rotation_deg: float
    overlap_m2: float
    max_gap_m: float
    neighbours_used: List[str]
    quality: str            # good / fair / poor
    position_uncertainty_m: float = 0.0


def _polygon(ring: Sequence[Point]) -> Polygon:
    return Polygon(ring)


def _cost(
    candidate: Polygon,
    constraints: Sequence[Tuple[Polygon, Tuple[float, float]]],
    others: Sequence[Polygon],
    char_len: float,
) -> Tuple[float, float, float]:
    """
    How badly a candidate placement violates what the documents say.

    Everything is expressed in square metres so the terms can be summed:
      - overlapping a neighbour, weighted heavily; two parcels cannot occupy the
        same ground and a placement that says they do is simply wrong
      - a gap where the documents say the parcels touch
      - sitting on the wrong side of a neighbour from the one the record names
      - and, as a reward, the length of boundary actually shared with the
        neighbour

    That last term is what makes the fit precise. Adjoining parcels do not merely
    touch at a point — they share a whole edge, because one was surveyed off the
    other. Without it any placement that grazes the neighbour scores as well as
    the true one, and irregular parcels settle metres away from where they
    belong, or flip end for end.
    """
    overlap_total = 0.0
    gap_max = 0.0
    cost = 0.0
    cc = candidate.centroid
    boundary = candidate.exterior
    tol = max(0.25, char_len * 0.004)

    for neighbour, want_dir in constraints:
        inter = candidate.intersection(neighbour).area
        overlap_total += inter
        cost += inter * 12.0

        gap = candidate.distance(neighbour)
        gap_max = max(gap_max, gap)
        cost += gap * gap

        nc = neighbour.centroid
        vx, vy = cc.x - nc.x, cc.y - nc.y
        norm = math.hypot(vx, vy)
        if norm > 1e-9:
            dot = (vx / norm) * want_dir[0] + (vy / norm) * want_dir[1]
            cost += (1.0 - dot) * char_len * char_len * 0.5

        # Reward shared edge: how much of this parcel's boundary lies along the
        # neighbour's, as a FRACTION of its perimeter. Bounding it matters — an
        # unbounded reward lets a parcel slide along its neighbour's edge
        # collecting contact, which drags it away from where it belongs. Kept
        # deliberately below the directional term so it refines a placement
        # rather than driving it.
        try:
            contact = boundary.intersection(neighbour.buffer(tol)).length
        except Exception:                                     # pragma: no cover
            contact = 0.0
        share = min(contact / boundary.length, 0.5) if boundary.length else 0.0
        cost -= share * char_len * char_len * 0.30

    # Never sit on top of a parcel already placed, named neighbour or not.
    for other in others:
        cost += candidate.intersection(other).area * 12.0

    return cost, overlap_total, gap_max


def _pattern_search(
    ring: Sequence[Point],
    rotation: float,
    start: Tuple[float, float],
    constraints: Sequence[Tuple[Polygon, Tuple[float, float]]],
    others: Sequence[Polygon],
    char_len: float,
    step0: float,
) -> Tuple[float, Tuple[float, float]]:
    """
    Compass search on translation: try a step in each of four directions, move to
    whichever improves, halve the step when none does. Derivative-free,
    deterministic, and entirely adequate for a 2-parameter fit.
    """
    rotated = sm.transform_ring(ring, rotation_deg=rotation, about=(0.0, 0.0))
    dx, dy = start
    best, _, _ = _cost(_polygon([(x + dx, y + dy) for x, y in rotated]),
                       constraints, others, char_len)
    step = step0

    while step > 0.01:
        improved = False
        for ox, oy in ((step, 0.0), (-step, 0.0), (0.0, step), (0.0, -step)):
            cand = _polygon([(x + dx + ox, y + dy + oy) for x, y in rotated])
            c, _, _ = _cost(cand, constraints, others, char_len)
            if c < best - 1e-9:
                best, dx, dy, improved = c, dx + ox, dy + oy, True
                break
        if not improved:
            step /= 2.0

    return best, (dx, dy)


def fit_parcel(
    local_ring: Sequence[Point],
    constraints: Sequence[Tuple[Polygon, Tuple[float, float]]],
    others: Sequence[Polygon],
    allow_rotation: bool,
    rotation_step_deg: float = 10.0,
) -> Optional[FitResult]:
    """
    Find where a floating parcel belongs, given placed neighbours and the
    direction the record says each one lies in.

    Orientation is only solved for when it is genuinely unknown — a tippan whose
    base line has no stated bearing. A traverse of true bearings already knows
    which way north is, and rotating it would throw away real information.
    """
    if not constraints:
        return None

    ring = [(float(x), float(y)) for x, y in local_ring]
    area = sm.ring_area_m2(ring)
    char_len = math.sqrt(area) if area > 0 else 50.0

    # Start the parcel just clear of the first neighbour, on the named side.
    nbr, want = constraints[0]
    nc = nbr.centroid
    nbr_reach = math.sqrt(nbr.area) if nbr.area > 0 else char_len
    offset = (nbr_reach + char_len) * 0.55
    cx, cy = sm.centroid(ring)
    start = (nc.x + want[0] * offset - cx, nc.y + want[1] * offset - cy)

    rotations = ([r * rotation_step_deg for r in range(int(360 / rotation_step_deg))]
                 if allow_rotation else [0.0])

    best_cost = float("inf")
    best_rot = 0.0
    best_shift = start

    for rot in rotations:
        cost, shift = _pattern_search(ring, rot, start, constraints, others,
                                      char_len, step0=char_len)
        if cost < best_cost:
            best_cost, best_rot, best_shift = cost, rot, shift

    # Refine the rotation once a coarse winner is known.
    if allow_rotation:
        for rot in [best_rot + d for d in (-6, -3, -1.5, 1.5, 3, 6)]:
            cost, shift = _pattern_search(ring, rot, best_shift, constraints, others,
                                          char_len, step0=char_len / 4)
            if cost < best_cost:
                best_cost, best_rot, best_shift = cost, rot, shift

    rotated = sm.transform_ring(ring, rotation_deg=best_rot, about=(0.0, 0.0))
    placed = [(x + best_shift[0], y + best_shift[1]) for x, y in rotated]
    _, overlap, gap = _cost(_polygon(placed), constraints, others, char_len)

    # How far can this parcel be moved before the fit measurably worsens?
    #
    # A parcel with one neighbour can slide along their shared edge and score
    # almost as well anywhere along it, so its position is genuinely uncertain
    # by that much. A parcel hemmed in on three sides cannot move at all. This
    # probes eight directions and reports the distance at which the cost rises
    # appreciably — an honest error bar, rather than presenting an inferred
    # position as though it were surveyed.
    threshold = best_cost + max(char_len * char_len * 0.02, 1.0)
    slack: List[float] = []
    for k in range(8):
        ang = math.pi * k / 4.0
        ux, uy = math.cos(ang), math.sin(ang)
        d = 0.0
        while d < char_len:
            d += char_len / 40.0
            probe = _polygon([(x + best_shift[0] + ux * d, y + best_shift[1] + uy * d)
                              for x, y in rotated])
            c, _, _ = _cost(probe, constraints, others, char_len)
            if c > threshold:
                break
        slack.append(d)
    uncertainty = round(sum(slack) / len(slack), 2)

    if overlap > area * 0.02 or gap > char_len * 0.5 or uncertainty > char_len * 0.35:
        quality = "poor"
    elif overlap > area * 0.002 or gap > char_len * 0.1 or uncertainty > char_len * 0.12:
        quality = "fair"
    else:
        quality = "good"

    return FitResult(
        ring_metric=placed,
        cost=round(best_cost, 4),
        rotation_deg=round(best_rot, 3),
        overlap_m2=round(overlap, 4),
        max_gap_m=round(gap, 4),
        neighbours_used=[],
        quality=quality,
        position_uncertainty_m=uncertainty,
    )


# ===========================================================================
# Village assembly
# ===========================================================================
@dataclass
class AssemblyReport:
    village: str
    anchored: List[str]
    inferred: List[str]
    unplaceable: List[str]
    passes: int
    graph: Dict[str, Any]
    flags: List[Dict[str, Any]]
    stats: Dict[str, Any]


def assemble_village(
    results: List[GeometryResult],
    village: str = "",
    max_passes: int = 12,
) -> AssemblyReport:
    """
    Place every parcel that can be placed, working outward from the anchored ones.

    Each pass takes the floating parcels that now have at least one placed
    neighbour and fits them. Newly placed parcels become anchors for the next
    pass, so the mosaic grows from its seeds until nothing more can be added.

    Parcels placed this way are marked `inferred`, carry the fit quality and the
    neighbours used, and are never presented as surveyed fact.
    """
    by_sn: Dict[str, GeometryResult] = {r.survey_no: r for r in results}
    graph = build_adjacency(results)
    flags: List[Dict[str, Any]] = []

    anchored = [r.survey_no for r in results if r.is_placed]
    if not anchored:
        placeable = [r.survey_no for r in results if r.ring_local]
        flags.append({
            "code": "NO_ANCHOR", "severity": "CRITICAL",
            "message": (
                f"{len(placeable)} parcels have exact shapes reconstructed from their "
                f"measurements, but nothing anchors them to the ground. The village "
                f"cannot be plotted."
            ),
            "action": ("Anchor any one parcel — a trijunction pillar, a GTS benchmark, "
                       "a record that already carries coordinates, or an officer "
                       "clicking two corners on satellite imagery. One anchor places "
                       "the whole mosaic."),
        })
        return AssemblyReport(village, [], [], placeable, 0, graph.as_dict(), flags,
                              {"parcels": len(results), "placed": 0})

    # Work in the metric CRS of the first anchor so the whole village shares one frame.
    seed = by_sn[anchored[0]]
    metric = seed.crs_used or crs.pick_metric_crs(*seed.ring_wgs84[0])   # type: ignore[misc]

    placed_metric: Dict[str, List[Point]] = {}
    for sn in anchored:
        r = by_sn[sn]
        placed_metric[sn] = crs.transform_ring(r.ring_wgs84, crs.CRS_WGS84, metric)  # type: ignore[arg-type]

    inferred: List[str] = []
    passes = 0

    for _ in range(max_passes):
        passes += 1
        progressed = False

        pending = [r for r in results
                   if r.survey_no not in placed_metric and r.ring_local]
        # Fit the best-constrained parcels first; they anchor the weaker ones.
        pending.sort(
            key=lambda r: -sum(1 for n in graph.neighbours(r.survey_no).values()
                               if n in placed_metric)
        )

        for r in pending:
            constraints: List[Tuple[Polygon, Tuple[float, float]]] = []
            used: List[str] = []
            for direction, neighbour in graph.neighbours(r.survey_no).items():
                if neighbour not in placed_metric:
                    continue
                # The record says the neighbour is (say) west of us, so we are
                # east of it.
                want = DIRECTION_VECTORS[OPPOSITE[direction]]
                constraints.append((_polygon(placed_metric[neighbour]), want))
                used.append(f"{neighbour} ({direction})")

            if not constraints:
                continue

            others = [_polygon(v) for k, v in placed_metric.items()
                      if k not in {n.split(" ")[0] for n in used}]

            allow_rotation = r.method == "chain_offset" and \
                r.provenance.get("base_bearing") is None

            fit = fit_parcel(r.ring_local, constraints, others, allow_rotation)  # type: ignore[arg-type]
            if fit is None:
                continue

            fit.neighbours_used = used
            placed_metric[r.survey_no] = fit.ring_metric
            inferred.append(r.survey_no)
            progressed = True

            r.ring_wgs84 = sm.ensure_ccw(
                crs.transform_ring(fit.ring_metric, metric, crs.CRS_WGS84))
            r.crs_used = metric
            r.accuracy_class = "inferred"
            r.accuracy_note = (
                "Position derived from adjoining parcels named in the record. The "
                "shape and area are from this parcel's own measurements; only its "
                "placement is inferred. Requires field verification."
            )
            r.provenance |= {
                "placement": "adjacency fit against mapped neighbours",
                "fit_quality": fit.quality,
                "fit_rotation_deg": fit.rotation_deg,
                "fit_overlap_m2": fit.overlap_m2,
                "fit_max_gap_m": fit.max_gap_m,
                "position_uncertainty_m": fit.position_uncertainty_m,
                "neighbours_used": used,
                "assembly_pass": passes,
            }
            r.flags.append(GeometryFlag(
                "PLACED_BY_ADJACENCY",
                {"good": "INFO", "fair": "WARNING", "poor": "CONFLICT"}[fit.quality],
                (f"Placed from {len(used)} mapped neighbour(s) — {', '.join(used)}. "
                 f"Fit quality {fit.quality}: overlap {fit.overlap_m2:.2f} m², "
                 f"largest gap {fit.max_gap_m:.2f} m, position uncertain to about "
                 f"±{fit.position_uncertainty_m:.1f} m."),
                ("Verify on the ground or against imagery before this position is "
                 "used for anything."),
            ))

        if not progressed:
            break

    # ---------------------------------------------------------------------
    # Refinement.
    #
    # A parcel fitted in an early pass had only one placed neighbour, and one
    # neighbour does not pin a position — the parcel can slide along the shared
    # edge. Now that the mosaic is complete, re-fit every inferred parcel
    # against ALL of its neighbours at once. Each round tightens the fit,
    # because each parcel is now constrained from several sides.
    # ---------------------------------------------------------------------
    refine_rounds = 0
    for _ in range(4):
        refine_rounds += 1
        moved = 0.0
        for survey_no in inferred:
            r = by_sn[survey_no]
            constraints = []
            used = []
            for direction, neighbour in graph.neighbours(survey_no).items():
                if neighbour == survey_no or neighbour not in placed_metric:
                    continue
                constraints.append((_polygon(placed_metric[neighbour]),
                                    DIRECTION_VECTORS[OPPOSITE[direction]]))
                used.append(f"{neighbour} ({direction})")
            if len(constraints) < 2:
                continue

            others = [_polygon(v) for k, v in placed_metric.items()
                      if k != survey_no and k not in {u.split(" ")[0] for u in used}]
            allow_rotation = (r.method == "chain_offset"
                              and r.provenance.get("base_bearing") is None)

            before = sm.centroid(placed_metric[survey_no])
            fit = fit_parcel(r.ring_local, constraints, others,          # type: ignore[arg-type]
                             allow_rotation, rotation_step_deg=5.0)
            if fit is None:
                continue

            moved = max(moved, math.dist(before, sm.centroid(fit.ring_metric)))
            placed_metric[survey_no] = fit.ring_metric
            r.ring_wgs84 = sm.ensure_ccw(
                crs.transform_ring(fit.ring_metric, metric, crs.CRS_WGS84))
            r.provenance |= {
                "fit_quality": fit.quality,
                "fit_rotation_deg": fit.rotation_deg,
                "fit_overlap_m2": fit.overlap_m2,
                "fit_max_gap_m": fit.max_gap_m,
                "position_uncertainty_m": fit.position_uncertainty_m,
                "neighbours_used": used,
                "refined_against": len(constraints),
                "refine_rounds": refine_rounds,
            }
            for f in r.flags:
                if f.code == "PLACED_BY_ADJACENCY":
                    f.severity = {"good": "INFO", "fair": "WARNING",
                                  "poor": "CONFLICT"}[fit.quality]
                    f.message = (
                        f"Placed and refined against {len(used)} mapped neighbours — "
                        f"{', '.join(used)}. Fit quality {fit.quality}: overlap "
                        f"{fit.overlap_m2:.2f} m², largest gap {fit.max_gap_m:.2f} m, "
                        f"position uncertain to about "
                        f"±{fit.position_uncertainty_m:.1f} m."
                    )

        if moved < 0.05:
            break

    # ---------------------------------------------------------------------
    # Propagate positional uncertainty along the inference chain.
    #
    # A parcel fitted against a neighbour inherits that neighbour's error on top
    # of its own fitting slack — this is an ordinary survey network, and error
    # accumulates with every step away from the control point. Reporting only
    # the local slack would tell an officer a parcel five links down the chain
    # is good to a couple of metres when it is not, and an error bar that is
    # confidently too small is worse than none at all.
    # ---------------------------------------------------------------------
    uncertainty: Dict[str, float] = {sn: 0.0 for sn in anchored}
    for _ in range(len(inferred) + 1):
        changed = False
        for survey_no in inferred:
            r = by_sn[survey_no]
            local = float(r.provenance.get("position_uncertainty_m", 0.0) or 0.0)
            parents = [u.split(" ")[0] for u in r.provenance.get("neighbours_used", [])]
            inherited = [uncertainty[p] for p in parents if p in uncertainty]
            # The local probe measures how flat the cost surface is around the
            # chosen placement. Ground-truth tests show the true error runs
            # about twice that, because the optimiser can settle in a different
            # basin entirely rather than merely drift within one. The factor is
            # empirical and deliberately conservative: an error bar that is too
            # small is far more dangerous here than one that is too generous.
            total = round(local * 2.5 + (min(inherited) if inherited else 0.0), 2)
            if abs(uncertainty.get(survey_no, -1.0) - total) > 1e-6:
                uncertainty[survey_no] = total
                changed = True
        if not changed:
            break

    for survey_no in inferred:
        r = by_sn[survey_no]
        total = uncertainty.get(survey_no, 0.0)
        r.provenance["position_uncertainty_m"] = total
        r.provenance["uncertainty_basis"] = (
            "local fitting slack plus the uncertainty inherited from the "
            "neighbour it was placed against"
        )
        char = math.sqrt(r.computed_area_m2 or 10_000.0)
        if total > char * 0.35:
            grade = "poor"
        elif total > char * 0.12:
            grade = "fair"
        else:
            grade = "good"
        r.provenance["fit_quality"] = grade
        for f in r.flags:
            if f.code == "PLACED_BY_ADJACENCY":
                f.severity = {"good": "INFO", "fair": "WARNING",
                              "poor": "CONFLICT"}[grade]
                f.message = (
                    f"Placed from the adjacency network against "
                    f"{', '.join(r.provenance.get('neighbours_used', []))}. "
                    f"Shape and area are this parcel's own measurements; only the "
                    f"position is inferred, to about \u00b1{total:.1f} m "
                    f"(fit {grade})."
                )
                f.action = ("Verify against imagery or on the ground before this "
                            "position is relied on.")

    unplaceable = [r.survey_no for r in results if r.survey_no not in placed_metric]
    for sn in unplaceable:
        r = by_sn[sn]
        reason = ("it has no reconstructable shape" if not r.ring_local
                  else "none of its named neighbours could be placed")
        flags.append({
            "code": "UNPLACEABLE", "severity": "WARNING", "survey_no": sn,
            "message": f"Parcel {sn} could not be positioned because {reason}.",
            "action": ("Locate its tippan / Field Measurement Book, or capture its "
                       "four boundaries so it can attach to the network."),
        })

    # Overlaps across the finished mosaic — the assembly's own quality check.
    survey_nos = sorted(placed_metric)
    for i, a in enumerate(survey_nos):
        pa = _polygon(placed_metric[a])
        for b in survey_nos[i + 1:]:
            pb = _polygon(placed_metric[b])
            if not pa.intersects(pb):
                continue
            ov = pa.intersection(pb).area
            if ov < 50.0:
                continue
            flags.append({
                "code": "MOSAIC_OVERLAP", "severity": "CONFLICT",
                "survey_no": a, "related_survey_no": b,
                "message": (f"In the assembled village, {a} and {b} overlap by "
                            f"{ov / 10000:.4f} ha."),
                "action": ("Either a measurement is wrong or the boundary columns "
                           "disagree. Re-read both documents."),
            })

    mosaic = unary_union([_polygon(v) for v in placed_metric.values()]) \
        if placed_metric else None

    return AssemblyReport(
        village=village,
        anchored=anchored,
        inferred=inferred,
        unplaceable=unplaceable,
        passes=passes,
        graph=graph.as_dict(),
        flags=flags,
        stats={
            "parcels": len(results),
            "placed": len(placed_metric),
            "anchored": len(anchored),
            "inferred": len(inferred),
            "unplaceable": len(unplaceable),
            "placed_pct": round(len(placed_metric) / len(results) * 100, 2) if results else 0,
            "mosaic_area_ha": round(mosaic.area / 10_000, 4) if mosaic else 0.0,
            "metric_crs": metric,
            "max_position_uncertainty_m": round(max(uncertainty.values()), 2) if uncertainty else 0.0,
            "mean_position_uncertainty_m": (
                round(sum(uncertainty[s] for s in inferred) / len(inferred), 2)
                if inferred else 0.0),
        },
    )
