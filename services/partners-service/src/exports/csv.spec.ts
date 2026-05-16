import { csvRow } from "./csv.js";

describe("csvRow", () => {
  it("joins simple string cells with a comma and appends CRLF", () => {
    expect(csvRow(["a", "b", "c"])).toBe("a,b,c\r\n");
  });

  it("passes numbers through as-is", () => {
    expect(csvRow([1, 2, 3.14])).toBe("1,2,3.14\r\n");
  });

  it("quotes cells containing commas", () => {
    expect(csvRow(["hello, world"])).toBe('"hello, world"\r\n');
  });

  it("quotes cells containing newlines", () => {
    expect(csvRow(["one\ntwo"])).toBe('"one\ntwo"\r\n');
  });

  it("doubles embedded quotes and wraps in quotes", () => {
    expect(csvRow(['He said "hi"'])).toBe('"He said ""hi"""\r\n');
  });

  it("mixes types correctly", () => {
    expect(csvRow(["a,b", 42, "plain"])).toBe('"a,b",42,plain\r\n');
  });

  it("returns just CRLF for empty array", () => {
    expect(csvRow([])).toBe("\r\n");
  });
});
