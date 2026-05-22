# Travelport+ API — Complete Field Reference

---

## CatalogProductOfferingsQueryRequest (root)

```
CatalogProductOfferingsQueryRequest
└── CatalogProductOfferingsRequest   (object, required)
```

---

## CatalogProductOfferingsRequest

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `@type` | string | **Required** | Must be `"CatalogProductOfferingsRequestAir"` |
| `maxNumberOfUpsellsToReturn` | integer | Optional | Brand upsells per offer. 0–4 (standard), 0–99 (Flight Specific). Limits by leg count: 1-2 legs → 4, 3 legs → 2, 4-6 legs → 1 |
| `contentSourceList` | string[] | Optional | `["GDS"]`, `["NDC"]`, or `["GDS","NDC"]`. Defaults to GDS only |
| `sortBy` | string | Optional | `"Price-LowToHigh"` \| `"Price-HighToLow"` \| `"Duration-ShortToLong"` \| `"Departure-EarlyToLate"` |
| `PassengerCriteria` | array | **Required** | At least one passenger |
| `SearchCriteriaFlight` | array | **Required** | Itinerary legs. 1 = one-way, 2 = round-trip, 2-6 = multi-city |
| `SearchModifiersAir` | object | Optional | Cabin, carrier, connection preferences |
| `PricingModifiersAir` | object | Optional | Currency, fare type, split ticketing |
| `CustomResponseModifiersAir` | object | Optional | Pagination, representation, amenities |

---

## PassengerCriteria

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `@type` | string | **Required** | Must be `"PassengerCriteria"` |
| `passengerTypeCode` | string | **Required** | `ADT` \| `CHD` \| `CNN` \| `INF` \| `INS` \| `MIL` \| `SRC` \| `STU` \| `YTH` |
| `number` | integer | **Required** | Count of this passenger type |
| `age` | integer | Optional | Age in years; required for CHD/CNN |
| `TravelerGeographicLocation.value` | string | Optional | ISO country code for residency-based fares |

---

## SearchCriteriaFlight

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `@type` | string | **Required** | Must be `"SearchCriteriaFlight"` |
| `departureDate` | string | **Required** | ISO date `YYYY-MM-DD` |
| `From.value` | string | **Required** | IATA 3-letter airport or city code |
| `To.value` | string | **Required** | IATA 3-letter airport or city code |
| `DepartureTimeRange.start` | string | Optional | Earliest departure time `HH:MM` (24h) |
| `DepartureTimeRange.end` | string | Optional | Latest departure time `HH:MM` (24h) |
| `daysBeforeDeparture` | integer | Optional | Premium Flex only: search N days before `departureDate` |
| `daysAfterDeparture` | integer | Optional | Premium Flex only: search N days after `departureDate` |

---

## SearchModifiersAir

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `@type` | string | **Required** | Must be `"SearchModifiersAir"` |
| `CabinPreference` | array | Optional | Cabin restrictions |
| `CarrierPreference` | array | Optional | Airline restrictions |
| `ConnectionPreferences` | array | Optional | Stop/connection restrictions |

### CabinPreference

| Field | Type | Allowed Values |
|-------|------|----------------|
| `@type` | string | `"CabinPreference"` |
| `preferenceType` | string | `"Preferred"` \| `"Permitted"` \| `"Excluded"` |
| `cabins` | string[] | `"Economy"` \| `"PremiumEconomy"` \| `"Business"` \| `"First"` |

### CarrierPreference

| Field | Type | Allowed Values |
|-------|------|----------------|
| `@type` | string | `"CarrierPreference"` |
| `preferenceType` | string | `"Preferred"` \| `"Permitted"` \| `"Excluded"` |
| `carriers` | string[] | IATA 2-letter airline codes e.g. `["EK","FZ","GF"]` |

### ConnectionPreferences (ConnectionPreferencesAir)

| Field | Type | Allowed Values |
|-------|------|----------------|
| `@type` | string | `"ConnectionPreferencesAir"` |
| `FlightType.connectionType` | string | `"NonStopDirect"` \| `"OneStop"` \| `"TwoOrMoreStops"` |
| `maxConnectionTime` | integer | Max layover in minutes |
| `minConnectionTime` | integer | Min layover in minutes |

---

