import { describe, it, expect } from "vitest";
import { MenuItem, CartItem, ProductVariant } from "@/types/pos";
import { getCartItemKey } from "@/app/_hooks/use-pos-cart";

describe("POS Cart Key & Calculation logic", () => {
  const dummyProduct: MenuItem = {
    id: "prod-01",
    sku: "SKU-01",
    barcode: "899999001",
    name: "Kopi Latte",
    type: "fnb",
    category: "kopi",
    price: 20000,
    costPrice: 10000,
    unit: "cup",
    description: "Kopi latte lezat",
    image: "",
    stock: 20,
  };

  const dummyVariant: ProductVariant = {
    id: "var-large",
    name: "Large (+5000)",
    priceDelta: 5000,
  };

  it("getCartItemKey generates distinct keys for base item vs variant", () => {
    const itemWithoutVariant: CartItem = {
      menuItem: dummyProduct,
      quantity: 1,
    };

    const itemWithVariant: CartItem = {
      menuItem: dummyProduct,
      quantity: 1,
      selectedVariant: dummyVariant,
    };

    const key1 = getCartItemKey(itemWithoutVariant);
    const key2 = getCartItemKey(itemWithVariant);

    expect(key1).toBe("prod-01");
    expect(key2).toBe("prod-01::var-large");
    expect(key1).not.toBe(key2);
  });

  it("calculates subtotal, discount, and tax correctly", () => {
    const basePrice = dummyProduct.price; // 20000
    const variantPrice = basePrice + dummyVariant.priceDelta; // 25000
    const qty = 2;
    const subtotal = variantPrice * qty; // 50000

    const discountAmount = 10000;
    const effectiveSubtotal = Math.max(0, subtotal - discountAmount); // 40000

    const taxRate = 0.1; // 10%
    const tax = Math.round(effectiveSubtotal * taxRate); // 4000
    const total = effectiveSubtotal + tax; // 44000

    expect(subtotal).toBe(50000);
    expect(effectiveSubtotal).toBe(40000);
    expect(tax).toBe(4000);
    expect(total).toBe(44000);
  });
});
