# Travelport+ API — One-Way Flight Search Payload

**Endpoint:** `POST /11/air/catalog/search/catalogproductofferings`  
**Host:** `api.travelport.net` (production)

---

## Minimal One-Way Payload

The smallest valid payload — 1 adult, economy, KHI → DXB:

```json
{
  "CatalogProductOfferingsQueryRequest": {
    "CatalogProductOfferingsRequest": {
      "@type": "CatalogProductOfferingsRequestAir",
      "PassengerCriteria": [
        {
          "@type": "PassengerCriteria",
          "passengerTypeCode": "ADT",
          "number": 1
        }
      ],
      "SearchCriteriaFlight": [
        {
          "@type": "SearchCriteriaFlight",
          "departureDate": "2026-06-15",
          "From": { "value": "KHI" },
          "To":   { "value": "DXB" }
        }
      ]
    }
  }
}
```

---

## Full One-Way Payload (All Options)

```json
{
  "CatalogProductOfferingsQueryRequest": {
    "CatalogProductOfferingsRequest": {
      "@type": "CatalogProductOfferingsRequestAir",

      // ── Upsell / brand options ────────────────────────────────────────────
      // 0-4 for standard search; 0-99 for Flight Specific Search
      // Limits by O&D count: 1-2 legs → max 4; 3 legs → max 2; 4-6 legs → max 1
      "maxNumberOfUpsellsToReturn": 4,

      // ── Content sources ───────────────────────────────────────────────────
      // "GDS" = traditional Travelport GDS content (supports up to 6 legs)
      // "NDC" = airline direct NDC content (supports up to 3 legs)
      // Omit to default to GDS only
      "contentSourceList": ["GDS", "NDC"],

      // ── Result ordering ───────────────────────────────────────────────────
      // "Price-LowToHigh" | "Price-HighToLow" | "Duration-ShortToLong" | "Departure-EarlyToLate"
      "sortBy": "Price-LowToHigh",

      // ── Passengers ────────────────────────────────────────────────────────
      "PassengerCriteria": [
        {
          "@type": "PassengerCriteria",
          "passengerTypeCode": "ADT",   // ADT | CHD | CNN | INF | INS | MIL | SRC | STU | YTH
          "number": 1                   // count of this passenger type
          // "age": 8                   // optional; required when code is age-based (CNN/CHD)
          // "TravelerGeographicLocation": { "value": "US" }  // optional residency for fare eligibility
        }
        // Add more blocks for children, infants, etc.
      ],

      // ── Itinerary legs ────────────────────────────────────────────────────
      // One-way = 1 element; round-trip = 2 elements; multi-city = 2-6 elements
      "SearchCriteriaFlight": [
        {
          "@type": "SearchCriteriaFlight",
          "departureDate": "2026-06-15",          // YYYY-MM-DD (required)

          // Optional departure time window (24-h HH:MM format)
          "DepartureTimeRange": {
            "start": "06:00",
            "end": "22:00"
          },

          "From": { "value": "KHI" },             // IATA airport or city code (required)
          "To":   { "value": "DXB" },             // IATA airport or city code (required)

          // Premium Flex only: search ± days around departure date
          // "daysBeforeDeparture": 3,
          // "daysAfterDeparture": 3
        }
      ],

      // ── Search modifiers (optional) ───────────────────────────────────────
      "SearchModifiersAir": {
        "@type": "SearchModifiersAir",

        // Cabin preference
        // preferenceType: "Preferred" | "Permitted" | "Excluded"
        // cabins: "Economy" | "PremiumEconomy" | "Business" | "First"
        "CabinPreference": [
          {
            "@type": "CabinPreference",
            "preferenceType": "Preferred",
            "cabins": ["Economy"]
          }
        ],

        // Carrier preference (optional — restrict or exclude airlines)
        // "CarrierPreference": [
        //   {
        //     "@type": "CarrierPreference",
        //     "preferenceType": "Preferred",   // "Preferred" | "Permitted" | "Excluded"
        //     "carriers": ["EK", "FZ", "GF"]
        //   }
        // ],

        // Connection / stop preferences (optional)
        // "ConnectionPreferences": [
        //   {
        //     "@type": "ConnectionPreferencesAir",
        //     "FlightType": {
        //       "connectionType": "NonStopDirect"   // "NonStopDirect" | "OneStop" | "TwoOrMoreStops"
        //     },
        //     "maxConnectionTime": 180             // minutes; max layover duration
        //   }
        // ]
      },

      // ── Pricing modifiers (optional) ──────────────────────────────────────
      // "PricingModifiersAir": {
      //   "@type": "PricingModifiersAir",
      //   "currencyCode": "GBP",               // ISO 4217 currency; defaults to agency currency
      //   "FareSelection": {
      //     "@type": "FareSelectionDetail",
      //     "fareType": "PublicFaresOnly",      // "PublicFaresOnly" | "PrivateFaresOnly"
      //     "refundableOnlyInd": false           // true = refundable fares only
      //   },
      //   "includeSplitPaymentInd": false        // true = allow split ticketing
      // },

      // ── Response customisation (optional but highly recommended) ──────────
      "CustomResponseModifiersAir": {
        "@type": "CustomResponseModifiersAir",

        // "Journey" = complete itinerary in each offer (recommended for one-way/RT)
        // "Leg"     = first leg only; use Next Leg Search for subsequent legs
        "SearchRepresentation": "Journey",

        // Number of offers per page.
        // 0 or omitted = return all (no response caching — AirPrice ref payload won't work)
        // Positive integer = max offers + ENABLES CACHING (required for AirPrice ref payload)
        "offersPerPage": 50,

        // Include amenity details (seat pitch, power, wifi flags) per flight
        "includeFlightAmenitiesInd": true

        // "includeFareCalculationInd": true    // include fare calculation string in response
      }
    }
  }
}
```

---

## Passenger Type Codes

| Code | Description |
|------|-------------|
| `ADT` | Adult (12+) |
| `CHD` | Child — use with `age` field |
| `CNN` | Child (2–11) — Amadeus-style code, use `age` |
| `INF` | Infant (under 2), seated on lap |
| `INS` | Infant (under 2), with seat |
| `MIL` | Military |
| `SRC` | Senior |
| `STU` | Student |
| `YTH` | Youth |

---

## sortBy Values

| Value | Description |
|-------|-------------|
| `Price-LowToHigh` | Cheapest first (default) |
| `Price-HighToLow` | Most expensive first |
| `Duration-ShortToLong` | Shortest total travel time first |
| `Departure-EarlyToLate` | Earliest departure first |

---

## Notes

1. `@type` fields are **mandatory** — the API uses them for polymorphic deserialization.
2. Airport codes can be IATA 3-letter airport (`KHI`) or city code (`KHI`/`DXB`). City codes return all airports in that city.
3. Always include `contentSourceList: ["GDS", "NDC"]` for maximum coverage.
4. `offersPerPage` must be set if you intend to call AirPrice with the reference payload pattern.
5. `Accept-Encoding` header is **required** by Travelport (see `06-headers-reference.md`).
