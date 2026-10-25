import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getTransactionsSnapshot,
  getTransactionsServerSnapshot,
  saveTransaction,
  resetStoredTransactions,
  subscribeTransactions,
} from "../transaction-storage";
import { Transaction } from "@/types/pos";

describe("transaction-storage snapshot stability", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    const storageMock = {
      getItem: (key: string) => mockStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    };

    // Setup global window and localStorage
    (globalThis as unknown as { window: unknown }).window = globalThis;
    Object.defineProperty(globalThis, "localStorage", {
      value: storageMock,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it("getTransactionsServerSnapshot returns consistent fallback", () => {
    const s1 = getTransactionsServerSnapshot();
    const s2 = getTransactionsServerSnapshot();
    expect(s1).toBe(s2);
  });

  it("should return the exact same cached reference on repeated getTransactionsSnapshot calls (referential stability)", () => {
    resetStoredTransactions();
    const snap1 = getTransactionsSnapshot();
    const snap2 = getTransactionsSnapshot();

    // MUST be identical by reference (Object.is) to satisfy useSyncExternalStore
    expect(snap1).toBe(snap2);
  });

  it("should update snapshot reference and notify listeners when saveTransaction is called", () => {
    resetStoredTransactions();
    const initialSnap = getTransactionsSnapshot();
    let listenerCalled = false;
    const unsubscribe = subscribeTransactions(() => {
      listenerCalled = true;
    });

    const newTx: Transaction = {
      id: "TRX-TEST-1",
      orderNumber: "ORD-999",
      timestamp: new Date().toISOString(),
      businessMode: "fnb",
      customerName: "Test Customer",
      tableNumber: "01",
      orderType: "dine_in",
      items: [],
      subtotal: 50000,
      discountAmount: 0,
      taxRate: 0.1,
      tax: 5000,
      total: 55000,
      paymentMethod: "tunai",
      amountPaid: 60000,
      changeAmount: 5000,
      status: "selesai",
    };

    saveTransaction(newTx);
    unsubscribe();

    expect(listenerCalled).toBe(true);
    const updatedSnap1 = getTransactionsSnapshot();
    const updatedSnap2 = getTransactionsSnapshot();

    expect(updatedSnap1).not.toBe(initialSnap);
    expect(updatedSnap1).toBe(updatedSnap2);
    expect(updatedSnap1[0].id).toBe("TRX-TEST-1");
  });
});
