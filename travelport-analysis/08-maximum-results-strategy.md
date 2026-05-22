# Travelport+ API — Maximum Results Strategy

This document covers every technique available to maximize the number and variety of flight offers returned.

---

## 1. Content Sources: Always Include Both

```json
"contentSourceList": ["GDS", "NDC"]
```

- **GDS** — Travelport's global distribution system content (all airlines filed via ATPCO/BSP)
- **NDC** — Airline direct content (richer ancillary data, potentially exclusive fares)
- Omitting `contentSourceList` defaults to GDS only — you miss all NDC content
- When an NDC and GDS offer have the same itinerary and price, Travelport can merge them into a single offer

---

## 2. offersPerPage: Use a High Value

```json
"CustomResponseModifiersAir": {
  "@type": "CustomResponseModifiersAir",
  "offersPerPage": 50
}
```

- `0` or omitting = return all offers in one response, but **disables caching** (AirPrice reference payload won't work)
- Positive integer = limit per page + **enables caching** for AirPrice/AddOffer
- For general testing, `50` is a good value — high enough to see lots of results, low enough to stay responsive
- For production pagination: use `offersPerPage: 10` and implement Next Page logic using `searchIdentifier`

---

## 3. maxNumberOfUpsellsToReturn: Maximize Cabin Variants

```json
"maxNumberOfUpsellsToReturn": 4
```

Each base offer can have up to N upsell variants (different brands/cabins). Maximizing this exposes Economy Light, Economy Flex, Business, First in the same result set.

| O&D Pairs | Maximum Allowed |
|---|---|
| 1–2 legs | 4 |
| 3 legs | 2 |
| 4–6 legs | 1 |

For one-way or round-trip, always use `4`.

---

## 4. No Cabin Restriction (Search All Cabins)

To get offers across all cabin types simultaneously, omit `CabinPreference` entirely or use `Permitted` with all cabins:

```json
"SearchModifiersAir": {
  "@type": "SearchModifiersAir",
  "CabinPreference": [
    {
      "@type": "CabinPreference",
      "preferenceType": "Permitted",
      "cabins": ["Economy", "PremiumEconomy", "Business", "First"]
    }
  ]
}
```

Or omit `SearchModifiersAir` entirely for widest results.

---

## 5. No Carrier Restriction

Never include `CarrierPreference` with `Excluded` or only `Preferred` unless you want to filter. Omit it entirely to see all airlines.

---

## 6. No Fare Type Restriction

Omit `PricingModifiersAir.FareSelection` to include both public and private fares:

```json
// Maximized — include all fare types:
// (omit PricingModifiersAir entirely, or:)
"PricingModifiersAir": {
  "@type": "PricingModifiersAir"
}
```

For private fares only:
```json
"FareSelection": {
  "@type": "FareSelectionDetail",
  "fareType": "PrivateFaresOnly"
}
```

---

## 7. Split Ticketing (Additional Combinations)

Enable to allow Travelport to price tickets on separate tickets when a cheaper combination exists:

```json
"PricingModifiersAir": {
  "@type": "PricingModifiersAir",
  "includeSplitPaymentInd": true
}
```

This can surface itineraries at lower prices by combining fares that can't be combined on a single ticket.

---

## 8. Wide Departure Time Window

Avoid restricting departure times unless necessary:

```json
// Best for maximum results — omit DepartureTimeRange entirely
// Or use full-day window:
"DepartureTimeRange": {
  "start": "00:00",
  "end": "23:59"
}
```

---

## 9. Premium Flex Search (±3 Days)

To get results across a ±3-day window in a single call:

**Endpoint:** `POST /11/air/catalog/search/catalogproductofferings/premiumflex`

```json
"SearchCriteriaFlight": [
  {
    "@type": "SearchCriteriaFlight",
    "departureDate": "2026-06-15",
    "daysBeforeDeparture": 3,
    "daysAfterDeparture": 3,
    "From": { "value": "KHI" },
    "To":   { "value": "DXB" }
  }
]
```

This returns offers for departure dates from June 12 to June 18 — 7 dates in one request.

---

## 10. Multi-PCC Search (Multiple Agencies)

If you have access to multiple PCCs (Pseudo City Codes), include them to aggregate fares:

```json
"PricingModifiersAir": {
  "@type": "PricingModifiersAir",
  "MultiPricingAgency": ["AB12", "CD34", "EF56"]
}
```

---

## 11. SearchRepresentation: Journey vs Leg Trade-off

| Mode | Pros | Cons |
|------|------|------|
| `Journey` | Complete priced itineraries, better for display | Requires `offersPerPage` for caching |
| `Leg` | More combinations via mix-and-match | Requires Next Leg Search round-trips; more complex |

For one-way searches, `Journey` is almost always better. For complex mix-and-match round-trips, `Leg` gives more combinations.

---

## 12. includeFlightAmenitiesInd: Richer Data

```json
"includeFlightAmenitiesInd": true
```

Includes seat pitch, power outlets, entertainment, wifi flags per flight — useful for UI display and filtering.

---

## Optimal Maximum-Coverage Payload

Combining all techniques:

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
        {
          "@type": "SearchCriteriaFlight",
          "departureDate": "2026-06-15",
          "From": { "value": "KHI" },
          "To":   { "value": "DXB" }
        }
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

This payload:
- Searches both GDS and NDC
- Returns up to 4 brand upsells per itinerary
- Includes split-ticket combinations
- Caches results for AirPrice
- Includes amenity data
- Covers all cabins (no restriction)
- Covers all carriers (no restriction)
- Covers all fare types (no restriction)
