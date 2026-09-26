import { supabase } from './supabaseClient';

/**
 * Append-only provenance trail for land_records.
 *
 * Every row answers "who changed what, and what did the AI originally say" —
 * the PRD's requirement that an extracted value is never silently overwritten.
 * The `changes` map is what carries that: the AI reading and the human's
 * correction side by side, so a certified record can always be traced back to
 * what the machine actually read.
 *
 * Nothing here throws. An audit trail records what happened; it must never be
 * able to stop it from happening, so a failed insert is a warning and the
 * approve / reject / submit it was describing still goes through.
 */

export type AuditAction =
  | 'OCR_EXTRACTED'
  | 'CITIZEN_CORRECTION'
  | 'CERTIFIED_APPROVED'
  | 'REJECTED';

export interface AuditEntry {
  recordId: string;
  action: AuditAction;
  role: 'OFFICER' | 'CITIZEN';
  performedBy: string;
  details: string;
  /** { field: { ai, officer } } or { field: { ai, citizen } }. {} when nothing was edited. */
  changes?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      record_id: entry.recordId,
      action: entry.action,
      role: entry.role,
      // performed_by and details are NOT NULL in the schema.
      performed_by: entry.performedBy || 'Unknown',
      details: entry.details || '',
      changes: entry.changes || {},
    });
    if (error) console.warn('Audit log insert notice:', error);
  } catch (err) {
    console.warn('Audit log insert notice:', err);
  }
}
