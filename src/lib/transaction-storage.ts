import { Transaction, DailySalesSummary } from '@/types/pos';

const STORAGE_KEY = 'kulapos_transactions_v1';

// Initial demo transactions for first run
const INITIAL_DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'TRX-101',
    orderNumber: 'ORD-001',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    customerName: 'Budi Santoso',
    tableNumber: '04',
    orderType: 'dine_in',
    items: [
      {
        menuItem: {
          id: 'item-01',
          name: 'Kula Latte Aren',
          category: 'kopi',
          price: 26000,
          description: 'Espresso ganda dengan susu segar dan gula aren organik',
          image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
          stock: 45,
        },
        quantity: 2,
      },
      {
        menuItem: {
          id: 'item-13',
          name: 'Butter Croissant Artisan',
          category: 'penutup',
          price: 24000,
          description: 'Pastry lapis mentega Prancis renyah',
          image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
          stock: 15,
        },
        quantity: 1,
      },
    ],
    subtotal: 76000,
    tax: 7600,
    total: 83600,
    paymentMethod: 'qris',
    amountPaid: 83600,
    changeAmount: 0,
    status: 'selesai',
  },
  {
    id: 'TRX-102',
    orderNumber: 'ORD-002',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    customerName: 'Siti Rahma',
    tableNumber: '',
    orderType: 'take_away',
    items: [
      {
        menuItem: {
          id: 'item-03',
          name: 'Americano Long Black',
          category: 'kopi',
          price: 22000,
          description: 'Espresso segar dipadukan dengan air mineral panas',
          image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80',
          stock: 60,
        },
        quantity: 1,
      },
      {
        menuItem: {
          id: 'item-08',
          name: 'Nasi Goreng Kampung Kula',
          category: 'makanan',
          price: 32000,
          description: 'Nasi goreng bumbu tradisional dengan suwiran ayam',
          image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=80',
          stock: 25,
        },
        quantity: 1,
      },
    ],
    subtotal: 54000,
    tax: 5400,
    total: 59400,
    paymentMethod: 'tunai',
    amountPaid: 100000,
    changeAmount: 40600,
    status: 'selesai',
  },
];

let cachedTransactions: Transaction[] = INITIAL_DEMO_TRANSACTIONS;
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

function notifyTransactionListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeTransactions(callback: () => void) {
  listeners.add(callback);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      getStoredTransactions();
      callback();
    }
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    listeners.delete(callback);
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

export function getTransactionsSnapshot(): Transaction[] {
  if (typeof window === 'undefined') return INITIAL_DEMO_TRANSACTIONS;
  return getStoredTransactions();
}

export function getTransactionsServerSnapshot(): Transaction[] {
  return INITIAL_DEMO_TRANSACTIONS;
}

export function getStoredTransactions(): Transaction[] {
  if (typeof window === 'undefined') {
    return INITIAL_DEMO_TRANSACTIONS;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initialJson = JSON.stringify(INITIAL_DEMO_TRANSACTIONS);
      localStorage.setItem(STORAGE_KEY, initialJson);
      cachedRaw = initialJson;
      cachedTransactions = INITIAL_DEMO_TRANSACTIONS;
      return cachedTransactions;
    }

    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedTransactions = JSON.parse(raw) as Transaction[];
    }
    return cachedTransactions;
  } catch {
    return cachedTransactions;
  }
}

export function saveTransaction(transaction: Transaction): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getStoredTransactions();
    const updated = [transaction, ...current];
    const updatedJson = JSON.stringify(updated);
    localStorage.setItem(STORAGE_KEY, updatedJson);
    cachedRaw = updatedJson;
    cachedTransactions = updated;
    notifyTransactionListeners();
  } catch (error) {
    console.error('Gagal menyimpan transaksi ke storage lokal:', error);
  }
}

export function resetStoredTransactions(): void {
  if (typeof window === 'undefined') return;
  try {
    const initialJson = JSON.stringify(INITIAL_DEMO_TRANSACTIONS);
    localStorage.setItem(STORAGE_KEY, initialJson);
    cachedRaw = initialJson;
    cachedTransactions = INITIAL_DEMO_TRANSACTIONS;
    notifyTransactionListeners();
  } catch (error) {
    console.error('Gagal mereset transaksi:', error);
  }
}

export function calculateSalesSummary(transactions: Transaction[]): DailySalesSummary {
  const completed = transactions.filter((t) => t.status === 'selesai');
  const totalRevenue = completed.reduce((sum, t) => sum + t.total, 0);
  const totalTransactions = completed.length;
  const averageOrderValue = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  const paymentBreakdown = {
    tunai: 0,
    qris: 0,
    debit: 0,
  };

  completed.forEach((t) => {
    if (t.paymentMethod in paymentBreakdown) {
      paymentBreakdown[t.paymentMethod] += t.total;
    }
  });

  return {
    totalRevenue,
    totalTransactions,
    averageOrderValue,
    paymentBreakdown,
  };
}
