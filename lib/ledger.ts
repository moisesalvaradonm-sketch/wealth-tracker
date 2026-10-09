import Decimal from "decimal.js";
import type { PrismaClient } from "@prisma/client";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export interface EntrySpec {
  accountId: string;
  assetId: string;
  amount: Decimal;
  amountUsd: Decimal;
  sortOrder: number;
}

export interface JournalInput {
  txType: string;
  amount: Decimal;
  assetId: string;
  accountId: string;
  toAccountId?: string;           // required for TRANSFER / INVESTMENT / EXCHANGE
  systemIncomeAccountId: string;
  systemExpenseAccountId: string;
}

// Pure function: no DB calls. Build balanced double-entry lines.
export function buildJournalEntries(input: JournalInput): EntrySpec[] {
  const { txType, amount, assetId, accountId, toAccountId,
          systemIncomeAccountId, systemExpenseAccountId } = input;

  if (amount.lte(0)) throw new Error("amount must be positive");

  const neg = amount.neg();

  // Credit-side types that need a real destination account
  const needsDest = ["TRANSFER", "INVESTMENT", "EXCHANGE"];
  if (needsDest.includes(txType) && !toAccountId) {
    throw new Error(`txType ${txType} requires toAccountId`);
  }

  switch (txType) {
    // Outflow: real account → virtual expense sink
    case "EXPENSE":
    case "FEE":
    case "WITHDRAWAL":
      return [
        { accountId, assetId, amount: neg, amountUsd: neg, sortOrder: 0 },
        { accountId: systemExpenseAccountId, assetId, amount, amountUsd: amount, sortOrder: 1 },
      ];

    // Inflow: virtual income source → real account
    case "INCOME":
    case "DIVIDEND":
    case "INTEREST":
    case "DEPOSIT":
      return [
        { accountId, assetId, amount, amountUsd: amount, sortOrder: 0 },
        { accountId: systemIncomeAccountId, assetId, amount: neg, amountUsd: neg, sortOrder: 1 },
      ];

    // Move between two real accounts (net-worth-neutral)
    case "TRANSFER":
    case "INVESTMENT":
    case "EXCHANGE":
      return [
        { accountId, assetId, amount: neg, amountUsd: neg, sortOrder: 0 },
        { accountId: toAccountId!, assetId, amount, amountUsd: amount, sortOrder: 1 },
      ];

    // Adjustment: if we have a destination account, use it; otherwise use system accounts
    case "ADJUSTMENT":
      if (toAccountId) {
        return [
          { accountId, assetId, amount: neg, amountUsd: neg, sortOrder: 0 },
          { accountId: toAccountId, assetId, amount, amountUsd: amount, sortOrder: 1 },
        ];
      }
      // Positive adjustment = income-like
      return [
        { accountId, assetId, amount, amountUsd: amount, sortOrder: 0 },
        { accountId: systemIncomeAccountId, assetId, amount: neg, amountUsd: neg, sortOrder: 1 },
      ];

    default:
      throw new Error(`Unknown txType: ${txType}`);
  }
}

// Validate that all amountUsd values in a set of entries sum to exactly zero.
export function validateBalance(entries: { amountUsd: Decimal | string | number }[]): boolean {
  const sum = entries.reduce(
    (acc, e) => acc.plus(new Decimal(e.amountUsd.toString())),
    new Decimal(0)
  );
  return sum.isZero();
}

// Build reversed entries for a reversal transaction
export function buildReversalEntries(
  originalEntries: { accountId: string; assetId: string; amountUsd: string | number }[]
): Omit<EntrySpec, "sortOrder">[] {
  return originalEntries.map((e) => ({
    accountId: e.accountId,
    assetId: e.assetId,
    amount: new Decimal(e.amountUsd.toString()).neg(),
    amountUsd: new Decimal(e.amountUsd.toString()).neg(),
  }));
}

// DB helper: get or create the two system virtual accounts
export async function getSystemAccounts(prisma: PrismaClient) {
  const INCOME_NAME = "__system_income__";
  const EXPENSE_NAME = "__system_expense__";

  const [income, expense] = await Promise.all([
    prisma.account.findFirst({ where: { name: INCOME_NAME } }),
    prisma.account.findFirst({ where: { name: EXPENSE_NAME } }),
  ]);

  if (!income || !expense) {
    throw new Error(
      "System accounts not found. Run: npx tsx prisma/seed.ts"
    );
  }

  return { income, expense };
}
