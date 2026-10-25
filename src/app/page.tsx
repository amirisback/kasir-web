import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getCurrentDictionary } from '@/lib/i18n-server';
import { generateWebsiteJsonLd } from '@/lib/seo';
import { OverviewMetrics } from './_components/overview-metrics';
import menuDataRaw from '@/data/menu.json';
import { MenuItem } from '@/types/pos';

export default async function HomePage() {
  const { locale } = await getCurrentDictionary();
  const websiteJsonLd = generateWebsiteJsonLd(locale);
  const menuItems = menuDataRaw as MenuItem[];
  const featuredMenu = menuItems.filter((item) => item.isFavorite).slice(0, 4);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="flex-1 w-full bg-background text-foreground transition-colors pb-16">
      {/* JSON-LD Structured Data: WebSite */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd),
        }}
      />

      {/* Hero & Quick Entry Section */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-card to-background py-10 sm:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span>Dual-Mode Point of Sale: Retail Toko &amp; F&amp;B Kafe</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                Pusat Operasional Kasir <span className="text-primary">KulaPOS</span>
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Kelola penjualan toko retail via barcode scanner maupun pesanan kedai kafe dengan nomor meja. 
                Dilengkapi hitung pajak fleksibel, diskon, pengurangan stok otomatis, dan cetak struk thermal 58mm/80mm.
              </p>
            </div>

            {/* Quick Action Box */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
              <Link
                href="/pos"
                className="min-h-[50px] px-6 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-md hover:brightness-110 active:brightness-95 transition-all cursor-pointer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span>Buka Register Kasir (POS)</span>
              </Link>
              <Link
                href="/transaksi"
                className="min-h-[50px] px-5 py-3.5 rounded-xl border border-border bg-card text-foreground font-semibold text-sm sm:text-base flex items-center justify-center gap-2 hover:bg-muted active:bg-muted/80 transition-colors cursor-pointer"
              >
                <svg
                  className="w-5 h-5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <span>Lihat Rekap Penjualan</span>
              </Link>
            </div>
          </div>

          {/* Real-time Sales Metrics Widget */}
          <div className="mt-8">
            <OverviewMetrics />
          </div>
        </div>
      </section>

      {/* Featured Catalog Items */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Katalog Unggulan Retail &amp; F&amp;B
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Pilihan produk terlaris yang siap ditransaksikan di register kasir.
            </p>
          </div>
          <Link
            href="/pos"
            className="text-xs sm:text-sm font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <span>Semua Produk</span>
            <span>&rarr;</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredMenu.map((item) => (
            <div
              key={item.id}
              className="group bg-card text-card-foreground border border-border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
            >
              <div className="relative w-full h-44 overflow-hidden bg-muted">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3 flex gap-1.5">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground uppercase tracking-wider">
                    {item.type}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-stone-900/80 text-white backdrop-blur-xs uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-mono text-muted-foreground">{item.sku}</div>
                  <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {item.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <div className="font-mono font-bold text-sm text-primary">
                    {formatRupiah(item.price)}
                  </div>
                  <Link
                    href="/pos"
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <span>+ Kasir</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cashier Workflow Guide */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border border-border rounded-2xl bg-card p-6 sm:p-8">
          <div className="max-w-xl">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Alur Kasir Dual-Mode
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Operasikan kasir sesuai alur bisnis toko retail maupun kedai F&amp;B.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="p-4 rounded-xl bg-background border border-border">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-mono font-bold flex items-center justify-center text-sm mb-3">
                01
              </div>
              <h3 className="font-semibold text-sm text-foreground">Pilih Mode Kasir</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Pilih <strong>Mode Retail</strong> untuk scan barcode cepat atau <strong>Mode F&amp;B</strong> untuk manajemen meja dan pesanan dine-in.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-mono font-bold flex items-center justify-center text-sm mb-3">
                02
              </div>
              <h3 className="font-semibold text-sm text-foreground">Scan Barcode / Klik Produk</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Gunakan barcode scanner gun fisik, cari via SKU atau tekan shortcut <code>/</code>, dan sesuaikan varian serta diskon.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-background border border-border">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-mono font-bold flex items-center justify-center text-sm mb-3">
                03
              </div>
              <h3 className="font-semibold text-sm text-foreground">Bayar &amp; Cetak Thermal</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Hitung kembalian tunai atau QRIS, stok terpotong otomatis, dan langsung cetak struk thermal 58mm/80mm.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
