import { useCallback, useEffect, useRef, useState } from 'react';
import { Toast } from './components/ui/Toast';
import { Legend } from './components/ui/Legend';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { MapView, type MapViewHandle } from './components/map/MapView';
import { HeatmapOverlay } from './components/map/HeatmapOverlay';
import { ConditionPopup } from './components/map/ConditionPopup';
import { DraggablePin } from './components/map/DraggablePin';
import { ReportButton } from './components/report/ReportButton';
import { ReportForm } from './components/report/ReportForm';
import { SearchBar } from './components/search/SearchBar';
import { ActivityFilter } from './components/filter/ActivityFilter';
import { useHeatmapData } from './hooks/useHeatmapData';
import { useGeolocation } from './hooks/useGeolocation';
import { useSessionToken } from './hooks/useSessionToken';
import { DEFAULT_CENTER } from './lib/constants';
import { getDeferredInstallPrompt, clearDeferredInstallPrompt } from './main';
import type { ActivityType, ToastState } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// MapContent — must live inside MapContainer so hooks can call useMap()
// ─────────────────────────────────────────────────────────────────────────────

interface MapContentProps {
  activityType: ActivityType;
  refetchTrigger: number;
  isReportOpen: boolean;
  pinLocation: { lat: number; lng: number } | null;
  onPinDragEnd: (lat: number, lng: number) => void;
}

