import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getProductsSnapshot,
  getProductsServerSnapshot,
  saveProduct,
  updateProductStock,
  deleteProduct,
  resetProducts,
  deductStockForTransaction,
} from "../product-storage";
import { MenuItem, CartItem } from "@/types/pos";

describe("product-storage functionality & stability", () => {
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

  it("getProductsServerSnapshot returns consistent fallback reference", () => {
    const s1 = getProductsServerSnapshot();
    const s2 = getProductsServerSnapshot();
    expect(s1).toBe(s2);
  });

  it("should have referential stability on repeated getProductsSnapshot calls", () => {
    resetProducts();
    const snap1 = getProductsSnapshot();
    const snap2 = getProductsSnapshot();
    expect(snap1).toBe(snap2);
  });

  it("should add and update product correctly", () => {
    resetProducts();
    const newProduct: MenuItem = {
      id: "prod-test-01",
      sku: "TEST-01",
      barcode: "999000111",
      name: "Barang Test Retail",
      type: "retail",
      category: "snack",
      price: 15000,
      costPrice: 10000,
      unit: "pcs",
      description: "Deskripsi barang test",
      image: "https://example.com/img.jpg",
      stock: 50,
    };

    saveProduct(newProduct);
    const snap = getProductsSnapshot();
    const found = snap.find((p) => p.id === "prod-test-01");
    expect(found).toBeDefined();
    expect(found?.name).toBe("Barang Test Retail");

    // Update existing
    saveProduct({ ...newProduct, price: 18000 });
    const updatedSnap = getProductsSnapshot();
    const updatedFound = updatedSnap.find((p) => p.id === "prod-test-01");
    expect(updatedFound?.price).toBe(18000);
  });

  it("should update stock and deduct on transaction", () => {
    resetProducts();
    const snap = getProductsSnapshot();
    const target = snap[0];
    const initialStock = target.stock;

    updateProductStock(target.id, 10);
    const afterAdd = getProductsSnapshot().find((p) => p.id === target.id);
    expect(afterAdd?.stock).toBe(initialStock + 10);

    // Deduct stock for transaction
    const cartItem: CartItem = {
      menuItem: afterAdd!,
      quantity: 5,
    };
    deductStockForTransaction([cartItem]);

    const afterDeduct = getProductsSnapshot().find((p) => p.id === target.id);
    expect(afterDeduct?.stock).toBe(initialStock + 10 - 5);
  });

  it("should delete product correctly", () => {
    resetProducts();
    const snap = getProductsSnapshot();
    const targetId = snap[0].id;

    deleteProduct(targetId);
    const afterDelete = getProductsSnapshot().find((p) => p.id === targetId);
    expect(afterDelete).toBeUndefined();
  });
});
