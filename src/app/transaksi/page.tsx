import React from 'react';
import type { Metadata } from 'next';
import { getCurrentDictionary } from '@/lib/i18n-server';
import { generatePageSeo } from '@/lib/seo';
import { TransactionsClient } from './transactions-client';

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getCurrentDictionary();

  return generatePageSeo({
    title: 'Riwayat Transaksi - KulaPOS',
    description: 'Daftar riwayat nota penjualan kasir dan rekapan omzet harian KulaPOS.',
    locale,
    pathname: '/transaksi',
  });
}

export default function TransactionsPage() {
  return <TransactionsClient />;
}
