import { calculateOpenPositionSnapshot } from '@/modules/trades/calculations';
import { getIpoEventStatus, parseDateOnly } from '@/modules/ipo/utils/ipoStatus';

type Severity = 'info' | 'warning' | 'danger';
type Delivery = 'center_only' | 'toast_only' | 'hybrid';

const NOTIFICATION_RETENTION_DAYS: Record<Severity, number | null> = {
  info: 7,
  warning: 14,
  danger: null,
};

export interface NotificationItem {
  key: string;
  typeId: string;
  module: string;
  title: string;
  message: string;
  severity: Severity;
  delivery: Delivery;
  ctaLabel: string;
  ctaTarget: string;
  fingerprint: string;
  createdAt: string;
}

export function getNotificationRetentionDays(severity: Severity) {
  return NOTIFICATION_RETENTION_DAYS[severity];
}

export function isNotificationExpired(notification: Pick<NotificationItem, 'severity' | 'createdAt'>, now = new Date()) {
  const retentionDays = getNotificationRetentionDays(notification.severity);
  if (retentionDays == null) return false;
  const createdAt = new Date(notification.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;
  return now.getTime() - createdAt.getTime() >= retentionDays * 86_400_000;
}

type IpoEventLike = {
  id: string;
  stockCode: string;
  offeringDate?: string;
  ipoDate: string;
  allotmentDate?: string;
  refundDate?: string;
  distributionDate?: string;
};

type IpoEntryLike = {
  id: string;
  ipoEventId: string;
  ipoAccountId?: string;
};

type IpoAccountLike = {
  id: string;
  name: string;
  isActive?: boolean;
};

type TradeLike = {
  id: string;
  stockCode: string;
  market?: 'ID' | 'US';
  buyPrice: number;
  sellPrice?: number | null;
  buyFee?: number;
  lots: number;
  dateBuy: string;
  dateSell?: string | null;
  reasonExit?: string;
  notes?: string;
};

type FinanceAccountLike = {
  id: string;
  name: string;
  openingBalance?: number;
  isActive?: boolean;
  createdAt?: string;
};

type FinanceTransactionLike = {
  id: string;
  accountId: string;
  type: string;
  date: string;
  transferGroupId?: string;
};

export type ReportShareLike = {
  id: string;
  title: string;
  is_active: boolean;
  updated_at?: string;
  created_at?: string;
};

type NotificationBuildInput = {
  now?: Date;
  ipoEvents: IpoEventLike[];
  ipoEntries: IpoEntryLike[];
  ipoAccounts: IpoAccountLike[];
  trades: TradeLike[];
  marketPrices: Record<string, number>;
  tradeFormDraft?: any;
  tradeEditDraft?: any;
  settings: {
    behaviorDailyTradeLimitEnabled?: boolean;
    behaviorDailyTradeLimit?: number;
  };
  financeAccounts: FinanceAccountLike[];
  financeTransactions: FinanceTransactionLike[];
  getFinanceAccountCurrentBalance?: (accountId: string) => number;
  reportShares?: ReportShareLike[];
  usedLocalCacheFallback?: boolean;
};

const IPO_MILESTONE_DAYS = 3;
const OPEN_TRADE_REVIEW_DAYS = 7;
const PORTFOLIO_LOSS_THRESHOLD = -0.07;
const PORTFOLIO_CONCENTRATION_THRESHOLD = 0.35;
const FINANCE_INACTIVE_DAYS = 30;
const REPORT_SNAPSHOT_STALE_DAYS = 30;
const LOW_BALANCE_FLOOR = 100_000;

function startOfDay(input: Date) {
  const next = new Date(input);
  next.setHours(0, 0, 0, 0);
  return next;
}

function diffInDays(dateA: Date, dateB: Date) {
  return Math.round((startOfDay(dateA).getTime() - startOfDay(dateB).getTime()) / 86_400_000);
}

function isOpenTrade(trade: TradeLike) {
  return !trade.sellPrice || !trade.dateSell;
}

function hasMeaningfulDraft(value: any) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.some((item) => hasMeaningfulDraft(item));
  if (typeof value === 'object') return Object.values(value).some((item) => hasMeaningfulDraft(item));
  return false;
}

