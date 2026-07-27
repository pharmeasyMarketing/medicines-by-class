# Live pricing / availability API — required contract

The static pages carry everything **except** commercial state. Price, offer, stock and
sale-status come from one API call per page render.

## 1. Batch endpoint (required)

One call per page, not one per card. A class page renders 12 cards; 12 requests is not viable.

```
POST https://api.pharmeasy.in/v1/catalog/commerce-state
Content-Type: application/json

{
  "skus": ["PE-100001", "PE-100002", "..."],
  "pincode": "400001"          // optional; omit for a national default
}
```

### Response

```jsonc
{
  "asOf": "2026-07-27T09:14:22Z",
  "pincode": "400001",
  "items": [
    {
      "sku": "PE-100001",
      "mrp": 32.50,
      "bestOffer": 27.60,          // the price actually charged
      "discountPct": 15,           // server-computed, don't make the client round
      "savings": 4.90,
      "currency": "INR",
      "availability": "InStock",   // InStock | OutOfStock | Discontinued | NotServiceable | NotSold
      "deliveryEta": "Tomorrow, 8 AM",
      "substituteAvailable": true,
      "maxQty": 5,
      "prescriptionRequired": true
    }
  ],
  "missing": ["PE-999999"]        // SKUs the API doesn't recognise
}
```

### Non-negotiables

| Requirement | Why |
|---|---|
| `Access-Control-Allow-Origin` for the page's domain | pages are static; the call is browser-side |
| `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` | crawler + user traffic will hammer this otherwise |
| p95 under 300 ms for 25 SKUs | it runs on every page view |
| Returns 200 with partial data rather than 5xx on downstream failure | one dead SKU must not blank the whole grid |
| `availability` is an enum, never free text | it drives both UI and schema.org mapping |

### Availability → schema.org mapping

| API value | schema.org | Card UI |
|---|---|---|
| `InStock` | `https://schema.org/InStock` | price + Add button |
| `OutOfStock` | `https://schema.org/OutOfStock` | price + "Notify me" |
| `Discontinued` | `https://schema.org/Discontinued` | no price, "Discontinued" |
| `NotServiceable` | `https://schema.org/InStoreOnly` | "Not deliverable to 400001" |
| `NotSold` | *omit Offer entirely* | card hidden from the grid |

`NotSold` items must be **excluded from the build**, not just hidden client-side — otherwise
Google indexes a page advertising a product you don't sell.

## 2. Build-time snapshot (strongly recommended)

The same endpoint is called once during the nightly build and the result is **baked into the
HTML**. The client call then refreshes it in place.

Why both:

- **Crawlers see real prices.** A client-only fetch means Googlebot may index cards with empty
  price blocks. That is a thin-content signal on a page whose whole purpose is commercial intent.
- **No layout shift.** The price block is already filled at first paint; the refresh swaps text
  inside a fixed-height box.
- **API downtime degrades to yesterday's price, not to blanks.**

Guardrails, because this is a pharmacy and PharmEasy publishes a Declaration on Dark Patterns:

- Snapshot is never more than 24 h old, and the build fails if the API was unreachable twice running.
- The client refresh is not optional — if it fails, the price block shows "Checking price…" and
  the Add button is disabled. A stale price must never be transactable.
- The Add-to-cart handoff re-validates against live price on the destination PDP.

## 3. What the API must NOT own

Keep these in the sheets, not the API — they are editorial and need review before they change:

- class membership (`class_ids`)
- sub-class assignment
- `rx_required`
- display name, composition string, pack size

If these come from the API, a catalogue change silently rewrites indexed page content with no
editorial gate.
