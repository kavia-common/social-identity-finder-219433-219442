# CORS Diagnosis and Backend Configuration Guide

This guide helps you quickly confirm if an error is CORS-related and provides copy-paste backend configurations for common frameworks. It also includes a React same-origin proxy alternative for local development.

## How to confirm it's CORS in the browser (Network and Console checks)

1. Reproduce the failing request in your app.
2. Open DevTools:
   - Chrome/Edge: View > Developer > Developer Tools
   - Firefox: Tools > Browser Tools > Web Developer Tools
3. Check Console:
   - Look for messages like "Access to fetch at ... has been blocked by CORS policy" or "TypeError: Failed to fetch".
   - If served over HTTPS and API is HTTP, you may see a mixed-content error instead of CORS.
4. Check Network tab:
   - Find the request and inspect headers and response.
   - For preflighted requests, you will see an OPTIONS request preceding your main request.
   - In the failing response, confirm if Access-Control-Allow-Origin is missing or does not match your frontend origin (e.g., http://localhost:3000 in dev).
   - If the request says "blocked" with no response body, it likely failed CORS at the browser level.

Tip: Your frontend app already surfaces CORS/mixed-content indicators in its error details (see the Details expander in the alert).

## Required CORS headers and when they must be present

CORS behavior differs for simple vs preflighted requests:

- Simple requests (e.g., GET/POST with simple headers and content types like application/x-www-form-urlencoded, multipart/form-data, text/plain):
  - Response must include:
    - Access-Control-Allow-Origin: <origin> or *
    - Optional: Access-Control-Expose-Headers to allow reading custom response headers from JS
  - If sending credentials (cookies/Authorization with credentials mode), you cannot use * and must echo the specific origin and set Access-Control-Allow-Credentials: true.

- Preflighted requests (OPTIONS request before the actual request):
  - The OPTIONS response must include:
    - Access-Control-Allow-Origin: <origin>
    - Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS (as needed)
    - Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, etc. (include any custom headers you send)
    - Optional: Access-Control-Max-Age: 600 (cache preflight for 10 minutes)
  - If the OPTIONS response is missing or incomplete, the browser will block the actual request.

## Handling preflight (OPTIONS) requests

Your server must:
- Route OPTIONS requests for the same paths as your API endpoints.
- Return the CORS headers listed above.
- Not require auth for OPTIONS or otherwise reject it.
- Return a 200 or 204 with no body.

Framework-specific snippets below include OPTIONS handling where relevant.

## Credentials notes (cookies/Authorization headers)

If your frontend uses cookies or sets fetch with credentials: 'include' or sends Authorization headers:
- Access-Control-Allow-Origin cannot be *; it must be the exact origin (e.g., http://localhost:3000).
- Access-Control-Allow-Credentials: true must be included on both the preflight response and the actual response.
- You typically also need Vary: Origin on responses when dynamically setting the allow origin.

## Environment-specific origins

Allow your development origin and production origin explicitly:
- Development commonly: http://localhost:3000
- Production: your deployed frontend domain, e.g., https://app.example.com

When in doubt, configure a whitelist (array) and switch by environment.

## Backend configuration snippets

Below are minimal, safe defaults to enable CORS for common stacks. Replace origins with your actual frontend URLs.

### Node/Express

Using cors package (recommended):
```bash
npm install cors
```

```js
// server.js
const express = require('express');
const cors = require('cors');
const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'https://app.example.com'
];

app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true); // allow non-browser clients
    const allowed = allowedOrigins.includes(origin);
    cb(null, allowed);
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 600
}));

app.options('*', cors()); // handle preflight

// ... your routes
app.listen(process.env.PORT || 8080);
```

Manual headers (if not using the package):
```js
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = ['http://localhost:3000', 'https://app.example.com'];
  if (origin && allowed.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
```

### Python/FastAPI
```bash
pip install fastapi uvicorn "starlette>=0.27"
```

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
    "http://localhost:3000",
    "https://app.example.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # use ["*"] only if not using credentials
    allow_credentials=True,
    allow_methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allow_headers=["*"],              # or list explicit headers
    expose_headers=["Content-Length", "Content-Type"],
    max_age=600
)

@app.get("/api/health")
def health():
    return {"ok": True}
```

### Python/Flask
```bash
pip install flask flask-cors
```

```python
# app.py
from flask import Flask
from flask_cors import CORS

app = Flask(__name__)

CORS(
    app,
    resources={r"/api/*": {"origins": ["http://localhost:3000","https://app.example.com"]}},
    supports_credentials=True,
    methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allow_headers=["Content-Type","Authorization","X-Requested-With"],
    expose_headers=["Content-Length","Content-Type"],
    max_age=600
)

@app.route("/api/health")
def health():
    return {"ok": True}
```

Manual example (if not using flask-cors):
```python
from flask import Flask, request, make_response

app = Flask(__name__)
ALLOWED = {"http://localhost:3000","https://app.example.com"}

@app.after_request
def add_cors_headers(resp):
    origin = request.headers.get("Origin")
    if origin in ALLOWED:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Credentials"] = "true"
        resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
        resp.headers["Access-Control-Max-Age"] = "600"
    return resp

@app.route("/api/<path:_path>", methods=["OPTIONS"])
def options(_path):
    return ("", 204)
```

### Django (django-cors-headers)
```bash
pip install django-cors-headers
```

settings.py:
```python
INSTALLED_APPS = [
    # ...
    "corsheaders",
    # ...
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    # ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://app.example.com",
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = ["content-type","authorization","x-requested-with"]
CORS_EXPOSE_HEADERS = ["content-length","content-type"]
CORS_PREFLIGHT_MAX_AGE = 600
CORS_ALLOW_METHODS = ["GET","POST","PUT","PATCH","DELETE","OPTIONS"]
```

If you need dynamic origins, use CORS_ALLOWED_ORIGIN_REGEXES or a custom middleware that echoes Origin and sets Vary: Origin.

### Ruby on Rails (rack-cors)
```ruby
# Gemfile
gem 'rack-cors', :require => 'rack/cors'
```

```ruby
# config/application.rb or config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins 'http://localhost:3000', 'https://app.example.com'
    resource '/api/*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options],
      credentials: true,
      expose: ['Content-Length', 'Content-Type'],
      max_age: 600
  end
end
```

### Spring Boot (Java)

application.yml example:
```yaml
# application.yml
app:
  cors:
    allowed-origins:
      - "http://localhost:3000"
      - "https://app.example.com"
    allowed-methods: "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    allowed-headers: "Content-Type,Authorization,X-Requested-With"
    exposed-headers: "Content-Length,Content-Type"
    allow-credentials: true
    max-age: 600
```

Global config:
```java
// src/main/java/com/example/config/WebCorsConfig.java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;

@Configuration
public class WebCorsConfig {
  @Bean
  public CorsFilter corsFilter() {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(Arrays.asList("http://localhost:3000","https://app.example.com"));
    config.setAllowedMethods(Arrays.asList("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
    config.setAllowedHeaders(Arrays.asList("Content-Type","Authorization","X-Requested-With"));
    config.setExposedHeaders(Arrays.asList("Content-Length","Content-Type"));
    config.setAllowCredentials(true);
    config.setMaxAge(600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return new CorsFilter(source);
  }
}
```

Per-controller using @CrossOrigin:
```java
@CrossOrigin(origins = {"http://localhost:3000","https://app.example.com"}, allowCredentials = "true")
@RestController
@RequestMapping("/api")
public class ApiController { /* ... */ }
```

## Alternative: same-origin dev proxy from React

To avoid CORS in development, proxy API requests through the React dev server so the browser sees them as same-origin.

Option A: package.json proxy (simple):
```json
// react_frontend/package.json
{
  "proxy": "http://localhost:8080"
}
```
- Then call relative paths in the frontend: fetch("/api/upload") etc.
- The dev server forwards to http://localhost:8080.
- Do not use this in production.

Option B: setupProxy.js for granular control:
```bash
npm install http-proxy-middleware --save-dev
```

```js
// src/setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    ['/api', '/health', '/auth'],
    createProxyMiddleware({
      target: 'http://localhost:8080',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug'
    })
  );
};
```

In both cases, ensure your frontend uses relative URLs (e.g., /api/upload). For this app, you can set:
```env
REACT_APP_API_BASE=
REACT_APP_UPLOAD_PATH=/api/upload
REACT_APP_RESULTS_PATH=/api/results
```
When REACT_APP_API_BASE is empty, the code falls back to window.location.origin, making calls same-origin, which the proxy handles in dev.

## Quick troubleshooting checklist

- Confirm the exact frontend origin (copy from address bar) and add it to your backend allowed origins.
- For credentials (cookies or Authorization with include), do not use wildcard origin; echo the exact origin and set Access-Control-Allow-Credentials: true.
- Ensure the OPTIONS preflight route is handled and returns:
  - Access-Control-Allow-Origin
  - Access-Control-Allow-Methods
  - Access-Control-Allow-Headers (include all custom headers you send)
  - Access-Control-Max-Age (optional, but helpful)
- Make sure your server does not require auth for OPTIONS and returns 200/204 quickly.
- Add Vary: Origin when dynamically setting Access-Control-Allow-Origin.
- If your app is HTTPS in dev/preview, ensure the API is also HTTPS or use the React proxy to avoid mixed-content.
- Re-test using browser DevTools Network tab after changes; verify the response headers on both OPTIONS and the actual request.
- In this project, verify env vars: REACT_APP_API_BASE, REACT_APP_UPLOAD_PATH, REACT_APP_RESULTS_PATH, and consider clearing REACT_APP_API_BASE to use the proxy.
- If still failing, check browser extensions or corporate proxies that might strip headers.

## Notes

We can tailor a minimal snippet for your stack if you share your backend framework and deployment environment.
