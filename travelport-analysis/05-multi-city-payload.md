# Travelport+ API — Multi-City Flight Search Payload

**Endpoint (Journey):** `POST /11/air/catalog/search/catalogproductofferings`  
**Endpoint (Leg-by-leg):** `POST /11/air/catalog/search/catalogproductofferings/buildnext`  
**Host:** `api.travelport.net` (production)

---

## Overview

Multi-city searches support up to:
- **GDS:** 6 O&D pairs (legs)
- **NDC:** 3 O&D pairs (legs)

There are two approaches:

| Approach | How | Best for |
|---|---|---|
| **Journey** | All legs in one `SearchCriteriaFlight` array | Fixed itinerary — all legs together |
| **Next Leg Search** | One leg at a time via `/buildnext` | Interactive selection — pick outbound, then next leg |

---

## Approach 1: Multi-City Journey (Single Request)

All legs in one payload. The API prices the combination as a whole.

```json
{
  "CatalogProductOfferingsQueryRequest": {
    "CatalogProductOfferingsRequest": {
      "@type": "CatalogProductOfferingsRequestAir",
      "maxNumberOfUpsellsToReturn": 1,
      "contentSourceList": ["GDS", "NDC"],
      "sortBy": "Price-LowToHigh",

      "PassengerCriteria": [
        {
          "@type": "PassengerCriteria",
          "passengerTypeCode": "ADT",
          "number": 1
        }
      ],

      "SearchCriteriaFlight": [
        {
          // ── Leg 1: KHI → DXB ──────────────────────────────────────────
          "@type": "SearchCriteriaFlight",
          "departureDate": "2026-06-15",
          "From": { "value": "KHI" },
          "To":   { "value": "DXB" }
        },
        {
          // ── Leg 2: DXB → LHR ──────────────────────────────────────────
          "@type": "SearchCriteriaFlight",
          "departureDate": "2026-06-20",
          "From": { "value": "DXB" },
          "To":   { "value": "LHR" }
        },
        {
          // ── Leg 3: LHR → JFK ──────────────────────────────────────────
          "@type": "SearchCriteriaFlight",
          "departureDate": "2026-06-25",
          "From": { "value": "LHR" },
          "To":   { "value": "JFK" }
        }
        // Add up to 6 legs total for GDS, 3 for NDC
      ],

      "SearchModifiersAir": {
        "@type": "SearchModifiersAir",
        "CabinPreference": [
          {
            "@type": "CabinPreference",
            "preferenceType": "Preferred",
            "cabins": ["Economy"]
          }
        ]
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

### Upsell Limit by Leg Count

| O&D Pairs | Max `maxNumberOfUpsellsToReturn` |
|---|---|
| 1–2 | 4 |
| 3 | 2 |
| 4–6 | 1 |

For a 3-leg itinerary, set `maxNumberOfUpsellsToReturn: 2`. For 4+ legs, use `1`.

---

## Approach 2: Leg-by-Leg (Next Leg Search)

Use the standard search endpoint for the first leg, then `/buildnext` for each subsequent leg. Responses are always cached in Journey-Leg mode.

### Step 1 — Search first leg

```json
POST /11/air/catalog/search/catalogproductofferings
{
  "CatalogProductOfferingsQueryRequest": {
    "CatalogProductOfferingsRequest": {
      "@type": "CatalogProductOfferingsRequestAir",
      "PassengerCriteria": [
        { "@type": "PassengerCriteria", "passengerTypeCode": "ADT", "number": 1 }
      ],
      "SearchCriteriaFlight": [
        {
          "@type": "SearchCriteriaFlight",
          "departureDate": "2026-06-15",
          "From": { "value": "KHI" },
          "To":   { "value": "DXB" }
        }
      ],
      "CustomResponseModifiersAir": {
        "@type": "CustomResponseModifiersAir",
        "SearchRepresentation": "Leg"
      }
    }
  }
}
```

The response contains a `CatalogProductOfferingsResponse.Identifier.value` — save this as `searchIdentifier`.

### Step 2 — Select first leg & search next

```json
POST /11/air/catalog/search/catalogproductofferings/buildnext
{
  "CatalogProductOfferingsQueryRequest": {
    "CatalogProductOfferingsRequest": {
      "@type": "CatalogProductOfferingsRequestAirBuildNextCatalogProductOfferings",

      // Identifier from Step 1 response
      "Identifier": {
        "@type": "Identifier",
        "value": "<searchIdentifier from Step 1>"
      },

      // Selected offer from Step 1
      "CatalogProductOfferingIdentifier": [
        {
          "@type": "CatalogProductOfferingIdentifier",
          "value": "<offerIdentifier from selected Step 1 offer>"
        }
      ],

      // Next leg to search
      "SearchCriteriaFlight": [
        {
          "@type": "SearchCriteriaFlight",
          "departureDate": "2026-06-20",
          "From": { "value": "DXB" },
          "To":   { "value": "LHR" }
        }
      ]
    }
  }
}
```

The first `CatalogProductOffering` in the `/buildnext` response represents the selected outbound leg; subsequent ones are options for the new leg.

### Step 3 — Repeat for each additional leg

Continue calling `/buildnext` until all legs are selected, then proceed to AirPrice.

---

## Maximum Coverage Notes

1. **NDC limit:** If searching 4+ legs, drop NDC from `contentSourceList` (only GDS supports > 3 legs). Mixing both with 4+ legs may cause partial results or errors.
2. **Date ordering:** Each leg's `departureDate` must be chronologically >= the previous leg's date.
3. **Connection city rules:** The `From.value` of each leg should match the `To.value` of the previous leg, unless you intentionally have a surface segment.
4. **Journey vs. Leg for multi-city:** Journey mode returns fully-priced multi-leg itineraries as single offers; Leg mode lets users mix-and-match individual leg options.

---

## 6-Leg GDS Example (Maximum)

```json
"SearchCriteriaFlight": [
  { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-01", "From": { "value": "NYC" }, "To": { "value": "LHR" } },
  { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-05", "From": { "value": "LHR" }, "To": { "value": "CDG" } },
  { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-10", "From": { "value": "CDG" }, "To": { "value": "FCO" } },
  { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-15", "From": { "value": "FCO" }, "To": { "value": "DXB" } },
  { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-20", "From": { "value": "DXB" }, "To": { "value": "BKK" } },
  { "@type": "SearchCriteriaFlight", "departureDate": "2026-06-25", "From": { "value": "BKK" }, "To": { "value": "NYC" } }
],
"contentSourceList": ["GDS"],
"maxNumberOfUpsellsToReturn": 1
```
