# Atomic Implementation Plan: AmirPOS (Kasir UMKM Modern)

Rencana pengerjaan bertahap (Atomic Phases) untuk membangun website AmirPOS mengikuti standar Next.js 16, React 19, Tailwind CSS v4, PWA Serwist, dan GUIDELINE.md.

---

## Ringkasan Proyek
- **Aplikasi:** AmirPOS (Point of Sale F&B dan Coffee Shop UMKM)
- **Framework:** Next.js 16.3.6 (App Router), React 19.3.0
- **Styling:** Tailwind CSS v4.3.3 (@theme inline token system)
- **Runtime & Package Manager:** Bun v1.4.2
- **Prinsip:** YAGNI (Ponytail), Antislop (Bebas em dash, kontras tinggi, fungsionalitas nyata, responsif mobile-first)
- **Status Eksekusi:** Selesai 100% (Semua Phase 1 sampai 7 telah diimplementasi & lolos uji build)

---

## Phase 1: Setup Lingkungan, Token Desain, & Pembersihan Rute Demo
- [x] **P1.1 Pembersihan Rute Demo:** Hapus folder `src/app/demo-encryption/` sesuai mandat GUIDELINE.md poin 13 agar tidak mengotori build produksi.
- [x] **P1.2 Setup Token Desain Tailwind CSS v4:** Perbarui `src/app/globals.css` dengan token warna Warm Amber (`#D97706`), Espresso Tone (`#1C1917`), Cream Parchment (`#FAF7F2`), serta aturan styling khusus `@media print` untuk cetak struk kasir thermal.
- [x] **P1.3 Setup Metadata & PWA Manifest:** Perbarui `src/app/manifest.ts` dan metadata di `src/app/layout.tsx` agar sesuai identitas AmirPOS.
- [x] **P1.4 Verifikasi Build Awal:** Jalankan `bun run lint` untuk memastikan pondasi bersih.

---

## Phase 2: Skema Data & Komponen Fondasi (Atomic UI & Utilities)
- [x] **P2.1 Dummy Data Katalog Menu:** Buat `src/data/menu.json` dengan minimal 12 menu F&B realistis (kategori: Kopi, Non-Kopi, Makanan Utama, Camilan, Penutup) beserta atribut ID, nama, kategori, harga, gambar, dan stok.
- [x] **P2.2 Definisi Type Definition:** Buat `src/types/pos.ts` yang memuat interface `MenuItem`, `CartItem`, `OrderType`, `PaymentMethod`, dan `Transaction`.
- [x] **P2.3 Komponen UI Atomic:**
  - `src/app/_components/ui/button.tsx`: Tombol dengan varian primary, secondary, danger, outline, dan ukuran responsive.
  - `src/app/_components/ui/badge.tsx`: Label kategori dan status.
  - `src/app/_components/ui/modal.tsx`: Dialog modal yang mendukung accessibility keyboard (Escape to close, backdrop click).
- [x] **P2.4 State Hook & Storage Service:**
  - `src/lib/transaction-storage.ts`: Service penyimpanan dan pembacaan transaksi di `localStorage` dengan dukungan subscription `useSyncExternalStore`.
  - `src/app/_hooks/use-pos-cart.ts`: Custom hook untuk manipulasi keranjang pesanan (tambah, kurang, hapus, reset, hitung subtotal, pajak, grand total).

---

## Phase 3: Komponen Navigasi & Tata Letak Bersama (Shared Layout)
- [x] **P3.1 Header AmirPOS:** Buat `src/app/_components/header.tsx` dengan logo AmirPOS, tautan navigasi aktif (`/`, `/pos`, `/transaksi`), indikator status register ("Buka"), dan jam digital lokal.
- [x] **P3.2 Footer AmirPOS:** Buat `src/app/_components/footer.tsx` yang ringkas, fungsional, dan ramah mobile.
- [x] **P3.3 Integrasi Layout Root:** Pastikan `src/app/layout.tsx` menyematkan header dan footer secara rapi dan tetap mempertahankan ThemeProvider tanpa FOUC.

---

