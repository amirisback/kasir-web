import { Transaction, DailySalesSummary } from '@/types/pos';
import { deductStockForTransaction } from './product-storage';

const STORAGE_KEY = 'kulapos_transactions_v2';

// Initial demo transactions for first run (Dual-Mode: Retail + F&B)
const INITIAL_DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: 'TRX-101',
    orderNumber: 'ORD-001',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    businessMode: 'fnb',
    customerName: 'Budi Santoso',
    tableNumber: '04',
    orderType: 'dine_in',
    items: [
      {
        menuItem: {
          id: 'fnb-01',
          sku: 'KOP-001',
          barcode: '899100100001',
          name: 'Kula Latte Aren',
          type: 'fnb',
          category: 'kopi',
          price: 26000,
          costPrice: 12000,
          unit: 'cup',
          description: 'Espresso ganda dengan susu segar dan gula aren organik',
          image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
          stock: 45,
          variants: [
            { id: 'var-reg', name: 'Regular (Ice)', priceDelta: 0 },
            { id: 'var-lrg', name: 'Large (+5.000)', priceDelta: 5000 },
          ],
        },
        quantity: 2,
        selectedVariant: { id: 'var-lrg', name: 'Large (+5.000)', priceDelta: 5000 },
      },
      {
        menuItem: {
          id: 'fnb-08',
          sku: 'PST-001',
          barcode: '899100100008',
          name: 'Butter Croissant Artisan',
          type: 'fnb',
          category: 'penutup',
          price: 24000,
          costPrice: 11000,
          unit: 'pcs',
          description: 'Pastry lapis mentega Prancis renyah',
          image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80',
          stock: 20,
        },
        quantity: 1,
      },
    ],
    subtotal: 86000,
    discountAmount: 5000,
    taxRate: 0.1,
    tax: 8100,
    total: 89100,
    paymentMethod: 'qris',
    amountPaid: 89100,
    changeAmount: 0,
    status: 'selesai',
  },
  {
    id: 'TRX-102',
    orderNumber: 'ORD-002',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    businessMode: 'retail',
    customerName: 'Siti Rahma',
    tableNumber: '',
    orderType: 'direct_sale',
    items: [
      {
        menuItem: {
          id: 'rtl-01',
          sku: 'RTL-AQ-600',
          barcode: '899999900101',
          name: 'Air Mineral Aqua 600ml',
          type: 'retail',
          category: 'minuman-kemasan',
          price: 5000,
          costPrice: 3200,
          unit: 'botol',
          description: 'Air mineral pegunungan murni',
          image: 'https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=600&q=80',
          stock: 120,
        },
        quantity: 3,
      },
      {
        menuItem: {
          id: 'rtl-03',
          sku: 'RTL-IND-GOR',
          barcode: '899999900103',
          name: 'Indomie Goreng Spesial',
          type: 'retail',
          category: 'sembako',
          price: 3500,
          costPrice: 2700,
          unit: 'bungkus',
          description: 'Mi instan goreng legendaris',
          image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&w=600&q=80',
          stock: 150,
        },
        quantity: 5,
      },
    ],
    subtotal: 32500,
    discountAmount: 0,
    taxRate: 0,
    tax: 0,
    total: 32500,
    paymentMethod: 'tunai',
    amountPaid: 50000,
    changeAmount: 17500,
    status: 'selesai',
  },
];

let cachedTransactions: Transaction[] = INITIAL_DEMO_TRANSACTIONS;
let cachedRaw: string | null = null;
const listeners = new Set<() => void>();

function notifyTransactionListeners(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeTransactions(callback: () => void): () => void {
  listeners.add(callback);

  const handleStorage = (event: StorageEvent): void => {
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
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        cachedTransactions = parsed.map((t) => ({
          ...t,
          businessMode: t?.businessMode === 'retail' ? 'retail' : 'fnb',
          discountAmount: Number(t?.discountAmount) || 0,
          taxRate: typeof t?.taxRate === 'number' ? t.taxRate : 0.1,
          total: Number(t?.total) || 0,
          subtotal: Number(t?.subtotal) || 0,
          tax: Number(t?.tax) || 0,
          amountPaid: Number(t?.amountPaid) || 0,
          changeAmount: Number(t?.changeAmount) || 0,
          items: Array.isArray(t?.items) ? t.items : [],
          status: t?.status === 'dibatalkan' ? 'dibatalkan' : 'selesai',
        })) as Transaction[];
      } else {
        cachedTransactions = INITIAL_DEMO_TRANSACTIONS;
      }
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

    // Otomatis kurangi stok produk lokal
    deductStockForTransaction(transaction.items);

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
  if (!Array.isArray(transactions)) {
    return {
      totalRevenue: 0,
      totalTransactions: 0,
      averageOrderValue: 0,
      retailRevenue: 0,
      fnbRevenue: 0,
      paymentBreakdown: { tunai: 0, qris: 0, debit: 0, transfer: 0 },
    };
  }

  const completed = transactions.filter((t) => t && t.status === 'selesai');
  const totalRevenue = completed.reduce((sum, t) => sum + (Number(t?.total) || 0), 0);
  const totalTransactions = completed.length;
  const averageOrderValue =
    totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

  let retailRevenue = 0;
  let fnbRevenue = 0;

  const paymentBreakdown = {
    tunai: 0,
    qris: 0,
    debit: 0,
    transfer: 0,
  };

  completed.forEach((t) => {
    const val = Number(t?.total) || 0;
    if (t?.businessMode === 'retail') {
      retailRevenue += val;
    } else {
      fnbRevenue += val;
    }

    if (t?.paymentMethod && t.paymentMethod in paymentBreakdown) {
      paymentBreakdown[t.paymentMethod] += val;
    }
  });

  return {
    totalRevenue,
    totalTransactions,
    averageOrderValue,
    retailRevenue,
    fnbRevenue,
    paymentBreakdown,
  };
}
