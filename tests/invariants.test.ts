/**
 * Invariant tests — no database needed.
 * Run: npm test
 */
import { describe, it, expect, beforeEach } from "vitest";
import Decimal from "decimal.js";
import {
  buildJournalEntries,
  validateBalance,
  buildReversalEntries,
} from "../lib/ledger";
import { createSessionToken, validateSessionToken } from "../lib/session";
import { checkRateLimit, clearRateLimit } from "../lib/ratelimit";

const SYS = {
  income: "sys-income-id",
  expense: "sys-expense-id",
};
const ACCOUNT = "account-checking-id";
const TO_ACCOUNT = "account-savings-id";
const ASSET = "asset-usd-id";

// ── Ledger invariants ─────────────────────────────────────────────────────────

describe("Invariant 1: EXPENSE creates exactly 2 entries", () => {
  it("returns 2 entries", () => {
    const entries = buildJournalEntries({
      txType: "EXPENSE", amount: new Decimal(100), assetId: ASSET,
      accountId: ACCOUNT, systemIncomeAccountId: SYS.income, systemExpenseAccountId: SYS.expense,
    });
    expect(entries).toHaveLength(2);
  });
});

describe("Invariant 2: EXPENSE entries sum to zero", () => {
  it("balances to 0", () => {
    const entries = buildJournalEntries({
      txType: "EXPENSE", amount: new Decimal(100), assetId: ASSET,
      accountId: ACCOUNT, systemIncomeAccountId: SYS.income, systemExpenseAccountId: SYS.expense,
    });
    expect(validateBalance(entries)).toBe(true);
  });
});

describe("Invariant 3: INCOME entries sum to zero", () => {
  it("balances to 0", () => {
    const entries = buildJournalEntries({
      txType: "INCOME", amount: new Decimal(1000), assetId: ASSET,
      accountId: ACCOUNT, systemIncomeAccountId: SYS.income, systemExpenseAccountId: SYS.expense,
    });
    expect(validateBalance(entries)).toBe(true);
  });
});

describe("Invariant 4: TRANSFER entries sum to zero", () => {
  it("balances to 0", () => {
    const entries = buildJournalEntries({
      txType: "TRANSFER", amount: new Decimal(500), assetId: ASSET,
      accountId: ACCOUNT, toAccountId: TO_ACCOUNT,
      systemIncomeAccountId: SYS.income, systemExpenseAccountId: SYS.expense,
    });
    expect(validateBalance(entries)).toBe(true);
  });
});

describe("Invariant 5: TRANSFER uses real accounts only (no virtual system)", () => {
  it("no entry uses system accounts", () => {
    const entries = buildJournalEntries({
      txType: "TRANSFER", amount: new Decimal(500), assetId: ASSET,
      accountId: ACCOUNT, toAccountId: TO_ACCOUNT,
      systemIncomeAccountId: SYS.income, systemExpenseAccountId: SYS.expense,
    });
    const ids = entries.map((e) => e.accountId);
    expect(ids).not.toContain(SYS.income);
    expect(ids).not.toContain(SYS.expense);
  });
});

describe("Invariant 6: EXPENSE real-account entry is negative", () => {
  it("real account side is negative", () => {
    const entries = buildJournalEntries({
      txType: "EXPENSE", amount: new Decimal(100), assetId: ASSET,
      accountId: ACCOUNT, systemIncomeAccountId: SYS.income, systemExpenseAccountId: SYS.expense,
    });
    const realEntry = entries.find((e) => e.accountId === ACCOUNT)!;
    expect(realEntry.amountUsd.lt(0)).toBe(true);
  });
});

describe("Invariant 7: INCOME real-account entry is positive", () => {
  it("real account side is positive", () => {
    const entries = buildJournalEntries({
      txType: "INCOME", amount: new Decimal(1000), assetId: ASSET,
      accountId: ACCOUNT, systemIncomeAccountId: SYS.income, systemExpenseAccountId: SYS.expense,
    });
    const realEntry = entries.find((e) => e.accountId === ACCOUNT)!;
    expect(realEntry.amountUsd.gt(0)).toBe(true);
  });
});

