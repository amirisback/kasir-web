'use client';

import React, { useState, useMemo, useEffect, useRef, useSyncExternalStore } from 'react';
import Image from 'next/image';
import {
  MenuItem,
  PaymentMethod,
  Transaction,
  BusinessMode,
} from '@/types/pos';
import { usePosCart, getCartItemKey } from '@/app/_hooks/use-pos-cart';
import { saveTransaction } from '@/lib/transaction-storage';
import {
  getProductsSnapshot,
  subscribeProducts,
  saveProduct,
  deleteProduct,
  updateProductStock,
  resetProducts,
} from '@/lib/product-storage';
import { Button } from '@/app/_components/ui/button';
import { Badge } from '@/app/_components/ui/badge';
import { Modal } from '@/app/_components/ui/modal';

interface PosClientProps {
  initialMenuItems: MenuItem[];
}

export function PosClient({ initialMenuItems }: PosClientProps) {
  // Real-time local reactive products with SSR fallback
  const liveProducts = useSyncExternalStore(
    subscribeProducts,
    getProductsSnapshot,
    () => initialMenuItems
  );

  const {
    items,
    businessMode,
    orderType,
    customerName,
    tableNumber,
    discountAmount,
    taxRate,
    subtotal,
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
  } = usePosCart();

  // Local UI State
  const [activeCategory, setActiveCategory] = useState<string>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

  // Variant picker target
  const [variantTargetItem, setVariantTargetItem] = useState<MenuItem | null>(null);

  // Receipt format (58mm vs 80mm)
  const [receiptWidth, setReceiptWidth] = useState<'58mm' | '80mm'>('58mm');

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [cashAmountInput, setCashAmountInput] = useState<string>('');
  const [latestTransaction, setLatestTransaction] = useState<Transaction | null>(null);

  // Discount form state
  const [tempDiscountInput, setTempDiscountInput] = useState<string>('0');
  const [tempTaxRate, setTempTaxRate] = useState<number>(taxRate);

  // Product management form state
  const [editingProduct, setEditingProduct] = useState<Partial<MenuItem> | null>(null);

  // Ref for search/barcode input
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Format currency IDR
  const formatRupiah = (val: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Toast feedback helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Global Barcode Scanner Listener (Hardware USB/Bluetooth scanner buffer detection)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcut '/' to focus search
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      const target = e.target as HTMLElement;
      // Do not capture if typing in normal text inputs
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      const now = Date.now();
      const diff = now - lastKeyTime;
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          const scanned = buffer.trim();
          const res = scanBarcode(scanned, liveProducts);
          if (res.success && res.item) {
            showToast(`✅ [Barcode] ${res.item.name} ditambahkan`);
          } else {
            showToast(`⚠️ Barcode / SKU "${scanned}" tidak ditemukan`);
          }
        }
        buffer = '';
      } else if (e.key.length === 1) {
        // Barcode scanners usually send characters within < 50ms intervals
        if (diff > 100) {
          buffer = e.key;
        } else {
          buffer += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [liveProducts, scanBarcode]);

  // Handle manual barcode input submit
  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const res = scanBarcode(barcodeInput, liveProducts);
    if (res.success && res.item) {
      showToast(`✅ [Scan] ${res.item.name} ditambahkan`);
      setBarcodeInput('');
    } else {
      showToast(`⚠️ Barcode / SKU "${barcodeInput}" tidak terdaftar`);
    }
  };

  // Filter products by mode, category, and search query
  const filteredProducts = useMemo(() => {
    return liveProducts.filter((item) => {
      // Filter by mode
      const matchMode =
        activeCategory === 'semua_global'
          ? true
          : item.type === businessMode;

      // Filter by category
      const matchCategory =
        activeCategory === 'semua' ||
        activeCategory === 'semua_global' ||
        item.category === activeCategory;

      // Filter by query (Name, SKU, Barcode) safely
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        (Boolean(item.name) && item.name.toLowerCase().includes(q)) ||
        (Boolean(item.sku) && item.sku.toLowerCase().includes(q)) ||
        (Boolean(item.barcode) && item.barcode?.toLowerCase().includes(q)) ||
        (Boolean(item.description) && item.description.toLowerCase().includes(q));

      return matchMode && matchCategory && matchSearch;
    });
  }, [liveProducts, businessMode, activeCategory, searchQuery]);

  // Category buttons tailored by mode
  const fnbCategories = [
    { key: 'semua', label: 'Semua F&B' },
    { key: 'kopi', label: '☕ Kopi' },
    { key: 'non-kopi', label: '🍵 Non-Kopi' },
    { key: 'makanan', label: '🍽️ Makanan' },
    { key: 'camilan', label: '🍟 Camilan' },
    { key: 'penutup', label: '🥐 Pastry/Dessert' },
  ];

  const retailCategories = [
    { key: 'semua', label: 'Semua Retail' },
    { key: 'minuman-kemasan', label: '🥤 Minuman Botol' },
    { key: 'sembako', label: '🍚 Sembako/Mi' },
    { key: 'snack', label: '🍿 Snack & Biskuit' },
    { key: 'perawatan', label: '🧴 Perawatan/Tisu' },
    { key: 'alat-tulis', label: '✏️ Alat Tulis' },
  ];

  const activeCategoryList = businessMode === 'fnb' ? fnbCategories : retailCategories;

  // Handle clicking product card
  const handleProductClick = (product: MenuItem) => {
    if (product.stock <= 0) {
      showToast(`⚠️ Stok "${product.name}" habis!`);
      return;
    }

    if (product.variants && product.variants.length > 0) {
      setVariantTargetItem(product);
      setIsVariantModalOpen(true);
    } else {
      addItem(product);
      showToast(`+1 ${product.name}`);
    }
  };

  // Quick cash calculations
  const cashAmountNum = Number(cashAmountInput) || 0;
  const changeAmount = Math.max(0, cashAmountNum - total);
  const isPaymentValid =
    paymentMethod === 'tunai' ? cashAmountNum >= total && total > 0 : total > 0;

  // Open payment modal
  const handleOpenPayment = () => {
    if (items.length === 0) return;
    setCashAmountInput(total.toString());
    setIsPaymentModalOpen(true);
  };

  // Complete transaction
  const handleCompleteTransaction = () => {
    if (!isPaymentValid) return;

    const trxId = `TRX-${Date.now().toString().slice(-6)}`;
    const orderNum = `ORD-${Math.floor(100 + Math.random() * 900)}`;
    const amountPaid = paymentMethod === 'tunai' ? cashAmountNum : total;

    const newTransaction: Transaction = {
      id: trxId,
      orderNumber: orderNum,
      timestamp: new Date().toISOString(),
      businessMode,
      customerName: customerName.trim() || (businessMode === 'retail' ? 'Pelanggan Toko' : 'Pelanggan Resto'),
      tableNumber: businessMode === 'fnb' && orderType === 'dine_in' ? tableNumber.trim() || 'Meja' : '',
      orderType,
      items: [...items],
      subtotal,
      discountAmount,
      taxRate,
      tax,
      total,
      paymentMethod,
      amountPaid,
      changeAmount: paymentMethod === 'tunai' ? changeAmount : 0,
      status: 'selesai',
    };

    saveTransaction(newTransaction);
    setLatestTransaction(newTransaction);
    setIsPaymentModalOpen(false);
    setIsReceiptModalOpen(true);
  };

  // Print receipt
  const handlePrintReceipt = () => {
    window.print();
  };

  // Copy receipt text to clipboard
  const handleCopyReceiptText = () => {
    if (!latestTransaction) return;
    const t = latestTransaction;
    const text = [
      `=== AmirPOS (${t.businessMode === 'retail' ? 'RETAIL' : 'F&B'}) ===`,
      `No: ${t.orderNumber} | ID: ${t.id}`,
      `Waktu: ${new Date(t.timestamp).toLocaleString('id-ID')}`,
      `Pelanggan: ${t.customerName}`,
      t.tableNumber ? `Meja: ${t.tableNumber}` : `Tipe: ${t.orderType}`,
      '--------------------------------',
      ...t.items.map(
        (i) =>
          `${i.menuItem.name}${i.selectedVariant ? ` (${i.selectedVariant.name})` : ''} x${i.quantity} = ${formatRupiah((i.menuItem.price + (i.selectedVariant?.priceDelta || 0)) * i.quantity)}`
      ),
      '--------------------------------',
      `Subtotal: ${formatRupiah(t.subtotal)}`,
      t.discountAmount > 0 ? `Diskon: -${formatRupiah(t.discountAmount)}` : null,
      t.tax > 0 ? `Pajak: ${formatRupiah(t.tax)}` : null,
      `TOTAL: ${formatRupiah(t.total)}`,
      `Bayar (${t.paymentMethod.toUpperCase()}): ${formatRupiah(t.amountPaid)}`,
      `Kembalian: ${formatRupiah(t.changeAmount)}`,
      'Terima Kasih atas Kunjungan Anda!',
    ]
      .filter(Boolean)
      .join('\n');

    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text)
        .then(() => showToast('📋 Teks struk berhasil disalin ke clipboard'))
        .catch(() => showToast('⚠️ Tidak dapat menyalin otomatis'));
    } else {
      showToast('📋 Format struk siap dicetak');
    }
  };

  // Start new transaction
  const handleNewTransaction = () => {
    setIsReceiptModalOpen(false);
    setLatestTransaction(null);
    clearCart();
    setCashAmountInput('');
  };

  // Open discount modal
  const handleOpenDiscountModal = () => {
    setTempDiscountInput(discountAmount.toString());
    setTempTaxRate(taxRate);
    setIsDiscountModalOpen(true);
  };

  const handleSaveDiscountAndTax = () => {
    setDiscountAmount(Number(tempDiscountInput) || 0);
    setTaxRate(tempTaxRate);
    setIsDiscountModalOpen(false);
    showToast('✅ Diskon & Pajak diperbarui');
  };

  // Product management actions
  const handleOpenNewProduct = () => {
    setEditingProduct({
      id: `prod-${Date.now().toString().slice(-6)}`,
      sku: businessMode === 'retail' ? 'RTL-NEW' : 'FNB-NEW',
      barcode: '',
      name: '',
      type: businessMode,
      category: businessMode === 'retail' ? 'snack' : 'kopi',
      price: 10000,
      costPrice: 7000,
      unit: businessMode === 'retail' ? 'pcs' : 'cup',
      description: '',
      image: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
      stock: 50,
    });
    setIsProductModalOpen(true);
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.sku) return;

    const fullProduct: MenuItem = {
      id: editingProduct.id || `prod-${Date.now()}`,
      sku: editingProduct.sku.trim().toUpperCase(),
      barcode: editingProduct.barcode ? editingProduct.barcode.trim() : undefined,
      name: editingProduct.name.trim(),
      type: editingProduct.type || businessMode,
      category: editingProduct.category || 'kopi',
      price: Math.max(0, Number(editingProduct.price) || 0),
      costPrice: Math.max(0, Number(editingProduct.costPrice) || 0),
      unit: editingProduct.unit?.trim() || 'pcs',
      description: editingProduct.description || '',
      image: editingProduct.image || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?auto=format&fit=crop&w=600&q=80',
      stock: Math.max(0, Number(editingProduct.stock) || 0),
      isFavorite: editingProduct.isFavorite || false,
    };

    saveProduct(fullProduct);
    setIsProductModalOpen(false);
    setEditingProduct(null);
    showToast(`✅ Produk "${fullProduct.name}" berhasil disimpan`);
  };

  return (
    <div className="flex-1 w-full bg-background text-foreground transition-colors p-3 sm:p-5 lg:p-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-card border border-primary/40 text-foreground text-xs sm:text-sm font-semibold shadow-xl flex items-center gap-2 animate-bounce">
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-4">
        {/* Top Header Bar: Mode Switcher & Quick Scanner */}
        <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Title & Business Mode Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                  <span>Register Kasir</span>
                  <Badge variant={businessMode === 'retail' ? 'primary' : 'secondary'} size="sm">
                    {businessMode === 'retail' ? 'Mode Retail' : 'Mode F&B'}
                  </Badge>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {businessMode === 'retail'
                    ? 'Kasir toko & retail: Scan barcode, penjualan langsung, satuan stok barang.'
                    : 'Kasir restoran & kedai: Meja pelanggan, dine in / take away, catatan dapur.'}
                </p>
              </div>

              {/* Mode Toggle Switcher Buttons */}
              <div className="inline-flex items-center p-1 bg-muted rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => {
                    setBusinessMode('fnb');
                    setActiveCategory('semua');
                    showToast('☕ Beralih ke Mode F&B');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    businessMode === 'fnb'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
                    <line x1="6" y1="1" x2="6" y2="4" strokeWidth="2" strokeLinecap="round" />
                    <line x1="10" y1="1" x2="10" y2="4" strokeWidth="2" strokeLinecap="round" />
                    <line x1="14" y1="1" x2="14" y2="4" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span>F&amp;B / Kedai</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBusinessMode('retail');
                    setActiveCategory('semua');
                    showToast('🛒 Beralih ke Mode Retail');
                  }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    businessMode === 'retail'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span>Retail / Toko</span>
                </button>
              </div>
            </div>

            {/* Quick Actions Right */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenDiscountModal}
                className="text-xs flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <span>Diskon ({formatRupiah(discountAmount)}) &amp; Pajak ({(taxRate * 100).toFixed(0)}%)</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenNewProduct}
                className="text-xs flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>Kelola Barang &amp; Stok</span>
              </Button>
            </div>
          </div>

          {/* Search Bar & Barcode Scanner Form */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-border/60">
            {/* Search Input */}
            <div className="md:col-span-7 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama barang, SKU, atau tekan [/]..."
                className="w-full min-h-[42px] pl-10 pr-8 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
              <svg
                className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Barcode Scanner Form */}
            <form onSubmit={handleManualBarcodeSubmit} className="md:col-span-5 flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  placeholder="Scan / Input barcode lalu Enter..."
                  className="w-full min-h-[42px] pl-9 pr-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all font-mono"
                />
                <svg
                  className="w-4 h-4 text-primary absolute left-3 top-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <Button type="submit" variant="primary" size="md" className="shrink-0 text-xs px-3">
                Scan / Tambah
              </Button>
            </form>
          </div>
        </div>

        {/* Main 2-Column POS Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (Catalog & Filters) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {activeCategoryList.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    activeCategory === cat.key
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'bg-card text-muted-foreground hover:text-foreground border border-border'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setActiveCategory('semua_global')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  activeCategory === 'semua_global'
                    ? 'bg-secondary text-secondary-foreground shadow-xs'
                    : 'bg-card text-muted-foreground hover:text-foreground border border-border'
                }`}
              >
                🌐 Semua (F&amp;B + Retail)
              </button>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filteredProducts.map((prod) => {
                const isOutOfStock = prod.stock <= 0;
                const isLowStock = prod.stock > 0 && prod.stock <= 5;

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleProductClick(prod)}
                    className={`group relative bg-card border border-border rounded-xl p-3 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all cursor-pointer ${
                      isOutOfStock ? 'opacity-60 cursor-not-allowed' : 'hover:border-primary/50'
                    }`}
                  >
                    <div>
                      {/* Image Thumbnail */}
                      <div className="relative w-full h-28 sm:h-32 rounded-lg overflow-hidden bg-muted mb-2.5">
                        <Image
                          src={prod.image}
                          alt={prod.name}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-1.5 left-1.5">
                          <Badge
                            variant={prod.type === 'retail' ? 'primary' : 'secondary'}
                            size="sm"
                            className="text-[10px] uppercase font-bold"
                          >
                            {prod.type}
                          </Badge>
                        </div>
                        {prod.variants && prod.variants.length > 0 && (
                          <div className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] px-1.5 py-0.5 rounded-md font-medium">
                            {prod.variants.length} Varian
                          </div>
                        )}
                      </div>

                      {/* Title & SKU */}
                      <div className="text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                        <span>{prod.sku}</span>
                        {prod.unit && <span>/ {prod.unit}</span>}
                      </div>
                      <h3 className="font-semibold text-xs sm:text-sm text-foreground line-clamp-1 mt-0.5 group-hover:text-primary transition-colors">
                        {prod.name}
                      </h3>
                    </div>

                    {/* Price & Stock Footer */}
                    <div className="mt-3 pt-2 border-t border-border/60 flex items-center justify-between">
                      <span className="font-bold text-xs sm:text-sm text-primary font-mono">
                        {formatRupiah(prod.price)}
                      </span>
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                          isOutOfStock
                            ? 'bg-destructive/10 text-destructive font-bold'
                            : isLowStock
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isOutOfStock ? 'Habis' : `Sisa ${prod.stock}`}
                      </span>
                    </div>
                  </div>
                );
              })}

              {filteredProducts.length === 0 && (
                <div className="col-span-full py-12 text-center bg-card border border-border rounded-xl p-6">
                  <div className="text-3xl mb-2">🔍</div>
                  <h4 className="font-semibold text-foreground text-sm">Produk Tidak Ditemukan</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Tidak ada barang yang cocok dengan kata kunci &quot;{searchQuery}&quot; pada kategori ini.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveCategory('semua');
                    }}
                    className="mt-3 text-xs"
                  >
                    Reset Filter
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Active Cart & Checkout) */}
          <div className="lg:col-span-5 xl:col-span-4 bg-card border border-border rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 sticky top-4">
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="font-bold text-base text-foreground flex items-center gap-1.5">
                  <span>Keranjang Kasir</span>
                  <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                    {totalItems} item
                  </span>
                </h2>
              </div>
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-destructive hover:underline cursor-pointer font-medium"
                >
                  Kosongkan
                </button>
              )}
            </div>

            {/* Dynamic Order Metadata (F&B Meja vs Retail Pelanggan) */}
            {businessMode === 'fnb' ? (
              <div className="space-y-2.5 p-3 rounded-xl bg-muted/50 border border-border text-xs">
                {/* Dine-in vs Take Away */}
                <div className="flex rounded-lg bg-card p-0.5 border border-border">
                  <button
                    type="button"
                    onClick={() => setOrderType('dine_in')}
                    className={`flex-1 py-1.5 rounded-md font-bold transition-all ${
                      orderType === 'dine_in'
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    🍽️ Dine In
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('take_away')}
                    className={`flex-1 py-1.5 rounded-md font-bold transition-all ${
                      orderType === 'take_away'
                        ? 'bg-primary text-primary-foreground shadow-2xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    🥡 Take Away
                  </button>
                </div>

                {/* Table Number & Customer Name */}
                <div className="grid grid-cols-2 gap-2">
                  {orderType === 'dine_in' && (
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                        Nomor Meja
                      </label>
                      <input
                        type="text"
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="Contoh: 04"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                  )}
                  <div className={orderType === 'dine_in' ? '' : 'col-span-2'}>
                    <label className="block text-[10px] font-semibold text-muted-foreground mb-1">
                      Nama Tamu / Pelanggan
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nama pelanggan..."
                      className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Retail Direct Customer Input */
              <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                  <span>🏷️ Kasir Penjualan Langsung</span>
                  <span className="text-primary font-semibold">Ready Barcode Gun</span>
                </div>
                <div>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama Pembeli (Opsional / Umum)..."
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {items.map((cartItem) => {
                const itemKey = getCartItemKey(cartItem);
                const unitPrice =
                  cartItem.menuItem.price + (cartItem.selectedVariant?.priceDelta || 0);
                const itemLineTotal = unitPrice * cartItem.quantity;

                return (
                  <div
                    key={itemKey}
                    className="p-2.5 rounded-xl border border-border bg-card hover:border-border/80 transition-all space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-foreground line-clamp-1">
                          {cartItem.menuItem.name}
                        </div>
                        {cartItem.selectedVariant && (
                          <span className="inline-block text-[10px] text-primary font-medium">
                            ✦ {cartItem.selectedVariant.name}
                          </span>
                        )}
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {formatRupiah(unitPrice)}{' '}
                          {cartItem.menuItem.unit ? `/${cartItem.menuItem.unit}` : ''}
                        </div>
                      </div>

                      {/* Line Total */}
                      <div className="text-right shrink-0">
                        <div className="font-bold text-xs font-mono text-foreground">
                          {formatRupiah(itemLineTotal)}
                        </div>
                      </div>
                    </div>

                    {/* Stepper & Actions */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQuantity(itemKey, -1)}
                          className="w-6 h-6 rounded-md bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-8 text-center text-xs font-bold font-mono">
                          {cartItem.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(itemKey, 1)}
                          className="w-6 h-6 rounded-md bg-muted hover:bg-muted/80 text-foreground flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {businessMode === 'fnb' && (
                          <input
                            type="text"
                            value={cartItem.notes || ''}
                            onChange={(e) => updateNotes(itemKey, e.target.value)}
                            placeholder="Catatan..."
                            className="text-[10px] px-2 py-0.5 rounded border border-border bg-background w-24 text-foreground focus:outline-none"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeItem(itemKey)}
                          className="text-muted-foreground hover:text-destructive text-xs cursor-pointer"
                          aria-label="Hapus item"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div className="text-center py-10 border border-dashed border-border rounded-xl text-muted-foreground text-xs space-y-1">
                  <div className="text-2xl">🛒</div>
                  <div>Keranjang masih kosong</div>
                  <div className="text-[10px]">Klik produk atau scan barcode untuk menambah</div>
                </div>
              )}
            </div>

            {/* Order Calculations Summary */}
            <div className="pt-3 border-t border-border space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span className="font-mono text-foreground">{formatRupiah(subtotal)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Diskon Transaksi:</span>
                  <span className="font-mono">-{formatRupiah(discountAmount)}</span>
                </div>
              )}

              {taxRate > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Pajak ({(taxRate * 100).toFixed(0)}%):</span>
                  <span className="font-mono text-foreground">{formatRupiah(tax)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-sm font-extrabold text-foreground pt-2 border-t border-border">
                <span>Total Bayar:</span>
                <span className="text-primary font-mono text-base">{formatRupiah(total)}</span>
              </div>
            </div>

            {/* Checkout Action Button */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={items.length === 0}
              onClick={handleOpenPayment}
              className="font-bold cursor-pointer shadow-md"
            >
              <span>Bayar Transaksi ({formatRupiah(total)})</span>
            </Button>
          </div>
        </div>
      </div>

      {/* MODAL 1: PEMBAYARAN KASIR */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Pembayaran Transaksi"
        description={`Selesaikan pembayaran pesanan kasir sebesar ${formatRupiah(total)}.`}
        maxWidth="md"
      >
        <div className="space-y-4">
          {/* Method Selection */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['tunai', 'qris', 'debit', 'transfer'] as PaymentMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPaymentMethod(m)}
                  className={`py-2 px-1 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer border ${
                    paymentMethod === m
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Cash Input if Tunai */}
          {paymentMethod === 'tunai' ? (
            <div className="space-y-3 p-3.5 rounded-xl bg-muted/40 border border-border">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Uang Tunai Diterima (Rp)
                </label>
                <input
                  type="number"
                  value={cashAmountInput}
                  onChange={(e) => setCashAmountInput(e.target.value)}
                  className="w-full text-lg font-mono font-bold px-3 py-2 rounded-xl border border-border bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {[total, 20000, 50000, 100000, 200000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashAmountInput(amt.toString())}
                    className="px-2.5 py-1 rounded-lg bg-card border border-border text-[11px] font-mono hover:bg-muted transition-colors cursor-pointer"
                  >
                    {amt === total ? 'Uang Pas' : formatRupiah(amt)}
                  </button>
                ))}
              </div>

              {/* Change Calculation */}
              <div className="flex justify-between items-center pt-2 border-t border-border/80 text-xs">
                <span className="font-semibold text-muted-foreground">Uang Kembalian:</span>
                <span
                  className={`font-mono text-sm font-bold ${
                    cashAmountNum < total ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {cashAmountNum < total
                    ? `Kurang ${formatRupiah(total - cashAmountNum)}`
                    : formatRupiah(changeAmount)}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-muted/40 border border-border text-center text-xs space-y-1">
              <div className="font-bold text-foreground uppercase">{paymentMethod} Payment</div>
              <div className="text-muted-foreground">
                Pastikan transaksi di mesin EDC / QRIS berhasil sebelum menyelesaikan pesanan.
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled={!isPaymentValid}
              onClick={handleCompleteTransaction}
              className="font-bold"
            >
              Selesaikan Transaksi
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: NOTA STRUK KASIR & CETAK THERMAL 58MM / 80MM */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={handleNewTransaction}
        title="Struk Transaksi Selesai"
        description="Nota transaksi berhasil dicatat dan siap dicetak."
        maxWidth="sm"
      >
        {latestTransaction && (
          <div className="space-y-4">
            {/* Paper Size Selector (58mm vs 80mm) */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">Ukuran Kertas:</span>
              <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted">
                <button
                  type="button"
                  onClick={() => setReceiptWidth('58mm')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    receiptWidth === '58mm' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                  }`}
                >
                  58mm (Mobile)
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptWidth('80mm')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    receiptWidth === '80mm' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                  }`}
                >
                  80mm (Desktop)
                </button>
              </div>
            </div>

            {/* Template Struk Thermal Siap Cetak (CSS @media print applied via id printable-receipt) */}
            <div
              id="printable-receipt"
              className={`mx-auto p-4 bg-white text-stone-900 rounded-xl border border-stone-200 font-mono text-xs shadow-xs space-y-2.5 ${
                receiptWidth === '58mm' ? 'max-w-[280px]' : 'max-w-[360px]'
              }`}
            >
              <div className="text-center pb-2 border-b border-dashed border-stone-300">
                <div className="font-bold text-sm tracking-tight">AmirPOS</div>
                <div className="text-[10px] text-stone-600">
                  {latestTransaction.businessMode === 'retail' ? 'Retail & Toko UMKM' : 'Kedai Kopi & Kuliner'}
                </div>
                <div className="text-[9px] text-stone-500 mt-0.5">Jl. Nusantara No. 88, Jakarta</div>
              </div>

              <div className="text-[10px] space-y-0.5 text-stone-700">
                <div className="flex justify-between">
                  <span>No: {latestTransaction.orderNumber}</span>
                  <span>ID: {latestTransaction.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu:</span>
                  <span>
                    {new Date(latestTransaction.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    WIB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Mode:</span>
                  <span className="uppercase font-semibold">
                    {latestTransaction.businessMode === 'retail'
                      ? 'Penjualan Retail'
                      : latestTransaction.tableNumber
                      ? `Meja: ${latestTransaction.tableNumber}`
                      : 'Take Away'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span>{latestTransaction.customerName}</span>
                </div>
              </div>

              {/* Item Details */}
              <div className="py-2 border-y border-dashed border-stone-300 space-y-1.5">
                {latestTransaction.items.map((item) => {
                  const unitPrice =
                    item.menuItem.price + (item.selectedVariant?.priceDelta || 0);
                  const totalLine = unitPrice * item.quantity;

                  return (
                    <div key={getCartItemKey(item)} className="text-[10px]">
                      <div className="font-semibold text-stone-900">
                        {item.menuItem.name}
                        {item.selectedVariant && (
                          <span className="font-normal text-stone-600">
                            {' '}
                            ({item.selectedVariant.name})
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>
                          {item.quantity} x {formatRupiah(unitPrice)}
                        </span>
                        <span>{formatRupiah(totalLine)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="space-y-1 text-[10px] pt-1">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(latestTransaction.subtotal)}</span>
                </div>
                {latestTransaction.discountAmount > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(latestTransaction.discountAmount)}</span>
                  </div>
                )}
                {latestTransaction.tax > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Pajak ({(latestTransaction.taxRate * 100).toFixed(0)}%):</span>
                    <span>{formatRupiah(latestTransaction.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs text-stone-900 pt-1 border-t border-stone-300">
                  <span>TOTAL:</span>
                  <span>{formatRupiah(latestTransaction.total)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Metode:</span>
                  <span className="uppercase font-semibold">{latestTransaction.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Bayar:</span>
                  <span>{formatRupiah(latestTransaction.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Kembalian:</span>
                  <span>{formatRupiah(latestTransaction.changeAmount)}</span>
                </div>
              </div>

              {/* Footer text */}
              <div className="text-center pt-2 border-t border-dashed border-stone-300 text-[9px] text-stone-500">
                Terima kasih atas kunjungan Anda!
                <div className="mt-0.5 font-mono text-[8px] tracking-wider text-stone-400">
                  *{latestTransaction.orderNumber}*
                </div>
              </div>
            </div>

            {/* Actions Button */}
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={handlePrintReceipt}
                  className="cursor-pointer text-xs"
                >
                  <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Cetak Thermal</span>
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={handleCopyReceiptText}
                  className="cursor-pointer text-xs"
                >
                  <span>Salin Teks Nota</span>
                </Button>
              </div>

              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={handleNewTransaction}
                className="cursor-pointer font-bold"
              >
                <span>Transaksi Kasir Baru</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 3: PENGATURAN DISKON & PAJAK */}
      <Modal
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        title="Pengaturan Diskon & Pajak"
        description="Atur potongan harga transaksi dan persentase pajak transaksi kasir."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">
              Potongan Diskon Transaksi (Rp)
            </label>
            <input
              type="number"
              value={tempDiscountInput}
              onChange={(e) => setTempDiscountInput(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2 rounded-xl border border-border bg-card text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5">
              Tarif Pajak Penjualan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '0% (Bebas Pajak)', rate: 0 },
                { label: '10% (PB1 Resto)', rate: 0.1 },
                { label: '11% (PPN Retail)', rate: 0.11 },
              ].map((p) => (
                <button
                  key={p.rate}
                  type="button"
                  onClick={() => setTempTaxRate(p.rate)}
                  className={`py-2 px-1 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                    tempTaxRate === p.rate
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-card text-muted-foreground border-border hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setIsDiscountModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleSaveDiscountAndTax}
              className="font-bold"
            >
              Simpan Perubahan
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: PILIH VARIAN PRODUK */}
      <Modal
        isOpen={isVariantModalOpen}
        onClose={() => {
          setIsVariantModalOpen(false);
          setVariantTargetItem(null);
        }}
        title={`Pilih Varian: ${variantTargetItem?.name || ''}`}
        description="Pilih opsi varian menu untuk dimasukkan ke keranjang kasir."
        maxWidth="sm"
      >
        {variantTargetItem && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              {variantTargetItem.variants?.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    addItem(variantTargetItem, v);
                    setIsVariantModalOpen(false);
                    setVariantTargetItem(null);
                    showToast(`+1 ${variantTargetItem.name} (${v.name})`);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-card hover:border-primary transition-all text-left cursor-pointer"
                >
                  <div>
                    <div className="font-semibold text-xs text-foreground">{v.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Base: {formatRupiah(variantTargetItem.price)}
                    </div>
                  </div>
                  <div className="font-mono font-bold text-xs text-primary">
                    {formatRupiah(variantTargetItem.price + v.priceDelta)}
                  </div>
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => {
                setIsVariantModalOpen(false);
                setVariantTargetItem(null);
              }}
            >
              Tutup
            </Button>
          </div>
        )}
      </Modal>

      {/* MODAL 5: KELOLA BARANG & STOK */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        title="Kelola Barang &amp; Inventori Stok"
        description="Tambah barang baru, ubah harga, atau restock persediaan produk."
        maxWidth="lg"
      >
        <div className="space-y-4">
          {/* Edit Form */}
          {editingProduct && (
            <form onSubmit={handleSaveProductSubmit} className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border text-xs">
              <div className="font-bold text-foreground text-sm">
                Formulir Barang / Produk
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Nama Produk *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground"
                    placeholder="Contoh: Kopi Susu Aren"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    SKU Kode Barang *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-mono"
                    placeholder="KOP-001"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Barcode Scanner (Opsional)
                  </label>
                  <input
                    type="text"
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-mono"
                    placeholder="899..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Tipe Produk
                  </label>
                  <select
                    value={editingProduct.type || 'retail'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, type: e.target.value as BusinessMode })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground"
                  >
                    <option value="retail">Retail / Toko</option>
                    <option value="fnb">F&amp;B / Makanan-Minuman</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Harga Jual (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    value={editingProduct.price || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    HPP / Modal (Rp)
                  </label>
                  <input
                    type="number"
                    value={editingProduct.costPrice || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Stok Saat Ini
                  </label>
                  <input
                    type="number"
                    value={editingProduct.stock || 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-foreground mb-1">
                    Satuan (Unit)
                  </label>
                  <input
                    type="text"
                    value={editingProduct.unit || 'pcs'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    placeholder="pcs / cup / porsi"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-card text-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingProduct(null)}
                >
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="sm" className="font-bold">
                  Simpan Barang
                </Button>
              </div>
            </form>
          )}

          {/* Table List of Existing Items */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-muted-foreground font-semibold sticky top-0 border-b border-border">
                  <tr>
                    <th className="py-2 px-3">Produk</th>
                    <th className="py-2 px-3">SKU / Barcode</th>
                    <th className="py-2 px-3">Harga</th>
                    <th className="py-2 px-3">Stok</th>
                    <th className="py-2 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {liveProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="py-2 px-3 font-semibold text-foreground">{p.name}</td>
                      <td className="py-2 px-3 font-mono text-muted-foreground">
                        {p.sku} {p.barcode ? `(${p.barcode})` : ''}
                      </td>
                      <td className="py-2 px-3 font-mono text-primary">{formatRupiah(p.price)}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1 font-mono">
                          <button
                            type="button"
                            onClick={() => updateProductStock(p.id, -5)}
                            className="px-1 text-[10px] bg-muted rounded hover:bg-muted/80 cursor-pointer"
                          >
                            -5
                          </button>
                          <span>{p.stock}</span>
                          <button
                            type="button"
                            onClick={() => updateProductStock(p.id, 10)}
                            className="px-1 text-[10px] bg-muted rounded hover:bg-muted/80 cursor-pointer"
                          >
                            +10
                          </button>
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(p)}
                          className="text-primary hover:underline font-semibold"
                        >
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Hapus "${p.name}"?`)) {
                              deleteProduct(p.id);
                              showToast(`🗑️ ${p.name} dihapus`);
                            }
                          }}
                          className="text-destructive hover:underline font-semibold"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reset button */}
          <div className="flex justify-between items-center pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Reset seluruh produk kembali ke katalog bawaan awal?')) {
                  resetProducts();
                  showToast('🔄 Produk dikembalikan ke default');
                }
              }}
              className="text-xs text-muted-foreground"
            >
              Reset Katalog Default
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsProductModalOpen(false);
                setEditingProduct(null);
              }}
            >
              Selesai
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
