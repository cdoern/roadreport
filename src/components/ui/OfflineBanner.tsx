interface OfflineBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Fixed top banner announcing that map tiles are unavailable.
 * Uses `role="alert"` so screen readers announce it immediately when it
 * appears.  Rendered in the overlay DOM layer, not inside the `aria-hidden`
 * map container.
 */
export function OfflineBanner({ visible, onDismiss }: OfflineBannerProps) {
  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[9998] flex items-center justify-between
                 bg-amber-500 text-white text-sm font-medium px-4 py-2 shadow-md"
    >
      <span>Map tiles unavailable — you are offline</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss offline notice"
        className="ml-4 text-white/80 hover:text-white focus:outline-none
                   focus-visible:ring-2 focus-visible:ring-white rounded"
      >
        ✕
      </button>
    </div>
  );
}
