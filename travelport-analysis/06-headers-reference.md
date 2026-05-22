# Travelport+ API — Headers Reference

---

## Required Headers (All API Calls)

| Header | Example Value | Notes |
|--------|--------------|-------|
| `Authorization` | `Bearer eyJhbGci...` | JWT Bearer token from `/oauth/token` |
| `Content-Type` | `application/json` | For POST requests with JSON body |
| `Accept` | `application/json` | Tells API to return JSON |
| `Accept-Encoding` | `gzip, deflate, br` | **REQUIRED** — Travelport returns HTTP 400 if absent |
| `XAUTH_TRAVELPORT_ACCESSGROUP` | `32B21B3B-827F-4FAE-8715-CFBF1B7F9CF8` | Agency access group UUID |
| `TravelportID` | `35439187` | Travelport agency numeric ID |
| `AgencyID` | `35439187` | Agency ID (same as TravelportID in most configurations) |

---

## Auth Request Headers

For `POST /oauth/token` (different from API calls):

| Header | Value | Notes |
|--------|-------|-------|
| `Content-Type` | `application/x-www-form-urlencoded` | Token requests use form encoding |
| `Authorization` | `Basic <base64(clientId:clientSecret)>` | HTTP Basic auth with client credentials |

---

## Optional / Contextual Headers

| Header | Example Value | When to Use |
|--------|--------------|-------------|
| `X-Forwarded-For` | `203.0.113.42` | Pass end-user IP for analytics/fraud detection |
| `X-Request-ID` | `a1b2c3d4-e5f6-...` | UUID for request tracing; echoed in response |

---

## Headers NOT to Include

These headers cause issues if sent to Travelport from a proxy:

| Header | Reason |
|--------|--------|
| `Host` | Must be set to the upstream Travelport hostname, not the proxy |
| `Origin` | Browser CORS header; not appropriate for server-to-server |
| `Referer` | Browser navigation header; not appropriate |
| `Connection` | Hop-by-hop header; must be stripped by proxies |
| `Transfer-Encoding` | Hop-by-hop; strip from upstream response before forwarding |
| `Keep-Alive` | Hop-by-hop; strip from upstream response |

---

## Building Headers in JavaScript

```javascript
const CREDS = {
  accessGroup:  '32B21B3B-827F-4FAE-8715-CFBF1B7F9CF8',
  travelportId: '35439187',
  agencyId:     '35439187',
};

function buildHeaders(token) {
  return {
    'Authorization':                `Bearer ${token}`,
    'Content-Type':                 'application/json',
    'Accept':                       'application/json',
    'Accept-Encoding':              'gzip, deflate, br',
    'XAUTH_TRAVELPORT_ACCESSGROUP': CREDS.accessGroup,
    'TravelportID':                 CREDS.travelportId,
    'AgencyID':                     CREDS.agencyId,
  };
}
```

---

## Proxy Header Handling (Node.js/Express)

When using a proxy server to forward browser requests to Travelport, strip browser-only headers and set the correct `Host`:

```javascript
function makeProxy(hostname) {
  return async (req, res) => {
    const headers = {};
    const STRIP_REQ = new Set(['host', 'origin', 'referer', 'connection']);
    const STRIP_RES = new Set(['transfer-encoding', 'connection', 'keep-alive']);

    for (const [k, v] of Object.entries(req.headers)) {
      if (!STRIP_REQ.has(k.toLowerCase())) headers[k] = v;
    }
    // DO NOT strip 'accept-encoding' — Travelport requires it!
    headers['host'] = hostname;

    // ... forward request with correct headers ...
  };
}
```

---

## `Accept-Encoding` — Critical Note

Travelport explicitly validates the `Accept-Encoding` header on every request. If it is missing or stripped by a proxy, the API returns:

```json
HTTP 400 Bad Request
{
  "errors": [
    { "code": "...", "description": "ACCEPT-ENCODING IS A REQUIRED HEADER" }
  ]
}
```

**Always ensure `Accept-Encoding` is preserved end-to-end**, from browser through proxy to Travelport.

---

## Header Case Sensitivity

HTTP/1.1 headers are case-insensitive, but some Travelport-specific headers use unusual casing in documentation:
- `XAUTH_TRAVELPORT_ACCESSGROUP` — all-caps with underscores
- `TravelportID` — mixed case
- `AgencyID` — mixed case

Node.js/Express lowercases headers internally, but when building outbound requests, use the exact casing documented above to avoid any potential issues with Travelport's header parsing.
