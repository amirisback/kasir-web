# Spesifikasi Desain AmirPOS: Kasir UMKM F&B & Coffee Shop Modern

Dokumen spesifikasi arsitektur dan antarmuka untuk aplikasi AmirPOS berbasis Next.js 16, React 19, Tailwind CSS v4, dan Serwist PWA.

---

## 1. Ringkasan Produk & Sasaran

- **Nama Aplikasi:** AmirPOS (Kasir Kuliner & Coffee Shop)
- **Tujuan:** Menyediakan antarmuka Point of Sale (POS) yang cepat, intuitif, dan responsif untuk kasir kedai kopi dan usaha kuliner UMKM.
- **Karakter Visual:** Nuansa Warm Coffee & Artisan Bistro (Warm Amber, Terracotta, dan Espresso Charcoal).
- **Target Pengguna:** Pemilik kedai, kasir, dan barista dewasa yang membutuhkan transaksi cepat dengan kesalahan input minimal.

---

## 2. Parameter Antislop & Gaya Desain

- **Dial Antislop:**
  - ENERGY: 2 (Balanced, profesional, berkarakter)
  - RHYTHM: 2 (Struktur tertata dengan kontras hierarki jelas)
  - MOTION: 1 (Transisi instan tanpa animasi berlebih yang memperlambat kasir)
- **Palet Warna:**
  - Primary: Warm Amber (`#D97706`), hover (`#B45309`), active (`#92400E`)
  - Accent / Contrast: Espresso Deep Tone (`#1C1917`)
  - Background (Light Mode): Warm Cream Parchment (`#FAF7F2`)
  - Background (Dark Mode): Deep Coffee Charcoal (`#14100D` dan card `#1C1713`)
  - Border & Pembatas: Warm Border (`#E7E0D8` di light mode, `#2E251E` di dark mode)
  - Kontras Teks: Memenuhi standar WCAG AA (rasio kontras teks normal minimal 4.5:1)
- **Tipografi:**
  - Teks Utama & UI: Geist Sans
  - Angka, Struk, Harga, dan Kode Pesanan: Geist Mono
- **Kepatuhan Aturan Bahasa:** Bebas dari karakter em dash di seluruh tampilan UI dan copy.

---

## 3. Arsitektur Teknis

- **Framework:** Next.js 16.3.6 (App Router), React 19.3.0, TypeScript Strict Mode
- **Styling:** Tailwind CSS v4.3.3 dengan CSS Variables di `@theme inline`
- **PWA:** Serwist v9.5.12 untuk caching offline
- **Manajemen State Kasir:**
  - Menu Katalog: Dimuat via dummy JSON (`src/data/menu.json`) terstruktur per kategori.
  - Keranjang Belanja (Cart): Reactive Client State dengan hooks terisolasi `use-cart.ts` dan persistensi lokal `localStorage`.
  - Log Transaksi: Penyimpanan transaksi lokal terstruktur di `localStorage` melalui service `transaction-storage.ts` agar dapat diakses bersama antara `/pos` dan `/transaksi`.
- **Pembersihan Demo Route:** Folder `src/app/demo-encryption/` dihapus sesuai mandat `GUIDELINE.md` agar build produksi bersih.

---

## 4. Struktur Rute & Fitur Halaman

### A. Beranda & Ikhtisar Kasir (`/`)
1. **Header Toko & Status Kasir:** Indikator kasir aktif ("Register Buka"), jam operasional, dan navigasi utama.
2. **Kartu Metrik Harian:**
   - Total Omzet Penjualan Hari Ini (dihitung dinamis dari riwayat transaksi lokal)
   - Jumlah Transaksi Selesai
   - Produk Terlaris Hari Ini
3. **Pintasan Aksi Kasir:**
   - Tombol utama: "Buka Mesin Kasir (POS)" mengarah langsung ke `/pos`.
   - Tombol sekunder: "Lihat Rekap Penjualan" mengarah ke `/transaksi`.
4. **Panduan Pintas Operasional:** Tips singkat penggunaan kasir untuk kasir baru.

### B. Layar Registrasi Kasir Aktif (`/pos`)
1. **Area Katalog Menu (Sisi Kiri/Atas):**
   - Tab Kategori: Semua, Kopi, Non-Kopi, Makanan Utama, Camilan, Penutup.
   - Input Pencarian: Filter instan berdasarkan nama menu atau kategori.
   - Kartu Menu: Gambar representatif, badge kategori, nama menu, harga format IDR, tombol aksi "Tambah (+)".
2. **Panel Keranjang Pesanan (Order Bill) (Sisi Kanan/Bawah di Mobile):**
   - Pilihan Tipe Pesanan: "Dine In" (Makan di Tempat) atau "Take Away" (Bungkus).
   - Input Opsional: Nomor Meja / Nama Pelanggan.
   - Daftar Item: Nama, harga satuan, quantity counter (`-`, jumlah, `+`), subtotal per item, dan tombol hapus item.
   - Empty State: Ilustrasi dan pesan jelas jika keranjang masih kosong.
   - Kalkulasi Pembayaran: Subtotal, Pajak PB1 (10%), dan Total Akhir.
   - Tombol Checkout: Membuka modal pembayaran.
3. **Modal Pembayaran & Validasi:**
   - Pilihan Metode Pembayaran: Tunai, QRIS, Kartu Debit.
   - Mode Tunai:
     - Tombol cepat uang pas, Rp 20.000, Rp 50.000, Rp 100.000, Rp 200.000.
     - Input nominal bayar kustom.
     - Kalkulator kembalian otomatis dengan proteksi validasi (tombol konfirmasi disabled jika uang kurang).
   - Mode QRIS: Tampilan QR code statis simulasi dan petunjuk scan.
   - Mode Debit: Input simulasi nomor referensi kartu.
4. **Modal Struk Transaksi Digital & Cetak:**
   - Tampilan nota kasir formal (Nama kedai AmirPOS, ID Transaksi, Tanggal/Waktu, Kasir, Rincian Pesanan, Subtotal, Pajak, Total, Bayar, Kembalian).
   - Tombol "Cetak Struk" (terhubung ke dialog cetak browser dengan format CSS cetak thermal `@media print`).
   - Tombol "Transaksi Baru" (mengosongkan keranjang dan siap menerima pesanan berikutnya).

### C. Riwayat & Rekap Penjualan (`/transaksi`)
1. **Ringkasan Penjualan:**
   - Total Omzet Tersimpan.
   - Rata-rata Nilai Transaksi (AOV).
   - Distribusi Metode Pembayaran (Tunai vs QRIS vs Debit).
2. **Filter & Pencarian Riwayat:**
   - Filter menurut metode pembayaran.
   - Pencarian berdasarkan ID transaksi atau nama pelanggan.
3. **Daftar Log Transaksi:**
   - Tabel/Kartu riwayat detail dengan status sukses.
   - Tombol aksi "Lihat Struk": Membuka kembali modal nota transaksi untuk dicetak ulang.
4. **Fitur Reset / Kosongkan Simulasi:** Opsi untuk membersihkan data demo transaksi lokal saat testing.

---

## 5. Rencana Pengujian & Kualitas

- Build checklist: `bun run build` sukses tanpa error dan warning.
- Lint checklist: `bun run lint` lolos tanpa error.
- Dukungan responsif: Uji tampilan di mobile (375px), tablet (768px), dan desktop (1280px).
- Dark mode checklist: Kontras dan elemen UI terverifikasi di mode terang dan gelap.
