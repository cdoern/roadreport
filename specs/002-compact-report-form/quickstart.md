# Quickstart: Compact Report Form

**Branch**: `002-compact-report-form` | **Updated**: 2026-02-22

## What Changed

The report form (`ReportForm.tsx`) has been redesigned to be compact and non-obstructive. The map remains visible and interactive while the form is open.

## Key Behaviours

### Opening the form
Tap the green **Report** button. The form slides up from the bottom and occupies ≤44% of the viewport. The map above it remains pannable and zoomable.

### Selecting a condition
Scroll the horizontal chip row to browse all 14 condition types (grouped as Weather and Structural). Tap a chip to select it — the selected chip highlights in green.

### Setting severity
Tap one of the three horizontal severity buttons: **1 – Mild**, **2 – Fair**, or **3 – Severe**.

### Adjusting pin location
With the form open, pan or zoom the map freely. The draggable green pin can be repositioned at any time. The form preserves all entered data across map interactions. The report is filed at the pin location current at submit time.

### Adding a note (optional)
Tap **+ Add note** to expand the description field. Type up to 280 characters. Tap the field label again to collapse (note text is preserved).

### Submitting
Tap **Submit Report** (enabled once condition type and severity are selected). The form closes on success and the heatmap refreshes.

### Closing without submitting
Tap the × button in the form header, or press **Escape**. The form closes and focus returns to the Report button.

## Development

```bash
# Run dev server
npm run dev

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Tests
npm test
```

## File Modified

```
src/components/report/ReportForm.tsx   # Presentation layer only
```

No backend, schema, hook, or type changes.
