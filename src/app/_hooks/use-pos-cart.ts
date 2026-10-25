'use client';

import { useSyncExternalStore, useCallback, useMemo } from 'react';
import { MenuItem, CartItem, OrderType, BusinessMode, ProductVariant } from '@/types/pos';

const CART_STORAGE_KEY = 'amirpos_active_cart_v2';

export interface CartState {
  items: CartItem[];
  businessMode: BusinessMode;
  orderType: OrderType;
  customerName: string;
  tableNumber: string;
  discountAmount: number;
  taxRate: number; // 0, 0.1, or 0.11
}

const defaultState: CartState = {
  items: [],
  businessMode: 'fnb',
  orderType: 'dine_in',
  customerName: '',
  tableNumber: '',
  discountAmount: 0,
  taxRate: 0.1, // Default 10% PB1
};

let currentCartState: CartState = defaultState;
const cartListeners = new Set<() => void>();

function notifyCartListeners(): void {
  cartListeners.forEach((listener) => listener());
}

export function getCartItemKey(item: CartItem): string {
  const variantPart = item.selectedVariant ? `::${item.selectedVariant.id}` : '';
  return `${item.menuItem.id}${variantPart}`;
}

function loadInitialCartState(): CartState {
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        businessMode: parsed.businessMode === 'retail' ? 'retail' : 'fnb',
        orderType: parsed.orderType || (parsed.businessMode === 'retail' ? 'direct_sale' : 'dine_in'),
        customerName: parsed.customerName || '',
        tableNumber: parsed.tableNumber || '',
        discountAmount: Number(parsed.discountAmount) || 0,
        taxRate: typeof parsed.taxRate === 'number' ? parsed.taxRate : 0.1,
      };
    }
  } catch {
    // Ignore parse error
  }
  return defaultState;
}

if (typeof window !== 'undefined') {
  currentCartState = loadInitialCartState();
}

function setCartState(updater: (prev: CartState) => CartState): void {
  currentCartState = updater(currentCartState);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(currentCartState));
    } catch {
      // Ignore storage error
    }
  }
  notifyCartListeners();
}

function subscribeCart(callback: () => void): () => void {
  cartListeners.add(callback);
  return () => {
    cartListeners.delete(callback);
  };
}

function getCartSnapshot(): CartState {
  return currentCartState;
}

function getCartServerSnapshot(): CartState {
  return defaultState;
}

export function usePosCart() {
  const state = useSyncExternalStore(subscribeCart, getCartSnapshot, getCartServerSnapshot);

  const addItem = useCallback(
    (menuItem: MenuItem, variant?: ProductVariant, qty: number = 1) => {
      setCartState((prev) => {
        const targetVariantId = variant?.id;
        const existingIndex = prev.items.findIndex(
          (i) => i.menuItem.id === menuItem.id && i.selectedVariant?.id === targetVariantId
        );

        if (existingIndex > -1) {
          const nextItems = [...prev.items];
          nextItems[existingIndex] = {
            ...nextItems[existingIndex],
            quantity: nextItems[existingIndex].quantity + qty,
          };
          return { ...prev, items: nextItems };
        }

        return {
          ...prev,
          items: [
            ...prev.items,
            {
              menuItem,
              quantity: qty,
              selectedVariant: variant,
              itemDiscount: 0,
            },
          ],
        };
      });
    },
    []
  );

  const scanBarcode = useCallback(
    (barcodeOrSku: string, catalog: MenuItem[]): { success: boolean; item?: MenuItem } => {
      if (!barcodeOrSku || !Array.isArray(catalog)) return { success: false };
      const query = barcodeOrSku.trim().toLowerCase();
      if (!query) return { success: false };

      const found = catalog.find(
        (p) =>
          (Boolean(p?.barcode) && p.barcode?.toLowerCase() === query) ||
          (Boolean(p?.sku) && p.sku?.toLowerCase() === query)
      );

      if (found) {
        addItem(found);
        return { success: true, item: found };
      }
      return { success: false };
    },
    [addItem]
  );

  const updateQuantity = useCallback((itemKey: string, delta: number) => {
    setCartState((prev) => {
      const nextItems = prev.items
        .map((item) => {
          if (getCartItemKey(item) === itemKey) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
      return { ...prev, items: nextItems };
    });
  }, []);

  const removeItem = useCallback((itemKey: string) => {
    setCartState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => getCartItemKey(item) !== itemKey),
    }));
  }, []);

  const updateNotes = useCallback((itemKey: string, notes: string) => {
    setCartState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        getCartItemKey(item) === itemKey ? { ...item, notes } : item
      ),
    }));
  }, []);

  const setBusinessMode = useCallback((mode: BusinessMode) => {
    setCartState((prev) => ({
      ...prev,
      businessMode: mode,
      orderType: mode === 'retail' ? 'direct_sale' : prev.orderType === 'direct_sale' ? 'dine_in' : prev.orderType,
      // Retail default tax 0% unless customized, F&B default 10%
      taxRate: mode === 'retail' ? 0 : 0.1,
    }));
  }, []);

  const setOrderType = useCallback((orderType: OrderType) => {
    setCartState((prev) => ({ ...prev, orderType }));
  }, []);

  const setCustomerName = useCallback((customerName: string) => {
    setCartState((prev) => ({ ...prev, customerName }));
  }, []);

  const setTableNumber = useCallback((tableNumber: string) => {
    setCartState((prev) => ({ ...prev, tableNumber }));
  }, []);

  const setDiscountAmount = useCallback((discountAmount: number) => {
    setCartState((prev) => ({
      ...prev,
      discountAmount: Math.max(0, discountAmount),
    }));
  }, []);

  const setTaxRate = useCallback((taxRate: number) => {
    setCartState((prev) => ({
      ...prev,
      taxRate: Math.max(0, taxRate),
    }));
  }, []);

  const clearCart = useCallback(() => {
    setCartState((prev) => ({
      ...prev,
      items: [],
      customerName: '',
      tableNumber: '',
      discountAmount: 0,
    }));
  }, []);

  // Price calculations
  const subtotal = useMemo(() => {
    return state.items.reduce((sum, item) => {
      const basePrice = Number(item?.menuItem?.price) || 0;
      const variantDelta = Number(item?.selectedVariant?.priceDelta) || 0;
      const itemDisc = Number(item?.itemDiscount) || 0;
      const unitTotal = Math.max(0, basePrice + variantDelta - itemDisc);
      const qty = Math.max(1, Number(item?.quantity) || 1);
      return sum + unitTotal * qty;
    }, 0);
  }, [state.items]);

  const effectiveSubtotal = useMemo(() => {
    return Math.max(0, subtotal - state.discountAmount);
  }, [subtotal, state.discountAmount]);

  const tax = useMemo(() => {
    return Math.round(effectiveSubtotal * state.taxRate);
  }, [effectiveSubtotal, state.taxRate]);

  const total = useMemo(() => {
    return effectiveSubtotal + tax;
  }, [effectiveSubtotal, tax]);

  const totalItems = useMemo(() => {
    return state.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [state.items]);

  return {
    items: state.items,
    businessMode: state.businessMode,
    orderType: state.orderType,
    customerName: state.customerName,
    tableNumber: state.tableNumber,
    discountAmount: state.discountAmount,
    taxRate: state.taxRate,
    subtotal,
    effectiveSubtotal,
    tax,
    total,
    totalItems,
    addItem,
    scanBarcode,
    updateQuantity,
    removeItem,
    updateNotes,
    setBusinessMode,
    setOrderType,
    setCustomerName,
    setTableNumber,
    setDiscountAmount,
    setTaxRate,
    clearCart,
  };
}
