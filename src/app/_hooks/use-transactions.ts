'use client';

import { useSyncExternalStore, useMemo } from 'react';
import {
  subscribeTransactions,
  getTransactionsSnapshot,
  getTransactionsServerSnapshot,
  calculateSalesSummary,
} from '@/lib/transaction-storage';

export function useTransactions() {
  const transactions = useSyncExternalStore(
    subscribeTransactions,
    getTransactionsSnapshot,
    getTransactionsServerSnapshot
  );

  const summary = useMemo(() => {
    return calculateSalesSummary(transactions);
  }, [transactions]);

  return { transactions, summary };
}
