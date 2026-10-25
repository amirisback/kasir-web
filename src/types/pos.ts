export type BusinessMode = 'fnb' | 'retail';

export type ProductType = 'fnb' | 'retail';

export type MenuCategory =
  | 'semua'
  | 'kopi'
  | 'non-kopi'
  | 'makanan'
  | 'camilan'
  | 'penutup'
  | 'sembako'
  | 'minuman-kemasan'
  | 'snack'
  | 'perawatan'
  | 'alat-tulis';

export interface ProductVariant {
  id: string;
  name: string;
  priceDelta: number;
}

export interface MenuItem {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  type: ProductType;
  category: string;
  price: number;
  costPrice?: number;
  unit?: string;
  description: string;
  image: string;
  stock: number;
  isFavorite?: boolean;
  variants?: ProductVariant[];
}

export type ProductItem = MenuItem;

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  selectedVariant?: ProductVariant;
  itemDiscount?: number;
  notes?: string;
}

export type OrderType = 'dine_in' | 'take_away' | 'direct_sale';

export type PaymentMethod = 'tunai' | 'qris' | 'debit' | 'transfer';

export interface Transaction {
  id: string;
  orderNumber: string;
  timestamp: string;
  businessMode: BusinessMode;
  customerName?: string;
  tableNumber?: string;
  orderType: OrderType;
  items: CartItem[];
  subtotal: number;
  discountAmount: number;
  taxRate: number;
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
  retailRevenue: number;
  fnbRevenue: number;
  paymentBreakdown: {
    tunai: number;
    qris: number;
    debit: number;
    transfer?: number;
  };
}
