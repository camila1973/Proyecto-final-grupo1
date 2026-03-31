# Search-Service — Remove `room_booked_ranges`

> **Why:** `room_booked_ranges` only captured confirmed bookings as date ranges.
> It missed held rooms, partner blocks, and per-date capacity overrides —
> making it an incomplete and stale copy of availability state that
> inventory-service already owns authoritatively.
> search-service will call inventory-service once per search instead.

---

## What Exists Today

### The table (`database/database.types.ts`)
```typescript
RoomBookedRangesTable: {
  room_id: string;
  from_date: string;
  to_date: string;
}
```

### How it's used (`properties/properties.service.ts`)
The main search query uses a `NOT EXISTS` subquery against `room_booked_ranges` to exclude rooms that have a booking overlapping the requested check-in/check-out dates:

```sql
-- current: bakes availability into the candidate query
SELECT ... FROM room_search_index rsi
WHERE rsi.city ILIKE :city
  AND rsi.capacity >= :guests
  AND NOT EXISTS (
    SELECT 1 FROM room_booked_ranges rbr
    WHERE rbr.room_id = rsi.room_id
      AND rbr.from_date < :checkOut
      AND rbr.to_date   > :checkIn
  )
```

### Why this is insufficient
- Does not reflect `held_rooms` — rooms in active carts appear available
- Does not reflect partner blocks (maintenance, remodeling)
- Does not reflect per-date capacity (a room type with 30 units only becomes fully unavailable when all 30 are booked — `room_booked_ranges` has no concept of quantity)
- Requires a separate sync mechanism to stay current — currently no handler populates it

---

## Changes Required

### 1. `database/database.types.ts`
Remove the `RoomBookedRangesTable` type and drop it from the `Database` interface.

```typescript
// Remove this type entirely
RoomBookedRangesTable: {
  room_id: string;
  from_date: string;
  to_date: string;
}

// Remove from Database interface
export interface Database {
  room_search_index: RoomSearchIndexTable;
  room_price_periods: RoomPricePeriodsTable;
  taxonomy_categories: TaxonomyCategoryTable;
  taxonomy_values: TaxonomyValueTable;
  // room_booked_ranges removed
}
```

### 2. `database/database.service.ts`
Drop the `room_booked_ranges` table from the schema initialisation (if present in `onModuleInit`).

### 3. `properties/properties.service.ts`
**Remove** the `NOT EXISTS` booked-range check from the candidate query.

**Add** a call to inventory-service after fetching candidates to filter by live availability:

```typescript
// After fetching candidates from room_search_index:
const candidateIds = candidates.map(r => r.room_id);

const available = await this.inventoryClient.checkAvailability({
  roomIds: candidateIds,
  fromDate: dto.checkIn,
  toDate:   dto.checkOut,
});

const availableIds = new Set(available.map(r => r.roomId));
const filtered = candidates.filter(r => availableIds.has(r.room_id));
```

The call targets `GET /internal/availability?room_ids=...&from_date=X&to_date=Y` on inventory-service (port 3003). One HTTP call per search, not one per room.

### 4. New file: `inventory/inventory-client.service.ts`
A lightweight HTTP client scoped to the availability contract with inventory-service.

```typescript
@Injectable()
export class InventoryClientService {
  private readonly baseUrl = process.env.INVENTORY_SERVICE_URL;
  private readonly token  = process.env.INTERNAL_TOKEN;

  async checkAvailability(params: {
    roomIds:  string[];
    fromDate: string;
    toDate:   string;
  }): Promise<Array<{ roomId: string }>> {
    const url = new URL(`${this.baseUrl}/internal/availability`);
    url.searchParams.set('room_ids',  params.roomIds.join(','));
    url.searchParams.set('from_date', params.fromDate);
    url.searchParams.set('to_date',   params.toDate);

    const res = await fetch(url.toString(), {
      headers: { 'X-Internal-Token': this.token },
    });

    if (!res.ok) throw new Error(`inventory availability check failed: ${res.status}`);
    return res.json();
  }
}
```

Register in a new `inventory/inventory.module.ts`, import into `PropertiesModule`.

### 5. `events/handlers/availability-updated.handler.ts`
This handler currently listens to `inventory.availability.updated` and updates `room_price_periods`. It has nothing to do with `room_booked_ranges` — it handles seasonal pricing and stays unchanged.

Review the routing key name to ensure it matches what inventory-service now publishes (`price.updated`). If the key has changed, update the subscription in `events/events.service.ts`.

### 6. No new event handler needed
There is no replacement event handler for booked ranges. availability is read on demand from inventory-service per search, so there is no state to maintain and nothing to subscribe to.

---

## Search Flow: Before vs After

**Before**
```
GET /properties?city=Cali&checkIn=...&checkOut=...
  └── DB query: room_search_index
        + NOT EXISTS room_booked_ranges  ← baked-in, stale, incomplete
      → ranked results returned
```

**After**
```
GET /properties?city=Cali&checkIn=...&checkOut=...
  └── Step 1: DB query room_search_index (city, capacity, amenities, price)
        → candidate room IDs
  └── Step 2: GET inventory-service /internal/availability?room_ids=...
        → which of those IDs are actually available (held + reserved + blocked)
  └── Step 3: filter candidates to available set → ranked results returned
```

---

## Files Changed

| File | Change |
|---|---|
| `database/database.types.ts` | Remove `RoomBookedRangesTable`, remove from `Database` interface |
| `database/database.service.ts` | Drop `room_booked_ranges` table creation if present |
| `properties/properties.service.ts` | Remove NOT EXISTS clause; add inventory availability call |
| `properties/properties.module.ts` | Import `InventoryModule` |
| `inventory/inventory-client.service.ts` | **New** — HTTP client for availability check |
| `inventory/inventory.module.ts` | **New** — module registering the client |
| `events/events.service.ts` | Verify routing key for price.updated subscription |

---

## Environment Variable Added

```bash
INVENTORY_SERVICE_URL=http://inventory-service:3003
INTERNAL_TOKEN=...   # shared with inventory-service
```

---

## Tests to Update

- `properties/properties.service.spec.ts` — remove test cases that mock `room_booked_ranges`; add test cases for the inventory availability call (mock `InventoryClientService`)
- `database/database.service.spec.ts` — remove any schema assertion for `room_booked_ranges`
