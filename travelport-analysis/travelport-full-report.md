# Travelport+ REST API — Complete Professional Reference

> **API Version:** TripServices Flights v11 (11.33.0)  
> **Prepared from:** Live API testing + developer.travelport.com documentation + OpenAPI spec  
> **Verified against:** Production (`api.travelport.net`) — KHI→DXB search confirmed working

---

# Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Authentication](#2-authentication)
3. [One-Way Search Payload](#3-one-way-search-payload)
4. [Round-Trip Search Payload](#4-round-trip-search-payload)
5. [Multi-City Search Payload](#5-multi-city-search-payload)
6. [Headers Reference](#6-headers-reference)
7. [Response Parsing Guide](#7-response-parsing-guide)
8. [Maximum Results Strategy](#8-maximum-results-strategy)
9. [Field Reference](#9-field-reference)
10. [Known Issues & Workarounds](#10-known-issues--workarounds)

---

# 1. Executive Summary

## Core Endpoints

| Purpose | Method | Path |
|---------|--------|------|
| Get OAuth2 token | POST | `/oauth/token` *(auth host)* |
| Flight Search | POST | `/11/air/catalog/search/catalogproductofferings` |
| Next Leg Search (multi-city) | POST | `/11/air/catalog/search/catalogproductofferings/buildnext` |
| Flight Specific Search | POST | `/11/air/catalog/search/catalogproductofferings/flightspecific` |
| Premium Flex Search (±3 days) | POST | `/11/air/catalog/search/catalogproductofferings/premiumflex` |
| AirPrice (from search results) | POST | `/11/air/price/offers/buildfromcatalogproductofferings` |
| AirPrice (full payload) | POST | `/11/air/price/offers/buildfromproducts` |
| Seat Map | POST | `/11/air/search/seat/catalogofferingsancillaries/seatavailabilities` |
| Create Booking Workbench | POST | `/11/air/book/session/reservationworkbench` |

**Hosts:**
- Production API: `api.travelport.net`
- Production Auth: `auth.travelport.net`
- Pre-production API: `api.pp.travelport.net`
- Pre-production Auth: `auth.pp.travelport.net`

## Critical Constraints

| Constraint | Value |
|---|---|
| `Accept-Encoding` header | **REQUIRED** — 400 error if missing |
| `maxNumberOfUpsellsToReturn` (Search) | 0–4 |
| `maxNumberOfUpsellsToReturn` (Flight Specific) | 0–99 |
| Max O&D legs — GDS | 6 |
| Max O&D legs — NDC | 3 |
| Token validity | 24 hours |
| `offersPerPage` required for | AirPrice reference payload caching |

## Verified Production Results

Configuration tested: `contentSourceList: ["GDS","NDC"]`, `offersPerPage: 50`, `maxNumberOfUpsellsToReturn: 4`, Economy, 1 ADT, KHI→DXB.

6 offers returned: **GF751, EK601, FZ334, EK603, EK2111** | Price range: **GBP 191.90 — GBP 1459.40**

---

# 2. Authentication

## OAuth 2.0 Password Grant (Recommended)

```http
POST https://auth.travelport.net/oauth/token
Content-Type: application/x-www-form-urlencoded
Authorization: Basic <base64(clientId:clientSecret)>

grant_type=password&username=TP35439187&password=YOUR_PASSWORD
```

## Token Response

```json
{
  "access_token": "eyJhbGci...JWT...",
  "token_type": "Bearer",
  "expires_in": 86400
}
```

Token is valid for **24 hours**. Cache with expiry — never re-fetch on every call.

## Token Caching

```javascript
let tokenCache = { token: null, expiresAt: 0 };

async function getToken() {
  if (tokenCache.token && Date.now() < tokenCache.expiresAt - 300_000) {
    return tokenCache.token;
  }
  const { access_token, expires_in } = await fetchNewToken();
  tokenCache = { token: access_token, expiresAt: Date.now() + expires_in * 1000 };
  return access_token;
}
```

## Credentials Summary

| Credential | Purpose |
|---|---|
| `TRAVELPORT_CLIENT_ID` | Basic auth username for `/oauth/token` |
| `TRAVELPORT_CLIENT_SECRET` | Basic auth password for `/oauth/token` |
| `TRAVELPORT_USERNAME` | `username=` field (password grant) |
| `TRAVELPORT_PASSWORD` | `password=` field (password grant) |
| `TRAVELPORT_ACCESS_GROUP` (UUID) | `XAUTH_TRAVELPORT_ACCESSGROUP` header |
| `TRAVELPORT_ID` | `TravelportID` header |
| `AGENCY_ID` | `AgencyID` header |

---

# 3. One-Way Search Payload

**Endpoint:** `POST /11/air/catalog/search/catalogproductofferings`

## Minimal

```json
{
  "CatalogProductOfferingsQueryRequest": {
    "CatalogProductOfferingsRequest": {
      "@type": "CatalogProductOfferingsRequestAir",
      "PassengerCriteria": [
        { "@type": "PassengerCriteria", "passengerTypeCode": "ADT", "number": 1 }
      ],
      "SearchCriteriaFlight": [
        { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-15",
          "From": { "value": "KHI" }, "To": { "value": "DXB" } }
      ]
    }
  }
}
```

## Full (All Options Annotated)

```json
{
  "CatalogProductOfferingsQueryRequest": {
    "CatalogProductOfferingsRequest": {
      "@type": "CatalogProductOfferingsRequestAir",

      "maxNumberOfUpsellsToReturn": 4,          // Brand upsells per offer: 0-4
      "contentSourceList": ["GDS", "NDC"],       // Both content types
      "sortBy": "Price-LowToHigh",               // Price-LowToHigh | Price-HighToLow | Duration-ShortToLong | Departure-EarlyToLate

      "PassengerCriteria": [
        {
          "@type": "PassengerCriteria",
          "passengerTypeCode": "ADT",            // ADT | CHD | CNN | INF | INS | MIL | SRC | STU | YTH
          "number": 1
          // "age": 8                            // Required for CHD/CNN
        }
      ],

      "SearchCriteriaFlight": [
        {
          "@type": "SearchCriteriaFlight",
          "departureDate": "2026-06-15",         // YYYY-MM-DD
          "DepartureTimeRange": { "start": "06:00", "end": "22:00" },
          "From": { "value": "KHI" },
          "To":   { "value": "DXB" }
        }
      ],

      "SearchModifiersAir": {
        "@type": "SearchModifiersAir",
        "CabinPreference": [
          {
            "@type": "CabinPreference",
            "preferenceType": "Preferred",       // Preferred | Permitted | Excluded
            "cabins": ["Economy"]                // Economy | PremiumEconomy | Business | First
          }
        ]
        // "CarrierPreference": [{ "@type": "CarrierPreference", "preferenceType": "Excluded", "carriers": ["FR"] }],
        // "ConnectionPreferences": [{ "@type": "ConnectionPreferencesAir", "FlightType": { "connectionType": "NonStopDirect" } }]
      },

      "PricingModifiersAir": {
        "@type": "PricingModifiersAir",
        "currencyCode": "GBP"                    // ISO 4217 — defaults to agency currency
        // "FareSelection": { "@type": "FareSelectionDetail", "fareType": "PublicFaresOnly", "refundableOnlyInd": false },
        // "includeSplitPaymentInd": true
      },

      "CustomResponseModifiersAir": {
        "@type": "CustomResponseModifiersAir",
        "SearchRepresentation": "Journey",       // Journey | Leg
        "offersPerPage": 50,                     // REQUIRED for AirPrice caching
        "includeFlightAmenitiesInd": true
      }
    }
  }
}
```

---

# 4. Round-Trip Search Payload

Round-trip = 2 elements in `SearchCriteriaFlight`. Journey mode bundles them as one priced offer.

```json
{
  "CatalogProductOfferingsQueryRequest": {
    "CatalogProductOfferingsRequest": {
      "@type": "CatalogProductOfferingsRequestAir",
      "maxNumberOfUpsellsToReturn": 4,
      "contentSourceList": ["GDS", "NDC"],
      "sortBy": "Price-LowToHigh",
      "PassengerCriteria": [
        { "@type": "PassengerCriteria", "passengerTypeCode": "ADT", "number": 2 },
        { "@type": "PassengerCriteria", "passengerTypeCode": "CHD", "number": 1, "age": 8 }
      ],
      "SearchCriteriaFlight": [
        {
          "@type": "SearchCriteriaFlight",
          "departureDate": "2026-06-15",
          "From": { "value": "KHI" },
          "To":   { "value": "DXB" }
        },
        {
          "@type": "SearchCriteriaFlight",
          "departureDate": "2026-06-22",
          "From": { "value": "DXB" },           // Mirror of outbound
          "To":   { "value": "KHI" }
        }
      ],
      "SearchModifiersAir": {
        "@type": "SearchModifiersAir",
        "CabinPreference": [{ "@type": "CabinPreference", "preferenceType": "Preferred", "cabins": ["Economy"] }]
      },
      "CustomResponseModifiersAir": {
        "@type": "CustomResponseModifiersAir",
        "SearchRepresentation": "Journey",
        "offersPerPage": 50,
        "includeFlightAmenitiesInd": true
      }
    }
  }
}
```

**Note:** With Journey mode, each offer's `ProductBrandOffering.Product[]` contains 2 items — [0] = outbound, [1] = return.

---

# 5. Multi-City Search Payload

Multi-city = 2–6 elements in `SearchCriteriaFlight` (GDS: 6 max, NDC: 3 max).

## Upsell Limits by Leg Count

| Legs | Max `maxNumberOfUpsellsToReturn` |
|---|---|
| 1–2 | 4 |
| 3 | 2 |
| 4–6 | 1 |

## 3-Leg Example

```json
{
  "CatalogProductOfferingsQueryRequest": {
    "CatalogProductOfferingsRequest": {
      "@type": "CatalogProductOfferingsRequestAir",
      "maxNumberOfUpsellsToReturn": 2,           // Max 2 for 3-leg
      "contentSourceList": ["GDS", "NDC"],
      "PassengerCriteria": [
        { "@type": "PassengerCriteria", "passengerTypeCode": "ADT", "number": 1 }
      ],
      "SearchCriteriaFlight": [
        { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-15", "From": { "value": "KHI" }, "To": { "value": "DXB" } },
        { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-20", "From": { "value": "DXB" }, "To": { "value": "LHR" } },
        { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-25", "From": { "value": "LHR" }, "To": { "value": "JFK" } }
      ],
      "CustomResponseModifiersAir": {
        "@type": "CustomResponseModifiersAir",
        "SearchRepresentation": "Journey",
        "offersPerPage": 50,
        "includeFlightAmenitiesInd": true
      }
    }
  }
}
```

## 6-Leg GDS Maximum

```json
"contentSourceList": ["GDS"],
"maxNumberOfUpsellsToReturn": 1,
"SearchCriteriaFlight": [
  { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-01", "From": { "value": "NYC" }, "To": { "value": "LHR" } },
  { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-05", "From": { "value": "LHR" }, "To": { "value": "CDG" } },
  { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-10", "From": { "value": "CDG" }, "To": { "value": "FCO" } },
  { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-15", "From": { "value": "FCO" }, "To": { "value": "DXB" } },
  { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-20", "From": { "value": "DXB" }, "To": { "value": "BKK" } },
  { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-25", "From": { "value": "BKK" }, "To": { "value": "NYC" } }
]
```

---

# 6. Headers Reference

## Required for All API Calls

| Header | Value | Notes |
|--------|-------|-------|
| `Authorization` | `Bearer <token>` | From `/oauth/token` |
| `Content-Type` | `application/json` | POST requests |
| `Accept` | `application/json` | |
| `Accept-Encoding` | `gzip, deflate, br` | **REQUIRED** — 400 if missing |
| `XAUTH_TRAVELPORT_ACCESSGROUP` | UUID | Agency access group |
| `TravelportID` | Numeric ID | Travelport agency ID |
| `AgencyID` | Numeric ID | Usually same as TravelportID |

## Required for Auth Calls

| Header | Value |
|--------|-------|
| `Content-Type` | `application/x-www-form-urlencoded` |
| `Authorization` | `Basic <base64(clientId:clientSecret)>` |

## JavaScript `buildHeaders()` Function

```javascript
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

# 7. Response Parsing Guide

## Response Structure

```
CatalogProductOfferingsResponse
├── Identifier.value              ← searchIdentifier (for AirPrice ref payload)
├── CatalogProductOffering[]      ← array of offers (IDs only, not full details)
└── ReferenceList[]               ← shared data (flights, products, brands)
```

## Step 1: Build ID Maps

```javascript
const refs = response.CatalogProductOfferingsResponse?.ReferenceList ?? [];
const flightMap = {}, productMap = {}, brandMap = {};

for (const ref of refs) {
  switch (ref?.['@type']) {
    case 'ReferenceListFlight':
      for (const f of (ref.Flight  ?? [])) flightMap[f.id]  = f; break;
    case 'ReferenceListProduct':
      for (const p of (ref.Product ?? [])) productMap[p.id] = p; break;
    case 'ReferenceListBrand':
      for (const b of (ref.Brand   ?? [])) brandMap[b.id]   = b; break;
  }
}
```

## Step 2: Navigate Offer → Flight

```javascript
for (const offer of (response.CatalogProductOfferingsResponse?.CatalogProductOffering ?? [])) {
  const price    = offer.Price?.TotalPrice?.value;
  const currency = offer.Price?.TotalPrice?.currencyCode;
  const pboId    = offer.ProductBrandOffering?.[0]?.Identifier?.value; // for AirPrice

  for (const pbo of (offer.ProductBrandOffering ?? [])) {
    for (const prodRef of (pbo.Product ?? [])) {
      const prod = productMap[prodRef.productRef ?? prodRef.id];
      if (!prod) continue;

      for (const seg of (prod.FlightSegment ?? [])) {
        const flight = flightMap[seg?.Flight?.FlightRef];  // ← correct path
        if (!flight) continue;

        console.log(`${flight.carrier}${flight.number} `
          + `${flight.Departure.location}${flight.Departure.time} → `
          + `${flight.Arrival.location}${flight.Arrival.time}`);
      }
    }
  }
}
```

## Key Object Paths

| Data | Path |
|------|------|
| Total price | `offer.Price.TotalPrice.value` |
| Currency | `offer.Price.TotalPrice.currencyCode` |
| PBO identifier (for AirPrice) | `offer.ProductBrandOffering[n].Identifier.value` |
| Flight carrier | `flightMap[seg.Flight.FlightRef].carrier` |
| Flight number | `flightMap[seg.Flight.FlightRef].number` |
| Departure airport | `flightMap[seg.Flight.FlightRef].Departure.location` |
| Departure time | `flightMap[seg.Flight.FlightRef].Departure.time` |
| Arrival airport | `flightMap[seg.Flight.FlightRef].Arrival.location` |
| Arrival time | `flightMap[seg.Flight.FlightRef].Arrival.time` |
| Duration | `flightMap[seg.Flight.FlightRef].duration` (ISO 8601) |
| Aircraft type | `flightMap[seg.Flight.FlightRef].equipment` |
| Cabin class | `seg.CabinAir` |
| Booking code | `seg.BookingCode` |
| Seats available | `seg.availableSeats` |

---

# 8. Maximum Results Strategy

## Priority Checklist

- [ ] `contentSourceList: ["GDS", "NDC"]` — both content types
- [ ] `maxNumberOfUpsellsToReturn: 4` — max brand variants
- [ ] `offersPerPage: 50` — high limit
- [ ] No `CabinPreference` (or all cabins as Permitted)
- [ ] No `CarrierPreference`
- [ ] No `FareSelection` (includes public + private)
- [ ] `includeSplitPaymentInd: true` — split ticket combinations
- [ ] `includeFlightAmenitiesInd: true` — richer data

## Optimal Payload

```json
{
  "CatalogProductOfferingsQueryRequest": {
    "CatalogProductOfferingsRequest": {
      "@type": "CatalogProductOfferingsRequestAir",
      "maxNumberOfUpsellsToReturn": 4,
      "contentSourceList": ["GDS", "NDC"],
      "sortBy": "Price-LowToHigh",
      "PassengerCriteria": [
        { "@type": "PassengerCriteria", "passengerTypeCode": "ADT", "number": 1 }
      ],
      "SearchCriteriaFlight": [
        { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-15",
          "From": { "value": "KHI" }, "To": { "value": "DXB" } }
      ],
      "PricingModifiersAir": {
        "@type": "PricingModifiersAir",
        "includeSplitPaymentInd": true
      },
      "CustomResponseModifiersAir": {
        "@type": "CustomResponseModifiersAir",
        "SearchRepresentation": "Journey",
        "offersPerPage": 50,
        "includeFlightAmenitiesInd": true
      }
    }
  }
}
```

## Additional Strategies

| Strategy | Field | Value |
|---|---|---|
| Date flexibility (±3 days) | `/premiumflex` endpoint | `daysBeforeDeparture: 3, daysAfterDeparture: 3` |
| Leg-based mix-and-match | `SearchRepresentation` | `"Leg"` + Next Leg Search |
| Multi-PCC private fares | `MultiPricingAgency` | `["PCC1", "PCC2"]` |
| Non-stop only | `ConnectionPreferences.FlightType.connectionType` | `"NonStopDirect"` |
| Refundable only | `FareSelection.refundableOnlyInd` | `true` |

---

# 9. Field Reference

## CatalogProductOfferingsRequest Top-Level Fields

| Field | Type | Req | Description |
|-------|------|-----|-------------|
| `@type` | string | ✅ | `"CatalogProductOfferingsRequestAir"` |
| `maxNumberOfUpsellsToReturn` | int | — | 0–4 (standard); limited by leg count |
| `contentSourceList` | string[] | — | `["GDS"]` \| `["NDC"]` \| `["GDS","NDC"]` |
| `sortBy` | string | — | Price-LowToHigh \| Price-HighToLow \| Duration-ShortToLong \| Departure-EarlyToLate |
| `PassengerCriteria` | array | ✅ | Passenger definitions |
| `SearchCriteriaFlight` | array | ✅ | Itinerary legs (1–6) |
| `SearchModifiersAir` | object | — | Cabin/carrier/connection filters |
| `PricingModifiersAir` | object | — | Currency/fare/split-ticket |
| `CustomResponseModifiersAir` | object | — | Pagination/representation/amenities |

## PassengerCriteria

| Field | Type | Req | Values |
|-------|------|-----|--------|
| `@type` | string | ✅ | `"PassengerCriteria"` |
| `passengerTypeCode` | string | ✅ | ADT, CHD, CNN, INF, INS, MIL, SRC, STU, YTH |
| `number` | int | ✅ | Count |
| `age` | int | — | Required for CHD/CNN |

## SearchCriteriaFlight

| Field | Type | Req | Notes |
|-------|------|-----|-------|
| `@type` | string | ✅ | `"SearchCriteriaFlight"` |
| `departureDate` | string | ✅ | YYYY-MM-DD |
| `From.value` | string | ✅ | IATA 3-letter code |
| `To.value` | string | ✅ | IATA 3-letter code |
| `DepartureTimeRange.start` | string | — | HH:MM 24h |
| `DepartureTimeRange.end` | string | — | HH:MM 24h |
| `daysBeforeDeparture` | int | — | Premium Flex only |
| `daysAfterDeparture` | int | — | Premium Flex only |

## CabinPreference

| Field | Type | Values |
|-------|------|--------|
| `@type` | string | `"CabinPreference"` |
| `preferenceType` | string | `Preferred` \| `Permitted` \| `Excluded` |
| `cabins` | string[] | `Economy` \| `PremiumEconomy` \| `Business` \| `First` |

## CustomResponseModifiersAir

| Field | Type | Values |
|-------|------|--------|
| `@type` | string | `"CustomResponseModifiersAir"` |
| `SearchRepresentation` | string | `Journey` (default) \| `Leg` |
| `offersPerPage` | int | 0 = all/no-cache; positive = limit + cache |
| `includeFlightAmenitiesInd` | bool | true/false |
| `includeFareCalculationInd` | bool | true/false |

## Flight Object Fields (from ReferenceListFlight)

| Field | Example | Description |
|-------|---------|-------------|
| `id` | `"f1"` | Reference key |
| `carrier` | `"EK"` | Marketing carrier IATA code |
| `number` | `"601"` | Flight number |
| `Departure.location` | `"KHI"` | IATA airport |
| `Departure.date` | `"2026-06-15"` | |
| `Departure.time` | `"02:30"` | HH:MM |
| `Departure.terminal` | `"1"` | |
| `Arrival.location` | `"DXB"` | |
| `Arrival.date` | `"2026-06-15"` | |
| `Arrival.time` | `"04:40"` | |
| `duration` | `"PT2H10M"` | ISO 8601 |
| `equipment` | `"77W"` | IATA aircraft code |
| `operatingCarrier` | `"EK"` | If codeshare |
| `operatingFlightNumber` | `"601"` | If codeshare |

---

# 10. Known Issues & Workarounds

## Critical Issues

### `Accept-Encoding` is Required

```
HTTP 400: "ACCEPT-ENCODING IS A REQUIRED HEADER"
```
Always include `Accept-Encoding: gzip, deflate, br`. Never strip it in a proxy.

### Node.js IPv6 DNS Timeout

Node.js times out connecting to `api.travelport.net` via IPv6/hostname. Fix:

```javascript
require('dns').setDefaultResultOrder('ipv4first');

const { address } = await dns.lookup(hostname, { family: 4 });
// Connect by IP with servername (SNI) for TLS
const opts = { hostname: address, servername: hostname, ... };
```

### CORS — Proxy Required

Travelport has no CORS headers. All browser calls must go through a same-origin proxy:
```
Browser → http://localhost:3000/proxy/api → https://api.travelport.net
```

### `offersPerPage` Must Be in `CustomResponseModifiersAir`

Not at the top level of `CatalogProductOfferingsRequest`.

### Missing `@type` Causes Silent Failures

Every object in the request payload needs its `@type` field.

### `ReferenceList` Must Be Filtered by `@type`

```javascript
// Wrong: for (const ref of refs) { for (const f of ref.Flight) ... }
// Right: filter by ref['@type'] === 'ReferenceListFlight' first
```

### `FlightRef` Path

```javascript
// Wrong: seg.FlightRef
// Right: seg?.Flight?.FlightRef
```

## Other Issues

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| `btoa()` throws on special chars | Latin-1 only | Use `btoa(unescape(encodeURIComponent(...)))` |
| Express 5 wildcard error | Syntax change | Use `app.use()` instead of `app.all('/path/*', ...)` |
| NDC prices show as 0 | NDC requires separate pricing step | Call AirPrice after search for NDC offers |
| 401 after token worked | Token expired silently | Cache with expiry, refresh 5 min early |

---

*End of Travelport+ API Complete Reference*
