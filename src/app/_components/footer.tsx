import React from 'react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border bg-card/60 transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">KulaPOS</span>
            <span>&bull;</span>
            <span>Solusi Kasir Digital UMKM Retail Toko &amp; F&amp;B Kafe</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              PWA Offline Ready
            </span>
            <span>&copy; {currentYear} KulaPOS</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
