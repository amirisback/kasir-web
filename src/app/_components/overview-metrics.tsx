'use client';

import React from 'react';
import Link from 'next/link';
import { useTransactions } from '@/app/_hooks/use-transactions';

export function OverviewMetrics() {
  const { summary } = useTransactions();

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* Metric 1: Total Omzet */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Total Omzet Hari Ini
          </span>
          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
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
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatRupiah(summary.totalRevenue)}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-600 dark:text-emerald-400">
            <span>&bull;</span>
            <span>Dari {summary.totalTransactions} transaksi tersimpan</span>
          </div>
        </div>
      </div>

      {/* Metric 2: Split Omzet Retail & F&B */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Omzet Retail vs F&amp;B
          </span>
          <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </span>
        </div>
        <div className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>🛒 Retail:</span>
            <span className="font-mono font-bold text-foreground">
              {formatRupiah(summary.retailRevenue || 0)}
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>☕ F&amp;B:</span>
            <span className="font-mono font-bold text-foreground">
              {formatRupiah(summary.fnbRevenue || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Metric 3: Rata-rata Nilai Pesanan */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Rata-rata Order (AOV)
          </span>
          <span className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
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
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </span>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {formatRupiah(summary.averageOrderValue)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Per transaksi kasir
          </div>
        </div>
      </div>

      {/* Metric 4: QRIS & Tunai Breakdown */}
      <div className="bg-card text-card-foreground border border-border rounded-xl p-5 shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Distribusi Pembayaran
          </span>
          <Link
            href="/transaksi"
            className="text-xs text-primary hover:underline font-medium"
          >
            Detail &rarr;
          </Link>
        </div>
        <div className="mt-3 space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-muted-foreground">
            <span>Tunai:</span>
            <span className="font-mono font-semibold text-foreground">
              {formatRupiah(summary.paymentBreakdown.tunai)}
            </span>
          </div>
          <div className="flex justify-between items-center text-muted-foreground">
            <span>QRIS:</span>
            <span className="font-mono font-semibold text-foreground">
              {formatRupiah(summary.paymentBreakdown.qris)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
