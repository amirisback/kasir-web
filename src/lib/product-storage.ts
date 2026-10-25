import { MenuItem, CartItem } from '@/types/pos';
import defaultProductsRaw from '@/data/menu.json';

const PRODUCTS_STORAGE_KEY = 'amirpos_products_v2';

const INITIAL_PRODUCTS: MenuItem[] = defaultProductsRaw as MenuItem[];

let cachedProducts: MenuItem[] = INITIAL_PRODUCTS;
let cachedRawProducts: string | null = null;
const productListeners = new Set<() => void>();

function notifyProductListeners(): void {
  productListeners.forEach((listener) => listener());
}

export function subscribeProducts(callback: () => void): () => void {
  productListeners.add(callback);

  const handleStorage = (event: StorageEvent): void => {
    if (event.key === PRODUCTS_STORAGE_KEY) {
      getStoredProducts();
      callback();
    }
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    productListeners.delete(callback);
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

export function getProductsSnapshot(): MenuItem[] {
  if (typeof window === 'undefined') return INITIAL_PRODUCTS;
  return getStoredProducts();
}

export function getProductsServerSnapshot(): MenuItem[] {
  return INITIAL_PRODUCTS;
}

export function getStoredProducts(): MenuItem[] {
  if (typeof window === 'undefined') {
    return INITIAL_PRODUCTS;
  }

  try {
    const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
    if (!raw) {
      const initialJson = JSON.stringify(INITIAL_PRODUCTS);
      localStorage.setItem(PRODUCTS_STORAGE_KEY, initialJson);
      cachedRawProducts = initialJson;
      cachedProducts = INITIAL_PRODUCTS;
      return cachedProducts;
    }

    if (raw !== cachedRawProducts) {
      cachedRawProducts = raw;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        cachedProducts = parsed.map((p) => ({
          ...p,
          price: Math.max(0, Number(p?.price) || 0),
          stock: Math.max(0, Number(p?.stock) || 0),
          costPrice: Math.max(0, Number(p?.costPrice) || 0),
          sku: p?.sku || `SKU-${p?.id}`,
          type: p?.type === 'retail' ? 'retail' : 'fnb',
        })) as MenuItem[];
      } else {
        cachedProducts = INITIAL_PRODUCTS;
      }
    }
    return cachedProducts;
  } catch {
    return cachedProducts;
  }
}

export function saveProduct(product: MenuItem): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getStoredProducts();
    const existingIndex = current.findIndex((p) => p.id === product.id);

    let updated: MenuItem[];
    if (existingIndex > -1) {
      updated = [...current];
      updated[existingIndex] = product;
    } else {
      updated = [product, ...current];
    }

    const updatedJson = JSON.stringify(updated);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, updatedJson);
    cachedRawProducts = updatedJson;
    cachedProducts = updated;
    notifyProductListeners();
  } catch (error) {
    console.error('Gagal menyimpan produk ke storage lokal:', error);
  }
}

export function deleteProduct(id: string): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getStoredProducts();
    const updated = current.filter((p) => p.id !== id);
    const updatedJson = JSON.stringify(updated);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, updatedJson);
    cachedRawProducts = updatedJson;
    cachedProducts = updated;
    notifyProductListeners();
  } catch (error) {
    console.error('Gagal menghapus produk:', error);
  }
}

export function updateProductStock(id: string, delta: number): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getStoredProducts();
    const existingIndex = current.findIndex((p) => p.id === id);
    if (existingIndex === -1) return;

    const updated = [...current];
    const newStock = Math.max(0, updated[existingIndex].stock + delta);
    updated[existingIndex] = { ...updated[existingIndex], stock: newStock };

    const updatedJson = JSON.stringify(updated);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, updatedJson);
    cachedRawProducts = updatedJson;
    cachedProducts = updated;
    notifyProductListeners();
  } catch (error) {
    console.error('Gagal memperbarui stok:', error);
  }
}

export function deductStockForTransaction(items: CartItem[]): void {
  if (typeof window === 'undefined' || !Array.isArray(items) || items.length === 0) return;

  try {
    const current = getStoredProducts();
    const stockMap = new Map<string, number>();

    items.forEach((item) => {
      const id = item?.menuItem?.id;
      if (!id) return;
      const qty = Math.max(0, Number(item.quantity) || 0);
      const prevQty = stockMap.get(id) || 0;
      stockMap.set(id, prevQty + qty);
    });

    const updated = current.map((prod) => {
      const deductQty = stockMap.get(prod.id);
      if (deductQty !== undefined) {
        return {
          ...prod,
          stock: Math.max(0, prod.stock - deductQty),
        };
      }
      return prod;
    });

    const updatedJson = JSON.stringify(updated);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, updatedJson);
    cachedRawProducts = updatedJson;
    cachedProducts = updated;
    notifyProductListeners();
  } catch (error) {
    console.error('Gagal memotong stok transaksi:', error);
  }
}

export function resetProducts(): void {
  if (typeof window === 'undefined') return;

  try {
    const initialJson = JSON.stringify(INITIAL_PRODUCTS);
    localStorage.setItem(PRODUCTS_STORAGE_KEY, initialJson);
    cachedRawProducts = initialJson;
    cachedProducts = INITIAL_PRODUCTS;
    notifyProductListeners();
  } catch (error) {
    console.error('Gagal mereset produk:', error);
  }
}
