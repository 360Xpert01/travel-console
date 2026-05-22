# Travelport+ REST API — Executive Summary

**API Version:** v11 (TripServices Flights API 11.33.0)  
**Base URL (Production):** `https://api.travelport.net`  
**Auth URL (Production):** `https://auth.travelport.net`  
**Base URL (Pre-production):** `https://api.pp.travelport.net`  
**Auth URL (Pre-production):** `https://auth.pp.travelport.net`  
**Protocol:** HTTPS, REST/JSON only  
**OpenAPI spec:** `https://developer.travelport.com/_bundle/apis/flights/@11.33/index.yaml`

---

## Core Endpoints

| Purpose | Method | Path |
|---------|--------|------|
| Get OAuth2 token | POST | `/oauth/token` *(on auth host)* |
| Flight Search | POST | `/11/air/catalog/search/catalogproductofferings` |
| Next Leg Search (multi-city) | POST | `/11/air/catalog/search/catalogproductofferings/buildnext` |
| Flight Specific Search | POST | `/11/air/catalog/search/catalogproductofferings/flightspecific` |
| Premium Flex Search (±3 days) | POST | `/11/air/catalog/search/catalogproductofferings/premiumflex` |
| AirPrice (from search results) | POST | `/11/air/price/offers/buildfromcatalogproductofferings` |
| AirPrice (full payload) | POST | `/11/air/price/offers/buildfromproducts` |
| Seat Map | POST | `/11/air/search/seat/catalogofferingsancillaries/seatavailabilities` |
| Ancillary Shop | POST | `/11/air/search/ancillary/catalogofferingsancillaries/ancillaryservicesavailabilities` |
| Create Booking Workbench | POST | `/11/air/book/session/reservationworkbench` |
| Get Workbench State | GET | `/11/air/book/session/reservationworkbench/{Identifier}` |

---

## Key Architectural Concepts

### 1. Reference-List Response Pattern
The API does **not** embed flight details directly inside each offer. Instead:
- Each `CatalogProductOffering` contains IDs that reference objects in `ReferenceList`
- `ReferenceList` is an array of typed containers (`ReferenceListFlight`, `ReferenceListProduct`, `ReferenceListBrand`, etc.)
- You must build in-memory maps from ID → object, then resolve references when rendering

### 2. Content Sources
Travelport aggregates two content types:
- **GDS** — Traditional airline inventory via Travelport GDS. Supports up to 6 O&D pairs.
- **NDC** — Direct airline NDC content. Supports up to 3 O&D pairs.
- Specify `contentSourceList: ["GDS", "NDC"]` to search both simultaneously.

### 3. Search Representations
- **Journey** (`SearchRepresentation: "Journey"`) — Returns complete itinerary offers (all legs together). **Requires `offersPerPage`** to be set for caching to work with AirPrice/AddOffer.
- **Leg** (`SearchRepresentation: "Leg"`) — Returns first-leg options only; use Next Leg Search to select subsequent legs. Always cached automatically.

### 4. Token-Based Auth (24-Hour Validity)
Tokens are valid for 24 hours. Cache them in memory with an expiry timestamp to avoid unnecessary round-trips to the auth server.

---

## Critical Constraints (Do Not Violate)

| Constraint | Value |
|---|---|
| `maxNumberOfUpsellsToReturn` (Search) | 0–4 |
| `maxNumberOfUpsellsToReturn` (Flight Specific) | 0–99 |
| Max O&D legs — GDS | 6 |
| Max O&D legs — NDC | 3 |
| Max upsells for 1–2 O&D pairs | 4 |
| Max upsells for 3 O&D pairs | 2 |
| Max upsells for 4–6 O&D pairs | 1 |
| `offersPerPage`: 0 or omitted | Returns all offers (no caching) |
| `offersPerPage`: positive integer | Sets max per page, enables caching |
| `Accept-Encoding` header | **REQUIRED** — 400 error if missing |
| Journey search without `offersPerPage` | AirPrice reference payload will fail |

---

## Verified Working Configuration

The following configuration was tested against the Travelport production API and confirmed working (6 offers returned for KHI→DXB):

- **Auth grant type:** `password` (with username/password)
- **Content sources:** `["GDS", "NDC"]`
- **Search representation:** `Journey`
- **offersPerPage:** 50 (inside `CustomResponseModifiersAir`)
- **maxNumberOfUpsellsToReturn:** 4
- **Cabin:** `Economy`
- **Passengers:** 1 ADT

Results included carriers: **GF751, EK601, FZ334, EK603, EK2111**  
Price range: **GBP 191.90 — GBP 1459.40**
