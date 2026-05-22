# Travelport+ API — Response Parsing Guide

---

## Response Envelope

```json
{
  "CatalogProductOfferingsResponse": {
    "Identifier": {
      "value": "<UUID>"
    },
    "CatalogProductOffering": [ ... ],
    "ReferenceList": [ ... ]
  }
}
```

The top-level response has two critical sections:
1. **`CatalogProductOffering[]`** — The list of priced offers. Each offer contains IDs, **not** full details.
2. **`ReferenceList[]`** — Shared data: full flight details, products, brands, amenities, T&Cs. Offers refer here by ID.

---

## ReferenceList Types

`ReferenceList` is an array of heterogeneous typed objects. Filter by `@type`:

| `@type` | Content |
|---------|---------|
| `ReferenceListFlight` | Full flight details: carrier, flight number, departure/arrival airports, times, duration, aircraft type |
| `ReferenceListProduct` | Product objects: FlightSegment arrays linking products to their flights |
| `ReferenceListBrand` | Brand info: brand name, amenities list per brand |
| `ReferenceListTermsAndConditions` | Fare rules: refund/rebooking conditions |
| `ReferenceListAmenity` | Individual amenity definitions (CarryOn, CheckedBag, Meals, Wifi, etc.) |

---

## Step-by-Step Parsing

### Step 1: Build ID maps from ReferenceList

```javascript
const refs = response.CatalogProductOfferingsResponse?.ReferenceList ?? [];

const flightMap  = {};   // id → Flight object
const productMap = {};   // id → Product object
const brandMap   = {};   // id → Brand object
const amenityMap = {};   // id → Amenity object

for (const ref of refs) {
  switch (ref?.['@type']) {
    case 'ReferenceListFlight':
      for (const f of (ref.Flight ?? [])) flightMap[f.id] = f;
      break;
    case 'ReferenceListProduct':
      for (const p of (ref.Product ?? [])) productMap[p.id] = p;
      break;
    case 'ReferenceListBrand':
      for (const b of (ref.Brand ?? [])) brandMap[b.id] = b;
      break;
    case 'ReferenceListAmenity':
      for (const a of (ref.Amenity ?? [])) amenityMap[a.id] = a;
      break;
  }
}
```

### Step 2: Iterate offers

```javascript
const offers = response.CatalogProductOfferingsResponse?.CatalogProductOffering ?? [];

for (const offer of offers) {
  const offerIdentifier = offer.Identifier?.value;   // for AirPrice reference payload
  const price           = offer.Price;               // see Price structure below

  for (const pbo of (offer.ProductBrandOffering ?? [])) {
    const pboIdentifier = pbo.Identifier?.value;     // for AddOffer reference payload

    for (const prodRef of (pbo.Product ?? [])) {
      // productRef can be an ID string or an object with a productRef field
      const pid = prodRef.productRef ?? prodRef.id;
      const prod = productMap[pid];
      if (!prod) continue;

      for (const seg of (prod.FlightSegment ?? [])) {
        // FlightRef is nested inside seg.Flight
        const flightRef = seg?.Flight?.FlightRef;
        const flight = flightMap[flightRef];
        if (!flight) continue;

        // Full flight details now available:
        console.log({
          carrier:       flight.carrier,         // e.g., "EK"
          flightNumber:  flight.number,          // e.g., "601"
          depAirport:    flight.Departure?.location,
          depDate:       flight.Departure?.date,
          depTime:       flight.Departure?.time,
          arrAirport:    flight.Arrival?.location,
          arrDate:       flight.Arrival?.date,
          arrTime:       flight.Arrival?.time,
          duration:      flight.duration,         // ISO 8601 "PT3H30M"
          aircraftType:  flight.equipment,        // e.g., "77W"
          cabinType:     seg.CabinAir,           // "Economy" | "Business" etc.
          bookingClass:  seg.BookingCode,        // e.g., "Y"
          seatsAvailable: seg.availableSeats,
        });
      }
    }
  }
}
```

---

## Price Structure

```json
"Price": {
  "TotalPrice": {
    "value": 191.90,
    "currencyCode": "GBP"
  },
  "BasePrice": {
    "value": 160.00,
    "currencyCode": "GBP"
  },
  "Taxes": {
    "TaxBreakdown": [
      {
        "TaxCode": "YQ",
        "value": 25.00,
        "currencyCode": "GBP"
      }
    ],
    "TaxTotal": {
      "value": 31.90,
      "currencyCode": "GBP"
    }
  }
}
```