## Phase 4: Implementasi Halaman Beranda / Overview Kasir (`/`)
- [x] **P4.1 Ringkasan Operasional Hari Ini:** Tampilkan kartu statistik ringkas (Total Omzet Hari Ini, Jumlah Transaksi, Rata-rata Nilai Pesanan).
- [x] **P4.2 Tombol Aksi Cepat:** Tautan langsung ke mesin kasir ("Mulai Transaksi Kasir") dan riwayat transaksi.
- [x] **P4.3 Panduan & Shortcut Kasir:** Bagian ringkas mengenai panduan cepat alur transaksi untuk kasir.
- [x] **P4.4 Menu Unggulan Kedai:** Preview 4 menu favorit teratas dengan tombol langsung masuk POS.

---

## Phase 5: Implementasi Layar Kasir POS Interaktif (`/pos`)
- [x] **P5.1 Tab Filter Kategori & Pencarian Menu:** Filter instan produk berdasarkan kategori dan input pencarian teks real-time.
- [x] **P5.2 Grid Menu Produk:** Kartu menu responsif dengan badge kategori, harga terformat rupiah, dan tombol tambah cepat.
- [x] **P5.3 Panel Keranjang Pesanan (Order Bill):**
  - Pemilihan tipe pesanan (Dine In atau Take Away).
  - Input opsional Nomor Meja / Nama Pelanggan.
  - Daftar belanja dengan pengatur quantity (`-` / `+`), tombol hapus per item, dan tombol kosongkan keranjang.
  - Rincian kalkulasi: Subtotal, Pajak PB1 (10%), dan Total Akhir.
- [x] **P5.4 Modal Pembayaran & Kalkulator Kembalian:**
  - Opsi pembayaran Tunai dengan tombol pecahan cepat (Pas, Rp 20.000, Rp 50.000, Rp 100.000) dan hitung kembalian otomatis.
  - Opsi QRIS dengan simulasi kode QR.
  - Opsi Kartu Debit.
  - Validasi ketat (tidak bisa menyelesaikan transaksi jika pembayaran kurang).
- [x] **P5.5 Modal Struk Belanja & Cetak Thermal:**
  - Format nota kasir rapi (ID Transaksi unik, tanggal jam, rincian pesanan, total, bayar, kembalian).
  - Tombol Cetak Struk menggunakan `window.print()` yang dioptimasi CSS `@media print`.
  - Tombol Transaksi Baru untuk mereset keranjang dan kembali ke katalog.

---

## Phase 6: Implementasi Riwayat & Rekap Penjualan (`/transaksi`)
- [x] **P6.1 Kartu Ringkasan Penjualan:** Akumulasi total omzet, total pesanan selesai, dan transaksi per metode pembayaran.
- [x] **P6.2 Filter & Pencarian Transaksi:** Filter berdasarkan metode pembayaran (Semua, Tunai, QRIS, Debit) dan pencarian ID transaksi.
- [x] **P6.3 Tabel Riwayat Transaksi:** Menampilkan daftar transaksi yang tersimpan secara terstruktur.
- [x] **P6.4 Modal Cetak Ulang Struk:** Kemampuan membuka kembali nota transaksi lama untuk dicetak ulang kapan saja.
- [x] **P6.5 Tombol Reset Data Demo:** Fitur pembersihan data simulasi transaksi lokal.

---

## Phase 7: Polish, Audit Antislop, & Verifikasi Build
- [x] **P7.1 Audit Kepatuhan Antislop:**
  - Tidak ada karakter em dash di seluruh antarmuka dan copy kode.
  - Seluruh tombol dan kontrol interaktif berfungsi nyata tanpa dead controls.
  - Kontras teks memenuhi standar WCAG AA di mode terang dan gelap.
  - Tidak ada horizontal scroll atau tabrakan elemen di mobile breakpoint.
- [x] **P7.2 Verifikasi `bun run lint`:** Lolos 100% tanpa error maupun warning.
- [x] **P7.3 Verifikasi `bun run build`:** Lolos 100% produksi Next.js 16 dengan bundle PWA Serwist.
