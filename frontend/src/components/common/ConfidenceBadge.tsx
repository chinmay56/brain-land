import React from 'react';

interface ConfidenceBadgeProps {
  confidence: number; // 0 to 1
  isFlagged?: boolean;
  compact?: boolean;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  isFlagged = false,
  compact = false,
}) => {
  const percentage = Math.round(confidence * 100);

  if (confidence >= 0.9) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-emerald-800 bg-emerald-50/80 px-1.5 py-0.5 rounded border border-emerald-200">
        <span className="w-1 h-1 rounded-full bg-emerald-600"></span>
        {percentage}% {!compact && <span className="font-sans font-normal text-emerald-700">OCR</span>}
      </span>
    );
  }

  if (confidence >= 0.7) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-amber-800 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200">
        <span className="w-1 h-1 rounded-full bg-amber-600"></span>
        {percentage}% {!compact && <span className="font-sans font-normal text-amber-700">Med</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-rose-800 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-300">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
      {percentage}% {!compact && <span className="font-sans font-medium text-rose-700">Low ⚠</span>}
    </span>
  );
};
