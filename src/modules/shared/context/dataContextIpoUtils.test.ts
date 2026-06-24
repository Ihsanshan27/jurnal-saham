import { describe, expect, it } from 'vitest';
import { normalizeIpoCollections } from '@/modules/shared/context/dataContextIpoUtils';

describe('normalizeIpoCollections', () => {
  it('groups entries with the same normalized account name into one ipo account', () => {
    const result = normalizeIpoCollections(
      [
        {
          id: 'entry-1',
          ipoEventId: 'ipo-1',
          accountName: 'Akun Utama',
          email: 'USER@MAIL.COM',
          createdAt: '2026-06-01T00:00:00.000Z',
        },
        {
          id: 'entry-2',
          ipoEventId: 'ipo-2',
          accountName: ' akun   utama ',
          email: 'user@mail.com',
          createdAt: '2026-06-02T00:00:00.000Z',
        },
      ],
      [],
    );

    expect(result.accounts).toHaveLength(1);
    expect(result.accounts[0].name).toBe('Akun Utama');
    expect(result.entries[0].ipoAccountId).toBe(result.entries[1].ipoAccountId);
    expect(result.entries[0].email).toBe('user@mail.com');
    expect(result.entries[1].email).toBe('user@mail.com');
    expect(result.accounts[0].rdnBankName || '').toBe('');
  });

  it('prefers an existing master account by id even when entry name casing differs', () => {
    const result = normalizeIpoCollections(
      [
        {
          id: 'entry-1',
          ipoEventId: 'ipo-1',
          ipoAccountId: 'acc-1',
          accountName: 'akun utama',
          email: 'user@mail.com',
          createdAt: '2026-06-02T00:00:00.000Z',
        },
      ],
      [
        {
          id: 'acc-1',
          name: 'Akun Utama',
          email: 'master@mail.com',
          rdnBankName: 'BCA',
          rdnAccountNumber: '1234567890',
          withdrawBankName: 'Mandiri',
          withdrawAccountNumber: '9988776655',
          withdrawAccountHolderName: 'Akun Utama',
          normalizedKey: 'akun utama',
          createdAt: '2026-06-01T00:00:00.000Z',
          lastUsedAt: '2026-06-01T00:00:00.000Z',
          isActive: true,
        },
      ],
    );

    expect(result.accounts).toHaveLength(1);
    expect(result.entries[0].accountName).toBe('Akun Utama');
    expect(result.entries[0].email).toBe('master@mail.com');
    expect(result.accounts[0].rdnBankName).toBe('BCA');
    expect(result.accounts[0].withdrawAccountNumber).toBe('9988776655');
  });
});
