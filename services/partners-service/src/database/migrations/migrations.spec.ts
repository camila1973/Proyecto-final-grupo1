// Each migration uses `sql\`...\`.execute(db)`. We don't have a real DB in unit
// tests, so we exercise the up/down functions against a stub Kysely instance.
// kysely's tagged template returns a RawBuilder with an `execute(db)` method;
// when the underlying executor returns successfully, the migration completes.

import { up as up1, down as down1 } from "./20260430_001_add_partners.js";
import {
  up as up2,
  down as down2,
} from "./20260430_002_add_property_check_in_keys.js";
import { up as up3, down as down3 } from "./20260501_001_add_partner_code.js";
import { up as up4, down as down4 } from "./20260501_002_add_managers.js";
import {
  up as up5,
  down as down5,
} from "./20260501_003_add_partner_members.js";

// Minimal Kysely stub: the only method `sql\`...\`.execute(db)` invokes on `db`
// is `getExecutor()` which it calls to compile and run the SQL. Since the
// migrations don't await the result, a stub that returns a resolved promise on
// `executeQuery` suffices.
function makeStubDb() {
  const executor = {
    adapter: { supportsReturning: true, supportsTransactionalDdl: true },
    executeQuery: jest.fn().mockResolvedValue({ rows: [] }),
    transformQuery: jest.fn((arg: unknown) => arg),
    compileQuery: jest.fn().mockReturnValue({
      sql: "",
      parameters: [],
      query: { kind: "RawNode" },
    }),
    provideConnection: jest
      .fn()
      .mockImplementation(async (cb: (c: unknown) => Promise<unknown>) =>
        cb({}),
      ),
    withConnectionProvider: jest.fn(),
    withPlugins: jest.fn(),
    withPlugin: jest.fn(),
    withPluginAtFront: jest.fn(),
    withoutPlugins: jest.fn(),
    plugins: [],
  };
  return {
    getExecutor: jest.fn().mockReturnValue(executor),
  };
}

describe("partners-service migrations", () => {
  it("20260430_001_add_partners.up runs without throwing", async () => {
    await expect(up1(makeStubDb() as never)).resolves.toBeUndefined();
  });

  it("20260430_001_add_partners.down runs without throwing", async () => {
    await expect(down1(makeStubDb() as never)).resolves.toBeUndefined();
  });

  it("20260430_002_add_property_check_in_keys.up", async () => {
    await expect(up2(makeStubDb() as never)).resolves.toBeUndefined();
  });

  it("20260430_002_add_property_check_in_keys.down", async () => {
    await expect(down2(makeStubDb() as never)).resolves.toBeUndefined();
  });

  it("20260501_001_add_partner_code.up", async () => {
    await expect(up3(makeStubDb() as never)).resolves.toBeUndefined();
  });

  it("20260501_001_add_partner_code.down", async () => {
    await expect(down3(makeStubDb() as never)).resolves.toBeUndefined();
  });

  it("20260501_002_add_managers.up", async () => {
    await expect(up4(makeStubDb() as never)).resolves.toBeUndefined();
  });

  it("20260501_002_add_managers.down", async () => {
    await expect(down4(makeStubDb() as never)).resolves.toBeUndefined();
  });

  it("20260501_003_add_partner_members.up", async () => {
    await expect(up5(makeStubDb() as never)).resolves.toBeUndefined();
  });

  it("20260501_003_add_partner_members.down", async () => {
    await expect(down5(makeStubDb() as never)).resolves.toBeUndefined();
  });
});
