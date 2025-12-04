# Social Identity Finder — React Frontend (Ocean Professional)

This frontend application lets users upload a photo and searches social media platforms for potential profile matches associated with the person in the image. It follows the Ocean Professional theme with blue and amber accents, rounded corners, subtle shadows, and smooth transitions.

## Overview

The app provides a single-page experience:
- A header with app title and a theme toggle (light/dark).
- An upload card supporting drag-and-drop or file picker for images.
- A results grid showing platform badges, confidence bars, and external profile links, with accessibility support.
- Robust error handling and configuration hints when environment is not properly set.

## Prerequisites and Quick Preview

You need Node.js 16+ and npm.

- Install dependencies:
  - npm install
- Run locally (development/preview):
  - npm start
- Open the app in your browser:
  - http://localhost:3000

You can run the app in mock mode without a backend by setting REACT_APP_FEATURE_FLAGS (see “Mock mode” below). Otherwise, configure backend URLs using environment variables.

## Environment Variables

The app reads environment variables via src/config/env.js. You can set them via a .env file or your process environment.

Primary variables:
- REACT_APP_API_BASE: The primary backend base URL used to call the identify endpoints. If not set, the app falls back to REACT_APP_BACKEND_URL, and finally to window.location.origin.
- REACT_APP_BACKEND_URL: Alternate backend base URL considered if REACT_APP_API_BASE is empty.
- REACT_APP_WS_URL: Optional WebSocket URL to receive live progress/complete events. If provided, the app will connect and listen for identify:{requestId} style notifications.
- REACT_APP_NODE_ENV: Environment name override. Defaults to process.env.NODE_ENV or 'development'.
- REACT_APP_LOG_LEVEL: Client logging level. Defaults to 'info'.
- REACT_APP_FEATURE_FLAGS: JSON string for feature toggles. Example:
  - {"mockApi":true, "maxUploadMB":10}

Other container envs available but not required by this app:
- REACT_APP_FRONTEND_URL, REACT_APP_NEXT_TELEMETRY_DISABLED, REACT_APP_ENABLE_SOURCE_MAPS, REACT_APP_PORT, REACT_APP_TRUST_PROXY, REACT_APP_HEALTHCHECK_PATH, REACT_APP_EXPERIMENTS_ENABLED.

Example .env for local preview:
REACT_APP_API_BASE=http://localhost:8080
REACT_APP_WS_URL=ws://localhost:8080/ws
REACT_APP_LOG_LEVEL=debug
REACT_APP_FEATURE_FLAGS={"mockApi":false,"maxUploadMB":8}

Note on precedence:
- API base resolution: REACT_APP_API_BASE → REACT_APP_BACKEND_URL → window.location.origin.
- Feature flags merge defaults {mockApi:false, maxUploadMB:5} with your JSON.

## Backend API Expectations

The frontend expects the following endpoints from the backend:

1) POST /api/v1/identify
- Request: multipart/form-data with a field named image containing the uploaded file.
- Response:
  - 200 OK: Completed immediately. Body contains results as an array or as {results: []}.
  - 202 Accepted: Asynchronous processing started. Body contains a requestId (could also appear as id or request_id).

2) GET /api/v1/identify/:requestId
- Used for polling when POST returns 202.
- Response:
  - 200 OK: Processing complete. Body contains results as an array or {results: []}.
  - 202 Accepted: Still processing.

3) Optional websocket channel
- If REACT_APP_WS_URL is set, the app will open a raw WebSocket connection and listen for messages. A message with fields like {type:"complete", requestId:"..."} and results triggers completion without waiting for the next polling tick. A typical channel or message topic would be identify:{requestId}, but the app only requires payloads that include the matching requestId and type:"complete".

Result schema normalization
The app accepts arrays of objects or {results: [...]} with flexible field names and normalizes them into:
- id
- avatarUrl
- displayName
- username
- platform
- profileUrl
- confidence (0–1 or 0–100 accepted; normalized to 0–100)
- verified

## Mock Mode

You can run entirely without a backend by enabling the mock API in feature flags:
- Set REACT_APP_FEATURE_FLAGS='{"mockApi":true}'

Behavior:
- POST simulate: ~500ms delay. 50% chance of returning completed results immediately, 50% chance of returning processing with a fake requestId.
- GET poll simulate: ~800ms delay and then returns a completed set of mock results.
- Sample mock outputs include a couple of results (e.g., a Twitter and an Instagram profile) with avatar URL, display name, username, platform, profile URL, confidence score, and verified status.

You can also control maximum upload size with maxUploadMB:
- REACT_APP_FEATURE_FLAGS='{"mockApi":true,"maxUploadMB":10}'

## How to Use the UI

- Upload an image via drag-and-drop onto the highlighted dropzone or click to open the file picker.
- Click “Find Social Profiles” to start the identification process.
- If results are ready, they appear as cards in a responsive grid, each showing:
  - A platform badge (Twitter, Instagram, etc.).
  - A confidence bar indicating match confidence.
  - A link to visit the external profile.
- Retry/Clear:
  - Use “Remove” to clear the current file and pick a different image.
  - Re-upload and click the primary action again to retry.
- While searching, a loader indicates ongoing analysis and the app announces progress via an aria-live region.

## Accessibility and Error Handling

The app includes several accessibility aids:
- A “Skip to content” link for keyboard users.
- Aria-live polite regions that announce loading states and results count.
- Buttons and interactive elements with descriptive labels.

Validation and errors:
- The app validates the selected image for type (JPG/PNG/WEBP) and size. The size limit can be configured via feature flags (maxUploadMB).
- If backend URL is missing, the app displays a configuration hint prompting you to set REACT_APP_API_BASE or REACT_APP_BACKEND_URL. It also shows the current window.location.origin for reference.
- Network errors and unexpected responses are surfaced via a dismissible error banner.

## Theming and Styles

The Ocean Professional theme is implemented via CSS variables in src/App.css. You can adjust colors, radii, shadows, and common components there.

Key variables:
- --color-primary, --color-secondary, --color-success, --color-error
- --color-bg, --color-surface, --color-text, --color-muted, --color-border
- --radius, --radius-sm, --shadow-sm, --shadow-md, --shadow-lg

To tweak the theme, edit the variables and component styles in src/App.css. A dark mode is supported by toggling the data-theme attribute to "dark", and can be controlled via the header toggle button.

## Tests

A minimal test exists to assert the application title renders:
- src/App.test.js checks for “Social Identity Finder” in the header.
- Run tests:
  - npm test

## Scripts

- npm start: Start development server at http://localhost:3000
- npm test: Run tests in watch mode
- npm run build: Create an optimized production build
- npm run eject: Eject CRA configuration (irreversible)

## Troubleshooting

- “Configuration required” banner:
  - Ensure REACT_APP_API_BASE or REACT_APP_BACKEND_URL is set. For quick local runs without a backend, enable mock mode via REACT_APP_FEATURE_FLAGS.
- File too large or invalid type:
  - Adjust maxUploadMB in REACT_APP_FEATURE_FLAGS or choose a smaller JPG/PNG/WEBP file.
- WebSocket not connecting:
  - Verify REACT_APP_WS_URL is correct and reachable; otherwise, the app will continue polling.
