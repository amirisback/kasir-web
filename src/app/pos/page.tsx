import React from 'react';
import type { Metadata } from 'next';
import { getCurrentDictionary } from '@/lib/i18n-server';
import { generatePageSeo } from '@/lib/seo';
import menuDataRaw from '@/data/menu.json';
import { MenuItem } from '@/types/pos';
import { PosClient } from './pos-client';

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getCurrentDictionary();

  return generatePageSeo({
    title: 'Mesin Kasir (POS) - AmirPOS',
    description: 'Layar kasir Point of Sale aktif untuk pencatatan transaksi pesanan kedai kopi dan kuliner.',
    locale,
    pathname: '/pos',
  });
}

export default async function PosPage() {
  const menuItems = menuDataRaw as MenuItem[];

  return <PosClient initialMenuItems={menuItems} />;
}