Access total price:
```javascript
const total    = offer.Price?.TotalPrice?.value;
const currency = offer.Price?.TotalPrice?.currencyCode;
```

---

## Flight Object Structure

```json
{
  "id": "f1",
  "carrier": "EK",
  "number": "601",
  "Departure": {
    "location": "KHI",
    "date": "2026-06-15",
    "time": "02:30",
    "terminal": "1"
  },
  "Arrival": {
    "location": "DXB",
    "date": "2026-06-15",
    "time": "04:40",
    "terminal": "3"
  },
  "duration": "PT2H10M",
  "equipment": "77W",
  "operatingCarrier": "EK",
  "operatingFlightNumber": "601"
}
```

Duration is ISO 8601 format. Parse with:
```javascript
function parseDuration(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  const h = parseInt(m?.[1] ?? '0');
  const min = parseInt(m?.[2] ?? '0');
  return `${h}h ${min}m`;
}
```

---

## Brand / Amenity Structure

```json
// In ReferenceListBrand
{
  "id": "b1",
  "name": "Economy Light",
  "BrandAttribute": [
    { "typeCode": "CarryOnAllowance",    "inclusion": "Included" },
    { "typeCode": "CheckedBagAllowance", "inclusion": "NotOffered" },
    { "typeCode": "SeatSelection",       "inclusion": "Chargeable" },
    { "typeCode": "Meals",               "inclusion": "NotOffered" },
    { "typeCode": "Rebooking",           "inclusion": "NotPermitted" },
    { "typeCode": "Refund",              "inclusion": "NotPermitted" },
    { "typeCode": "WiFi",                "inclusion": "NotOffered" }
  ]
}
```

`inclusion` values: `"Included"` | `"Chargeable"` | `"NotOffered"` | `"NotPermitted"`

---

## Common Amenity typeCodes

| typeCode | Description |
|----------|-------------|
| `CarryOnAllowance` | Hand luggage |
| `CheckedBagAllowance` | Hold luggage |
| `SeatSelection` | Seat selection fee |
| `Meals` | In-flight meals |
| `Rebooking` | Change fee |
| `Refund` | Refundability |
| `WiFi` | In-flight WiFi |
| `PremiumSeat` | Preferred/extra legroom seats |
| `LieFlatSeat` | Flat-bed seat (Business/First) |
| `PersonalItemAllowance` | Small personal item |
| `FastTrackSecurity` | Priority lane |
| `LoungeAccess` | Airport lounge |
| `Upgrades` | Upgrade eligibility |

---

## Identifier Flow for Subsequent Calls

After search, use these identifiers for AirPrice and booking:

```
CatalogProductOfferingsResponse
├── Identifier.value                     → "searchIdentifier" (for session/pagination)
└── CatalogProductOffering[n]
    ├── Identifier.value                 → "offerIdentifier" (for Flight Specific Search)
    └── ProductBrandOffering[n]
        └── Identifier.value             → "pboIdentifier" (for AirPrice reference payload)
```

AirPrice reference payload:
```json
POST /11/air/price/offers/buildfromcatalogproductofferings
{
  "PriceRequestAssociatedItems": [
    {
      "@type": "PriceRequestAssociatedItemsCatalogProductOffering",
      "CatalogProductOfferingIdentifier": {
        "value": "<pboIdentifier>"
      }
    }
  ],
  "CatalogProductOfferingsIdentifier": {
    "value": "<searchIdentifier>"
  }
}
```

**Important:** Journey-based searches only have cached results if `offersPerPage` was set in the search. Without it, the AirPrice reference payload will fail.

---

## Safe Rendering (XSS Prevention)

All data from the API is user-visible. Escape before inserting into DOM:

```javascript
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// WRONG — XSS risk:
div.innerHTML = `<span>${flight.carrier}${flight.number}</span>`;

// RIGHT — safe:
const span = document.createElement('span');
span.textContent = `${flight.carrier}${flight.number}`;
div.appendChild(span);

// Or with esc() if you need innerHTML for structure:
div.innerHTML = `<span>${esc(flight.carrier)}${esc(flight.number)}</span>`;
```
