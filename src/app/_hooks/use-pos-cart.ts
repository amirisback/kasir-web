'use client';

import { useSyncExternalStore, useCallback, useMemo } from 'react';
import { MenuItem, CartItem, OrderType } from '@/types/pos';

const CART_STORAGE_KEY = 'kulapos_active_cart_v1';

interface CartState {
  items: CartItem[];
  orderType: OrderType;
  customerName: string;
  tableNumber: string;
}

const defaultState: CartState = {
  items: [],
  orderType: 'dine_in',
  customerName: '',
  tableNumber: '',
};

let currentCartState: CartState = defaultState;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function loadInitialState(): CartState {
  if (typeof window === 'undefined') return defaultState;
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        items: Array.isArray(parsed.items) ? parsed.items : [],
        orderType: parsed.orderType || 'dine_in',
        customerName: parsed.customerName || '',
        tableNumber: parsed.tableNumber || '',
      };
    }
  } catch {
    // Ignore parse error
  }
  return defaultState;
}

if (typeof window !== 'undefined') {
  currentCartState = loadInitialState();
}

function setCartState(updater: (prev: CartState) => CartState) {
  currentCartState = updater(currentCartState);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(currentCartState));
    } catch {
      // Ignore storage error
    }
  }
  notifyListeners();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): CartState {
  return currentCartState;
}

function getServerSnapshot(): CartState {
  return defaultState;
}

export function usePosCart() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback((menuItem: MenuItem) => {
    setCartState((prev) => {
      const existingIndex = prev.items.findIndex(
        (i) => i.menuItem.id === menuItem.id
      );
      if (existingIndex > -1) {
        const nextItems = [...prev.items];
        nextItems[existingIndex] = {
          ...nextItems[existingIndex],
          quantity: nextItems[existingIndex].quantity + 1,
        };
        return { ...prev, items: nextItems };
      }
      return { ...prev, items: [...prev.items, { menuItem, quantity: 1 }] };
    });
  }, []);

  const updateQuantity = useCallback((menuItemId: string, delta: number) => {
    setCartState((prev) => {
      const nextItems = prev.items
        .map((item) => {
          if (item.menuItem.id === menuItemId) {
            const nextQty = item.quantity + delta;
            return nextQty > 0 ? { ...item, quantity: nextQty } : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
      return { ...prev, items: nextItems };
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setCartState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.menuItem.id !== menuItemId),
    }));
  }, []);

  const updateNotes = useCallback((menuItemId: string, notes: string) => {
    setCartState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.menuItem.id === menuItemId ? { ...item, notes } : item
      ),
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

  const clearCart = useCallback(() => {
    setCartState(() => ({
      items: [],
      orderType: 'dine_in',
      customerName: '',
      tableNumber: '',
    }));
  }, []);

  const subtotal = useMemo(() => {
    return state.items.reduce(
      (sum, item) => sum + item.menuItem.price * item.quantity,
      0
    );
  }, [state.items]);

  const tax = useMemo(() => {
    return Math.round(subtotal * 0.1); // PB1 10%
  }, [subtotal]);

  const total = useMemo(() => {
    return subtotal + tax;
  }, [subtotal, tax]);

  const totalItems = useMemo(() => {
    return state.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [state.items]);

  return {
    items: state.items,
    orderType: state.orderType,
    customerName: state.customerName,
    tableNumber: state.tableNumber,
    subtotal,
    tax,
    total,
    totalItems,
    addItem,
    updateQuantity,
    removeItem,
    updateNotes,
    setOrderType,
    setCustomerName,
    setTableNumber,
    clearCart,
  };
}
