import { sql } from "kysely";
import { AuthRepository } from "./auth.repository";

// ─── kysely mock ─────────────────────────────────────────────────────────────

jest.mock("kysely", () => {
  const mockSql = jest
    .fn()
    .mockReturnValue({ execute: jest.fn().mockResolvedValue(undefined) });
  return { sql: mockSql };
});

const mockSql = sql as jest.MockedFunction<typeof sql>;

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeQChain(terminalResult?: unknown) {
  const chain: any = {};
  ["selectAll", "select", "where", "set", "values", "orderBy"].forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.execute = jest.fn().mockResolvedValue(terminalResult ?? []);
  chain.executeTakeFirst = jest.fn().mockResolvedValue(terminalResult);
  chain.executeTakeFirstOrThrow = jest
    .fn()
    .mockResolvedValue(terminalResult ?? {});
  return chain;
}

function makeDb() {
  const qChain = makeQChain();
  return {
    selectFrom: jest.fn().mockReturnValue(qChain),
    insertInto: jest.fn().mockReturnValue(qChain),
    updateTable: jest.fn().mockReturnValue(qChain),
    deleteFrom: jest.fn().mockReturnValue(qChain),
    __qChain: qChain,
  };
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe("AuthRepository", () => {
  let db: ReturnType<typeof makeDb>;
  let repo: AuthRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSql.mockReturnValue({
      execute: jest.fn().mockResolvedValue(undefined),
    } as unknown as ReturnType<typeof sql>);
    db = makeDb();
    repo = new AuthRepository(db as any);
  });

  // ─── createUser ─────────────────────────────────────────────────────────────

  describe("createUser", () => {
    it("inserts into auth_users", async () => {
      await repo.createUser({
        id: "usr_1",
        email: "a@b.com",
        role: "guest",
        passwordHash: "hash",
        createdAt: "2024-01-01",
      });

      expect(db.insertInto).toHaveBeenCalledWith("auth_users");
      expect(db.__qChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "usr_1",
          email: "a@b.com",
          role: "guest",
          password_hash: "hash",
          created_at: "2024-01-01",
        }),
      );
    });
  });

  // ─── findUserByEmail ─────────────────────────────────────────────────────────

  describe("findUserByEmail", () => {
    it("returns null when no user found", async () => {
      db.__qChain.executeTakeFirst.mockResolvedValueOnce(undefined);

      const result = await repo.findUserByEmail("a@b.com");

      expect(db.selectFrom).toHaveBeenCalledWith("auth_users");
      expect(result).toBeNull();
    });

    it("returns the user when found", async () => {
      const user = {
        id: "usr_1",
        email: "a@b.com",
        role: "guest",
        password_hash: "h",
        created_at: "",
      };
      db.__qChain.executeTakeFirst.mockResolvedValueOnce(user);

      const result = await repo.findUserByEmail("a@b.com");

      expect(result).toEqual(user);
    });
  });

  // ─── findUserById ────────────────────────────────────────────────────────────

  describe("findUserById", () => {
    it("returns null when no user found", async () => {
      db.__qChain.executeTakeFirst.mockResolvedValueOnce(undefined);

      const result = await repo.findUserById("usr_none");

      expect(result).toBeNull();
    });

    it("returns the user when found", async () => {
      const user = {
        id: "usr_1",
        email: "a@b.com",
        role: "guest",
        password_hash: "h",
        created_at: "",
      };
      db.__qChain.executeTakeFirst.mockResolvedValueOnce(user);

      expect(await repo.findUserById("usr_1")).toEqual(user);
    });
  });

  // ─── listUsers ───────────────────────────────────────────────────────────────

  describe("listUsers", () => {
    it("selects from auth_users ordered by created_at desc", async () => {
      const users = [
        {
          id: "usr_1",
          email: "a@b.com",
          role: "guest",
          password_hash: "h",
          created_at: "",
        },
      ];
      db.__qChain.execute.mockResolvedValueOnce(users);

      const result = await repo.listUsers();

      expect(db.selectFrom).toHaveBeenCalledWith("auth_users");
      expect(db.__qChain.orderBy).toHaveBeenCalledWith("created_at", "desc");
      expect(result).toEqual(users);
    });
  });

  // ─── createChallenge ─────────────────────────────────────────────────────────

  describe("createChallenge", () => {
    it("inserts into auth_login_challenges", async () => {
      await repo.createChallenge({
        id: "mfa_1",
        userId: "usr_1",
        otpCodeHash: "hash",
        expiresAt: "2024-01-01",
      });

      expect(db.insertInto).toHaveBeenCalledWith("auth_login_challenges");
      expect(db.__qChain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "mfa_1",
          user_id: "usr_1",
          otp_code_hash: "hash",
          expires_at: "2024-01-01",
        }),
      );
    });
  });

  // ─── findChallengeById ───────────────────────────────────────────────────────

  describe("findChallengeById", () => {
    it("returns null when not found", async () => {
      db.__qChain.executeTakeFirst.mockResolvedValueOnce(undefined);

      const result = await repo.findChallengeById("mfa_none");

      expect(db.selectFrom).toHaveBeenCalledWith("auth_login_challenges");
      expect(result).toBeNull();
    });

    it("returns the challenge when found", async () => {
      const challenge = {
        id: "mfa_1",
        user_id: "usr_1",
        otp_code_hash: "h",
        attempts: 0,
        expires_at: "",
      };
      db.__qChain.executeTakeFirst.mockResolvedValueOnce(challenge);

      expect(await repo.findChallengeById("mfa_1")).toEqual(challenge);
    });
  });

  // ─── incrementChallengeAttempts ──────────────────────────────────────────────

  describe("incrementChallengeAttempts", () => {
    it("updates auth_login_challenges", async () => {
      await repo.incrementChallengeAttempts("mfa_1");

      expect(db.updateTable).toHaveBeenCalledWith("auth_login_challenges");
      expect(db.__qChain.where).toHaveBeenCalledWith("id", "=", "mfa_1");
    });
  });

  // ─── deleteChallengeById ─────────────────────────────────────────────────────

  describe("deleteChallengeById", () => {
    it("deletes from auth_login_challenges", async () => {
      await repo.deleteChallengeById("mfa_1");

      expect(db.deleteFrom).toHaveBeenCalledWith("auth_login_challenges");
      expect(db.__qChain.where).toHaveBeenCalledWith("id", "=", "mfa_1");
    });
  });

  // ─── purgeExpiredChallenges ──────────────────────────────────────────────────

  describe("purgeExpiredChallenges", () => {
    it("executes a DELETE sql query", async () => {
      await repo.purgeExpiredChallenges();

      expect(mockSql).toHaveBeenCalled();
    });
  });
});
