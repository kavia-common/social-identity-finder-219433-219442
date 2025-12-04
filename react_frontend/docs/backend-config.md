# Backend API Configuration

Configure the React app to talk to your real backend by setting environment variables.

## Required

- REACT_APP_API_BASE or REACT_APP_BACKEND_URL  
  Example:
  REACT_APP_API_BASE=https://api.example.com

Resolution priority:
1) REACT_APP_API_BASE
2) REACT_APP_BACKEND_URL
3) window.__API_BASE__ (if injected at runtime)
4) window.location.origin

## Optional paths

If your backend routes differ from the defaults, you can override them:

- REACT_APP_UPLOAD_PATH (default: /api/upload)
  - Used for POST image upload (multipart field name: "image")
  - Full URL: `${REACT_APP_API_BASE}${REACT_APP_UPLOAD_PATH}`
- REACT_APP_RESULTS_PATH (default: /api/results)
  - Used for GET polling: `${REACT_APP_API_BASE}${REACT_APP_RESULTS_PATH}/{jobId}`
- REACT_APP_HEALTHCHECK_PATH (default: not set; when set, Footer shows an "API Health" link)
  - Full URL: `${REACT_APP_API_BASE}${REACT_APP_HEALTHCHECK_PATH}`

Notes:
- Leading/trailing slashes are normalized; you can provide `/v1/upload` or `v1/upload` and it will be treated as `/v1/upload`.
- API_BASE will have trailing slashes removed to avoid `//` in URLs.

Example:
REACT_APP_UPLOAD_PATH=/v1/files
REACT_APP_RESULTS_PATH=/v1/jobs
REACT_APP_HEALTHCHECK_PATH=/health

## Retry configuration (optional)

These tune the built-in retry and polling behavior:
- REACT_APP_RETRY_MAX (default: 5)  
  Maximum number of retries for network requests (upload) and transient polling fetches.
- REACT_APP_RETRY_BASE_DELAY_MS (default: 500)  
  Base delay in milliseconds used for exponential backoff.

The UI shows a "Retry" button for failed uploads or polls. During auto-retry of polling, a non-blocking informational banner is displayed with an option to "Retry now".

## Feature flags (optional)

- REACT_APP_FEATURE_FLAGS can be CSV or JSON (array/object).  
  Example:
  REACT_APP_FEATURE_FLAGS=livePolling
  or
  REACT_APP_FEATURE_FLAGS=["livePolling"]
  or
  REACT_APP_FEATURE_FLAGS={"livePolling":true}

- REACT_APP_EXPERIMENTS_ENABLED can be truthy values: 1, true, yes, on.

## Common "Failed to fetch" causes and how the UI surfaces them

- CORS: Backend missing Access-Control-Allow-Origin. UI shows a detailed CORS error with tips to enable CORS or use a same-origin proxy.
- Mixed content: App over HTTPS but API over HTTP. UI highlights mixed-content with recommendation to serve API via HTTPS.
- Offline / network down: UI indicates offline status and recommends checking the connection.
- HTTP errors (4xx/5xx): UI displays the status code and server-provided message if available.
- Timeout: UI shows a timeout message with the ability to retry.

Use the Details expander in the alert to see additional context such as the API base URL and raw error message.

## Apply changes

After changing environment variables, rebuild or restart your preview:

- Development: stop and re-run `npm start`
- Production: re-run `npm run build`

```env
# Example .env file
REACT_APP_API_BASE=https://api.example.com
REACT_APP_UPLOAD_PATH=/api/upload
REACT_APP_RESULTS_PATH=/api/results
REACT_APP_HEALTHCHECK_PATH=/health

# Retry tuning
REACT_APP_RETRY_MAX=5
REACT_APP_RETRY_BASE_DELAY_MS=500

REACT_APP_FEATURE_FLAGS=livePolling
REACT_APP_EXPERIMENTS_ENABLED=true
```
