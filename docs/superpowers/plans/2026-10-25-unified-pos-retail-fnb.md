# Unified Dual-Mode POS (Retail & F&B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun sistem Point of Sale (POS) skala kecil yang mendukung dua mode operasi utama (**Retail** dan **F&B**) dalam satu aplikasi terpadu (`kasir-web`), dilengkapi barcode scanner, varian produk, diskon/pajak fleksibel, manajemen stok lokal, serta cetak struk thermal 58mm/80mm.

**Architecture:**
- Frontend: Next.js 16 App Router, React 19, TypeScript strict mode, Tailwind CSS v4 (@theme inline).
- Dual-Mode Engine: Mode toggle (`fnb` vs `retail`) yang secara dinamis menyesuaikan form (Nomor Meja & Catatan Pesanan di F&B; Barcode Scanner & SKU Satuan di Retail).
- Local Storage Reactive Stores: `useSyncExternalStore` pattern untuk `product-storage.ts` (katalog & stok), `transaction-storage.ts` (riwayat transaksi), dan `use-pos-cart.ts` (keranjang aktif), memastikan offline-first dan sinkronisasi instan antar tab/komponen.

**Tech Stack:** Next.js 16.3.6, React 19, TypeScript 6, Tailwind CSS v4, Serwist PWA, Vitest / Bun Test.

---

## Task Decomposition

### Task 1: Domain Types & Seed Data Upgrade
- [ ] Update `src/types/pos.ts`:
  - Definisikan `BusinessMode = 'fnb' | 'retail'`.
  - Definisikan `ProductType = 'fnb' | 'retail'`.
  - Definisikan `ProductVariant { id: string; name: string; priceDelta: number }`.
  - Perbarui interface `ProductItem` (alias `MenuItem`) mencakup `sku`, `barcode`, `type`, `costPrice`, `unit`, `variants`.
  - Perbarui `CartItem` mencakup `selectedVariant`, `discount`.
  - Perbarui `Transaction` mencakup `businessMode`, `discountAmount`, `taxRate`.
- [ ] Perbarui `src/data/menu.json` dengan data katalog awal F&B dan Retail (lengkap dengan barcode, SKU, satuan, dan varian).
- [ ] Buat unit test type validation di `src/lib/__tests__/pos-types.test.ts`.

### Task 2: Persistent Product Storage & Stock Engine
- [ ] Buat `src/lib/product-storage.ts`:
  - Reactive store dengan `subscribeProducts` dan `getProductsSnapshot`.
  - Simpan ke `localStorage` (`amirpos_products_v2`) dengan fallback ke data katalog `menu.json`.
  - Fungsi `saveProduct(item: ProductItem)`, `deleteProduct(id: string)`, `updateStock(id: string, delta: number)`.
  - Fungsi `resetToDefaultProducts()`.
- [ ] Buat unit test di `src/lib/__tests__/product-storage.test.ts`.
- [ ] Jalankan `bun test` untuk memastikan semua test lulus.

### Task 3: Cart Hook Upgrade (`use-pos-cart.ts`)
- [ ] Perbarui `src/app/_hooks/use-pos-cart.ts`:
  - Tambahkan state `businessMode` (`'fnb' | 'retail'`), default persist ke localStorage.
  - Tambahkan method `setBusinessMode(mode: BusinessMode)`.
  - Tambahkan state & method `taxRate` (pilihan: 0%, 10% PB1, 11% PPN) dan `discountAmount`.
  - Dukungan varian produk saat `addItem(product, variant?)`.
  - Method `scanBarcode(code: string): boolean` (mencari produk berdasarkan barcode / SKU dan langsung menambahkan qty).
  - Kalkulasi `subtotal`, `discountAmount`, `tax`, `total`, dan `totalItems`.
- [ ] Buat unit test untuk kalkulasi diskon, pajak, varian, dan barcode scanner di `src/lib/__tests__/pos-cart.test.ts`.
- [ ] Jalankan `bun test`.

### Task 4: UI Dual-Mode Kasir & Barcode Scanner Integration
- [ ] Perbarui `src/app/pos/pos-client.tsx`:
  - Switcher Header: Tab/Pill Toggle `Mode Retail 🛒` vs `Mode F&B ☕`.
  - Barcode Scanner Listener: Keyboard listener global untuk USB barcode gun + Quick Input Bar (shortcut `/`).
  - Tampilan Item Grid & List: Tampilkan badge mode, barcode, SKU, dan stok sisa.
  - Modal Pilih Varian Produk jika produk memiliki varian sebelum masuk keranjang.
  - Form Cart Dinamis:
    - Mode F&B: Field Nomor Meja & Opsi Dine-In / Take Away & Catatan per menu.
    - Mode Retail: Ringkas langsung ke nama pelanggan & checkout, tanpa wajib meja.
  - Modal Diskon & Pajak dinamis.
  - Modal Tambah / Edit Produk Sederhana (Kelola Barang & Stok).

### Task 5: Thermal Receipt 58mm & 80mm Ready Print
- [ ] Perbarui komponen struk di `src/app/pos/pos-client.tsx`:
  - Opsi toggle lebar kertas struk: **58mm** (default kasir mobile/mini) atau **80mm** (kasir desktop standar).
  - Layout formal: Header toko, Badge Mode (Retail / Meja F&B), Rincian Item + Varian, Diskon, Pajak, Total, Pembayaran, Kembalian, Barcode/QR order.
  - CSS `@media print` presisi tanpa margin header/footer browser bawaan.

### Task 6: Rekap Transaksi & Laporan Penjualan Dual-Mode
- [ ] Perbarui `src/app/transaksi/transactions-client.tsx`:
  - Filter riwayat transaksi berdasarkan Mode: Semua, Mode Retail, atau Mode F&B.
  - Tampilkan ringkasan metrik: Total Omset, Total Transaksi, Omset Retail vs Omset F&B.
  - Detail transaksi menampilkan varian item dan mode pesanan.

### Task 7: Verifikasi Menyeluruh & Build
- [ ] Jalankan `bun test` untuk seluruh test suite.
- [ ] Jalankan `bun run build` untuk memverifikasi tidak ada type error atau linting warning di Next.js 16.
