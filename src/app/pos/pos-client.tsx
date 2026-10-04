'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { MenuItem, MenuCategory, PaymentMethod, Transaction, CartItem } from '@/types/pos';
import { usePosCart } from '@/app/_hooks/use-pos-cart';
import { saveTransaction } from '@/lib/transaction-storage';
import { Button } from '@/app/_components/ui/button';
import { Badge } from '@/app/_components/ui/badge';
import { Modal } from '@/app/_components/ui/modal';

interface PosClientProps {
  initialMenuItems: MenuItem[];
}

export function PosClient({ initialMenuItems }: PosClientProps) {
  const {
    items,
    orderType,
    customerName,
    tableNumber,
    subtotal,
    tax,
    total,
    totalItems,
    addItem,
    updateQuantity,
    removeItem,
    setOrderType,
    setCustomerName,
    setTableNumber,
    clearCart,
  } = usePosCart();

  const [activeCategory, setActiveCategory] = useState<MenuCategory>('semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [cashAmountInput, setCashAmountInput] = useState<string>('');
  const [latestTransaction, setLatestTransaction] = useState<Transaction | null>(null);

  // Format currency
  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  // Filter menu items
  const filteredItems = useMemo(() => {
    return initialMenuItems.filter((item) => {
      const matchCategory =
        activeCategory === 'semua' || item.category === activeCategory;
      const matchSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [initialMenuItems, activeCategory, searchQuery]);

  // Categories list
  const categories: { key: MenuCategory; label: string }[] = [
    { key: 'semua', label: 'Semua Menu' },
    { key: 'kopi', label: 'Kopi' },
    { key: 'non-kopi', label: 'Non-Kopi' },
    { key: 'makanan', label: 'Makanan Utama' },
    { key: 'camilan', label: 'Camilan' },
    { key: 'penutup', label: 'Penutup' },
  ];

  // Quick cash buttons
  const cashAmountNum = Number(cashAmountInput) || 0;
  const changeAmount = Math.max(0, cashAmountNum - total);
  const isPaymentValid =
    paymentMethod === 'tunai'
      ? cashAmountNum >= total && total > 0
      : total > 0;

  // Handle open payment modal
  const handleOpenPayment = () => {
    if (items.length === 0) return;
    setCashAmountInput(total.toString());
    setIsPaymentModalOpen(true);
  };

  // Quick set cash
  const setQuickCash = (amount: number) => {
    setCashAmountInput(amount.toString());
  };

  // Complete payment and generate receipt
  const handleCompleteTransaction = () => {
    if (!isPaymentValid) return;

    const trxId = `TRX-${Date.now().toString().slice(-6)}`;
    const orderNum = `ORD-${Math.floor(100 + Math.random() * 900)}`;
    const amountPaid =
      paymentMethod === 'tunai' ? cashAmountNum : total;

    const newTransaction: Transaction = {
      id: trxId,
      orderNumber: orderNum,
      timestamp: new Date().toISOString(),
      customerName: customerName.trim() || 'Pelanggan Umum',
      tableNumber: orderType === 'dine_in' ? tableNumber.trim() || 'Meja' : '',
      orderType,
      items: [...items],
      subtotal,
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

  // Start new transaction
  const handleNewTransaction = () => {
    setIsReceiptModalOpen(false);
    setLatestTransaction(null);
    clearCart();
    setCashAmountInput('');
  };

  return (
    <div className="flex-1 w-full bg-background text-foreground transition-colors p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Top Header bar inside POS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Register Kasir POS
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Pilih menu pesanan, atur meja pelanggan, dan selesaikan pembayaran.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu kopi, makanan..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            />
            <svg
              className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-xs text-muted-foreground hover:text-foreground"
                aria-label="Bersihkan pencarian"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Main Grid: Left Catalog, Right Order Bill */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6 items-start">
          {/* SISI KIRI: Katalog Menu (7 atau 8 kolom di Desktop) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-5">
            {/* Filter Kategori Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveCategory(cat.key)}
                    className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-card text-muted-foreground hover:text-foreground border border-border hover:bg-muted'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Grid Kartu Menu */}
            {filteredItems.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card">
                <svg
                  className="w-10 h-10 text-muted-foreground mx-auto mb-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="font-semibold text-foreground text-sm">
                  Menu tidak ditemukan
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Coba kata kunci pencarian lain atau pilih kategori Semua Menu.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('semua');
                  }}
                >
                  Reset Filter
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredItems.map((menu) => {
                  const cartItem = items.find((i) => i.menuItem.id === menu.id);
                  const inCartQty = cartItem ? cartItem.quantity : 0;

                  return (
                    <div
                      key={menu.id}
                      className="group bg-card text-card-foreground border border-border rounded-xl overflow-hidden shadow-2xs hover:shadow-sm hover:border-primary/40 transition-all flex flex-col justify-between"
                    >
                      <div className="relative w-full h-36 bg-muted overflow-hidden">
                        <Image
                          src={menu.image}
                          alt={menu.name}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute top-2.5 left-2.5">
                          <Badge variant="espresso" size="sm">
                            {menu.category}
                          </Badge>
                        </div>
                        {inCartQty > 0 && (
                          <div className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground font-bold text-xs px-2 py-0.5 rounded-full shadow-sm">
                            {inCartQty}x di Order
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1">
                            {menu.name}
                          </h3>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {menu.description}
                          </p>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {formatRupiah(menu.price)}
                          </span>

                          <button
                            type="button"
                            onClick={() => addItem(menu)}
                            className="min-h-[44px] min-w-[44px] px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 active:brightness-95 transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                            aria-label={`Tambah ${menu.name} ke pesanan`}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                            <span>Tambah</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SISI KANAN: Panel Pesanan / Order Bill (5 atau 4 kolom di Desktop) */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-20 bg-card text-card-foreground border border-border rounded-2xl shadow-xs overflow-hidden flex flex-col">
            {/* Header Bill */}
            <div className="p-4 border-b border-border bg-muted/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-base text-foreground">
                    Pesanan Aktif
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                    {totalItems} Item
                  </span>
                </div>
                {items.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-destructive hover:underline font-medium cursor-pointer"
                  >
                    Kosongkan
                  </button>
                )}
              </div>

              {/* Tipe Pesanan: Dine In vs Take Away */}
              <div className="grid grid-cols-2 gap-2 mt-3 p-1 rounded-xl bg-background border border-border">
                <button
                  type="button"
                  onClick={() => setOrderType('dine_in')}
                  className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    orderType === 'dine_in'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" />
                  </svg>
                  <span>Dine In (Meja)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('take_away')}
                  className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                    orderType === 'take_away'
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span>Take Away (Bungkus)</span>
                </button>
              </div>

              {/* Input Nomor Meja & Pelanggan */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                {orderType === 'dine_in' && (
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                      No. Meja
                    </label>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Misal: 04"
                      className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                    />
                  </div>
                )}
                <div className={orderType === 'take_away' ? 'col-span-2' : ''}>
                  <label className="text-[11px] font-medium text-muted-foreground block mb-1">
                    Nama Pelanggan
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama pemesan"
                    className="w-full min-h-[38px] px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-1 focus:ring-ring focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* List Item Keranjang */}
            <div className="p-4 overflow-y-auto max-h-[340px] divide-y divide-border/60">
              {items.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">
                  <svg
                    className="w-10 h-10 mx-auto text-muted-foreground/60 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  <p className="text-xs font-medium">Keranjang masih kosong</p>
                  <p className="text-[11px] mt-0.5">
                    Klik tombol + Tambah pada menu untuk memasukkan pesanan.
                  </p>
                </div>
              ) : (
                items.map((item: CartItem) => (
                  <div key={item.menuItem.id} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-foreground truncate">
                        {item.menuItem.name}
                      </h4>
                      <div className="font-mono text-xs text-muted-foreground mt-0.5">
                        {formatRupiah(item.menuItem.price)} &times; {item.quantity}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.menuItem.id, -1)}
                        className="w-8 h-8 rounded-lg border border-border bg-background hover:bg-muted text-foreground flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
                        aria-label="Kurangi jumlah"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-xs w-6 text-center text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.menuItem.id, 1)}
                        className="w-8 h-8 rounded-lg border border-border bg-background hover:bg-muted text-foreground flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
                        aria-label="Tambah jumlah"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.menuItem.id)}
                        className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive flex items-center justify-center ml-1 cursor-pointer transition-colors"
                        aria-label="Hapus item dari keranjang"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Ringkasan Subtotal, PB1, Grand Total */}
            <div className="p-4 border-t border-border bg-muted/20 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal Item:</span>
                <span className="font-mono text-foreground">{formatRupiah(subtotal)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Pajak PB1 (10%):</span>
                <span className="font-mono text-foreground">{formatRupiah(tax)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-foreground pt-2 border-t border-border">
                <span>Total Bayar:</span>
                <span className="font-mono text-primary text-lg">{formatRupiah(total)}</span>
              </div>

              {/* Tombol Bayar */}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={items.length === 0}
                onClick={handleOpenPayment}
                className="mt-3 cursor-pointer"
              >
                <span>Bayar Sekarang ({formatRupiah(total)})</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: PEMBAYARAN */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Pembayaran Transaksi"
        description={`Total Tagihan: ${formatRupiah(total)}`}
      >
        <div className="space-y-4">
          {/* Pilihan Metode Bayar */}
          <div>
            <label className="text-xs font-semibold text-foreground block mb-2">
              Pilih Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('tunai')}
                className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                  paymentMethod === 'tunai'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                <span>Tunai (Cash)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('qris')}
                className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                  paymentMethod === 'qris'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                <span>QRIS Instan</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('debit')}
                className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                  paymentMethod === 'debit'
                    ? 'border-primary bg-primary/10 text-primary font-bold'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted'
                }`}
              >
                <span>Kartu Debit</span>
              </button>
            </div>
          </div>

          {/* Mode Tunai: Tombol Pecahan Cepat & Kalkulator Kembalian */}
          {paymentMethod === 'tunai' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-muted/40 border border-border">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Uang Diterima (Rp)
                </label>
                <input
                  type="number"
                  value={cashAmountInput}
                  onChange={(e) => setCashAmountInput(e.target.value)}
                  placeholder="0"
                  className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-border bg-background text-foreground font-mono text-base font-bold focus:ring-2 focus:ring-ring focus:outline-none"
                />
              </div>

              {/* Pecahan Uang Cepat */}
              <div>
                <span className="text-[11px] text-muted-foreground block mb-1.5">
                  Pecahan Cepat:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickCash(total)}
                    className="min-h-[38px] px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                  >
                    Uang Pas
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCash(50000)}
                    className="min-h-[38px] px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                  >
                    Rp 50.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCash(100000)}
                    className="min-h-[38px] px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                  >
                    Rp 100.000
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickCash(200000)}
                    className="min-h-[38px] px-2.5 py-1 rounded-md text-xs font-medium border border-border bg-background hover:bg-muted text-foreground cursor-pointer"
                  >
                    Rp 200.000
                  </button>
                </div>
              </div>

              {/* Kembalian Status */}
              <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-semibold">
                <span className="text-muted-foreground">Kembalian:</span>
                <span
                  className={`font-mono text-base font-bold ${
                    cashAmountNum < total
                      ? 'text-destructive'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {cashAmountNum < total
                    ? `Kurang ${formatRupiah(total - cashAmountNum)}`
                    : formatRupiah(changeAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Mode QRIS */}
          {paymentMethod === 'qris' && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border text-center space-y-2">
              <div className="w-36 h-36 mx-auto bg-white p-2 rounded-lg border border-stone-200 flex items-center justify-center shadow-xs">
                {/* SVG Simulasi QR Code QRIS */}
                <svg className="w-32 h-32 text-stone-900" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm8-2h6v6h-6V3zm2 2v2h2V5h-2zM3 13h6v6H3v-6zm2 2v2h2v-2H5zm13-2h3v2h-3v-2zm-5 0h2v2h-2v-2zm3 3h3v3h-3v-3zm-3 2h2v3h-2v-3zm0-4h2v2h-2v-2zm-3-3h2v2h-2v-2zm-2 2h2v2H9v-2zm2 2h2v2h-2v-2zm0-4h2v2h-2v-2z" />
                </svg>
              </div>
              <p className="text-xs text-muted-foreground">
                Tunjukkan QRIS kepada pelanggan untuk scan via aplikasi mobile banking / dompet digital.
              </p>
              <div className="font-mono text-sm font-bold text-foreground">
                Nominal: {formatRupiah(total)}
              </div>
            </div>
          )}

          {/* Mode Debit */}
          {paymentMethod === 'debit' && (
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
              <label className="text-xs font-semibold text-foreground block">
                Nomor Referensi EDC / Kartu Debit
              </label>
              <input
                type="text"
                defaultValue="EDC-98234-OK"
                className="w-full min-h-[44px] px-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs font-mono focus:ring-1 focus:ring-ring focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground">
                Pastikan transaksi mesin EDC telah berhasil sebelum konfirmasi.
              </p>
            </div>
          )}

          {/* Tombol Konfirmasi Selesai */}
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!isPaymentValid}
              onClick={handleCompleteTransaction}
              className="cursor-pointer"
            >
              Konfirmasi &amp; Cetak Struk
            </Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 2: NOTA STRUK KASIR & CETAK THERMAL */}
      <Modal
        isOpen={isReceiptModalOpen}
        onClose={handleNewTransaction}
        title="Struk Transaksi Selesai"
        description="Nota siap dicetak menggunakan printer kasir."
        maxWidth="sm"
      >
        {latestTransaction && (
          <div className="space-y-4">
            {/* Template Struk Kasir Formal (Dukungan cetak thermal @media print via #printable-receipt) */}
            <div
              id="printable-receipt"
              className="p-4 bg-white text-stone-900 rounded-xl border border-stone-200 font-mono text-xs shadow-xs space-y-2.5"
            >
              <div className="text-center pb-2 border-b border-dashed border-stone-300">
                <div className="font-bold text-sm tracking-tight">KulaPOS</div>
                <div className="text-[10px] text-stone-600">Kedai Kopi &amp; Kuliner UMKM</div>
                <div className="text-[10px] text-stone-500 mt-0.5">Jl. Nusantara No. 88, Jakarta</div>
              </div>

              <div className="text-[11px] space-y-0.5 text-stone-700">
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
                    })} WIB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tipe:</span>
                  <span className="uppercase font-semibold">
                    {latestTransaction.orderType === 'dine_in'
                      ? `Dine In (${latestTransaction.tableNumber || 'Meja'})`
                      : 'Take Away'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span>{latestTransaction.customerName}</span>
                </div>
              </div>

              {/* Rincian Item */}
              <div className="py-2 border-y border-dashed border-stone-300 space-y-1.5">
                {latestTransaction.items.map((item) => (
                  <div key={item.menuItem.id} className="text-[11px]">
                    <div className="font-semibold text-stone-900">{item.menuItem.name}</div>
                    <div className="flex justify-between text-stone-600">
                      <span>{item.quantity} x {formatRupiah(item.menuItem.price)}</span>
                      <span>{formatRupiah(item.quantity * item.menuItem.price)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totalan */}
              <div className="space-y-1 text-[11px] pt-1">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(latestTransaction.subtotal)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>PB1 (10%):</span>
                  <span>{formatRupiah(latestTransaction.tax)}</span>
                </div>
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

              <div className="text-center pt-2 border-t border-dashed border-stone-300 text-[10px] text-stone-500">
                Terima kasih atas kunjungan Anda!
              </div>
            </div>

            {/* Aksi Struk */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={handlePrintReceipt}
                className="cursor-pointer"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Cetak Struk</span>
              </Button>
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={handleNewTransaction}
                className="cursor-pointer"
              >
                <span>Transaksi Baru</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
