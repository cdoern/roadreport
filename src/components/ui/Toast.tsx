import { useEffect } from 'react';

interface ToastProps {
  message: string | null;
  type: 'success' | 'error' | 'info';
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4_000;

const colorMap: Record<ToastProps['type'], string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
};

/**
 * Fixed-position status banner rendered at the top of the viewport.
 * Automatically dismisses after 4 seconds.  Renders nothing when `message`
 * is null.
 */
export function Toast({ message, type, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3
        px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium
        ${colorMap[type]}`}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-2 text-white/80 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        ✕
      </button>
    </div>
  );
}
