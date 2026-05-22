# Travelport+ API — Authentication Guide

## Overview

Travelport+ uses **OAuth 2.0** to issue Bearer tokens. Every API request must include an `Authorization: Bearer <token>` header. Tokens are valid for **24 hours**.

---

## Auth Endpoints

| Environment | Token URL |
|---|---|
| Production | `https://auth.travelport.net/oauth/token` |
| Pre-production | `https://auth.pp.travelport.net/oauth/token` |

---

## Grant Types

### Option A: Password Grant (Recommended for Server-Side)

Used when you have a Travelport username and password in addition to client credentials.

**Request:**
```http
POST /oauth/token
Host: auth.travelport.net
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(clientId:clientSecret)>

grant_type=password&username=TP35439187&password=YOUR_PASSWORD
```

**cURL Example:**
```bash
curl -X POST "https://auth.travelport.net/oauth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "Authorization: Basic $(echo -n 'CLIENT_ID:CLIENT_SECRET' | base64)" \
  -d "grant_type=password&username=TP35439187&password=YOUR_PASSWORD"
```

**JavaScript Example:**
```javascript
const body = new URLSearchParams({
  grant_type: 'password',
  username: 'TP35439187',
  password: 'YOUR_PASSWORD'
}).toString();

// btoa must handle UTF-8 safely:
const basic = btoa(unescape(encodeURIComponent(`${clientId}:${clientSecret}`)));

const res = await fetch('http://localhost:3000/proxy/auth/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Basic ${basic}`,
  },
  body,
});
const { access_token, expires_in } = await res.json();
```

---

### Option B: Client Credentials Grant

Used when you only have client ID and secret (no username/password).

**Request:**
```http
POST /oauth/token
Host: auth.travelport.net
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(clientId:clientSecret)>

grant_type=client_credentials
```

---

## Token Response

```json
{
  "access_token": "eyJhbGci...long JWT...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

| Field | Description |
|---|---|
| `access_token` | JWT Bearer token, include in all API requests |
| `token_type` | Always `"Bearer"` |
| `expires_in` | Token lifetime in seconds (86400 = 24 hours) |

---

## Token Caching Strategy

Never request a new token on every API call. Cache with expiry:

```javascript
let tokenCache = { token: null, expiresAt: 0 };

async function getToken() {
  const now = Date.now();
  // Refresh 5 minutes before actual expiry to avoid edge-case expiry mid-request
  if (tokenCache.token && now < tokenCache.expiresAt - 300_000) {
    return tokenCache.token;
  }

  const res = await fetch(AUTH_URL, { method: 'POST', /* ... */ });
  const { access_token, expires_in } = await res.json();

  tokenCache = {
    token: access_token,
    expiresAt: now + expires_in * 1000,
  };
  return access_token;
}
```

---

## Using the Token in API Requests

All API requests require these headers (see `06-headers-reference.md` for full list):

```javascript
function buildHeaders(token) {
  return {
    'Authorization':                  `Bearer ${token}`,
    'Content-Type':                   'application/json',
    'Accept':                         'application/json',
    'Accept-Encoding':                'gzip, deflate, br',   // REQUIRED
    'XAUTH_TRAVELPORT_ACCESSGROUP':   ACCESS_GROUP_UUID,
    'TravelportID':                   TRAVELPORT_ID,
    'AgencyID':                       AGENCY_ID,
  };
}
```

---

## Credentials Reference

| Credential | Used For | Header / Field |
|---|---|---|
| `TRAVELPORT_CLIENT_ID` | Basic auth username | `Authorization: Basic base64(id:secret)` |
| `TRAVELPORT_CLIENT_SECRET` | Basic auth password | `Authorization: Basic base64(id:secret)` |
| `TRAVELPORT_USERNAME` | Password grant only | `username=` form field |
| `TRAVELPORT_PASSWORD` | Password grant only | `password=` form field |
| `TRAVELPORT_ACCESS_GROUP` (UUID) | All API calls | `XAUTH_TRAVELPORT_ACCESSGROUP` header |
| `TRAVELPORT_ID` | All API calls | `TravelportID` header |
| `AGENCY_ID` | All API calls | `AgencyID` header |

---

## Error Responses

| HTTP Status | Meaning |
|---|---|
| 401 | Invalid or expired token |
| 403 | Valid token but insufficient permissions for the requested resource |
| 400 | Malformed token request (check grant_type, content-type, basic auth encoding) |

---

## CORS Note

Travelport is a B2B API and does **not** send `Access-Control-Allow-Origin` headers. Direct browser-to-Travelport calls will be blocked by the browser's CORS policy. Use a server-side proxy (Node.js, nginx, etc.) to forward requests.