describe("Invariant 8: TRANSFER requires toAccountId", () => {
  it("throws when toAccountId is missing", () => {
    expect(() =>
      buildJournalEntries({
        txType: "TRANSFER", amount: new Decimal(100), assetId: ASSET,
        accountId: ACCOUNT, systemIncomeAccountId: SYS.income, systemExpenseAccountId: SYS.expense,
      })
    ).toThrow("toAccountId");
  });
});

describe("Invariant 9: amount must be positive", () => {
  it("throws for zero amount", () => {
    expect(() =>
      buildJournalEntries({
        txType: "EXPENSE", amount: new Decimal(0), assetId: ASSET,
        accountId: ACCOUNT, systemIncomeAccountId: SYS.income, systemExpenseAccountId: SYS.expense,
      })
    ).toThrow();
  });

  it("throws for negative amount", () => {
    expect(() =>
      buildJournalEntries({
        txType: "EXPENSE", amount: new Decimal(-50), assetId: ASSET,
        accountId: ACCOUNT, systemIncomeAccountId: SYS.income, systemExpenseAccountId: SYS.expense,
      })
    ).toThrow();
  });
});

describe("Invariant 10: reversal entries sum to zero and negate originals", () => {
  it("reversal balances", () => {
    const original = buildJournalEntries({
      txType: "EXPENSE", amount: new Decimal(75), assetId: ASSET,
      accountId: ACCOUNT, systemIncomeAccountId: SYS.income, systemExpenseAccountId: SYS.expense,
    });
    const reversed = buildReversalEntries(original.map((e) => ({ ...e, amountUsd: e.amountUsd.toFixed(8) })));
    expect(validateBalance(reversed)).toBe(true);
  });

  it("reversal entries are negated", () => {
    const entries = buildJournalEntries({
      txType: "EXPENSE", amount: new Decimal(75), assetId: ASSET,
      accountId: ACCOUNT, systemIncomeAccountId: SYS.income, systemExpenseAccountId: SYS.expense,
    });
    const reversed = buildReversalEntries(entries.map((e) => ({ ...e, amountUsd: e.amountUsd.toFixed(8) })));
    for (let i = 0; i < entries.length; i++) {
      expect(reversed[i].amountUsd.plus(entries[i].amountUsd).isZero()).toBe(true);
    }
  });
});

// ── Session invariants ────────────────────────────────────────────────────────

describe("Invariant 11: session token is signed and verifiable", () => {
  beforeEach(() => {
    process.env.APP_SESSION_SECRET = "test-secret-for-unit-tests-32chars!";
  });

  it("creates and validates a token", () => {
    const token = createSessionToken();
    expect(validateSessionToken(token)).toBe(true);
  });

  it("rejects a tampered token", () => {
    const token = createSessionToken();
    const parts = token.split(".");
    parts[1] = Buffer.from('{"iat":1,"jti":"tampered"}').toString("base64url");
    expect(validateSessionToken(parts.join("."))).toBe(false);
  });

  it("rejects an old base64 token format", () => {
    const oldToken = Buffer.from("default-secret:1234567890").toString("base64");
    expect(validateSessionToken(oldToken)).toBe(false);
  });
});

// ── Rate limiting ─────────────────────────────────────────────────────────────

describe("Invariant 12: rate limiter blocks after 5 attempts", () => {
  it("allows first 5 then blocks the 6th", () => {
    const ip = `test-ip-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(ip)).toBe(true);
    }
    expect(checkRateLimit(ip)).toBe(false);
    clearRateLimit(ip);
  });

  it("resets after clear", () => {
    const ip = `test-ip-${Date.now()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(ip);
    clearRateLimit(ip);
    expect(checkRateLimit(ip)).toBe(true);
    clearRateLimit(ip);
  });
});
