import { describe, expect, it } from 'vitest';
import { buildNotificationItems, getNotificationRetentionDays, isNotificationExpired } from '@/modules/shared/utils/notificationCenter';

describe('buildNotificationItems', () => {
  it('creates IPO notifications for today listing and missing entries', () => {
    const items = buildNotificationItems({
      now: new Date('2026-06-26T08:00:00.000Z'),
      ipoEvents: [
        {
          id: 'ipo-1',
          stockCode: 'TEST',
          ipoDate: '2026-06-26',
          offeringDate: '2026-06-25',
        },
      ],
      ipoEntries: [],
      ipoAccounts: [],
      trades: [],
      marketPrices: {},
      settings: {},
      financeAccounts: [],
      financeTransactions: [],
    });

    expect(items.some((item) => item.typeId === 'ipo-listing-today')).toBe(true);
    expect(items.some((item) => item.typeId === 'ipo-active-without-entries')).toBe(true);
  });

  it('creates portfolio concentration and target hit notifications from open trades', () => {
    const items = buildNotificationItems({
      now: new Date('2026-06-26T08:00:00.000Z'),
      ipoEvents: [],
      ipoEntries: [],
      ipoAccounts: [],
      trades: [
        {
          id: 'trade-1',
          stockCode: 'ABCD',
          market: 'ID',
          buyPrice: 100,
          sellPrice: 120,
          buyFee: 0.15,
          lots: 10,
          dateBuy: '2026-06-20',
        },
        {
          id: 'trade-2',
          stockCode: 'EFGH',
          market: 'ID',
          buyPrice: 100,
          buyFee: 0.15,
          lots: 1,
          dateBuy: '2026-06-20',
        },
      ],
      marketPrices: { ABCD: 125, EFGH: 90 },
      settings: {},
      financeAccounts: [],
      financeTransactions: [],
    });

    expect(items.some((item) => item.typeId === 'trade-target-hit')).toBe(true);
    expect(items.some((item) => item.typeId === 'portfolio-overconcentration')).toBe(true);
  });

  it('creates finance transfer sync and low balance notifications', () => {
    const items = buildNotificationItems({
      now: new Date('2026-06-26T08:00:00.000Z'),
      ipoEvents: [],
      ipoEntries: [],
      ipoAccounts: [],
      trades: [],
      marketPrices: {},
      settings: {},
      financeAccounts: [
        {
          id: 'acc-1',
          name: 'BCA',
          openingBalance: 5000000,
          isActive: true,
          createdAt: '2026-05-01',
        },
      ],
      financeTransactions: [
        {
          id: 'tx-1',
          accountId: 'acc-1',
          type: 'transfer_out',
          date: '2026-06-10',
          transferGroupId: 'group-1',
        },
      ],
      getFinanceAccountCurrentBalance: () => -5000,
    });

    expect(items.some((item) => item.typeId === 'finance-transfer-sync-problem')).toBe(true);
    expect(items.some((item) => item.typeId === 'finance-balance-low-or-negative')).toBe(true);
  });

  it('applies retention policy by severity', () => {
    expect(getNotificationRetentionDays('info')).toBe(7);
    expect(getNotificationRetentionDays('warning')).toBe(14);
    expect(getNotificationRetentionDays('danger')).toBeNull();
  });

  it('expires info and warning notifications after their retention window', () => {
    expect(isNotificationExpired({
      severity: 'info',
      createdAt: '2026-06-01T00:00:00.000Z',
    }, new Date('2026-06-09T00:00:00.000Z'))).toBe(true);

    expect(isNotificationExpired({
      severity: 'warning',
      createdAt: '2026-06-01T00:00:00.000Z',
    }, new Date('2026-06-16T00:00:00.000Z'))).toBe(true);

    expect(isNotificationExpired({
      severity: 'danger',
      createdAt: '2026-06-01T00:00:00.000Z',
    }, new Date('2026-07-30T00:00:00.000Z'))).toBe(false);
  });
});
