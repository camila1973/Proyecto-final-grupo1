// Emits ISO YYYY-MM-DD dates 30/33 days in the future so flows always land
// inside the seeded inventory window (services/inventory-service/scripts/seed.ts
// publishes rates for the next several months).
function iso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const now = new Date();
const checkIn = new Date(now);
checkIn.setDate(now.getDate() + 30);
const checkOut = new Date(now);
checkOut.setDate(now.getDate() + 33);

output.CHECK_IN = iso(checkIn);
output.CHECK_OUT = iso(checkOut);
