# MediGO

MediGO is an offline-first personal health record and report builder. Profiles, entries, medications, care-team notes, and documents are stored in browser storage on the device.

## Run locally

Serve this folder over localhost so the service worker can cache the app shell:

```powershell
python -m http.server 8000
```

Then open <http://localhost:8000> in a browser. Use **Download backup** in Settings to export a JSON backup of local records.

## Privacy and limitations

The app does not connect to the hosted MediGO account. Data is stored in the browser profile used for the local site. The report’s QR-style graphic is currently illustrative; the plain-text summary can be copied or shared, but the graphic is not a scannable QR code.

## Project structure

- `app.js` owns app startup, navigation, and shared event handling.
- `src/state.js` owns device-local data and storage helpers.
- `src/pages/` holds one view module per feature area.
- `src/utils.js` holds shared formatting and report helpers.
- `src/styles/` separates foundation, landing-page, and app styles.

When adding a feature, keep its page view in its matching `src/pages/` file and its styles in the relevant stylesheet. Shared navigation and storage changes should be coordinated through `app.js` and `src/state.js`.
