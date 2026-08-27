import React from 'react';
import { RecordStatus } from '@/types';

interface StatusBadgeProps {
  status: RecordStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'VERIFIED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium text-emerald-800 bg-emerald-50/80 border border-emerald-200/90 rounded ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          Verified
        </span>
      );
    case 'UNDER_VERIFICATION':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium text-amber-800 bg-amber-50/80 border border-amber-200/90 rounded ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
          In SDO Queue
        </span>
      );
    case 'VALIDATED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium text-stone-700 bg-stone-100 border border-stone-200 rounded ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-stone-500"></span>
          Validated
        </span>
      );
    case 'REJECTED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium text-rose-800 bg-rose-50/80 border border-rose-200/90 rounded ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          Rejected
        </span>
      );
    case 'CORRECTION_REQUESTED':
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium text-terracotta-800 bg-terracotta-50 border border-terracotta-200 rounded ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-terracotta-600"></span>
          Correction Requested
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium text-stone-600 bg-stone-50 border border-stone-200 rounded ${className}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-stone-400"></span>
          Submitted
        </span>
      );
  }
};
