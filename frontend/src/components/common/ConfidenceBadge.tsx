import React from 'react';

interface ConfidenceBadgeProps {
  confidence: number; // Accepts 0.0-1.0 OR 0-100
  isFlagged?: boolean;
  compact?: boolean;
  size?: 'sm' | 'md';
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  isFlagged = false,
  compact = false,
  size = 'md',
}) => {
  // Gracefully handle both 0.0 - 1.0 floats and 0 - 100 integers
  const normalized = confidence > 1 ? confidence / 100 : (confidence || 0);
  const percentage = Math.min(100, Math.max(0, Math.round(normalized * 100)));

  if (percentage >= 90) {
    return (
      <span className={`inline-flex items-center gap-1 font-mono font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 ${
        size === 'sm' ? 'text-[10.5px]' : 'text-xs'
      }`}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
        <span>{percentage}%</span>
        {!compact && <span className="font-sans font-normal text-emerald-700">OCR</span>}
      </span>
    );
  }

  // 70 is the flag line used everywhere else (backend LOW_CONFIDENCE_THRESHOLD,
  // the officer queue's low-confidence filter), so the badge agrees with them.
  if (percentage >= 70) {
    return (
      <span className={`inline-flex items-center gap-1 font-mono font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 ${
        size === 'sm' ? 'text-[10.5px]' : 'text-xs'
      }`}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
        <span>{percentage}%</span>
        {!compact && <span className="font-sans font-normal text-amber-700">Med</span>}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 font-mono font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-300 ${
      size === 'sm' ? 'text-[10.5px]' : 'text-xs'
    }`}>
      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
      <span>{percentage}%</span>
      {!compact && <span className="font-sans font-medium text-rose-700">Low ⚠</span>}
    </span>
  );
};
