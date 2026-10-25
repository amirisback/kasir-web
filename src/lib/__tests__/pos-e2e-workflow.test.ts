import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MenuItem, Transaction, CartItem } from '@/types/pos';
import {
  getProductsSnapshot,
  saveProduct,
  updateProductStock,
  deleteProduct,
  resetProducts,
  deductStockForTransaction,
} from '../product-storage';
import {
  getTransactionsSnapshot,
  saveTransaction,
  resetStoredTransactions,
  calculateSalesSummary,
} from '../transaction-storage';
import { getCartItemKey } from '@/app/_hooks/use-pos-cart';

describe('POS End-to-End Operational Lifecycle & Crash Resilience Test', () => {
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
    Object.defineProperty(globalThis, 'localStorage', {
      value: storageMock,
      writable: true,
      configurable: true,
    });

    resetProducts();
    resetStoredTransactions();
  });

  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
  });

  it('E2E Flow 1: F&B Dine-In Order Lifecycle with Variant, PB1 Tax, and Stock Deduction', () => {
    const products = getProductsSnapshot();
    const coffeeItem = products.find((p) => p.id === 'fnb-01');
    expect(coffeeItem).toBeDefined();
    const initialStock = coffeeItem!.stock;

    // 1. Customer orders 2 Large Latte Aren (with price delta 5.000)
    const selectedVariant = coffeeItem!.variants?.find((v) => v.id === 'var-lrg');
    expect(selectedVariant).toBeDefined();
    expect(selectedVariant!.priceDelta).toBe(5000);

    const cartItem: CartItem = {
      menuItem: coffeeItem!,
      quantity: 2,
      selectedVariant,
      notes: 'Less sugar, oatmilk',
    };

    const unitPrice = coffeeItem!.price + selectedVariant!.priceDelta; // 26.000 + 5.000 = 31.000
    const subtotal = unitPrice * cartItem.quantity; // 62.000
    const taxRate = 0.1; // PB1 10%
    const tax = Math.round(subtotal * taxRate); // 6.200
    const total = subtotal + tax; // 68.200
    const amountPaid = 100000;
    const changeAmount = amountPaid - total; // 31.800

    // 2. Checkout transaction
    const transaction: Transaction = {
      id: 'TRX-E2E-FNB',
      orderNumber: 'ORD-FNB-01',
      timestamp: new Date().toISOString(),
      businessMode: 'fnb',
      customerName: 'Bapak Rian',
      tableNumber: 'Meja 08',
      orderType: 'dine_in',
      items: [cartItem],
      subtotal,
      discountAmount: 0,
      taxRate,
      tax,
      total,
      paymentMethod: 'tunai',
      amountPaid,
      changeAmount,
      status: 'selesai',
    };

    saveTransaction(transaction);

    // 3. Verify transaction recorded
    const allTransactions = getTransactionsSnapshot();
    const saved = allTransactions.find((t) => t.id === 'TRX-E2E-FNB');
    expect(saved).toBeDefined();
    expect(saved?.tableNumber).toBe('Meja 08');
    expect(saved?.total).toBe(68200);
    expect(saved?.changeAmount).toBe(31800);

    // 4. Verify stock deducted automatically
    const updatedProducts = getProductsSnapshot();
    const updatedCoffee = updatedProducts.find((p) => p.id === 'fnb-01');
    expect(updatedCoffee?.stock).toBe(initialStock - 2);
  });

  it('E2E Flow 2: Retail Fast Barcode Scan, Discount, 0% Tax, and Inventory Sync', () => {
    const products = getProductsSnapshot();
    const aquaItem = products.find((p) => p.sku === 'RTL-AQ-600');
    expect(aquaItem).toBeDefined();
    expect(aquaItem?.barcode).toBe('899999900101');
    const initialAquaStock = aquaItem!.stock;

    // 1. Barcode scan simulation
    const scannedCode = '899999900101';
    const foundByBarcode = products.find(
      (p) => p.barcode?.toLowerCase() === scannedCode.toLowerCase()
    );
    expect(foundByBarcode?.id).toBe(aquaItem?.id);

    // 2. Retail cart with 4 bottles of Aqua and 2.000 voucher discount
    const cartItem: CartItem = {
      menuItem: aquaItem!,
      quantity: 4,
    };
    const subtotal = aquaItem!.price * cartItem.quantity; // 5.000 * 4 = 20.000
    const discountAmount = 2000;
    const effectiveSubtotal = subtotal - discountAmount; // 18.000
    const taxRate = 0; // 0% tax in retail store
    const total = effectiveSubtotal;

    const retailTx: Transaction = {
      id: 'TRX-E2E-RTL',
      orderNumber: 'ORD-RTL-01',
      timestamp: new Date().toISOString(),
      businessMode: 'retail',
      customerName: 'Ibu Ratna',
      tableNumber: '',
      orderType: 'direct_sale',
      items: [cartItem],
      subtotal,
      discountAmount,
      taxRate,
      tax: 0,
      total,
      paymentMethod: 'qris',
      amountPaid: total,
      changeAmount: 0,
      status: 'selesai',
    };

    saveTransaction(retailTx);

    // 3. Verify stock deducted
    const updatedProducts = getProductsSnapshot();
    const updatedAqua = updatedProducts.find((p) => p.sku === 'RTL-AQ-600');
    expect(updatedAqua?.stock).toBe(initialAquaStock - 4);

    // 4. Verify summary calculation contains retail split
    const summary = calculateSalesSummary(getTransactionsSnapshot());
    expect(summary.retailRevenue).toBeGreaterThanOrEqual(18000);
    expect(summary.paymentBreakdown.qris).toBeGreaterThanOrEqual(18000);
  });

  it('E2E Flow 3: Resilience against corrupt/legacy storage items & missing fields', () => {
    // 1. Inject malformed/incomplete product into localStorage
    const incompleteProduct: MenuItem = {
      id: 'prod-incomplete',
      sku: 'SKU-INC',
      name: 'Item Incomplete',
      type: 'retail',
      category: 'snack',
      price: 10000,
      description: '',
      image: '',
      stock: 5,
    };
    saveProduct(incompleteProduct);

    const snapshot = getProductsSnapshot();
    const target = snapshot.find((p) => p.id === 'prod-incomplete');
    expect(target).toBeDefined();

    // 2. Search query check should not throw even if optional properties are null/undefined
    const query = 'inc';
    const matches = snapshot.filter(
      (item) =>
        (Boolean(item.name) && item.name.toLowerCase().includes(query)) ||
        (Boolean(item.sku) && item.sku.toLowerCase().includes(query)) ||
        (Boolean(item.barcode) && item.barcode?.toLowerCase().includes(query)) ||
        (Boolean(item.description) && item.description.toLowerCase().includes(query))
    );
    expect(matches.length).toBeGreaterThan(0);

    // 3. Deduct stock and manual stock update should not crash
    expect(() => deductStockForTransaction([])).not.toThrow();
    expect(() => deductStockForTransaction([{ menuItem: target!, quantity: 1 }])).not.toThrow();
    expect(() => updateProductStock(target!.id, 5)).not.toThrow();

    // 4. Verify delete
    deleteProduct('prod-incomplete');
    expect(getProductsSnapshot().find((p) => p.id === 'prod-incomplete')).toBeUndefined();
  });

  it('E2E Flow 4: Cart Key generation handles variant vs non-variant without collision', () => {
    const itemA: CartItem = {
      menuItem: { id: 'item-1' } as MenuItem,
      quantity: 1,
    };
    const itemAVariant1: CartItem = {
      menuItem: { id: 'item-1' } as MenuItem,
      selectedVariant: { id: 'var-1', name: 'Hot', priceDelta: 0 },
      quantity: 1,
    };
    const itemAVariant2: CartItem = {
      menuItem: { id: 'item-1' } as MenuItem,
      selectedVariant: { id: 'var-2', name: 'Cold', priceDelta: 0 },
      quantity: 1,
    };

    const keyA = getCartItemKey(itemA);
    const keyVar1 = getCartItemKey(itemAVariant1);
    const keyVar2 = getCartItemKey(itemAVariant2);

    expect(keyA).toBe('item-1');
    expect(keyVar1).toBe('item-1::var-1');
    expect(keyVar2).toBe('item-1::var-2');
    expect(keyA).not.toBe(keyVar1);
    expect(keyVar1).not.toBe(keyVar2);
  });
});