## PricingModifiersAir

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `@type` | string | **Required** | Must be `"PricingModifiersAir"` |
| `currencyCode` | string | Optional | ISO 4217 code e.g. `"USD"`, `"GBP"`. Defaults to agency currency |
| `FareSelection` | object | Optional | Fare type filter |
| `FareSelection.@type` | string | Required if present | `"FareSelectionDetail"` |
| `FareSelection.fareType` | string | Optional | `"PublicFaresOnly"` \| `"PrivateFaresOnly"` |
| `FareSelection.refundableOnlyInd` | boolean | Optional | `true` = refundable fares only |
| `MultiPricingAgency` | string[] | Optional | Additional PCC agency codes to aggregate |
| `includeSplitPaymentInd` | boolean | Optional | `true` = include split-ticket combinations |

---

## CustomResponseModifiersAir

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `@type` | string | **Required** | Must be `"CustomResponseModifiersAir"` |
| `SearchRepresentation` | string | Optional | `"Journey"` (default) \| `"Leg"` |
| `offersPerPage` | integer | Optional | Max offers per page. 0/omit = all (no cache). Positive = max + enables caching |
| `includeFlightAmenitiesInd` | boolean | Optional | `true` = include seat/wifi/meal amenity data |
| `includeFareCalculationInd` | boolean | Optional | `true` = include fare calculation string |

---

## Response: CatalogProductOffering

| Field | Path | Description |
|-------|------|-------------|
| Offer ID | `.id` | Unique offer identifier (e.g., `"o1"`) |
| Offer Identifier | `.Identifier.value` | UUID for reference payload calls |
| Total Price | `.Price.TotalPrice.value` | Numeric total price |
| Currency | `.Price.TotalPrice.currencyCode` | ISO 4217 |
| Base Fare | `.Price.BasePrice.value` | Pre-tax fare |
| Taxes | `.Price.Taxes.TaxTotal.value` | Total taxes |
| Products | `.ProductBrandOffering[].Product[]` | Product refs — look up in `productMap` |
| PBO Identifier | `.ProductBrandOffering[].Identifier.value` | Use for AirPrice reference payload |

---

## Response: ReferenceListFlight → Flight

| Field | Path | Description |
|-------|------|-------------|
| ID | `.id` | Reference key for `FlightRef` |
| Carrier | `.carrier` | IATA 2-letter airline code |
| Flight Number | `.number` | Numeric flight number |
| Dep Airport | `.Departure.location` | IATA 3-letter airport |
| Dep Date | `.Departure.date` | `YYYY-MM-DD` |
| Dep Time | `.Departure.time` | `HH:MM` |
| Dep Terminal | `.Departure.terminal` | Terminal letter/number |
| Arr Airport | `.Arrival.location` | IATA 3-letter airport |
| Arr Date | `.Arrival.date` | `YYYY-MM-DD` |
| Arr Time | `.Arrival.time` | `HH:MM` |
| Arr Terminal | `.Arrival.terminal` | Terminal letter/number |
| Duration | `.duration` | ISO 8601 duration e.g. `"PT2H10M"` |
| Aircraft | `.equipment` | IATA aircraft type e.g. `"77W"` |
| Operating Carrier | `.operatingCarrier` | IATA code if codeshare |
| Operating Number | `.operatingFlightNumber` | Flight number if codeshare |

---

## Response: ReferenceListProduct → Product → FlightSegment

| Field | Path | Description |
|-------|------|-------------|
| Product ID | `.id` | Reference key for `productRef` |
| Segments | `.FlightSegment[]` | Array of segments (1 per connection point) |
| Flight Ref | `.FlightSegment[n].Flight.FlightRef` | Links to `flightMap` key |
| Cabin | `.FlightSegment[n].CabinAir` | `"Economy"` etc. |
| Booking Class | `.FlightSegment[n].BookingCode` | e.g. `"Y"`, `"J"` |
| Available Seats | `.FlightSegment[n].availableSeats` | Integer seat count |

---

## Response: ReferenceListBrand → Brand

| Field | Path | Description |
|-------|------|-------------|
| Brand ID | `.id` | Reference key |
| Brand Name | `.name` | e.g. `"Economy Light"` |
| Attributes | `.BrandAttribute[]` | Array of amenity inclusions |
| Attr Type | `.BrandAttribute[n].typeCode` | See amenity typeCodes in `07-response-parsing.md` |
| Attr Value | `.BrandAttribute[n].inclusion` | `"Included"` \| `"Chargeable"` \| `"NotOffered"` \| `"NotPermitted"` |
