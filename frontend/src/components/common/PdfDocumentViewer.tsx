'use client';

/**
 * Renders the original document the applicant uploaded — the actual bytes, from
 * the server, never a reconstruction.
 *
 * Two kinds of upload arrive in practice. A scanned PDF, and a phone photo of
 * the paper, which is why images are handled here as a first-class case rather
 * than being refused. Both rotate, because a photographed 7/12 lands sideways
 * more often than not and an officer should not have to tilt their head to read
 * a survey number.
 *
 * Rotation is owned by the page, not by this component: it is per-page state
 * that the toolbar drives and this only reflects. Zoom likewise.
 *
 * Load with next/dynamic and { ssr: false } — pdfjs touches `window`.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { AlertTriangle, FileQuestion } from 'lucide-react';

// Served from public/. Must stay in step with the installed react-pdf major.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PdfDocumentViewerProps {
  fileUrl: string;
  /** From the upload response. Absent means assume PDF. */
  contentType?: string;
  pageNumber: number;
  zoomLevel: number;
  rotation: number;
  onNumPagesChange?: (numPages: number) => void;
  onLoadError?: (message: string) => void;
}

const FRAME =
  'shadow-parchment border border-[#D7D4CA] rounded-lg overflow-hidden bg-white';

// The document column. A page is fitted to this box at 100% zoom so the
// officer starts with the whole page visible; zooming past that scrolls.
const BOX_W = 440;
const BOX_H = 620;

export function PdfDocumentViewer({
  fileUrl,
  contentType,
  pageNumber,
  zoomLevel,
  rotation,
  onNumPagesChange,
  onLoadError,
}: PdfDocumentViewerProps) {
  const [loadError, setLoadError] = useState<string | null>(null);
  // The page's own size, needed to keep a quarter-turned page inside the
  // column: rotating swaps which edge has to fit the available width.
  const [pageSize, setPageSize] = useState<{ w: number; h: number } | null>(null);

  // A new document deserves a fresh verdict; without this a single failure
  // would stick to every record the officer opened afterwards.
  useEffect(() => { setLoadError(null); setPageSize(null); }, [fileUrl]);

  const fail = useCallback((message: string) => {
    setLoadError(message);
    onLoadError?.(message);
  }, [onLoadError]);

  const handleLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setLoadError(null);
      onNumPagesChange?.(numPages);
    },
    [onNumPagesChange],
  );

  if (!fileUrl) {
    return (
      <div className="w-[440px] p-8 border border-dashed border-[#D7D4CA] rounded-lg
                      text-stone-500 text-xs flex flex-col items-center gap-2 text-center bg-white">
        <FileQuestion className="w-5 h-5 text-stone-400" />
        <span className="font-semibold text-stone-700">No original document on file</span>
        <span className="text-stone-500 leading-relaxed max-w-[280px]">
          This record was created without an attached upload, so there is nothing
          to verify the extracted fields against.
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-[440px] p-6 bg-rose-50 border border-rose-200 rounded-lg
                      text-rose-900 text-xs flex flex-col items-center gap-2 text-center">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-semibold">Could not load the original document</span>
        <span className="text-rose-700 text-[10px] leading-relaxed">{loadError}</span>
        <span className="text-rose-600 text-[10px]">
          Do not certify this record until the document can be read.
        </span>
      </div>
    );
  }

  const swappedPdf = rotation === 90 || rotation === 270;

  // A photographed record. CSS handles both rotation and zoom; the browser is
  // already good at this and pdfjs is not involved.
  if (contentType && contentType.startsWith('image/')) {
    const swapped = swappedPdf;
    return (
      <div
        className="flex items-center justify-center"
        // Reserve the post-rotation footprint so a sideways photo does not
        // overlap the toolbar or get clipped by the scroll container.
        style={{ minHeight: swapped ? 440 : undefined }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt="Original uploaded land document"
          onError={() => fail('The image could not be fetched from the server.')}
          className={FRAME}
          style={{
            transform: `rotate(${rotation}deg) scale(${zoomLevel / 100})`,
            transformOrigin: 'center center',
            // Constrain pre-rotation, so after the turn the photo still fits the
            // column instead of running off the side of it.
            maxWidth: swapped ? BOX_H : BOX_W,
            maxHeight: swapped ? BOX_W : BOX_H,
            objectFit: 'contain',
            transition: 'transform 120ms ease-out',
          }}
        />
      </div>
    );
  }

  // Fit the page to the column at 100%, then let zoom scale from there. A
  // portrait A4 turned 90° is 842pt across, not 595, so the same scale that fit
  // upright would push a third of the page out of view.
  const turnedEdge = pageSize ? (swappedPdf ? pageSize.h : pageSize.w) : null;
  const fitScale =
    (zoomLevel / 100) * (turnedEdge ? Math.min(1, BOX_W / turnedEdge) : 1);

  return (
    <Document
      file={fileUrl}
      onLoadSuccess={handleLoadSuccess}
      onLoadError={(err) => fail(err?.message || 'Unreadable PDF.')}
      onSourceError={(err) => fail(err?.message || 'The server did not return the document.')}
      loading={
        <div className="w-[440px] h-[600px] flex items-center justify-center text-xs text-stone-400">
          Loading original document…
        </div>
      }
      error={
        <div className="w-[440px] p-6 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs text-center">
          Could not load the original document.
        </div>
      }
    >
      <Page
        pageNumber={pageNumber}
        scale={fitScale}
        rotate={rotation}
        className={FRAME}
        renderAnnotationLayer={false}
        renderTextLayer={false}
        onLoadSuccess={(pg) =>
          setPageSize({ w: pg.originalWidth, h: pg.originalHeight })
        }
      />
    </Document>
  );
}

export default PdfDocumentViewer;
