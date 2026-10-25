'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Transaction } from '@/types/pos';
import { useTransactions } from '@/app/_hooks/use-transactions';
import { resetStoredTransactions } from '@/lib/transaction-storage';
import { getCartItemKey } from '@/app/_hooks/use-pos-cart';
import { Button } from '@/app/_components/ui/button';
import { Badge } from '@/app/_components/ui/badge';
import { Modal } from '@/app/_components/ui/modal';

export function TransactionsClient() {
  const { transactions, summary } = useTransactions();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMode, setSelectedMode] = useState<string>('semua');
  const [selectedMethod, setSelectedMethod] = useState<string>('semua');
  const [selectedType, setSelectedType] = useState<string>('semua');
  const [activeReceipt, setActiveReceipt] = useState<Transaction | null>(null);
  const [receiptWidth, setReceiptWidth] = useState<'58mm' | '80mm'>('58mm');
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  const formatRupiah = (val: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return transactions.filter((trx) => {
      const matchSearch =
        !q ||
        (Boolean(trx?.id) && trx.id.toLowerCase().includes(q)) ||
        (Boolean(trx?.orderNumber) && trx.orderNumber.toLowerCase().includes(q)) ||
        (Boolean(trx?.customerName) && trx.customerName!.toLowerCase().includes(q));

      const matchMode =
        selectedMode === 'semua' || trx.businessMode === selectedMode;

      const matchMethod =
        selectedMethod === 'semua' || trx.paymentMethod === selectedMethod;

      const matchType =
        selectedType === 'semua' || trx.orderType === selectedType;

      return matchSearch && matchMode && matchMethod && matchType;
    });
  }, [transactions, searchQuery, selectedMode, selectedMethod, selectedType]);

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleConfirmReset = () => {
    resetStoredTransactions();
    setIsResetConfirmOpen(false);
  };

  return (
    <div className="flex-1 w-full bg-background text-foreground transition-colors p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Riwayat Transaksi &amp; Laporan Kasir
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Pantau laporan penjualan gabungan Retail &amp; F&amp;B, cetak ulang struk thermal, dan audit omset.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsResetConfirmOpen(true)}
              className="text-xs"
            >
              Reset Data Demo
            </Button>
            <Link
              href="/pos"
              className="min-h-[44px] px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 active:brightness-95 transition-all inline-flex items-center gap-1.5 shadow-xs"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>Kasir Baru</span>
            </Link>
          </div>
        </div>

        {/* 4 Cards Summary (Dual-Mode Metrics) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-2xs">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Total Omzet Keseluruhan
            </span>
            <div className="mt-2 text-2xl font-bold font-mono text-primary">
              {formatRupiah(summary.totalRevenue)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Dari {summary.totalTransactions} transaksi tersimpan
            </div>
          </div>

          <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-2xs">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Omzet Retail vs F&amp;B
            </span>
            <div className="mt-2 text-sm font-bold font-mono text-foreground space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">🛒 Retail:</span>
                <span>{formatRupiah(summary.retailRevenue || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-sans">☕ F&amp;B:</span>
                <span>{formatRupiah(summary.fnbRevenue || 0)}</span>
              </div>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Rata-rata/order: {formatRupiah(summary.averageOrderValue)}
            </div>
          </div>

          <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-2xs">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Penerimaan QRIS &amp; Transfer
            </span>
            <div className="mt-2 text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {formatRupiah((summary.paymentBreakdown.qris || 0) + (summary.paymentBreakdown.transfer || 0))}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Non-tunai otomatis &amp; aman
            </div>
          </div>

          <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-2xs">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider block">
              Penerimaan Kasir Tunai
            </span>
            <div className="mt-2 text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {formatRupiah(summary.paymentBreakdown.tunai || 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Uang kas tunai di laci kasir
            </div>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-card border border-border rounded-xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari ID transaksi, No. Order, atau nama..."
              className="w-full min-h-[44px] pl-10 pr-4 rounded-lg border border-border bg-background text-foreground text-xs focus:ring-2 focus:ring-ring focus:outline-none"
            />
            <svg
              className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Mode:</span>
              <select
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
                className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-ring focus:outline-none cursor-pointer"
              >
                <option value="semua">Semua Mode</option>
                <option value="retail">🛒 Mode Retail</option>
                <option value="fnb">☕ Mode F&amp;B</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Metode:</span>
              <select
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value)}
                className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-ring focus:outline-none cursor-pointer"
              >
                <option value="semua">Semua Metode</option>
                <option value="tunai">Tunai</option>
                <option value="qris">QRIS</option>
                <option value="debit">Debit</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>Tipe:</span>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-medium focus:ring-1 focus:ring-ring focus:outline-none cursor-pointer"
              >
                <option value="semua">Semua Tipe</option>
                <option value="dine_in">Dine In (Resto)</option>
                <option value="take_away">Take Away</option>
                <option value="direct_sale">Direct Sale (Retail)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card">
            <svg
              className="w-10 h-10 text-muted-foreground mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="font-semibold text-foreground text-sm">
              Tidak ada data transaksi yang cocok
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Sesuaikan kata kunci pencarian atau setel ulang filter.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.map((trx) => (
              <div
                key={trx.id}
                className="bg-card text-card-foreground border border-border rounded-xl p-4 sm:p-5 shadow-2xs hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left: Info ID, Jam, Customer */}
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-foreground">
                      {trx.orderNumber}
                    </span>
                    <span className="text-xs text-muted-foreground">({trx.id})</span>
                    <Badge
                      variant={trx.businessMode === 'retail' ? 'primary' : 'secondary'}
                      size="sm"
                    >
                      {trx.businessMode === 'retail' ? '🛒 RETAIL' : '☕ F&B'}
                    </Badge>
                    <Badge
                      variant={
                        trx.paymentMethod === 'qris'
                          ? 'success'
                          : trx.paymentMethod === 'tunai'
                          ? 'amber'
                          : 'espresso'
                      }
                      size="sm"
                    >
                      {trx.paymentMethod.toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" size="sm">
                      {trx.orderType === 'dine_in'
                        ? `Dine In ${trx.tableNumber ? `(Meja ${trx.tableNumber})` : ''}`
                        : trx.orderType === 'direct_sale'
                        ? 'Direct Sale'
                        : 'Take Away'}
                    </Badge>
                  </div>

                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                    <span>
                      Pelanggan: <strong className="text-foreground">{trx.customerName}</strong>
                    </span>
                    <span>&bull;</span>
                    <span>
                      {new Date(trx.timestamp).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      {new Date(trx.timestamp).toLocaleTimeString('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      WIB
                    </span>
                  </div>

                  {/* Summary items */}
                  <div className="text-xs text-muted-foreground line-clamp-1 pt-1">
                    {trx.items
                      .map(
                        (i) =>
                          `${i.menuItem.name}${i.selectedVariant ? ` (${i.selectedVariant.name})` : ''} (${i.quantity}x)`
                      )
                      .join(', ')}
                  </div>
                </div>

                {/* Right: Total Nominal & Action Button */}
                <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                  <div className="text-left md:text-right">
                    <div className="text-[11px] text-muted-foreground">Total Bayar:</div>
                    <div className="font-mono font-bold text-base text-primary">
                      {formatRupiah(trx.total)}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveReceipt(trx)}
                    className="cursor-pointer text-xs"
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>Lihat Struk</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL CETAK ULANG STRUK */}
      <Modal
        isOpen={activeReceipt !== null}
        onClose={() => setActiveReceipt(null)}
        title="Detail Struk Kasir"
        description="Nota transaksi arsip penjualan KulaPOS"
        maxWidth="sm"
      >
        {activeReceipt && (
          <div className="space-y-4">
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
                  58mm
                </button>
                <button
                  type="button"
                  onClick={() => setReceiptWidth('80mm')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                    receiptWidth === '80mm' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground'
                  }`}
                >
                  80mm
                </button>
              </div>
            </div>

            <div
              id="printable-receipt"
              className={`mx-auto p-4 bg-white text-stone-900 rounded-xl border border-stone-200 font-mono text-xs shadow-xs space-y-2.5 ${
                receiptWidth === '58mm' ? 'max-w-[280px]' : 'max-w-[360px]'
              }`}
            >
              <div className="text-center pb-2 border-b border-dashed border-stone-300">
                <div className="font-bold text-sm tracking-tight">KulaPOS</div>
                <div className="text-[10px] text-stone-600">
                  {activeReceipt.businessMode === 'retail' ? 'Retail & Toko UMKM' : 'Kedai Kopi & Kuliner'}
                </div>
                <div className="text-[10px] text-stone-500 mt-0.5">Jl. Nusantara No. 88, Jakarta</div>
              </div>

              <div className="text-[10px] space-y-0.5 text-stone-700">
                <div className="flex justify-between">
                  <span>No: {activeReceipt.orderNumber}</span>
                  <span>ID: {activeReceipt.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu:</span>
                  <span>
                    {new Date(activeReceipt.timestamp).toLocaleTimeString('id-ID', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    WIB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Mode:</span>
                  <span className="uppercase font-semibold">
                    {activeReceipt.businessMode === 'retail'
                      ? 'Penjualan Retail'
                      : activeReceipt.tableNumber
                      ? `Meja: ${activeReceipt.tableNumber}`
                      : 'Take Away'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span>{activeReceipt.customerName}</span>
                </div>
              </div>

              <div className="py-2 border-y border-dashed border-stone-300 space-y-1.5">
                {activeReceipt.items.map((item) => {
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

              <div className="space-y-1 text-[10px] pt-1">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(activeReceipt.subtotal)}</span>
                </div>
                {activeReceipt.discountAmount > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(activeReceipt.discountAmount)}</span>
                  </div>
                )}
                {activeReceipt.tax > 0 && (
                  <div className="flex justify-between text-stone-600">
                    <span>Pajak ({(activeReceipt.taxRate * 100).toFixed(0)}%):</span>
                    <span>{formatRupiah(activeReceipt.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-xs text-stone-900 pt-1 border-t border-stone-300">
                  <span>TOTAL:</span>
                  <span>{formatRupiah(activeReceipt.total)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Metode:</span>
                  <span className="uppercase font-semibold">{activeReceipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Bayar:</span>
                  <span>{formatRupiah(activeReceipt.amountPaid)}</span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Kembalian:</span>
                  <span>{formatRupiah(activeReceipt.changeAmount)}</span>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-dashed border-stone-300 text-[10px] text-stone-500">
                Dokumen Arsip Sah KulaPOS
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={handlePrintReceipt}
                className="cursor-pointer"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Cetak Ulang Struk</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL RESET CONFIRMATION */}
      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title="Konfirmasi Reset Data Demo"
        description="Tindakan ini akan mengembalikan data riwayat transaksi lokal ke kondisi demo awal."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Apakah Anda yakin ingin mereset seluruh data transaksi simulasi di browser ini?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsResetConfirmOpen(false)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmReset}
            >
              Ya, Reset Data
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
