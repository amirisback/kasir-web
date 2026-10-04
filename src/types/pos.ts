export type MenuCategory = 'semua' | 'kopi' | 'non-kopi' | 'makanan' | 'camilan' | 'penutup';

export interface MenuItem {
  id: string;
  name: string;
  category: Exclude<MenuCategory, 'semua'>;
  price: number;
  description: string;
  image: string;
  stock: number;
  isFavorite?: boolean;
}

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export type OrderType = 'dine_in' | 'take_away';

export type PaymentMethod = 'tunai' | 'qris' | 'debit';

export interface Transaction {
  id: string;
  orderNumber: string;
  timestamp: string;
  customerName?: string;
  tableNumber?: string;
  orderType: OrderType;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  changeAmount: number;
  status: 'selesai' | 'dibatalkan';
}

export interface DailySalesSummary {
  totalRevenue: number;
  totalTransactions: number;
  averageOrderValue: number;
  paymentBreakdown: {
    tunai: number;
    qris: number;
    debit: number;
  };
}
