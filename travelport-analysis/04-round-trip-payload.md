# Travelport+ API — Round-Trip Flight Search Payload

**Endpoint:** `POST /11/air/catalog/search/catalogproductofferings`  
**Host:** `api.travelport.net` (production)

A round-trip search is identical to a one-way search except `SearchCriteriaFlight` contains exactly **2 elements**: outbound leg first, return leg second.

---

## Minimal Round-Trip Payload

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
        },
        {
          "@type": "SearchCriteriaFlight",
          "departureDate": "2026-06-22",
          "From": { "value": "DXB" },
          "To":   { "value": "KHI" }
        }
      ]
    }
  }
}
```

---

## Full Round-Trip Payload (All Options)

```json
{
  "CatalogProductOfferingsQueryRequest": {
    "CatalogProductOfferingsRequest": {
      "@type": "CatalogProductOfferingsRequestAir",
      "maxNumberOfUpsellsToReturn": 4,
      "contentSourceList": ["GDS", "NDC"],
      "sortBy": "Price-LowToHigh",

      "PassengerCriteria": [
        {
          "@type": "PassengerCriteria",
          "passengerTypeCode": "ADT",
          "number": 2
        },
        {
          "@type": "PassengerCriteria",
          "passengerTypeCode": "CHD",
          "number": 1,
          "age": 8
        }
      ],

      "SearchCriteriaFlight": [
        {
          // ── Outbound leg ──────────────────────────────────────────────
          "@type": "SearchCriteriaFlight",
          "departureDate": "2026-06-15",
          "DepartureTimeRange": {
            "start": "06:00",
            "end": "22:00"
          },
          "From": { "value": "KHI" },
          "To":   { "value": "DXB" }
        },
        {
          // ── Return leg ────────────────────────────────────────────────
          // From/To are reversed; date must be >= outbound departure date
          "@type": "SearchCriteriaFlight",
          "departureDate": "2026-06-22",
          "DepartureTimeRange": {
            "start": "06:00",
            "end": "22:00"
          },
          "From": { "value": "DXB" },
          "To":   { "value": "KHI" }
        }
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

      "PricingModifiersAir": {
        "@type": "PricingModifiersAir",
        "currencyCode": "USD"
        // "includeSplitPaymentInd": true   // allow split ticketing (see 08-maximum-results-strategy.md)
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

---

## How Round-Trip Results Are Returned

With `SearchRepresentation: "Journey"`, each `CatalogProductOffering` in the response represents a **complete round-trip itinerary** — outbound and return are bundled together as a single priced offer.

Each offer's `ProductBrandOffering.Product[]` array will contain **2 products** (one per leg). Navigate as:

```
CatalogProductOffering
└── ProductBrandOffering[]
    ├── Identifier.value             ← reference ID for AirPrice
    └── Product[]                    ← array: [0] = outbound, [1] = return
        ├── productRef               ← look up in ReferenceListProduct
        └── ...
```

In `ReferenceListProduct`, each `Product` has `FlightSegment[]` containing the actual flights for that leg (connection flights appear as multiple segments).

---

## Leg-Based Alternative

For round-trips with many airline combinations (e.g., mix-and-match outbound/return carriers), use `SearchRepresentation: "Leg"`. This returns outbound options only; the traveler then picks a return flight via the Next Leg Search endpoint.

```json
"CustomResponseModifiersAir": {
  "@type": "CustomResponseModifiersAir",
  "SearchRepresentation": "Leg"
}
```

Leg-based responses are always cached automatically — no `offersPerPage` required.

---

## Multi-Passenger Combinations

For a family booking (2 adults + 1 child aged 8):

```json
"PassengerCriteria": [
  { "@type": "PassengerCriteria", "passengerTypeCode": "ADT", "number": 2 },
  { "@type": "PassengerCriteria", "passengerTypeCode": "CHD", "number": 1, "age": 8 }
]
```

For an adult + lap infant:

```json
"PassengerCriteria": [
  { "@type": "PassengerCriteria", "passengerTypeCode": "ADT", "number": 1 },
  { "@type": "PassengerCriteria", "passengerTypeCode": "INF", "number": 1 }
]
```

---

## Notes

1. The return leg's `From` and `To` must be the mirror of the outbound leg.
2. Return date must be on or after the outbound date.
3. Each leg can have its own `DepartureTimeRange`.
4. For mixed cabin round-trips (economy out, business back), use separate `CabinPreference` entries in `SearchModifiersAir.CabinPreference[]` — or accept combined-cabin offers and filter on the client side.
5. Round-trip with `SearchRepresentation: "Journey"` is the most common pattern and returns the best GDS combinability.
