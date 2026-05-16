import { reportStrings, resolveLocale } from "./exports-i18n.js";

describe("reportStrings", () => {
  it("returns Spanish strings when locale=es", () => {
    const t = reportStrings("es");
    expect(t.title).toBe("Reporte de pagos");
    expect(t.disbursement.title).toBe("Reporte de desembolsos");
    expect(t.disbursement.status.paid).toBe("Pagado");
  });

  it("returns English strings when locale=en", () => {
    const t = reportStrings("en");
    expect(t.title).toBe("Payments report");
    expect(t.disbursement.title).toBe("Disbursements report");
    expect(t.disbursement.status.paid).toBe("Paid");
  });

  it("formats page-of-pages text in Spanish", () => {
    const t = reportStrings("es");
    expect(t.footer.pageOf(1, 3)).toBe("Página 1 de 3");
  });

  it("formats page-of-pages text in English", () => {
    const t = reportStrings("en");
    expect(t.footer.pageOf(2, 5)).toBe("Page 2 of 5");
  });
});

describe("resolveLocale", () => {
  it("returns 'en' for 'en'", () => {
    expect(resolveLocale("en")).toBe("en");
  });

  it("defaults to 'es' for any non-'en' value", () => {
    expect(resolveLocale(undefined)).toBe("es");
    expect(resolveLocale("")).toBe("es");
    expect(resolveLocale("fr")).toBe("es");
    expect(resolveLocale("es")).toBe("es");
  });
});
