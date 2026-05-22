# Travelport+ API — Known Issues & Workarounds

---

## 1. `Accept-Encoding` Is a Required Header

**Symptom:** HTTP 400 with message `"ACCEPT-ENCODING IS A REQUIRED HEADER"`

**Cause:** Travelport validates the presence of `Accept-Encoding` on every API request. If a proxy strips it (standard HTTP proxy behaviour for hop-by-hop headers), all requests fail.

**Fix:** Explicitly preserve `Accept-Encoding` in your proxy. Do NOT include it in the list of headers to strip:

```javascript
// WRONG — includes accept-encoding in strip list
const STRIP = ['host', 'origin', 'referer', 'connection', 'accept-encoding'];

// RIGHT — accept-encoding is kept
const STRIP = ['host', 'origin', 'referer', 'connection'];
```

---

## 2. Node.js IPv6 DNS Timeout

**Symptom:** Requests from Node.js hang for 20–30 seconds then fail with `ETIMEDOUT` or `ECONNRESET`.

**Cause:** `api.travelport.net` resolves to an Akamai CDN IP that accepts IPv4 TCP connections but causes Node.js's default IPv6 resolution to time out or connect to an unresponsive address.

**Fix — Two-step approach:**

1. At the top of `server.js`, force DNS to return IPv4 first:
```javascript
require('dns').setDefaultResultOrder('ipv4first');
```

2. Explicitly resolve the hostname to IPv4, then connect by IP with SNI:
```javascript
const dns = require('dns').promises;
const ipCache = {};

async function resolveIP(hostname) {
  if (!ipCache[hostname]) {
    const { address } = await dns.lookup(hostname, { family: 4 });
    ipCache[hostname] = address;
  }
  return ipCache[hostname];
}

// In the proxy:
const ip = await resolveIP(hostname);
const opts = {
  hostname:   ip,         // connect by explicit IPv4 address
  servername: hostname,   // SNI so TLS certificate validates
  path:       targetPath,
  // ...
};
```

---

## 3. CORS — Browser Cannot Call Travelport Directly

**Symptom:** Browser console shows `Access-Control-Allow-Origin` error or CORS preflight failure.

**Cause:** Travelport is a B2B API with no CORS headers. Browsers block cross-origin requests to APIs that don't explicitly allow it.

**Fix:** Route all Travelport calls through a same-origin server-side proxy:

```
Browser → http://localhost:3000/proxy/api → https://api.travelport.net
Browser → http://localhost:3000/proxy/auth → https://auth.travelport.net
```

The proxy forwards headers (except hop-by-hop) and returns the response to the browser on the same origin (`localhost:3000`).

---

## 4. `offersPerPage` Location

**Symptom:** AirPrice reference payload returns 404 or "session not found" error after a Journey-based search.

**Cause:** Journey-based search results are only cached server-side when `offersPerPage` is set. The field must be inside `CustomResponseModifiersAir`, not at the top level of `CatalogProductOfferingsRequest`.

**Fix:**
```json
// WRONG:
{
  "CatalogProductOfferingsRequest": {
    "offersPerPage": 50,   ← wrong level
    ...
  }
}

// RIGHT:
{
  "CatalogProductOfferingsRequest": {
    "CustomResponseModifiersAir": {
      "@type": "CustomResponseModifiersAir",
      "offersPerPage": 50   ← correct location
    }
  }
}
```

---

## 5. `btoa()` Fails with Non-ASCII Characters

**Symptom:** `InvalidCharacterError: The string to be encoded contains non-Latin1 characters` when encoding client credentials.

**Cause:** Native `btoa()` only handles Latin-1. If client ID or secret contains multibyte characters, it throws.

**Fix:** Use URI-encoding before base64:
```javascript
const encoded = btoa(unescape(encodeURIComponent(`${clientId}:${clientSecret}`)));
// Or in Node.js:
const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
```

---

## 6. Express 5 Wildcard Route Syntax

**Symptom:** Express throws `PathError: Missing parameter name at position N` at startup.

**Cause:** Express 5 changed wildcard route syntax. `app.all('/proxy/auth/*', handler)` is invalid in Express 5.

**Fix:** Use `app.use()` instead of `app.all()` with wildcards:
```javascript
// WRONG (Express 5):
app.all('/proxy/auth/*', makeProxy('auth.travelport.net'));

// RIGHT:
app.use('/proxy/auth', makeProxy('auth.travelport.net'));
```

`app.use()` automatically matches the prefix and passes the remaining path as `req.url`.

---

## 7. Missing `@type` on Nested Objects

**Symptom:** HTTP 400 or unexpected empty results with no error message.

**Cause:** Travelport uses polymorphic JSON — the `@type` field tells the deserializer which concrete class to instantiate. Missing `@type` causes silent deserialization failure or the field is ignored.

**Fix:** Every named object in the request must include its `@type`:
```json
// Correct:
"PassengerCriteria": [{ "@type": "PassengerCriteria", "passengerTypeCode": "ADT", "number": 1 }]
"SearchCriteriaFlight": [{ "@type": "SearchCriteriaFlight", "departureDate": "...", ... }]
"SearchModifiersAir": { "@type": "SearchModifiersAir", ... }
"CabinPreference": [{ "@type": "CabinPreference", ... }]
"CustomResponseModifiersAir": { "@type": "CustomResponseModifiersAir", ... }
```

---

## 8. Response ReferenceList Navigation

**Symptom:** `flightMap` is empty; no flight details render.

**Cause:** `ReferenceList` is a polymorphic array. You cannot directly access `ref.Flight` — you must first filter by `ref['@type'] === 'ReferenceListFlight'`.

**Fix:**
```javascript
// WRONG:
for (const ref of refs) {
  for (const f of (ref.Flight ?? [])) flightMap[f.id] = f;
}

// RIGHT:
for (const ref of refs) {
  if (ref?.['@type'] === 'ReferenceListFlight') {
    for (const f of (ref.Flight ?? [])) flightMap[f.id] = f;
  }
}
```

---

## 9. FlightRef Path

**Symptom:** All flight lookups return `undefined`.

**Cause:** `FlightRef` is nested two levels deep inside `FlightSegment`, not directly on `FlightSegment`.

**Wrong path:** `seg.FlightRef`  
**Wrong path:** `seg.Flight.id`  
**Correct path:** `seg.Flight.FlightRef`

```javascript
// WRONG:
const flight = flightMap[seg.FlightRef];

// RIGHT:
const flight = flightMap[seg?.Flight?.FlightRef];
```

---

## 10. NDC Content Requires Separate Pricing Step

**Symptom:** Some NDC offers don't show prices, or the price shows as 0.

**Cause:** Some NDC carriers require an explicit AirPrice call to finalize pricing. The search response shows an indicative price only.

**Fix:** Always call AirPrice before presenting prices to the user for NDC offers. The `ProductBrandOffering.Identifier.value` from the search result is used as the reference.

---

## 11. Token Expiry — Silent 401

**Symptom:** API calls that worked an hour ago now return 401, but your code shows the token as valid.

**Cause:** Token is cached past its 24-hour validity without an expiry check.

**Fix:** Cache tokens with a computed expiry timestamp, and refresh at least 5 minutes early:
```javascript
tokenCache = {
  token: access_token,
  expiresAt: Date.now() + (expires_in * 1000) - 300_000  // expire 5 min early
};
```
