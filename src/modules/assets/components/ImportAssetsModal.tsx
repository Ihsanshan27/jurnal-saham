// @ts-nocheck
import React, { useState, useRef } from 'react';
import { Upload, Download, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { ASSET_CATEGORY_LABELS, ASSET_GROUP_LABELS } from '@/modules/assets/types/assets';

interface ImportAssetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveAssets: (assets: any[]) => void;
  showToast: (msg: string, type?: string) => void;
}

const CATEGORY_MAP_REVERSE: Record<string, string> = {
  emas: 'gold',
  gold: 'gold',
  deposito: 'deposit',
  deposit: 'deposit',
  kripto: 'crypto',
  crypto: 'crypto',
  properti: 'real_estate',
  'real estate': 'real_estate',
  piutang: 'receivable',
  receivable: 'receivable',
  laptop: 'it_equipment',
  gadget: 'it_equipment',
  'it equipment': 'it_equipment',
  it: 'it_equipment',
  kendaraan: 'vehicle',
  vehicle: 'vehicle',
  mobil: 'vehicle',
  motor: 'vehicle',
  furnitur: 'furniture',
  furniture: 'furniture',
  meja: 'furniture',
  kursi: 'furniture',
  lisensi: 'software_license',
  'software license': 'software_license',
  software: 'software_license',
  lainnya: 'other',
  other: 'other',
};

const GROUP_MAP_REVERSE: Record<string, string> = {
  investasi: 'investment',
  investment: 'investment',
  inventaris: 'office_inventory',
  'inventaris kantor': 'office_inventory',
  office_inventory: 'office_inventory',
  kantor: 'office_inventory',
};

