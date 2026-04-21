import { Kysely, PostgresDialect, sql } from "kysely";
import { Pool } from "pg";
import type { SearchDatabase } from "../src/database/database.types.js";

const db = new Kysely<SearchDatabase>({
  dialect: new PostgresDialect({
    pool: new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgres://postgres:postgres@localhost:5433/search_service",
    }),
  }),
});

// ─── UUIDs ────────────────────────────────────────────────────────────────────

const PARTNER_1 = "a1000000-0000-0000-0000-000000000001";
const PARTNER_2 = "a1000000-0000-0000-0000-000000000002";

const PROP_CANCUN_1 = "b1000000-0000-0000-0000-000000000001";
const PROP_CANCUN_2 = "b1000000-0000-0000-0000-000000000002";
const PROP_CANCUN_3 = "b1000000-0000-0000-0000-000000000003";
const PROP_CDMX_1 = "b1000000-0000-0000-0000-000000000004";
const PROP_CDMX_2 = "b1000000-0000-0000-0000-000000000005";

const ROOM = (n: number) =>
  `c1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("Truncating tables...");
  await sql`TRUNCATE room_price_periods, room_search_index, taxonomy_values, taxonomy_categories RESTART IDENTITY CASCADE`.execute(
    db,
  );

  // ── Taxonomy categories ───────────────────────────────────────────────────
  console.log("Seeding taxonomy_categories...");
  const categories = await db
    .insertInto("taxonomy_categories")
    .values([
      {
        code: "amenities",
        label: "Amenities",
        filter_type: "multi",
        display_order: 1,
        is_active: true,
      },
      {
        code: "room_type",
        label: "Room Type",
        filter_type: "single",
        display_order: 2,
        is_active: true,
      },
      {
        code: "bed_type",
        label: "Bed Type",
        filter_type: "single",
        display_order: 3,
        is_active: true,
      },
      {
        code: "view_type",
        label: "View Type",
        filter_type: "single",
        display_order: 4,
        is_active: true,
      },
    ])
    .returning(["id", "code"])
    .execute();

  const catId = (code: string) => categories.find((c) => c.code === code)!.id;

  // ── Taxonomy values ───────────────────────────────────────────────────────
  console.log("Seeding taxonomy_values...");
  await db
    .insertInto("taxonomy_values")
    .values([
      // amenities
      {
        category_id: catId("amenities"),
        code: "pool",
        label: "Pool",
        display_order: 1,
      },
      {
        category_id: catId("amenities"),
        code: "wifi",
        label: "Free WiFi",
        display_order: 2,
      },
      {
        category_id: catId("amenities"),
        code: "parking",
        label: "Parking",
        display_order: 3,
      },
      {
        category_id: catId("amenities"),
        code: "gym",
        label: "Gym",
        display_order: 4,
      },
      {
        category_id: catId("amenities"),
        code: "spa",
        label: "Spa",
        display_order: 5,
      },
      {
        category_id: catId("amenities"),
        code: "restaurant",
        label: "Restaurant",
        display_order: 6,
      },
      {
        category_id: catId("amenities"),
        code: "breakfast",
        label: "Breakfast",
        display_order: 7,
      },
      {
        category_id: catId("amenities"),
        code: "ac",
        label: "Air Conditioning",
        display_order: 8,
      },
      {
        category_id: catId("amenities"),
        code: "pet_friendly",
        label: "Pet Friendly",
        display_order: 9,
      },
      {
        category_id: catId("amenities"),
        code: "beach_access",
        label: "Beach Access",
        display_order: 10,
      },
      // room_type
      {
        category_id: catId("room_type"),
        code: "standard",
        label: "Standard",
        display_order: 1,
      },
      {
        category_id: catId("room_type"),
        code: "deluxe",
        label: "Deluxe",
        display_order: 2,
      },
      {
        category_id: catId("room_type"),
        code: "suite",
        label: "Suite",
        display_order: 3,
      },
      {
        category_id: catId("room_type"),
        code: "junior_suite",
        label: "Junior Suite",
        display_order: 4,
      },
      {
        category_id: catId("room_type"),
        code: "penthouse",
        label: "Penthouse",
        display_order: 5,
      },
      // bed_type
      {
        category_id: catId("bed_type"),
        code: "single",
        label: "Single",
        display_order: 1,
      },
      {
        category_id: catId("bed_type"),
        code: "twin",
        label: "Twin",
        display_order: 2,
      },
      {
        category_id: catId("bed_type"),
        code: "double",
        label: "Double",
        display_order: 3,
      },
      {
        category_id: catId("bed_type"),
        code: "queen",
        label: "Queen",
        display_order: 4,
      },
      {
        category_id: catId("bed_type"),
        code: "king",
        label: "King",
        display_order: 5,
      },
      // view_type
      {
        category_id: catId("view_type"),
        code: "garden",
        label: "Garden View",
        display_order: 1,
      },
      {
        category_id: catId("view_type"),
        code: "city",
        label: "City View",
        display_order: 2,
      },
      {
        category_id: catId("view_type"),
        code: "ocean",
        label: "Ocean View",
        display_order: 3,
      },
      {
        category_id: catId("view_type"),
        code: "mountain",
        label: "Mountain View",
        display_order: 4,
      },
      {
        category_id: catId("view_type"),
        code: "pool_view",
        label: "Pool View",
        display_order: 5,
      },
    ])
    .execute();

  // ── room_search_index ─────────────────────────────────────────────────────
  console.log("Seeding room_search_index...");
  await db
    .insertInto("room_search_index")
    .values([
      // ── Cancún: Gran Caribe Resort (5★) ──────────────────────────────────
      // tax_rate_pct: MX IVA 16% + Cancún ISH 3% = 19%
      // flat_fee_per_night_usd: Partner 1 Resort Fee $25/night
      {
        room_id: ROOM(1),
        property_id: PROP_CANCUN_1,
        partner_id: PARTNER_1,
        property_name: "Gran Caribe Resort & Spa",
        city: "Cancún",
        country: "MX",
        neighborhood: "Zona Hotelera",
        lat: 21.1619,
        lon: -86.8515,
        room_type: "deluxe",
        bed_type: "king",
        view_type: "ocean",
        capacity: 2,
        amenities: [
          "pool",
          "wifi",
          "spa",
          "restaurant",
          "breakfast",
          "ac",
          "beach_access",
          "gym",
        ],
        base_price_usd: "320.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "25.00",
        flat_fee_per_stay_usd: "0.00",
        stars: 5,
        rating: "4.7",
        review_count: 842,
        thumbnail_url: "https://placehold.co/400x300?text=Gran+Caribe",
      },
      {
        room_id: ROOM(2),
        property_id: PROP_CANCUN_1,
        partner_id: PARTNER_1,
        property_name: "Gran Caribe Resort & Spa",
        city: "Cancún",
        country: "MX",
        neighborhood: "Zona Hotelera",
        lat: 21.1619,
        lon: -86.8515,
        room_type: "suite",
        bed_type: "king",
        view_type: "ocean",
        capacity: 4,
        amenities: [
          "pool",
          "wifi",
          "spa",
          "restaurant",
          "breakfast",
          "ac",
          "beach_access",
          "gym",
        ],
        base_price_usd: "580.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "25.00",
        flat_fee_per_stay_usd: "0.00",
        stars: 5,
        rating: "4.7",
        review_count: 842,
        thumbnail_url: "https://placehold.co/400x300?text=Gran+Caribe",
      },
      // ── Cancún: Playa Azul Hotel (4★) ────────────────────────────────────
      {
        room_id: ROOM(3),
        property_id: PROP_CANCUN_2,
        partner_id: PARTNER_1,
        property_name: "Playa Azul Hotel",
        city: "Cancún",
        country: "MX",
        neighborhood: "Zona Hotelera",
        lat: 21.1502,
        lon: -86.8437,
        room_type: "standard",
        bed_type: "queen",
        view_type: "pool",
        capacity: 2,
        amenities: ["pool", "wifi", "ac", "restaurant", "parking"],
        base_price_usd: "145.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "25.00",
        flat_fee_per_stay_usd: "0.00",
        stars: 4,
        rating: "4.2",
        review_count: 519,
        thumbnail_url: "https://placehold.co/400x300?text=Playa+Azul",
      },
      {
        room_id: ROOM(4),
        property_id: PROP_CANCUN_2,
        partner_id: PARTNER_1,
        property_name: "Playa Azul Hotel",
        city: "Cancún",
        country: "MX",
        neighborhood: "Zona Hotelera",
        lat: 21.1502,
        lon: -86.8437,
        room_type: "deluxe",
        bed_type: "king",
        view_type: "ocean",
        capacity: 2,
        amenities: [
          "pool",
          "wifi",
          "ac",
          "restaurant",
          "parking",
          "beach_access",
        ],
        base_price_usd: "195.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "25.00",
        flat_fee_per_stay_usd: "0.00",
        stars: 4,
        rating: "4.2",
        review_count: 519,
        thumbnail_url: "https://placehold.co/400x300?text=Playa+Azul",
      },
      {
        room_id: ROOM(5),
        property_id: PROP_CANCUN_2,
        partner_id: PARTNER_1,
        property_name: "Playa Azul Hotel",
        city: "Cancún",
        country: "MX",
        neighborhood: "Zona Hotelera",
        lat: 21.1502,
        lon: -86.8437,
        room_type: "junior_suite",
        bed_type: "king",
        view_type: "ocean",
        capacity: 3,
        amenities: [
          "pool",
          "wifi",
          "ac",
          "restaurant",
          "parking",
          "beach_access",
          "spa",
        ],
        base_price_usd: "265.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "25.00",
        flat_fee_per_stay_usd: "0.00",
        stars: 4,
        rating: "4.2",
        review_count: 519,
        thumbnail_url: "https://placehold.co/400x300?text=Playa+Azul",
      },
      // ── Cancún: Hostal Sol (3★) ───────────────────────────────────────────
      // flat_fee_per_stay_usd: Partner 2 Cleaning Fee $15/stay
      {
        room_id: ROOM(6),
        property_id: PROP_CANCUN_3,
        partner_id: PARTNER_2,
        property_name: "Hostal Sol Cancún",
        city: "Cancún",
        country: "MX",
        neighborhood: "Downtown",
        lat: 21.1743,
        lon: -86.8466,
        room_type: "standard",
        bed_type: "double",
        view_type: "city",
        capacity: 2,
        amenities: ["wifi", "ac", "parking"],
        base_price_usd: "65.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "0.00",
        flat_fee_per_stay_usd: "15.00",
        stars: 3,
        rating: "3.8",
        review_count: 204,
        thumbnail_url: "https://placehold.co/400x300?text=Hostal+Sol",
      },
      {
        room_id: ROOM(7),
        property_id: PROP_CANCUN_3,
        partner_id: PARTNER_2,
        property_name: "Hostal Sol Cancún",
        city: "Cancún",
        country: "MX",
        neighborhood: "Downtown",
        lat: 21.1743,
        lon: -86.8466,
        room_type: "standard",
        bed_type: "twin",
        view_type: "garden",
        capacity: 2,
        amenities: ["wifi", "ac"],
        base_price_usd: "55.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "0.00",
        flat_fee_per_stay_usd: "15.00",
        stars: 3,
        rating: "3.8",
        review_count: 204,
        thumbnail_url: "https://placehold.co/400x300?text=Hostal+Sol",
      },
      // ── CDMX: Hotel Histórico (5★) ────────────────────────────────────────
      // tax_rate_pct: MX IVA 16% + CDMX ISH 3% = 19%
      // flat_fee_per_stay_usd: Partner 2 Cleaning Fee $15/stay
      {
        room_id: ROOM(8),
        property_id: PROP_CDMX_1,
        partner_id: PARTNER_2,
        property_name: "Hotel Histórico Centro",
        city: "Ciudad de México",
        country: "MX",
        neighborhood: "Centro Histórico",
        lat: 19.4326,
        lon: -99.1332,
        room_type: "deluxe",
        bed_type: "king",
        view_type: "city",
        capacity: 2,
        amenities: [
          "wifi",
          "gym",
          "spa",
          "restaurant",
          "breakfast",
          "ac",
          "parking",
        ],
        base_price_usd: "280.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "0.00",
        flat_fee_per_stay_usd: "15.00",
        stars: 5,
        rating: "4.6",
        review_count: 631,
        thumbnail_url: "https://placehold.co/400x300?text=Hotel+Historico",
      },
      {
        room_id: ROOM(9),
        property_id: PROP_CDMX_1,
        partner_id: PARTNER_2,
        property_name: "Hotel Histórico Centro",
        city: "Ciudad de México",
        country: "MX",
        neighborhood: "Centro Histórico",
        lat: 19.4326,
        lon: -99.1332,
        room_type: "penthouse",
        bed_type: "king",
        view_type: "city",
        capacity: 4,
        amenities: [
          "wifi",
          "gym",
          "spa",
          "restaurant",
          "breakfast",
          "ac",
          "parking",
          "pet_friendly",
        ],
        base_price_usd: "650.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "0.00",
        flat_fee_per_stay_usd: "15.00",
        stars: 5,
        rating: "4.6",
        review_count: 631,
        thumbnail_url: "https://placehold.co/400x300?text=Hotel+Historico",
      },
      // ── CDMX: Condesa Inn (4★) ────────────────────────────────────────────
      {
        room_id: ROOM(10),
        property_id: PROP_CDMX_2,
        partner_id: PARTNER_2,
        property_name: "Condesa Inn",
        city: "Ciudad de México",
        country: "MX",
        neighborhood: "Condesa",
        lat: 19.4118,
        lon: -99.1718,
        room_type: "standard",
        bed_type: "queen",
        view_type: "garden",
        capacity: 2,
        amenities: ["wifi", "breakfast", "ac", "pet_friendly"],
        base_price_usd: "110.00",
        tax_rate_pct: "19.0000",
        flat_fee_per_night_usd: "0.00",
        flat_fee_per_stay_usd: "15.00",
        stars: 4,
        rating: "4.4",
        review_count: 387,
        thumbnail_url: "https://placehold.co/400x300?text=Condesa+Inn",
      },
    ])
    .execute();

  // ── room_price_periods ────────────────────────────────────────────────────
  // Seasonal pricing periods. Rooms are available by default; only explicit
  // bookings (room_booked_ranges) exclude them from search results.
  console.log("Seeding room_price_periods...");

  // Per-room seasonal price map: [low_season, high_season (Jul-Aug), shoulder]
  const pricePeriods: Array<{
    room_id: string;
    from_date: string;
    to_date: string;
    price_usd: string;
  }> = [
    // ROOM 1 – Gran Caribe Resort & Spa, deluxe king ocean
    {
      room_id: ROOM(1),
      from_date: "2027-01-01",
      to_date: "2027-06-30",
      price_usd: "310.00",
    },
    {
      room_id: ROOM(1),
      from_date: "2027-07-01",
      to_date: "2027-08-31",
      price_usd: "370.00",
    },
    {
      room_id: ROOM(1),
      from_date: "2027-09-01",
      to_date: "2027-12-31",
      price_usd: "330.00",
    },
    // ROOM 2 – Gran Caribe Resort & Spa, suite king ocean
    {
      room_id: ROOM(2),
      from_date: "2027-01-01",
      to_date: "2027-06-30",
      price_usd: "560.00",
    },
    {
      room_id: ROOM(2),
      from_date: "2027-07-01",
      to_date: "2027-08-31",
      price_usd: "650.00",
    },
    {
      room_id: ROOM(2),
      from_date: "2027-09-01",
      to_date: "2027-12-31",
      price_usd: "590.00",
    },
    // ROOM 3 – Playa Azul Hotel, standard queen pool
    {
      room_id: ROOM(3),
      from_date: "2027-01-01",
      to_date: "2027-12-31",
      price_usd: "135.00",
    },
    // ROOM 4 – Playa Azul Hotel, deluxe king ocean
    {
      room_id: ROOM(4),
      from_date: "2027-01-01",
      to_date: "2027-06-30",
      price_usd: "185.00",
    },
    {
      room_id: ROOM(4),
      from_date: "2027-07-01",
      to_date: "2027-08-31",
      price_usd: "220.00",
    },
    {
      room_id: ROOM(4),
      from_date: "2027-09-01",
      to_date: "2027-12-31",
      price_usd: "195.00",
    },
    // ROOM 5 – Playa Azul Hotel, junior suite king ocean
    {
      room_id: ROOM(5),
      from_date: "2027-01-01",
      to_date: "2027-12-31",
      price_usd: "250.00",
    },
    // ROOM 6 – Hostal Sol Cancún, standard double city
    {
      room_id: ROOM(6),
      from_date: "2027-01-01",
      to_date: "2027-12-31",
      price_usd: "60.00",
    },
    // ROOM 7 – Hostal Sol Cancún, standard twin garden
    {
      room_id: ROOM(7),
      from_date: "2027-01-01",
      to_date: "2027-12-31",
      price_usd: "50.00",
    },
    // ROOM 8 – Hotel Histórico Centro, deluxe king city
    {
      room_id: ROOM(8),
      from_date: "2027-01-01",
      to_date: "2027-06-30",
      price_usd: "270.00",
    },
    {
      room_id: ROOM(8),
      from_date: "2027-07-01",
      to_date: "2027-08-31",
      price_usd: "320.00",
    },
    {
      room_id: ROOM(8),
      from_date: "2027-09-01",
      to_date: "2027-12-31",
      price_usd: "285.00",
    },
    // ROOM 9 – Hotel Histórico Centro, penthouse king city
    {
      room_id: ROOM(9),
      from_date: "2027-01-01",
      to_date: "2027-12-31",
      price_usd: "620.00",
    },
    // ROOM 10 – Condesa Inn, standard queen garden
    {
      room_id: ROOM(10),
      from_date: "2027-01-01",
      to_date: "2027-12-31",
      price_usd: "105.00",
    },
  ];

  await db.insertInto("room_price_periods").values(pricePeriods).execute();

  // ── property media + descriptions ────────────────────────────────────────
  // CloudFront-style host to simulate the production media pipeline. Images
  // are served async by the frontend carousel so the HTML shell is not
  // blocked by large payloads.
  const CDN = "https://media.travelhub.example/cdn-cgi/images";
  const img = (key: string) => `${CDN}/q-85,w-1600/properties/${key}.jpg`;

  type PropertyMedia = {
    id: string;
    images: string[];
    description: Record<string, string>;
  };

  const propertyMedia: PropertyMedia[] = [
    {
      id: PROP_CANCUN_1,
      images: [
        img("gran-caribe-1"),
        img("gran-caribe-2"),
        img("gran-caribe-3"),
        img("gran-caribe-4"),
        img("gran-caribe-5"),
      ],
      description: {
        es: "Gran Caribe Resort & Spa se encuentra frente a las turquesas playas de la Zona Hotelera de Cancún, a pocos pasos del mar Caribe. Ofrece cinco restaurantes, spa de servicio completo, tres piscinas y habitaciones con vista al océano.",
        en: "Gran Caribe Resort & Spa sits directly on the turquoise beaches of Cancún's Hotel Zone, steps from the Caribbean Sea. It offers five restaurants, a full-service spa, three pools and rooms with ocean views.",
        pt: "O Gran Caribe Resort & Spa fica em frente às praias turquesa da Zona Hoteleira de Cancún, a poucos passos do Mar do Caribe. Oferece cinco restaurantes, spa completo, três piscinas e quartos com vista para o oceano.",
        fr: "Le Gran Caribe Resort & Spa se trouve directement sur les plages turquoise de la Zone Hôtelière de Cancún, à quelques pas de la mer des Caraïbes. Il propose cinq restaurants, un spa complet, trois piscines et des chambres avec vue sur l'océan.",
        it: "Il Gran Caribe Resort & Spa si trova direttamente sulle spiagge turchesi della Zona Alberghiera di Cancún, a pochi passi dal Mar dei Caraibi. Offre cinque ristoranti, una spa completa, tre piscine e camere vista oceano.",
        de: "Das Gran Caribe Resort & Spa liegt direkt an den türkisfarbenen Stränden der Hotelzone von Cancún, wenige Schritte vom Karibischen Meer entfernt. Es bietet fünf Restaurants, ein Full-Service-Spa, drei Pools und Zimmer mit Meerblick.",
      },
    },
    {
      id: PROP_CANCUN_2,
      images: [
        img("playa-azul-1"),
        img("playa-azul-2"),
        img("playa-azul-3"),
        img("playa-azul-4"),
      ],
      description: {
        es: "Playa Azul Hotel está muy bien situado en Zona Hotelera, Cancún, a 3,4 km del centro comercial La Isla y a 7 km del Centro Internacional de Negocios y Exposiciones. Sus huéspedes disfrutan de piscina al aire libre y desayuno buffet.",
        en: "Playa Azul Hotel is very well located in Cancún's Hotel Zone, 3.4 km from La Isla mall and 7 km from the International Business & Exhibition Center. Guests enjoy an outdoor pool and a buffet breakfast.",
        pt: "O Playa Azul Hotel está muito bem localizado na Zona Hoteleira de Cancún, a 3,4 km do shopping La Isla e a 7 km do Centro Internacional de Negócios e Exposições. Os hóspedes desfrutam de piscina ao ar livre e café da manhã buffet.",
        fr: "Le Playa Azul Hotel est très bien situé dans la Zone Hôtelière de Cancún, à 3,4 km du centre commercial La Isla et à 7 km du Centre International des Affaires et Expositions. Les clients profitent d'une piscine extérieure et d'un petit-déjeuner buffet.",
        it: "Il Playa Azul Hotel è molto ben posizionato nella Zona Alberghiera di Cancún, a 3,4 km dal centro commerciale La Isla e a 7 km dal Centro Internazionale Affari ed Esposizioni. Gli ospiti possono godere di una piscina all'aperto e di una colazione a buffet.",
        de: "Das Playa Azul Hotel liegt sehr gut in der Hotelzone von Cancún, 3,4 km vom Einkaufszentrum La Isla und 7 km vom Internationalen Geschäfts- und Ausstellungszentrum entfernt. Gäste genießen einen Außenpool und ein Frühstücksbuffet.",
      },
    },
    {
      id: PROP_CANCUN_3,
      images: [img("hostal-sol-1"), img("hostal-sol-2"), img("hostal-sol-3")],
      description: {
        es: "Hostal Sol Cancún ofrece alojamiento económico en el downtown de Cancún, ideal para mochileros y viajeros de presupuesto. Cuenta con WiFi gratuito, aire acondicionado y estacionamiento privado.",
        en: "Hostal Sol Cancún offers budget-friendly lodging in downtown Cancún, ideal for backpackers and budget travelers. It features free WiFi, air conditioning and private parking.",
        pt: "O Hostal Sol Cancún oferece hospedagem econômica no centro de Cancún, ideal para mochileiros e viajantes com orçamento reduzido. Possui WiFi gratuito, ar-condicionado e estacionamento privativo.",
        fr: "Hostal Sol Cancún propose un hébergement économique dans le centre-ville de Cancún, idéal pour les routards et les voyageurs à petit budget. Il propose le WiFi gratuit, la climatisation et un parking privé.",
        it: "Hostal Sol Cancún offre alloggi economici nel centro di Cancún, ideali per backpacker e viaggiatori con budget ridotto. Dispone di WiFi gratuito, aria condizionata e parcheggio privato.",
        de: "Hostal Sol Cancún bietet eine günstige Unterkunft im Zentrum von Cancún, ideal für Rucksacktouristen und Sparfüchse. Es verfügt über kostenloses WLAN, Klimaanlage und privaten Parkplatz.",
      },
    },
    {
      id: PROP_CDMX_1,
      images: [
        img("historico-1"),
        img("historico-2"),
        img("historico-3"),
        img("historico-4"),
        img("historico-5"),
      ],
      description: {
        es: "Hotel Histórico Centro ocupa un edificio colonial del siglo XVIII en el corazón del Centro Histórico de la Ciudad de México, a pocos pasos del Zócalo y el Palacio de Bellas Artes. Ofrece spa, gimnasio y restaurante gourmet.",
        en: "Hotel Histórico Centro occupies an 18th-century colonial building in the heart of Mexico City's Historic Center, steps from the Zócalo and the Palacio de Bellas Artes. It offers a spa, gym and gourmet restaurant.",
        pt: "O Hotel Histórico Centro ocupa um edifício colonial do século XVIII no coração do Centro Histórico da Cidade do México, a poucos passos do Zócalo e do Palácio de Belas Artes. Oferece spa, academia e restaurante gourmet.",
        fr: "L'Hotel Histórico Centro occupe un bâtiment colonial du XVIIIe siècle au cœur du Centre Historique de Mexico, à quelques pas du Zócalo et du Palacio de Bellas Artes. Il propose un spa, une salle de sport et un restaurant gastronomique.",
        it: "L'Hotel Histórico Centro occupa un edificio coloniale del XVIII secolo nel cuore del Centro Storico di Città del Messico, a pochi passi dallo Zócalo e dal Palacio de Bellas Artes. Offre spa, palestra e ristorante gourmet.",
        de: "Das Hotel Histórico Centro befindet sich in einem kolonialen Gebäude aus dem 18. Jahrhundert im Herzen des historischen Zentrums von Mexiko-Stadt, nur wenige Schritte vom Zócalo und dem Palacio de Bellas Artes entfernt. Es bietet Spa, Fitnessstudio und Gourmet-Restaurant.",
      },
    },
    {
      id: PROP_CDMX_2,
      images: [img("condesa-1"), img("condesa-2"), img("condesa-3")],
      description: {
        es: "Condesa Inn es un hotel boutique en el barrio bohemio de la Condesa, rodeado de cafés, galerías y parques. Admite mascotas y sirve desayuno continental incluido.",
        en: "Condesa Inn is a boutique hotel in the bohemian Condesa neighborhood, surrounded by cafés, galleries and parks. It is pet-friendly and serves a complimentary continental breakfast.",
        pt: "O Condesa Inn é um hotel boutique no boêmio bairro da Condesa, cercado por cafés, galerias e parques. Aceita animais de estimação e serve café da manhã continental incluso.",
        fr: "Condesa Inn est un hôtel-boutique dans le quartier bohème de Condesa, entouré de cafés, galeries et parcs. Il accepte les animaux de compagnie et sert un petit-déjeuner continental offert.",
        it: "Il Condesa Inn è un boutique hotel nel quartiere bohémien della Condesa, circondato da caffè, gallerie e parchi. Accetta animali domestici e serve una colazione continentale inclusa.",
        de: "Das Condesa Inn ist ein Boutique-Hotel im bohèmehaften Viertel Condesa, umgeben von Cafés, Galerien und Parks. Haustiere sind erlaubt, und ein kontinentales Frühstück ist inklusive.",
      },
    },
  ];

  console.log("Enriching properties with images + descriptions...");
  for (const m of propertyMedia) {
    await db
      .updateTable("room_search_index")
      .set({
        image_urls: m.images,
        description: m.description,
      })
      .where("property_id", "=", m.id)
      .execute();
  }

  // ── property_reviews ──────────────────────────────────────────────────────
  console.log("Seeding property_reviews...");
  await sql`TRUNCATE property_reviews RESTART IDENTITY`.execute(db);

  const daysAgo = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  const reviews = [
    // Gran Caribe Resort & Spa — 8 reviews
    {
      p: PROP_CANCUN_1,
      n: "María G.",
      c: "MX",
      r: 5,
      l: "es",
      t: "Experiencia inolvidable",
      cm: "El servicio fue impecable y la vista al mar desde la habitación es espectacular. Volveremos el próximo año.",
      age: 3,
    },
    {
      p: PROP_CANCUN_1,
      n: "John D.",
      c: "US",
      r: 5,
      l: "en",
      t: "Outstanding resort",
      cm: "From check-in to check-out, every detail was taken care of. The beach access is unbeatable.",
      age: 10,
    },
    {
      p: PROP_CANCUN_1,
      n: "Luiza P.",
      c: "BR",
      r: 4,
      l: "pt",
      t: "Muito bom",
      cm: "Quartos amplos e comida de excelente qualidade. O spa é um ponto alto. Só achei o WiFi um pouco lento.",
      age: 18,
    },
    {
      p: PROP_CANCUN_1,
      n: "Camille L.",
      c: "FR",
      r: 5,
      l: "fr",
      t: "Séjour magique",
      cm: "La vue sur la mer est à couper le souffle. Le personnel parle plusieurs langues et a été très attentionné.",
      age: 25,
    },
    {
      p: PROP_CANCUN_1,
      n: "Andrea R.",
      c: "CO",
      r: 4,
      l: "es",
      t: "Muy recomendado",
      cm: "Un lugar increíble para familias. Las piscinas están perfectamente mantenidas.",
      age: 40,
    },
    {
      p: PROP_CANCUN_1,
      n: "Marco S.",
      c: "IT",
      r: 5,
      l: "it",
      t: "Paradiso",
      cm: "Servizio di altissimo livello e colazione eccellente. Lo consiglio vivamente.",
      age: 55,
    },
    {
      p: PROP_CANCUN_1,
      n: "Hans M.",
      c: "DE",
      r: 4,
      l: "de",
      t: "Sehr schön",
      cm: "Tolle Anlage direkt am Strand. Nur das Mittagessen am Pool war etwas teuer.",
      age: 70,
    },
    {
      p: PROP_CANCUN_1,
      n: "Sofía V.",
      c: "MX",
      r: 5,
      l: "es",
      t: "Perfecto para luna de miel",
      cm: "Detalles románticos, atención personalizada y una suite divina. 10/10.",
      age: 90,
    },

    // Playa Azul Hotel — 6 reviews
    {
      p: PROP_CANCUN_2,
      n: "Carlos H.",
      c: "ES",
      r: 4,
      l: "es",
      t: "Buena relación calidad-precio",
      cm: "La ubicación es excelente y las habitaciones muy limpias. El desayuno es amplio.",
      age: 5,
    },
    {
      p: PROP_CANCUN_2,
      n: "Rachel K.",
      c: "US",
      r: 4,
      l: "en",
      t: "Great stay",
      cm: "Friendly staff, good location. Pool area could be larger but overall a solid choice.",
      age: 14,
    },
    {
      p: PROP_CANCUN_2,
      n: "Paulo C.",
      c: "BR",
      r: 5,
      l: "pt",
      t: "Ótimo hotel",
      cm: "Adorei a estrutura e o atendimento foi maravilhoso. Voltarei com certeza.",
      age: 22,
    },
    {
      p: PROP_CANCUN_2,
      n: "Ana M.",
      c: "CO",
      r: 4,
      l: "es",
      t: "Cumple con lo esperado",
      cm: "Habitaciones cómodas y cercanas a la playa. Buen desayuno buffet.",
      age: 33,
    },
    {
      p: PROP_CANCUN_2,
      n: "Sophie B.",
      c: "FR",
      r: 3,
      l: "fr",
      t: "Correct sans plus",
      cm: "L'emplacement est très bon mais l'équipement commence à dater.",
      age: 48,
    },
    {
      p: PROP_CANCUN_2,
      n: "Giulia F.",
      c: "IT",
      r: 4,
      l: "it",
      t: "Buon rapporto qualità-prezzo",
      cm: "Posizione eccellente e personale disponibile. Consigliato per famiglie.",
      age: 60,
    },

    // Hostal Sol Cancún — 4 reviews
    {
      p: PROP_CANCUN_3,
      n: "Diego L.",
      c: "AR",
      r: 4,
      l: "es",
      t: "Muy bueno por el precio",
      cm: "Limpio, cómodo y central. Ideal si no piensas pasar mucho tiempo en el hotel.",
      age: 7,
    },
    {
      p: PROP_CANCUN_3,
      n: "Emma S.",
      c: "UK",
      r: 3,
      l: "en",
      t: "Basic but okay",
      cm: "Not fancy but clean and great location for exploring downtown.",
      age: 20,
    },
    {
      p: PROP_CANCUN_3,
      n: "Bianca T.",
      c: "BR",
      r: 4,
      l: "pt",
      t: "Boa localização",
      cm: "Simples, mas atende bem as necessidades. A equipe é muito atenciosa.",
      age: 30,
    },
    {
      p: PROP_CANCUN_3,
      n: "Lucas P.",
      c: "MX",
      r: 4,
      l: "es",
      t: "Recomendable para mochileros",
      cm: "Buena opción de bajo costo en el centro. Personal servicial.",
      age: 50,
    },

    // Hotel Histórico Centro — 7 reviews
    {
      p: PROP_CDMX_1,
      n: "Isabella R.",
      c: "MX",
      r: 5,
      l: "es",
      t: "Lugar histórico increíble",
      cm: "La arquitectura del edificio es impresionante. Ubicación inmejorable para recorrer el Centro Histórico.",
      age: 2,
    },
    {
      p: PROP_CDMX_1,
      n: "Tom W.",
      c: "US",
      r: 5,
      l: "en",
      t: "Stunning colonial hotel",
      cm: "Stepping inside feels like going back in time. Excellent restaurant.",
      age: 12,
    },
    {
      p: PROP_CDMX_1,
      n: "Hélène D.",
      c: "FR",
      r: 4,
      l: "fr",
      t: "Charme authentique",
      cm: "Bel édifice colonial, chambres spacieuses. Un peu de bruit le soir.",
      age: 19,
    },
    {
      p: PROP_CDMX_1,
      n: "Roberta S.",
      c: "BR",
      r: 5,
      l: "pt",
      t: "Hotel incrível",
      cm: "A localização no Centro Histórico é perfeita. Funcionários muito atenciosos.",
      age: 28,
    },
    {
      p: PROP_CDMX_1,
      n: "Francesco B.",
      c: "IT",
      r: 5,
      l: "it",
      t: "Meraviglioso",
      cm: "Un edificio storico stupendo e un servizio impeccabile.",
      age: 42,
    },
    {
      p: PROP_CDMX_1,
      n: "Liam O.",
      c: "UK",
      r: 4,
      l: "en",
      t: "Lovely character",
      cm: "Great architecture and good food. Would stay again.",
      age: 60,
    },
    {
      p: PROP_CDMX_1,
      n: "Ingrid F.",
      c: "DE",
      r: 4,
      l: "de",
      t: "Historisches Juwel",
      cm: "Schönes altes Gebäude mit viel Charakter. Zentral gelegen.",
      age: 80,
    },

    // Condesa Inn — 5 reviews
    {
      p: PROP_CDMX_2,
      n: "Julián M.",
      c: "MX",
      r: 5,
      l: "es",
      t: "Barrio encantador",
      cm: "La Condesa es ideal para caminar y el hotel tiene un ambiente muy acogedor.",
      age: 4,
    },
    {
      p: PROP_CDMX_2,
      n: "Sarah P.",
      c: "US",
      r: 4,
      l: "en",
      t: "Cute boutique",
      cm: "Pet-friendly and the breakfast is solid. Beautiful neighborhood.",
      age: 15,
    },
    {
      p: PROP_CDMX_2,
      n: "Carla B.",
      c: "BR",
      r: 4,
      l: "pt",
      t: "Muito bom",
      cm: "Hotel aconchegante e localização fantástica em um bairro charmoso.",
      age: 27,
    },
    {
      p: PROP_CDMX_2,
      n: "Léa M.",
      c: "FR",
      r: 5,
      l: "fr",
      t: "Coup de cœur",
      cm: "Un petit hôtel adorable dans un quartier plein de charme.",
      age: 45,
    },
    {
      p: PROP_CDMX_2,
      n: "Jens H.",
      c: "DE",
      r: 4,
      l: "de",
      t: "Charmant",
      cm: "Gemütliches Boutique-Hotel in einer tollen Nachbarschaft.",
      age: 75,
    },
  ];

  await db
    .insertInto("property_reviews")
    .values(
      reviews.map((r) => ({
        property_id: r.p,
        reviewer_name: r.n,
        reviewer_country: r.c,
        rating: r.r,
        language: r.l,
        title: r.t,
        comment: r.cm,
        created_at: daysAgo(r.age),
      })),
    )
    .execute();

  console.log("✓ Seed complete.");
  await db.destroy();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