function makeNotification(
  partial: Omit<NotificationItem, 'fingerprint' | 'createdAt'> & { fingerprintParts?: Array<string | number | boolean | undefined | null> }
): NotificationItem {
  const fingerprint = (partial.fingerprintParts || []).filter((part) => part != null && String(part).length > 0).join('|');
  return {
    key: partial.key,
    typeId: partial.typeId,
    module: partial.module,
    title: partial.title,
    message: partial.message,
    severity: partial.severity,
    delivery: partial.delivery,
    ctaLabel: partial.ctaLabel,
    ctaTarget: partial.ctaTarget,
    fingerprint: fingerprint || partial.key,
    createdAt: new Date().toISOString(),
  };
}

export function buildNotificationItems({
  now = new Date(),
  ipoEvents,
  ipoEntries,
  ipoAccounts,
  trades,
  marketPrices,
  tradeFormDraft,
  tradeEditDraft,
  settings,
  financeAccounts,
  financeTransactions,
  getFinanceAccountCurrentBalance,
  reportShares = [],
  usedLocalCacheFallback = false,
}: NotificationBuildInput): NotificationItem[] {
  const items: NotificationItem[] = [];
  const today = startOfDay(now);
  const entryCountByEventId = ipoEntries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.ipoEventId] = (acc[entry.ipoEventId] || 0) + 1;
    return acc;
  }, {});

  ipoEvents.forEach((event) => {
    const offeringDate = event.offeringDate ? parseDateOnly(event.offeringDate) : null;
    const ipoDate = parseDateOnly(event.ipoDate);
    const eventStatus = getIpoEventStatus(event as any);
    if (offeringDate && diffInDays(offeringDate, today) === 0) {
      items.push(makeNotification({
        key: `ipo-offering-today:${event.id}`,
        typeId: 'ipo-offering-today',
        module: 'IPO',
        title: 'Penawaran IPO hari ini',
        message: `Masa penawaran untuk ${event.stockCode} berlangsung hari ini. Pastikan entry akun sudah siap.`,
        severity: 'warning',
        delivery: 'hybrid',
        ctaLabel: 'Buka IPO',
        ctaTarget: `/ipo/${event.id}`,
        fingerprintParts: [event.id, offeringDate.toISOString().slice(0, 10)],
      }));
    }
    if (ipoDate && diffInDays(ipoDate, today) === 0) {
      items.push(makeNotification({
        key: `ipo-listing-today:${event.id}`,
        typeId: 'ipo-listing-today',
        module: 'IPO',
        title: 'IPO listing hari ini',
        message: `${event.stockCode} listing hari ini. Tinjau hasil partisipasi dan rencana aksi akun.`,
        severity: 'danger',
        delivery: 'hybrid',
        ctaLabel: 'Lihat Detail',
        ctaTarget: `/ipo/${event.id}`,
        fingerprintParts: [event.id, ipoDate.toISOString().slice(0, 10)],
      }));
    }

    const milestoneDefs = [
      { id: 'allotment', label: 'Allotment', value: event.allotmentDate },
      { id: 'refund', label: 'Refund', value: event.refundDate },
      { id: 'distribution', label: 'Distribusi', value: event.distributionDate },
    ];
    milestoneDefs.forEach((milestone) => {
      const milestoneDate = milestone.value ? parseDateOnly(milestone.value) : null;
      if (!milestoneDate) return;
      const diff = diffInDays(milestoneDate, today);
      if (diff < 0 || diff > IPO_MILESTONE_DAYS) return;
      const label = diff === 0 ? `${milestone.label} hari ini` : `${milestone.label} ${diff} hari lagi`;
      items.push(makeNotification({
        key: `ipo-milestone-near:${event.id}:${milestone.id}`,
        typeId: 'ipo-milestone-near',
        module: 'IPO',
        title: 'Tanggal penting IPO mendekat',
        message: `${label} untuk ${event.stockCode}. Pastikan tindak lanjutnya sudah siap.`,
        severity: diff === 0 ? 'warning' : 'info',
        delivery: 'center_only',
        ctaLabel: 'Cek Jadwal',
        ctaTarget: `/ipo/${event.id}`,
        fingerprintParts: [event.id, milestone.id, milestoneDate.toISOString().slice(0, 10)],
      }));
    });

    if ((eventStatus === 'active' || eventStatus === 'upcoming') && (entryCountByEventId[event.id] || 0) === 0) {
      items.push(makeNotification({
        key: `ipo-active-without-entries:${event.id}`,
        typeId: 'ipo-active-without-entries',
        module: 'IPO',
        title: 'IPO aktif belum punya entry akun',
        message: `Event ${event.stockCode} sudah aktif tetapi belum memiliki catatan partisipasi akun.`,
        severity: 'warning',
        delivery: 'center_only',
        ctaLabel: 'Tambah Entry',
        ctaTarget: `/ipo/${event.id}`,
        fingerprintParts: [event.id, eventStatus],
      }));
    }

    const missingFields = [
      !event.offeringDate && 'penawaran',
      !event.allotmentDate && 'allotment',
      !event.refundDate && 'refund',
      !event.distributionDate && 'distribusi',
    ].filter(Boolean);
    if ((eventStatus === 'active' || eventStatus === 'upcoming') && missingFields.length > 0) {
      items.push(makeNotification({
        key: `ipo-missing-key-dates:${event.id}`,
        typeId: 'ipo-missing-key-dates',
        module: 'IPO',
        title: 'Data tanggal IPO belum lengkap',
        message: `Event ${event.stockCode} masih belum memiliki tanggal ${missingFields.join(', ')}.`,
        severity: 'info',
        delivery: 'center_only',
        ctaLabel: 'Lengkapi Data',
        ctaTarget: `/ipo/${event.id}`,
        fingerprintParts: [event.id, missingFields.join(',')],
      }));
    }
  });

  const accountEntryCount = ipoEntries.reduce<Record<string, number>>((acc, entry) => {
    if (!entry.ipoAccountId) return acc;
    acc[entry.ipoAccountId] = (acc[entry.ipoAccountId] || 0) + 1;
    return acc;
  }, {});
  ipoAccounts.forEach((account) => {
    if (account.isActive !== false || !accountEntryCount[account.id]) return;
    items.push(makeNotification({
      key: `ipo-inactive-account-still-referenced:${account.id}`,
      typeId: 'ipo-inactive-account-still-referenced',
      module: 'IPO',
      title: 'Akun IPO nonaktif masih dipakai histori',
      message: `Akun ${account.name} sudah nonaktif tetapi masih punya riwayat partisipasi yang mungkin perlu ditinjau.`,
      severity: 'info',
      delivery: 'center_only',
      ctaLabel: 'Buka Akun IPO',
      ctaTarget: '/ipo/accounts',
      fingerprintParts: [account.id, accountEntryCount[account.id]],
    }));
  });

  const openTrades = trades.filter(isOpenTrade);
  const todayIso = today.toISOString().slice(0, 10);
  if (settings.behaviorDailyTradeLimitEnabled && Number(settings.behaviorDailyTradeLimit) > 0) {
    const todayTradeCount = trades.filter((trade) => trade.dateBuy === todayIso).length;
    const limit = Number(settings.behaviorDailyTradeLimit);
    if (todayTradeCount >= limit - 1) {
      const hitLimit = todayTradeCount >= limit;
      items.push(makeNotification({
        key: `trade-daily-limit-near-or-hit:${todayIso}`,
        typeId: 'trade-daily-limit-near-or-hit',
        module: 'Trades',
        title: 'Batas transaksi harian terpantau',
        message: hitLimit
          ? `Jumlah trade hari ini sudah mencapai batas harian ${limit} transaksi.`
          : `Jumlah trade hari ini sudah mendekati batas harian ${limit} transaksi.`,
        severity: hitLimit ? 'danger' : 'warning',
        delivery: 'hybrid',
        ctaLabel: 'Lihat Transaksi',
        ctaTarget: '/trades',
        fingerprintParts: [todayIso, todayTradeCount, limit],
      }));
    }
  }

  if (hasMeaningfulDraft(tradeFormDraft)) {
    items.push(makeNotification({
      key: 'trade-draft-incomplete:new',
      typeId: 'trade-draft-incomplete',
      module: 'Trades',
      title: 'Draft trade belum selesai',
      message: 'Masih ada draft input trade yang belum diselesaikan.',
      severity: 'info',
      delivery: 'center_only',
      ctaLabel: 'Lanjutkan Draft',
      ctaTarget: '/trades/new',
      fingerprintParts: ['new-trade'],
    }));
  }
  if (hasMeaningfulDraft(tradeEditDraft)) {
    const draftTradeId = typeof tradeEditDraft?.id === 'string' ? tradeEditDraft.id : 'edit';
    items.push(makeNotification({
      key: `trade-draft-incomplete:edit:${draftTradeId}`,
      typeId: 'trade-draft-incomplete',
      module: 'Trades',
      title: 'Draft edit trade belum selesai',
      message: 'Masih ada draft edit trade yang belum diselesaikan.',
      severity: 'info',
      delivery: 'center_only',
      ctaLabel: 'Lanjutkan Draft',
      ctaTarget: draftTradeId && draftTradeId !== 'edit' ? `/trades/${draftTradeId}` : '/trades',
      fingerprintParts: ['edit-trade', draftTradeId],
    }));
  }

  const groupedOpenPositions: Record<string, { marketValue: number; tradeIds: string[] }> = {};
  let totalMarketValue = 0;
  let missingLivePriceCount = 0;
  openTrades.forEach((trade) => {
    const snapshot = calculateOpenPositionSnapshot(trade as any, marketPrices || {});
    const lossRatio = snapshot.totalBuy > 0 ? snapshot.floatingPnL / snapshot.totalBuy : 0;
    if (snapshot.hasLivePrice && lossRatio <= PORTFOLIO_LOSS_THRESHOLD) {
      items.push(makeNotification({
        key: `portfolio-loss-threshold:${trade.id}`,
        typeId: 'portfolio-loss-threshold',
        module: 'Portfolio',
        title: 'Posisi rugi melewati ambang',
        message: `Posisi ${trade.stockCode} sedang berada di bawah ambang rugi yang perlu ditinjau.`,
        severity: 'danger',
        delivery: 'center_only',
        ctaLabel: 'Buka Portofolio',
        ctaTarget: '/portfolio',
        fingerprintParts: [trade.id, snapshot.priceUsed, lossRatio.toFixed(4)],
      }));
    }
    if (!snapshot.hasLivePrice) {
      missingLivePriceCount += 1;
    }
    const positionKey = `${trade.market || 'ID'}:${trade.stockCode}`;
    groupedOpenPositions[positionKey] = groupedOpenPositions[positionKey] || { marketValue: 0, tradeIds: [] };
    groupedOpenPositions[positionKey].marketValue += snapshot.marketValue;
    groupedOpenPositions[positionKey].tradeIds.push(trade.id);
    totalMarketValue += snapshot.marketValue;

    const livePrice = Number(marketPrices?.[trade.stockCode]) || 0;
    if (livePrice > 0 && Number(trade.sellPrice) > 0 && livePrice >= Number(trade.sellPrice)) {
      items.push(makeNotification({
        key: `trade-target-hit:${trade.id}`,
        typeId: 'trade-target-hit',
        module: 'Trades',
        title: 'Harga menyentuh target profit',
        message: `${trade.stockCode} telah mencapai area target profit. Evaluasi realisasi atau trailing plan.`,
        severity: 'info',
        delivery: 'center_only',
        ctaLabel: 'Review Trade',
        ctaTarget: `/trades/${trade.id}`,
        fingerprintParts: [trade.id, livePrice, trade.sellPrice],
      }));
    }

    const buyDate = trade.dateBuy ? parseDateOnly(trade.dateBuy) : null;
    const tradeAge = buyDate ? diffInDays(today, buyDate) : 0;
    if (tradeAge >= OPEN_TRADE_REVIEW_DAYS && !String(trade.reasonExit || '').trim() && !String(trade.notes || '').trim()) {
      items.push(makeNotification({
        key: `trade-open-without-review:${trade.id}`,
        typeId: 'trade-open-without-review',
        module: 'Trades',
        title: 'Trade terbuka belum punya review lanjutan',
        message: `Trade ${trade.stockCode} masih terbuka tetapi review atau rencana exit belum lengkap.`,
        severity: 'info',
        delivery: 'center_only',
        ctaLabel: 'Isi Review',
        ctaTarget: `/trades/${trade.id}`,
        fingerprintParts: [trade.id, trade.dateBuy],
      }));
    }
  });

  if (totalMarketValue > 0) {
    Object.entries(groupedOpenPositions).forEach(([positionKey, grouped]) => {
      const weight = grouped.marketValue / totalMarketValue;
      if (weight <= PORTFOLIO_CONCENTRATION_THRESHOLD) return;
      const stockCode = positionKey.split(':')[1];
      items.push(makeNotification({
        key: `portfolio-overconcentration:${positionKey}`,
        typeId: 'portfolio-overconcentration',
        module: 'Portfolio',
        title: 'Konsentrasi portofolio terlalu besar',
        message: `Eksposur pada ${stockCode} sudah terlalu dominan dibanding total portofolio.`,
        severity: 'warning',
        delivery: 'center_only',
        ctaLabel: 'Tinjau Alokasi',
        ctaTarget: '/portfolio',
        fingerprintParts: [positionKey, weight.toFixed(4)],
      }));
    });
  }

  if (openTrades.length > 0 && missingLivePriceCount > 0) {
    items.push(makeNotification({
      key: 'portfolio-price-refresh-stale',
      typeId: 'portfolio-price-refresh-stale',
      module: 'Portfolio',
      title: 'Harga live belum terbarui',
      message: `${missingLivePriceCount} posisi masih memakai fallback harga dan perlu refresh data live.`,
      severity: 'warning',
      delivery: 'hybrid',
      ctaLabel: 'Refresh Harga',
      ctaTarget: '/portfolio',
      fingerprintParts: [missingLivePriceCount, openTrades.length],
    }));
  }

  financeAccounts.forEach((account) => {
    if (account.isActive === false) return;
    const accountTransactions = financeTransactions
      .filter((transaction) => transaction.accountId === account.id)
      .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
    const lastTransactionDate = accountTransactions[0]?.date || account.createdAt;
    const lastDate = lastTransactionDate ? parseDateOnly(lastTransactionDate) : null;
    const inactiveDays = lastDate ? diffInDays(today, lastDate) : 0;
    if (inactiveDays >= FINANCE_INACTIVE_DAYS) {
      items.push(makeNotification({
        key: `finance-account-inactive-mutation:${account.id}`,
        typeId: 'finance-account-inactive-mutation',
        module: 'Finance',
        title: 'Rekening aktif lama tanpa mutasi',
        message: `Rekening ${account.name} belum memiliki mutasi baru dalam ${inactiveDays} hari terakhir.`,
        severity: 'info',
        delivery: 'center_only',
        ctaLabel: 'Buka Finance Tracker',
        ctaTarget: '/finance',
        fingerprintParts: [account.id, lastTransactionDate],
      }));
    }

    if (typeof getFinanceAccountCurrentBalance === 'function') {
      const balance = Number(getFinanceAccountCurrentBalance(account.id)) || 0;
      const lowThreshold = Math.max(LOW_BALANCE_FLOOR, Math.abs(Number(account.openingBalance) || 0) * 0.05);
      if (balance < 0 || balance <= lowThreshold) {
        items.push(makeNotification({
          key: `finance-balance-low-or-negative:${account.id}`,
          typeId: 'finance-balance-low-or-negative',
          module: 'Finance',
          title: 'Saldo rekening perlu perhatian',
          message: balance < 0
            ? `Saldo rekening ${account.name} sudah negatif dan perlu segera ditinjau.`
            : `Saldo rekening ${account.name} mendekati batas minimum operasional.`,
          severity: balance < 0 ? 'danger' : 'warning',
          delivery: 'center_only',
          ctaLabel: 'Lihat Rekening',
          ctaTarget: `/finance/${account.id}`,
          fingerprintParts: [account.id, balance],
        }));
      }
    }
  });

  const transferGroups = financeTransactions.reduce<Record<string, FinanceTransactionLike[]>>((acc, transaction) => {
    if (!transaction.transferGroupId) return acc;
    acc[transaction.transferGroupId] = acc[transaction.transferGroupId] || [];
    acc[transaction.transferGroupId].push(transaction);
    return acc;
  }, {});
  Object.entries(transferGroups).forEach(([groupId, groupTransactions]) => {
    const hasExpectedPair = groupTransactions.length === 2;
    const hasIn = groupTransactions.some((item) => item.type === 'transfer_in');
    const hasOut = groupTransactions.some((item) => item.type === 'transfer_out');
    if (hasExpectedPair && hasIn && hasOut) return;
    items.push(makeNotification({
      key: `finance-transfer-sync-problem:${groupId}`,
      typeId: 'finance-transfer-sync-problem',
      module: 'Finance',
      title: 'Transfer internal perlu ditinjau',
      message: 'Ada transfer internal dengan pasangan data yang tidak lengkap atau tidak sinkron.',
      severity: 'danger',
      delivery: 'hybrid',
      ctaLabel: 'Periksa Ledger',
      ctaTarget: '/finance',
      fingerprintParts: [groupId, groupTransactions.length, hasIn, hasOut],
    }));
  });

  reportShares.forEach((share) => {
    if (!share.is_active) {
      items.push(makeNotification({
        key: `report-link-disabled:${share.id}`,
        typeId: 'report-link-disabled',
        module: 'Reports',
        title: 'Link report nonaktif',
        message: `Link report "${share.title}" saat ini nonaktif dan mungkin perlu diaktifkan kembali.`,
        severity: 'info',
        delivery: 'center_only',
        ctaLabel: 'Buka Reports',
        ctaTarget: '/reports',
        fingerprintParts: [share.id, 'inactive'],
      }));
    }
    const updatedAt = share.updated_at || share.created_at;
    const updatedDate = updatedAt ? parseDateOnly(updatedAt) : null;
    if (!updatedDate) return;
    const staleDays = diffInDays(today, updatedDate);
    if (staleDays < REPORT_SNAPSHOT_STALE_DAYS) return;
    items.push(makeNotification({
      key: `report-snapshot-stale:${share.id}`,
      typeId: 'report-snapshot-stale',
      module: 'Reports',
      title: 'Snapshot report sudah lama',
      message: `Snapshot report "${share.title}" belum diperbarui dalam ${staleDays} hari.`,
      severity: 'warning',
      delivery: 'center_only',
      ctaLabel: 'Perbarui Snapshot',
      ctaTarget: '/reports',
      fingerprintParts: [share.id, updatedAt],
    }));
  });

  if (usedLocalCacheFallback) {
    items.push(makeNotification({
      key: 'system-sync-fallback-local-cache',
      typeId: 'system-sync-fallback-local-cache',
      module: 'System',
      title: 'Koneksi server gagal, memakai cache lokal',
      message: 'Sinkronisasi ke server gagal sehingga aplikasi sementara memakai data cache lokal.',
      severity: 'danger',
      delivery: 'hybrid',
      ctaLabel: 'Buka Pengaturan',
      ctaTarget: '/settings',
      fingerprintParts: ['local-cache-fallback'],
    }));
  }

  const severityOrder: Record<Severity, number> = { danger: 0, warning: 1, info: 2 };
  return items.sort((left, right) => {
    const severityDiff = severityOrder[left.severity] - severityOrder[right.severity];
    if (severityDiff !== 0) return severityDiff;
    return left.title.localeCompare(right.title, 'id');
  });
}
