import { describe, expect, it } from 'vitest';
import {
  parseCSVTokenizer,
  parseCurrencyAmount,
  normalizeDateString,
  parseLedgerCsv,
} from '@/modules/finance/utils/financeExportImport';
import type { FinanceTransaction } from '@/modules/finance/types/finance';

describe('financeExportImport utils', () => {
  describe('parseCSVTokenizer', () => {
    it('tokenizes comma separated records with quotes', () => {
      const csv = `Tanggal,Keterangan,Jumlah\n"2026-10-01","Makan, Siang",50000`;
      const records = parseCSVTokenizer(csv);
      expect(records).toEqual([
        ['Tanggal', 'Keterangan', 'Jumlah'],
        ['2026-10-01', 'Makan, Siang', '50000'],
      ]);
    });

    it('auto-detects semicolon delimiter', () => {
      const csv = `Tanggal;Keterangan;Jumlah\n2026-10-01;Gaji;15000000`;
      const records = parseCSVTokenizer(csv);
      expect(records).toEqual([
        ['Tanggal', 'Keterangan', 'Jumlah'],
        ['2026-10-01', 'Gaji', '15000000'],
      ]);
    });
  });

  describe('parseCurrencyAmount', () => {
    it('handles Indonesian dot-separated numbers', () => {
      expect(parseCurrencyAmount('1.500.000').value).toBe(1500000);
      expect(parseCurrencyAmount('Rp 2.500.000,50').value).toBe(2500000.5);
    });

    it('handles negative formats and indicators', () => {
      expect(parseCurrencyAmount('-50000').value).toBe(-50000);
      expect(parseCurrencyAmount('(75000)').value).toBe(-75000);
      expect(parseCurrencyAmount('100000 CR')).toEqual({ value: 100000, indicator: 'CR' });
      expect(parseCurrencyAmount('25000 DB')).toEqual({ value: 25000, indicator: 'DB' });
    });
  });

  describe('normalizeDateString', () => {
    it('normalizes various date patterns into YYYY-MM-DD', () => {
      expect(normalizeDateString('2026-10-05')).toBe('2026-10-05');
      expect(normalizeDateString('05/10/2026')).toBe('2026-10-05');
      expect(normalizeDateString('5-10-2026')).toBe('2026-10-05');
      expect(normalizeDateString('05/10/26')).toBe('2026-10-05');
    });
  });

  describe('parseLedgerCsv', () => {
    const existing: FinanceTransaction[] = [
      {
        id: 'tx-1',
        accountId: 'acc-bca',
        type: 'income',
        amount: 15000000,
        date: '2026-10-01',
        description: 'Gaji Bulanan',
        createdAt: '2026-10-01T08:00:00Z',
      },
    ];

    it('parses standard template CSV correctly and identifies duplicates', () => {
      const csv = `Tanggal,Tipe,Kategori,Keterangan,Masuk,Keluar,Catatan
2026-10-01,income,Gaji,Gaji Bulanan,15000000,0,Gaji
2026-10-02,expense,Makan,Makan Siang Resto,0,85000,Lunch`;

      const result = parseLedgerCsv(csv, 'acc-bca', existing);
      expect(result.error).toBeUndefined();
      expect(result.rows.length).toBe(2);

      // First row matches existing -> duplicate
      expect(result.rows[0].isDuplicate).toBe(true);
      expect(result.rows[0].amount).toBe(15000000);

      // Second row is valid and not duplicate
      expect(result.rows[1].isDuplicate).toBe(false);
      expect(result.rows[1].isValid).toBe(true);
      expect(result.rows[1].type).toBe('expense');
      expect(result.rows[1].amount).toBe(85000);
      expect(result.totalValid).toBe(1);
      expect(result.totalDuplicate).toBe(1);
    });

    it('parses Indonesian bank format with Debet / Kredit columns', () => {
      const csv = `Tgl Transaksi,Uraian,Debet,Kredit
05/10/2026,Transfer Masuk dari Rekening Lain,2500000,0
06/10/2026,Bayar Tagihan PLN,0,350000`;

      const result = parseLedgerCsv(csv, 'acc-bca', []);
      expect(result.rows.length).toBe(2);
      expect(result.rows[0].date).toBe('2026-10-05');
      expect(result.rows[0].type).toBe('income');
      expect(result.rows[0].amount).toBe(2500000);

      expect(result.rows[1].date).toBe('2026-10-06');
      expect(result.rows[1].type).toBe('expense');
      expect(result.rows[1].amount).toBe(350000);
    });
  });
});
