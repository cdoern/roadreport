import { forwardRef } from 'react';

interface ReportButtonProps {
  onClick: () => void;
}

/**
 * Floating action button anchored at the bottom-centre of the viewport.
 * Rendered in the accessible overlay layer (outside the aria-hidden map canvas).
 *
 * The ref is forwarded so that App.tsx can return focus here when ReportForm
 * closes (WCAG 2.4.3 — Focus Order).
 */
export const ReportButton = forwardRef<HTMLButtonElement, ReportButtonProps>(
  function ReportButton({ onClick }, ref) {
    return (
      <button
        ref={ref}
        onClick={onClick}
        aria-label="Report a road condition"
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000]
                   flex items-center gap-2 px-5 py-3
                   bg-green-600 hover:bg-green-700 active:bg-green-800
                   text-white font-semibold text-sm rounded-full shadow-lg
                   focus:outline-none focus-visible:ring-4 focus-visible:ring-green-300
                   transition-colors"
      >
        {/* Location-pin icon */}
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21C12 21 5 13.5 5 8.5a7 7 0 1 1 14 0c0 5-7 12.5-7 12.5z" />
          <circle cx="12" cy="8.5" r="2.5" />
        </svg>
        Report
      </button>
    );
  }
);