export default function ImportAssetsModal({
  isOpen,
  onClose,
  onSaveAssets,
  showToast,
}: ImportAssetsModalProps) {
  const [parsedItems, setParsedItems] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const downloadTemplate = () => {
    const headers = [
      'Nama Aset',
      'Kode Aset',
      'Kelompok',
      'Kategori',
      'Tanggal Perolehan',
      'Jumlah',
      'Satuan',
      'Harga Perolehan',
      'Nilai Saat Ini',
      'PIC / Lokasi',
      'Serial Number',
      'Garansi s.d.',
      'Penyusutan per Tahun (%)',
      'Catatan',
    ];

    const sampleRows = [
      [
        'Emas Antam 100g',
        'AST-2026-001',
        'Investasi',
        'Emas',
        '2026-01-15',
        '100',
        'gram',
        '130000000',
        '145000000',
        'Brankas Rumah',
        'SN-9988221',
        '',
        '0',
        'Beli di Logam Mulia',
      ],
      [
        'MacBook Pro M3 Max 16"',
        'AST-2026-002',
        'Inventaris Kantor',
        'IT / Gadget',
        '2026-02-10',
        '1',
        'unit',
        '42000000',
        '38000000',
        'Dev Team',
        'C02FX911Q05D',
        '2028-02-10',
        '20',
        'Laptop Developer',
      ],
      [
        'Ruko Sudirman Plaza',
        'AST-2026-003',
        'Investasi',
        'Properti',
        '2025-05-01',
        '1',
        'unit',
        '2500000000',
        '2800000000',
        'Jakarta Pusat',
        'SHM-102938',
        '',
        '2',
        'Disewakan ke PT Sejahtera',
      ],
    ];

    const csvContent =
      '\uFEFF' +
      [
        headers.join(','),
        ...sampleRows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `template_import_aset_inventaris.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Template CSV berhasil diunduh');
  };

  const parseCSV = (text: string) => {
    setErrorMsg('');
    setParsedItems([]);

    try {
      const cleanText = text.replace(/^\uFEFF/, '');
      if (!cleanText.trim()) {
        setErrorMsg('File CSV kosong.');
        return;
      }

      // Auto-detect delimiter (;, ,, or tab)
      const firstLine = cleanText.split(/\r?\n/)[0] || '';
      const countSemicolon = (firstLine.match(/;/g) || []).length;
      const countComma = (firstLine.match(/,/g) || []).length;
      const countTab = (firstLine.match(/\t/g) || []).length;

      let delimiter = ',';
      if (countSemicolon > countComma && countSemicolon > countTab) delimiter = ';';
      else if (countTab > countComma && countTab > countSemicolon) delimiter = '\t';

      // Robust CSV tokenizer respecting quotes and newlines
      const records: string[][] = [];
      let currentRecord: string[] = [];
      let currentCell = '';
      let inQuotes = false;

      for (let i = 0; i < cleanText.length; i++) {
        const char = cleanText[i];
        const nextChar = cleanText[i + 1];

        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            currentCell += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          currentRecord.push(currentCell.trim());
          currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
          if (char === '\r' && nextChar === '\n') i++;
          currentRecord.push(currentCell.trim());
          currentCell = '';
          if (currentRecord.some((c) => c.length > 0)) {
            records.push(currentRecord);
          }
          currentRecord = [];
        } else {
          currentCell += char;
        }
      }

      if (currentCell || currentRecord.length > 0) {
        currentRecord.push(currentCell.trim());
        if (currentRecord.some((c) => c.length > 0)) {
          records.push(currentRecord);
        }
      }

      if (records.length < 2) {
        setErrorMsg('File CSV harus memiliki minimal baris header dan 1 baris data.');
        return;
      }

      const cleanHeader = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

      const headers = records[0].map(cleanHeader);

      const findCol = (keywords: string[]) => {
        return headers.findIndex((h) =>
          keywords.some((kw) => h === kw || h.includes(kw))
        );
      };

      const idxName = findCol(['nama', 'namaaset', 'namaitem', 'item', 'name', 'assetname']);
      const idxCode = findCol(['kode', 'kodeaset', 'code', 'assetcode']);
      const idxGroup = findCol(['kelompok', 'group', 'kelompokaset']);
      const idxCat = findCol(['kategori', 'category']);
      const idxDate = findCol(['tanggal', 'tanggalperolehan', 'date', 'purchasedate', 'tgl']);
      const idxQty = findCol(['jumlah', 'qty', 'quantity', 'kuantitas']);
      const idxUnit = findCol(['satuan', 'unit']);
      const idxPrice = findCol(['hargaperolehan', 'harga', 'hargabeli', 'purchaseprice', 'cost', 'totalharga']);
      const idxValue = findCol(['nilaisaatini', 'nilai', 'currentvalue', 'nilaisekarang', 'value']);
      const idxPic = findCol(['pic', 'lokasi', 'location', 'penanggungjawab']);
      const idxSn = findCol(['serialnumber', 'serial', 'sn', 'noseri', 'sertifikat']);
      const idxWarranty = findCol(['garansi', 'warranty']);
      const idxDeprec = findCol(['penyusutan', 'depreciation', 'depresiasi']);
      const idxNotes = findCol(['catatan', 'notes', 'keterangan', 'remark']);

      if (idxName === -1) {
        setErrorMsg('Kolom "Nama Aset" tidak ditemukan. Pastikan baris pertama memuat nama kolom seperti "Nama Aset", "Nama", atau "Item".');
        return;
      }

      const rows: any[] = [];
      const today = new Date().toISOString().split('T')[0];

      for (let i = 1; i < records.length; i++) {
        const cols = records[i];
        const rawName = cols[idxName] ? cols[idxName].trim() : '';
        if (!rawName) continue;

        const rawCat = idxCat !== -1 && cols[idxCat] ? cols[idxCat].toLowerCase() : '';
        let category = 'other';
        if (rawCat) {
          for (const [key, val] of Object.entries(CATEGORY_MAP_REVERSE)) {
            if (rawCat.includes(key)) {
              category = val;
              break;
            }
          }
        }

        const rawGroup = idxGroup !== -1 && cols[idxGroup] ? cols[idxGroup].toLowerCase() : '';
        let group = ASSET_CATEGORY_LABELS[category]?.group || 'investment';
        if (rawGroup) {
          for (const [key, val] of Object.entries(GROUP_MAP_REVERSE)) {
            if (rawGroup.includes(key)) {
              group = val;
              break;
            }
          }
        }

        const parseNum = (str: string, fallback: number = 0) => {
          if (!str) return fallback;
          // Clean thousand separators (dots or commas)
          const cleaned = str.replace(/Rp|\s/gi, '').replace(/\./g, '').replace(',', '.');
          const val = parseFloat(cleaned);
          return isNaN(val) ? fallback : val;
        };

        const qty = idxQty !== -1 ? parseNum(cols[idxQty], 1) : 1;
        const purchasePrice = idxPrice !== -1 ? parseNum(cols[idxPrice], 0) : 0;
        const currentValue = idxValue !== -1 && cols[idxValue] ? parseNum(cols[idxValue], purchasePrice) : purchasePrice;
        const deprecRate = idxDeprec !== -1 ? parseNum(cols[idxDeprec], 0) : 0;

        const normalizeDateStr = (str: string) => {
          if (!str) return today;
          const trimmed = str.trim();
          const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
          if (dmyMatch) {
            const [, day, month, year] = dmyMatch;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          const dateObj = new Date(trimmed);
          if (!isNaN(dateObj.getTime())) {
            return dateObj.toISOString().split('T')[0];
          }
          return trimmed;
        };

        const cleanTextStr = (s: string) => (s || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

        rows.push({
          name: cleanTextStr(rawName),
          code: idxCode !== -1 && cols[idxCode] ? cleanTextStr(cols[idxCode]) : '',
          group,
          category,
          purchaseDate: idxDate !== -1 && cols[idxDate] ? normalizeDateStr(cols[idxDate]) : today,
          quantity: qty > 0 ? qty : 1,
          unit: idxUnit !== -1 && cols[idxUnit] ? cleanTextStr(cols[idxUnit]) : 'unit',
          purchasePrice,
          currentValue,
          pic: idxPic !== -1 && cols[idxPic] ? cleanTextStr(cols[idxPic]) : '',
          serialNumber: idxSn !== -1 && cols[idxSn] ? cleanTextStr(cols[idxSn]) : '',
          warrantyExpiry: idxWarranty !== -1 && cols[idxWarranty] ? normalizeDateStr(cols[idxWarranty]) : '',
          depreciationRateYearly: deprecRate,
          notes: idxNotes !== -1 && cols[idxNotes] ? cleanTextStr(cols[idxNotes]) : '',
          status: 'active',
        });
      }

      if (rows.length === 0) {
        setErrorMsg('Tidak ada baris data aset yang dapat dibaca dengan benar dari file CSV ini.');
      } else {
        setParsedItems(rows);
      }
    } catch (err: any) {
      setErrorMsg(`Gagal memproses file CSV: ${err.message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) parseCSV(text);
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = () => {
    if (parsedItems.length === 0) return;
    onSaveAssets(parsedItems);
    showToast(`Berhasil mengimpor ${parsedItems.length} data aset & inventaris!`, 'success');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 840, width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={20} /> Impor Aset &amp; Inventaris (CSV / Excel)
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Unggah file CSV atau Excel yang tersimpan dalam format CSV (titik koma `;` atau koma `,`).
          </p>

          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={downloadTemplate}>
              <Download size={15} style={{ marginRight: 6 }} /> Unduh Template CSV
            </button>
            <button type="button" className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
              <FileText size={15} style={{ marginRight: 6 }} /> Pilih File CSV / Excel
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {fileName && (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 12 }}>
              File terpilih: <strong>{fileName}</strong>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                background: 'rgba(239,68,68,0.12)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: 'var(--accent-red)',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: '0.85rem',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={16} /> {errorMsg}
            </div>
          )}

          {parsedItems.length > 0 && (
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={16} style={{ color: 'var(--accent-green)' }} /> Pratinjau Data ({parsedItems.length} item ditemukan - gulir untuk melihat seluruhnya):
              </div>
              <div className="table-container" style={{ maxHeight: 360, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 8 }}>
                <table className="table" style={{ fontSize: '0.8rem', width: '100%', tableLayout: 'fixed' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                      <th style={{ width: 45, textAlign: 'center' }}>No.</th>
                      <th style={{ width: 220 }}>Nama</th>
                      <th style={{ width: 140 }}>Kode</th>
                      <th style={{ width: 150 }}>Kelompok</th>
                      <th style={{ width: 130 }}>Kategori</th>
                      <th style={{ width: 80 }}>Qty</th>
                      <th style={{ width: 130, textAlign: 'right' }}>Harga Perolehan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ textAlign: 'center', color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.name}>
                          <strong>{item.name}</strong>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.code || '-'}</td>
                        <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ASSET_GROUP_LABELS[item.group] || item.group}</td>
                        <td style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ASSET_CATEGORY_LABELS[item.category]?.label || item.category}</td>
                        <td>{item.quantity} {item.unit}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Rp {item.purchasePrice.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={parsedItems.length === 0}
            onClick={handleImportSubmit}
          >
            Impor ({parsedItems.length} Item) Sekarang
          </button>
        </div>
      </div>
    </div>
  );
}
