# Quickstart: Fix Report Pin Placement & Submit Button Visibility

**Branch**: `005-fix-report-placement`

## What Changed

This feature delivers two targeted UX improvements to the road condition reporting flow.

### 1. Context-Aware Report Pin Placement

**Before**: Opening the report form always placed the initial pin at the user's GPS location (or the app's default map center if GPS was unavailable), regardless of where the map was currently positioned.

**After**: The initial pin is placed at the map's current visible center. If the map happens to be showing the user's GPS location (they haven't panned away), the behavior is identical to before. If they have scrolled to a different area to report a condition there, the pin starts at that location — no manual repositioning required.

**How it works**:
- At form-open time, the app reads the map's current center.
- It compares that center to the user's GPS position (if available) using a 50-metre threshold.
- If the two are within 50 m (map is centered on the user), GPS coordinates are used.
- If the map has been panned further away, or if GPS is unavailable, the map center is used.

### 2. Submit Button Always Visible

**Before**: When the user tapped the "Add a note" field, the textarea expansion or mobile keyboard could push the Submit button off the bottom of the form panel, making it inaccessible without dismissing the keyboard.

**After**: The Submit button is pinned to the bottom of the form panel at all times. The fields above it scroll independently. The button is always reachable without any extra steps.

---

## Developer Notes

### Files Modified

| File | Change |
|------|--------|
| `src/components/map/MapView.tsx` | Added `getCenter()` to `MapViewHandle` |
| `src/lib/constants.ts` | Added `MAP_CENTER_MATCH_THRESHOLD_M = 50` |
| `src/App.tsx` | Updated `openReport()` with map-center-aware pin placement logic |
| `src/components/report/ReportForm.tsx` | Restructured form layout for sticky submit button |

### Testing the Pin Placement Fix

1. Open the app and allow location access.
2. Pan the map significantly away from your current location (e.g., zoom out and pan to another city).
3. Tap the Report button.
4. **Expected**: The pin appears at the center of the map, not at your GPS location.
5. Without panning (map centered on your location), tap Report.
6. **Expected**: The pin appears at your GPS location.

### Testing the Submit Button Fix

1. Open the report form.
2. Select a condition type and severity.
3. Tap "Add a note" and type a multi-line note.
4. **Expected**: The Submit button remains visible and tappable without dismissing the keyboard or scrolling.

### Running Tests

```bash
npm test
npm run lint
```
