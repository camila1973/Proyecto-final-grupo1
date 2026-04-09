import { BadRequestException } from "@nestjs/common";
import { PropertiesController } from "./properties.controller.js";
import type { PropertiesService } from "./properties.service.js";

describe("PropertiesController", () => {
  let controller: PropertiesController;
  let service: jest.Mocked<
    Pick<
      PropertiesService,
      "searchProperties" | "getCitySuggestions" | "getPropertyRooms"
    >
  >;

  beforeEach(() => {
    service = {
      searchProperties: jest.fn().mockResolvedValue({ results: [] }),
      getCitySuggestions: jest.fn().mockReturnValue({ suggestions: [] }),
      getPropertyRooms: jest
        .fn()
        .mockResolvedValue({ property: null, rooms: [] }),
    };
    controller = new PropertiesController(
      service as unknown as PropertiesService,
    );
  });

  // Access the private parseQuery for unit-level testing
  const parse = (ctrl: PropertiesController, query: Record<string, string>) =>
    (ctrl as any).parseQuery(query);

  // ─── valid parsing ──────────────────────────────────────────────────────────

  it("parses all valid fields correctly", () => {
    const dto = parse(controller, {
      city: " Lisbon ",
      checkIn: "2026-04-01",
      checkOut: "2026-04-05",
      guests: "3",
      page: "2",
      limit: "10",
      sort: "price_asc",
      amenities: "wifi,pool",
      stars: "4,5",
      priceMin: "100",
      priceMax: "500",
    });

    expect(dto.city).toBe("Lisbon"); // trimmed
    expect(dto.checkIn).toBe("2026-04-01");
    expect(dto.checkOut).toBe("2026-04-05");
    expect(dto.guests).toBe(3);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(10);
    expect(dto.sort).toBe("price_asc");
    expect(dto.amenities).toEqual(["wifi", "pool"]);
    expect(dto.stars).toEqual([4, 5]);
    expect(dto.priceMin).toBe(100);
    expect(dto.priceMax).toBe(500);
  });

  it("defaults to page 1, pageSize 20, guests 1, sort relevance when omitted", () => {
    const dto = parse(controller, { city: "Lisbon" });
    expect(dto.page).toBe(1);
    expect(dto.pageSize).toBe(20);
    expect(dto.guests).toBe(1);
    expect(dto.sort).toBe("relevance");
  });

  it("defaults checkIn/checkOut to empty strings when omitted", () => {
    const dto = parse(controller, { city: "Lisbon" });
    expect(dto.checkIn).toBe("");
    expect(dto.checkOut).toBe("");
  });

  it("clamps pageSize to 100 maximum", () => {
    const dto = parse(controller, { city: "Lisbon", limit: "9999" });
    expect(dto.pageSize).toBe(100);
  });

  it("clamps pageSize to 1 minimum", () => {
    const dto = parse(controller, { city: "Lisbon", limit: "0" });
    expect(dto.pageSize).toBe(1);
  });

  it("clamps page to 1 minimum", () => {
    const dto = parse(controller, { city: "Lisbon", page: "-5" });
    expect(dto.page).toBe(1);
  });

  it("leaves priceMin/priceMax undefined when not provided", () => {
    const dto = parse(controller, { city: "Lisbon" });
    expect(dto.priceMin).toBeUndefined();
    expect(dto.priceMax).toBeUndefined();
  });

  it("filters out NaN values from stars array", () => {
    const dto = parse(controller, { city: "Lisbon", stars: "4,abc,5" });
    expect(dto.stars).toEqual([4, 5]);
  });

  it("filters empty strings from amenities array", () => {
    const dto = parse(controller, { city: "Lisbon", amenities: "wifi,,pool," });
    expect(dto.amenities).toEqual(["wifi", "pool"]);
  });

  it("accepts all valid sort options", () => {
    for (const sort of ["price_asc", "price_desc", "stars_desc", "relevance"]) {
      expect(() => parse(controller, { city: "Lisbon", sort })).not.toThrow();
    }
  });

  it("parses roomType from comma-delimited string", () => {
    expect(
      parse(controller, { city: "Lisbon", roomType: "suite,deluxe" }).roomType,
    ).toEqual(["suite", "deluxe"]);
  });

  it("parses bedType from comma-delimited string", () => {
    expect(
      parse(controller, { city: "Lisbon", bedType: "king" }).bedType,
    ).toEqual(["king"]);
  });

  it("parses viewType from comma-delimited string", () => {
    expect(
      parse(controller, { city: "Lisbon", viewType: "ocean,city" }).viewType,
    ).toEqual(["ocean", "city"]);
  });

  it("parses amenities from bracket key (amenities[])", () => {
    expect(
      parse(controller, { city: "Lisbon", "amenities[]": "wifi,pool" })
        .amenities,
    ).toEqual(["wifi", "pool"]);
  });

  it("parses roomType from bracket key (roomType[])", () => {
    expect(
      parse(controller, { city: "Lisbon", "roomType[]": "suite" }).roomType,
    ).toEqual(["suite"]);
  });

  it('sets exact=true when query["exact"] is "true"', () => {
    expect(parse(controller, { city: "Lisbon", exact: "true" }).exact).toBe(
      true,
    );
  });

  it('sets exact=false when query["exact"] is absent', () => {
    expect(parse(controller, { city: "Lisbon" }).exact).toBe(false);
  });

  it('sets exact=false when query["exact"] is "false"', () => {
    expect(parse(controller, { city: "Lisbon", exact: "false" }).exact).toBe(
      false,
    );
  });

  // ─── validation errors ──────────────────────────────────────────────────────

  it("throws BadRequestException when city is missing", () => {
    expect(() => parse(controller, {})).toThrow(BadRequestException);
  });

  it("throws BadRequestException when city is whitespace-only", () => {
    expect(() => parse(controller, { city: "   " })).toThrow(
      BadRequestException,
    );
  });

  it("throws BadRequestException for invalid checkIn date", () => {
    expect(() =>
      parse(controller, { city: "Lisbon", checkIn: "not-a-date" }),
    ).toThrow(BadRequestException);
  });

  it("throws BadRequestException for invalid checkOut date", () => {
    expect(() =>
      parse(controller, { city: "Lisbon", checkOut: "not-a-date" }),
    ).toThrow(BadRequestException);
  });

  it("throws BadRequestException when checkOut equals checkIn", () => {
    expect(() =>
      parse(controller, {
        city: "Lisbon",
        checkIn: "2026-04-01",
        checkOut: "2026-04-01",
      }),
    ).toThrow(BadRequestException);
  });

  it("throws BadRequestException when checkOut is before checkIn", () => {
    expect(() =>
      parse(controller, {
        city: "Lisbon",
        checkIn: "2026-04-05",
        checkOut: "2026-04-01",
      }),
    ).toThrow(BadRequestException);
  });

  it("throws BadRequestException for non-numeric guests", () => {
    expect(() => parse(controller, { city: "Lisbon", guests: "abc" })).toThrow(
      BadRequestException,
    );
  });

  it("throws BadRequestException for guests = 0", () => {
    expect(() => parse(controller, { city: "Lisbon", guests: "0" })).toThrow(
      BadRequestException,
    );
  });

  it("throws BadRequestException for negative guests", () => {
    expect(() => parse(controller, { city: "Lisbon", guests: "-1" })).toThrow(
      BadRequestException,
    );
  });

  it("throws BadRequestException for unknown sort value", () => {
    expect(() =>
      parse(controller, { city: "Lisbon", sort: "cheapest_first" }),
    ).toThrow(BadRequestException);
  });

  // ─── HTTP endpoint ──────────────────────────────────────────────────────────

  it("searchProperties delegates to service", async () => {
    await controller.searchProperties({ city: "Cancún" });
    expect(service.searchProperties).toHaveBeenCalledWith(
      expect.objectContaining({ city: "Cancún" }),
    );
  });

  it("returns the service response", async () => {
    const response = await controller.searchProperties({ city: "Cancún" });
    expect(response).toEqual({ results: [] });
  });

  describe("GET cities", () => {
    it("delegates to service and returns suggestions", () => {
      const mockResult = {
        suggestions: [{ city: "Cancún", country: "MX" }],
      };
      (service.getCitySuggestions as jest.Mock).mockReturnValue(mockResult);

      const result = controller.getCitySuggestions("Cancun");

      expect(service.getCitySuggestions).toHaveBeenCalledWith("Cancun");
      expect(result).toEqual(mockResult);
    });

    it("trims whitespace from q before delegating", () => {
      controller.getCitySuggestions("  Paris  ");
      expect(service.getCitySuggestions).toHaveBeenCalledWith("Paris");
    });

    it("throws BadRequestException when q is missing", () => {
      expect(() => controller.getCitySuggestions(undefined as any)).toThrow(
        BadRequestException,
      );
    });

    it("throws BadRequestException when q is whitespace-only", () => {
      expect(() => controller.getCitySuggestions("   ")).toThrow(
        BadRequestException,
      );
    });
  });

  describe("GET properties/:propertyId/rooms", () => {
    it("delegates to service with propertyId and parsed options", async () => {
      await controller.getPropertyRooms("p1", {
        checkIn: "2026-04-01",
        checkOut: "2026-04-05",
        guests: "2",
      });
      expect(service.getPropertyRooms).toHaveBeenCalledWith("p1", {
        checkIn: "2026-04-01",
        checkOut: "2026-04-05",
        guests: 2,
      });
    });

    it("returns the service response", async () => {
      const mockResponse = {
        property: { id: "p1", name: "Hotel A" },
        rooms: [],
      };
      (service.getPropertyRooms as jest.Mock).mockResolvedValue(mockResponse);
      const result = await controller.getPropertyRooms("p1", {});
      expect(result).toEqual(mockResponse);
    });

    it("omits checkIn/checkOut/guests when not provided", async () => {
      await controller.getPropertyRooms("p1", {});
      expect(service.getPropertyRooms).toHaveBeenCalledWith("p1", {
        checkIn: undefined,
        checkOut: undefined,
        guests: undefined,
      });
    });

    it("throws BadRequestException for invalid checkIn", () => {
      expect(() =>
        controller.getPropertyRooms("p1", { checkIn: "not-a-date" }),
      ).toThrow(BadRequestException);
    });

    it("throws BadRequestException for invalid checkOut", () => {
      expect(() =>
        controller.getPropertyRooms("p1", { checkOut: "not-a-date" }),
      ).toThrow(BadRequestException);
    });

    it("throws BadRequestException when checkOut equals checkIn", () => {
      expect(() =>
        controller.getPropertyRooms("p1", {
          checkIn: "2026-04-01",
          checkOut: "2026-04-01",
        }),
      ).toThrow(BadRequestException);
    });

    it("throws BadRequestException for guests = 0", () => {
      expect(() => controller.getPropertyRooms("p1", { guests: "0" })).toThrow(
        BadRequestException,
      );
    });

    it("throws BadRequestException for non-numeric guests", () => {
      expect(() =>
        controller.getPropertyRooms("p1", { guests: "abc" }),
      ).toThrow(BadRequestException);
    });
  });
});