function MapContent({
  activityType,
  refetchTrigger,
  isReportOpen,
  pinLocation,
  onPinDragEnd,
}: MapContentProps) {
  const { cells } = useHeatmapData({ activityType, refetchTrigger });
  return (
    <>
      <HeatmapOverlay cells={cells} />
      <ConditionPopup cells={cells} activityType={activityType} />
      <DraggablePin
        active={isReportOpen}
        lat={pinLocation?.lat ?? null}
        lng={pinLocation?.lng ?? null}
        onPositionChange={onPinDragEnd}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// App — root component
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  // Map navigation ref — forwarded to SearchBar (US3 / T033).
  const mapRef = useRef<MapViewHandle | null>(null);

  // Activity type — controls heatmap weighting, popup sort order, and form default.
  const [activityType, setActivityType] = useState<ActivityType>('running');

  // Toast notifications.
  const [toast, setToast] = useState<ToastState | null>(null);

  // Tile-error → offline banner.
  const [tileError, setTileError] = useState(false);

  // ── US2 state ───────────────────────────────────────────────────────────
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pinAdjusted, setPinAdjusted] = useState(false);
  // Incrementing this triggers an immediate heatmap refetch after submission.
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  // Key prop on ReportForm resets its internal state on each open.
  const [formKey, setFormKey] = useState(0);

  const reportButtonRef = useRef<HTMLButtonElement | null>(null);
  const geo = useGeolocation();
  const sessionToken = useSessionToken();

  // ── US5: PWA install prompt ──────────────────────────────────────────────
  // showInstallPrompt: true = Android deferred prompt ready
  // showIosHint: true = iOS Safari — show manual "Add to Home Screen" instructions
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // Listen for the custom event dispatched in main.tsx when beforeinstallprompt fires.
    const handler = () => setShowInstallPrompt(true);
    window.addEventListener('pwa-install-ready', handler);
    return () => window.removeEventListener('pwa-install-ready', handler);
  }, []);

  const handleInstallClick = useCallback(async () => {
    const prompt = getDeferredInstallPrompt();
    if (prompt) {
      await prompt.prompt();
      clearDeferredInstallPrompt();
      setShowInstallPrompt(false);
    } else {
      // iOS Safari — show manual instructions
      setShowIosHint(true);
    }
  }, []);

  // ── Callbacks ───────────────────────────────────────────────────────────

  const handleTileError = useCallback(() => setTileError(true), []);
  const dismissToast = useCallback(() => setToast(null), []);
  const showToast = useCallback(
    (message: string, type: ToastState['type']) => setToast({ message, type }),
    []
  );

  const openReport = useCallback(() => {
    const lat = geo.coords?.latitude ?? DEFAULT_CENTER[0];
    const lng = geo.coords?.longitude ?? DEFAULT_CENTER[1];
    setPinLocation({ lat, lng });
    setPinAdjusted(false);
    setFormKey((k) => k + 1); // reset form fields to activity defaults
    setIsReportOpen(true);
  }, [geo.coords]);

  const closeReport = useCallback(() => {
    setIsReportOpen(false);
    setPinLocation(null);
    setPinAdjusted(false);
    // Return focus to the button that opened the form (WCAG 2.4.3).
    requestAnimationFrame(() => reportButtonRef.current?.focus());
  }, []);

  const handlePinDragEnd = useCallback((lat: number, lng: number) => {
    setPinLocation({ lat, lng });
    setPinAdjusted(true);
  }, []);

  const handleSubmitSuccess = useCallback(() => {
    setRefetchTrigger((t) => t + 1);
  }, []);

  return (
    <div className="h-screen w-screen overflow-hidden relative">
      {/* ── Map canvas (aria-hidden — not in keyboard / AT flow) ─────────── */}
      <MapView ref={mapRef} onTileError={handleTileError}>
        <MapContent
          activityType={activityType}
          refetchTrigger={refetchTrigger}
          isReportOpen={isReportOpen}
          pinLocation={pinLocation}
          onPinDragEnd={handlePinDragEnd}
        />
      </MapView>

      {/* ── Accessible overlay layer ──────────────────────────────────────── */}

      <OfflineBanner visible={tileError} onDismiss={() => setTileError(false)} />

      <Toast
        message={toast?.message ?? null}
        type={toast?.type ?? 'info'}
        onDismiss={dismissToast}
      />

      <Legend activityType={activityType} />

      {/* Tab order: SearchBar → ActivityFilter → ReportButton (WCAG 2.4.3) */}

      {/* US3: Location search — top-center */}
      <SearchBar mapRef={mapRef} />

      {/* US4: Activity filter — bottom-center above report button */}
      <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-[1000]">
        <ActivityFilter value={activityType} onChange={setActivityType} />
      </div>

      {/* US2: Report button + form */}
      <ReportButton ref={reportButtonRef} onClick={openReport} />

      <ReportForm
        key={formKey}
        isOpen={isReportOpen}
        activityType={activityType}
        pinLocation={pinLocation}
        accuracy={geo.accuracy}
        pinAdjusted={pinAdjusted}
        sessionToken={sessionToken}
        onToast={showToast}
        onClose={closeReport}
        onSubmitSuccess={handleSubmitSuccess}
      />

      {/* PWA install button — top-right, visible when install prompt is ready */}
      {showInstallPrompt && (
        <button
          onClick={handleInstallClick}
          aria-label="Install RoadReport app"
          className="absolute top-4 right-4 z-[1000] rounded-xl bg-green-600 px-3 py-2
                     text-xs font-semibold text-white shadow-lg hover:bg-green-700
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400
                     transition-colors"
        >
          Install App
        </button>
      )}

      {/* iOS "Add to Home Screen" hint modal */}
      {showIosHint && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ios-install-title"
          className="absolute inset-x-4 bottom-24 z-[2000] rounded-2xl bg-white shadow-2xl
                     border border-gray-200 p-5"
        >
          <h2 id="ios-install-title" className="text-base font-bold text-gray-900 mb-2">
            Install RoadReport
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Tap <strong>Share</strong> (the box with an arrow) in Safari, then tap{' '}
            <strong>Add to Home Screen</strong>.
          </p>
          <button
            onClick={() => setShowIosHint(false)}
            className="w-full py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold
                       hover:bg-green-700 focus:outline-none focus-visible:ring-2
                       focus-visible:ring-green-400 transition-colors"
          >
            Got it
          </button>
        </div>
      )}

    </div>
  );
}
