import { generateId } from '@/modules/shared/utils/storage';
import type { IpoAccount, IpoEntry } from '@/modules/ipo/types/ipo';

type IpoEntryLike = {
  ipoAccountId?: string;
  accountName?: string;
  email?: string;
  createdAt?: string;
  [key: string]: unknown;
};

type IpoAccountLike = {
  id?: string;
  name?: string;
  email?: string;
  balance?: number;
  rdnBankName?: string;
  rdnAccountNumber?: string;
  withdrawBankName?: string;
  withdrawAccountNumber?: string;
  withdrawAccountHolderName?: string;
  normalizedKey?: string;
  createdAt?: string;
  lastUsedAt?: string;
  notes?: string;
  isActive?: boolean;
  updatedAt?: string;
};

export function normalizeIpoText(value: unknown) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

export function normalizeIpoEmail(value: unknown) {
  return normalizeIpoText(value).toLowerCase();
}

export function buildIpoAccountKey(accountName: unknown) {
  const normalizedName = normalizeIpoText(accountName).toLowerCase();
  return normalizedName;
}

export function normalizeIpoCollections(entries: any[] = [], accounts: any[] = []) {
  const accountMap = new Map<string, IpoAccountLike>();
  const accountIdMap = new Map<string, IpoAccountLike>();

  (accounts || []).forEach((account) => {
    const normalizedName = normalizeIpoText(account.name);
    const normalizedEmail = normalizeIpoEmail(account.email);
    const normalizedKey = account.normalizedKey || buildIpoAccountKey(normalizedName);
    if (!normalizedKey) return;
    const normalizedAccount = {
      id: account.id || generateId(),
      name: normalizedName || account.name || 'Tanpa nama akun',
      email: normalizedEmail,
      balance: Number(account.balance) || 0,
      rdnBankName: normalizeIpoText(account.rdnBankName),
      rdnAccountNumber: normalizeIpoText(account.rdnAccountNumber),
      withdrawBankName: normalizeIpoText(account.withdrawBankName),
      withdrawAccountNumber: normalizeIpoText(account.withdrawAccountNumber),
      withdrawAccountHolderName: normalizeIpoText(account.withdrawAccountHolderName),
      normalizedKey,
      createdAt: account.createdAt || new Date().toISOString(),
      lastUsedAt: account.lastUsedAt || account.createdAt || new Date().toISOString(),
      notes: normalizeIpoText(account.notes),
      isActive: account.isActive !== false,
      updatedAt: account.updatedAt,
    };
    accountMap.set(normalizedKey, normalizedAccount);
    accountIdMap.set(normalizedAccount.id!, normalizedAccount);
  });

  const normalizedEntries = (entries || []).map((entry) => {
    const normalizedName = normalizeIpoText(entry.accountName);
    const normalizedEmail = normalizeIpoEmail(entry.email);
    const normalizedKey = buildIpoAccountKey(normalizedName);

    if (!normalizedKey) {
      return {
        ...entry,
        accountName: normalizedName || entry.accountName || 'Tanpa nama akun',
        email: normalizedEmail,
      };
    }

    let account = (entry.ipoAccountId && accountIdMap.get(entry.ipoAccountId)) || accountMap.get(normalizedKey);
    if (!account) {
      account = {
        id: entry.ipoAccountId || generateId(),
        name: normalizedName || entry.accountName || 'Tanpa nama akun',
        email: normalizedEmail,
        balance: 0,
        rdnBankName: '',
        rdnAccountNumber: '',
        withdrawBankName: '',
        withdrawAccountNumber: '',
        withdrawAccountHolderName: '',
        normalizedKey,
        createdAt: entry.createdAt || new Date().toISOString(),
        lastUsedAt: entry.createdAt || new Date().toISOString(),
        notes: '',
        isActive: true,
      };
      accountMap.set(normalizedKey, account);
      accountIdMap.set(account.id!, account);
    } else {
      account.lastUsedAt = entry.createdAt || account.lastUsedAt || new Date().toISOString();
      if (!account.name && normalizedName) {
        account.name = normalizedName;
      }
      if (!account.email && normalizedEmail) {
        account.email = normalizedEmail;
      }
      if (normalizedKey && account.normalizedKey !== normalizedKey) {
        accountMap.delete(account.normalizedKey!);
        account.normalizedKey = normalizedKey;
        accountMap.set(normalizedKey, account);
      }
    }

    return {
      ...entry,
      ipoAccountId: account.id,
      accountName: account.name,
      email: account.email || normalizedEmail,
    };
  });

  const normalizedAccounts = Array.from(accountMap.values()).sort(
    (a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime(),
  );

  return {
    entries: normalizedEntries as unknown as IpoEntry[],
    accounts: normalizedAccounts as unknown as IpoAccount[],
  };
}
