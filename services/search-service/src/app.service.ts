import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  private readonly properties = [
    {
      id: "prop_001",
      name: "Beachfront Villa",
      city: "Cancún",
      pricePerNight: 350,
      capacity: 6,
      amenities: ["pool", "wifi", "kitchen"],
    },
    {
      id: "prop_002",
      name: "Downtown Loft",
      city: "São Paulo",
      pricePerNight: 120,
      capacity: 2,
      amenities: ["wifi", "gym"],
    },
    {
      id: "prop_003",
      name: "Mountain Cabin",
      city: "Bariloche",
      pricePerNight: 200,
      capacity: 4,
      amenities: ["fireplace", "wifi"],
    },
  ];

  getHealth(): object {
    return { status: "ok", service: "search-service" };
  }

  searchProperties(filters: {
    city?: string;
    checkIn?: string;
    checkOut?: string;
    guests?: number;
  }): object {
    const results = filters.city
      ? this.properties.filter((p) =>
          p.city.toLowerCase().includes(filters.city!.toLowerCase()),
        )
      : this.properties;
    return { total: results.length, results, filters };
  }

  getProperty(id: string): object {
    const property = this.properties.find((p) => p.id === id);
    if (!property) return { error: "Property not found", id };
    return property;
  }
}
