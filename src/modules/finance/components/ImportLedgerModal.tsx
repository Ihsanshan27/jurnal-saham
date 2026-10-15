import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  X,
  AlertCircle,
  ArrowRightLeft,
  ClipboardPaste,
  HelpCircle,
  RotateCcw,
} from 'lucide-react';
import { FinanceAccount, FinanceTransaction } from '@/modules/finance/types/finance';
import { useData } from '@/modules/shared/context/DataContext';
import { formatRupiah, formatUSD } from '@/modules/shared/utils/formatters';
import CustomSelect from '@/modules/shared/components/CustomSelect';
import {
  downloadLedgerTemplateCsv,
  parseLedgerCsv,
  ParsedLedgerRow,
} from '@/modules/finance/utils/financeExportImport';
import '@/modules/finance/finance.css';

interface ImportLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: FinanceAccount;
  existingTransactions: FinanceTransaction[];
  onSuccess?: () => void;
}

export default function ImportLedgerModal({
  isOpen,
  onClose,
  account,
  existingTransactions,
  onSuccess,
}: ImportLedgerModalProps) {
  const { bulkAddFinanceTransactions, showToast } = useData();

  // Input mode: file upload or direct text paste
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [bankPreset, setBankPreset] = useState<'auto' | 'default' | 'bca' | 'mandiri' | 'bri' | 'bni' | 'ewallet'>('auto');

  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [parseResult, setParseResult] = useState<{
    rows: ParsedLedgerRow[];
    totalValid: number;
    totalDuplicate: number;
    totalInvalid: number;
    totalIn: number;
    totalOut: number;
    error?: string;
  } | null>(null);

  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [filterPreviewStatus, setFilterPreviewStatus] = useState<'all' | 'valid' | 'duplicate' | 'invalid'>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Set default bank preset based on account name / institution
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setRawText('');
      setParseResult(null);
      setSkipDuplicates(true);
      setFilterPreviewStatus('all');
      setIsSubmitting(false);
      setInputMode('file');

      const inst = (account.institutionName || account.name || '').toLowerCase();
      if (inst.includes('bca')) {
        setBankPreset('bca');
      } else if (inst.includes('mandiri')) {
        setBankPreset('mandiri');
      } else if (inst.includes('bri')) {
        setBankPreset('bri');
      } else if (inst.includes('bni')) {
        setBankPreset('bni');
      } else {
        setBankPreset('auto');
      }
    }
  }, [isOpen, account]);

  // Re-parse if preset or text changes in paste mode
  useEffect(() => {
    if (rawText.trim()) {
      const result = parseLedgerCsv(rawText, account.id, existingTransactions, bankPreset);
      setParseResult(result);
    }
  }, [bankPreset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    readFile(selectedFile);
  };

  const readFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = (event.target?.result as string) || '';
      setRawText(content);
      const result = parseLedgerCsv(content, account.id, existingTransactions, bankPreset);
      setParseResult(result);
    };
    reader.readAsText(f);
  };

  const handlePasteChange = (text: string) => {
    setRawText(text);
    if (!text.trim()) {
      setParseResult(null);
      return;
    }
    const result = parseLedgerCsv(text, account.id, existingTransactions, bankPreset);
    setParseResult(result);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      readFile(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const resetData = () => {
    setFile(null);
    setRawText('');
    setParseResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatMoney = (val: number) => {
    return account.currency === 'USD' ? formatUSD(val) : formatRupiah(val);
  };

  // Determine items to actually import
  const itemsToImport = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.rows.filter((row) => {
      if (!row.isValid) return false;
      if (skipDuplicates && row.isDuplicate) return false;
      return true;
    });
  }, [parseResult, skipDuplicates]);

  // Filtered rows for preview table
  const displayedPreviewRows = useMemo(() => {
    if (!parseResult) return [];
    return parseResult.rows.filter((row) => {
      if (filterPreviewStatus === 'valid') return row.isValid && !row.isDuplicate;
      if (filterPreviewStatus === 'duplicate') return row.isDuplicate;
      if (filterPreviewStatus === 'invalid') return !row.isValid;
      return true;
    });
  }, [parseResult, filterPreviewStatus]);

  const handleImportSubmit = async () => {
    if (itemsToImport.length === 0) {
      showToast('Tidak ada transaksi valid yang siap diimpor.', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = itemsToImport.map((item) => ({
        accountId: account.id,
        type: item.type,
        amount: item.amount,
        date: item.date,
        description: item.description,
        category: item.category,
        notes: item.notes,
      }));

      bulkAddFinanceTransactions(payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      showToast(`Gagal mengimpor mutasi: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const hasParsedData = Boolean(parseResult && parseResult.rows.length > 0);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modal modal-flex"
        style={{
          maxWidth: hasParsedData ? 880 : 660,
          width: '95vw',
          maxHeight: '92vh',
          transition: 'max-width 0.2s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <ArrowRightLeft size={20} className="text-primary" />
              Impor Mutasi Transaksi
            </h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: 3 }}>
              Rekening: <strong>{account.name}</strong> ({account.institutionName}) &bull; Mata Uang: <strong>{account.currency}</strong>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Preset & Action Bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              backgroundColor: 'var(--bg-card-hover)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <label htmlFor="bank-preset-select" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Format Bank:
              </label>
              <div style={{ minWidth: 170 }}>
                <CustomSelect
                  value={bankPreset}
                  onChange={(val) => setBankPreset(val as any)}
                  options={[
                    { value: 'auto', label: 'Auto-Detect (Rekomendasi)' },
                    { value: 'bca', label: 'BCA (KlikBCA / myBCA)' },
                    { value: 'mandiri', label: 'Bank Mandiri (Livin)' },
                    { value: 'bri', label: 'Bank BRI (BRIMO)' },
                    { value: 'bni', label: 'Bank BNI' },
                    { value: 'default', label: 'Template Jurnal Standar' },
                    { value: 'ewallet', label: 'E-Wallet (GoPay/OVO/Dana)' },
                  ]}
                />
              </div>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={downloadLedgerTemplateCsv}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={14} />
              Unduh Template CSV
            </button>
          </div>

          {/* Mode Switch Tabs (Only when not showing parsed preview) */}
          {!hasParsedData && (
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
              <button
                type="button"
                className={`btn btn-sm ${inputMode === 'file' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setInputMode('file')}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <FileText size={15} />
                Unggah File CSV / TXT
              </button>
              <button
                type="button"
                className={`btn btn-sm ${inputMode === 'paste' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setInputMode('paste')}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <ClipboardPaste size={15} />
                Salin &amp; Tempel Teks (Paste)
              </button>
            </div>
          )}

          {/* Upload Drop Zone Mode */}
          {!hasParsedData && inputMode === 'file' && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '36px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: 'var(--bg-card)',
                transition: 'border-color 0.2s, background-color 0.2s',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .txt"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Upload size={38} style={{ color: 'var(--accent-primary, #3b82f6)', marginBottom: 12 }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                Pilih atau seret file CSV/TXT mutasi ke sini
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', maxWidth: 440, margin: '0 auto' }}>
                Mendukung file unduhan mutasi dari KlikBCA, myBCA, Mandiri, BRI, BNI, maupun template jurnal standar.
              </div>
            </div>
          )}

          {/* Paste Mode */}
          {!hasParsedData && inputMode === 'paste' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label htmlFor="import-paste-textarea" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Tempelkan teks tabel mutasi rekening Anda di bawah ini:
              </label>
              <textarea
                id="import-paste-textarea"
                rows={7}
                className="form-input"
                style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '0.82rem', resize: 'vertical' }}
                placeholder={`Contoh tempelan dari KlikBCA atau spreadsheet:\nTanggal\tKeterangan\tCabang\tJumlah\tTipe\tSaldo\n05/10/2026\tTRANSFER CR-KE 12345\t0000\t1.500.000,00\tCR\t11.500.000,00\n06/10/2026\tTARIK TUNAI ATM\t0000\t200.000,00\tDB\t11.300.000,00`}
                value={rawText}
                onChange={(e) => handlePasteChange(e.target.value)}
              />
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <HelpCircle size={14} /> Tip: Anda bisa langsung copy-paste baris mutasi dari browser internet banking.
              </div>
            </div>
          )}

          {/* Error Message if parsing failed */}
          {parseResult?.error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--accent-red)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
              }}
            >
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>{parseResult.error}</div>
            </div>
          )}

          {/* Parse Result Summary & Controls */}
          {hasParsedData && parseResult && (
            <>
              {/* File Info Bar with Reset button */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-card-hover)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  border: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} className="text-primary" />
                  <span>
                    <strong>{file ? file.name : 'Teks Mutasi'}</strong> &bull;{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>{parseResult.rows.length} baris terbaca</span>
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={resetData}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', padding: '4px 8px' }}
                >
                  <RotateCcw size={13} />
                  Ganti Data
                </button>
              </div>

              {/* Summary Metric Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: 10,
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--bg-card-hover)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Siap Diimpor</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                    {itemsToImport.length} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>baris</span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-card-hover)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Duplikat Terdeteksi</div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: parseResult.totalDuplicate > 0 ? '#f59e0b' : 'var(--text-secondary)',
                    }}
                  >
                    {parseResult.totalDuplicate} <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>baris</span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-card-hover)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Uang Masuk</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                    {formatMoney(parseResult.totalIn)}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-card-hover)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Total Uang Keluar</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-red)' }}>
                    {formatMoney(parseResult.totalOut)}
                  </div>
                </div>
              </div>

              {/* Duplicate Handling Option Banner */}
              {parseResult.totalDuplicate > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '10px 14px',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={17} style={{ color: '#f59e0b', flexShrink: 0 }} />
                    <span>Ditemukan <strong>{parseResult.totalDuplicate}</strong> transaksi yang identik dengan histori sebelumnya.</span>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                    />
                    Lewati Duplikat
                  </label>
                </div>
              )}

              {/* Table Preview Filter Tabs */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>Pratinjau Data Mutasi:</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${filterPreviewStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFilterPreviewStatus('all')}
                  >
                    Semua ({parseResult.rows.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${filterPreviewStatus === 'valid' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setFilterPreviewStatus('valid')}
                  >
                    Valid ({parseResult.totalValid})
                  </button>
                  {parseResult.totalDuplicate > 0 && (
                    <button
                      type="button"
                      className={`btn btn-sm ${filterPreviewStatus === 'duplicate' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setFilterPreviewStatus('duplicate')}
                    >
                      Duplikat ({parseResult.totalDuplicate})
                    </button>
                  )}
                  {parseResult.totalInvalid > 0 && (
                    <button
                      type="button"
                      className={`btn btn-sm ${filterPreviewStatus === 'invalid' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setFilterPreviewStatus('invalid')}
                    >
                      Error ({parseResult.totalInvalid})
                    </button>
                  )}
                </div>
              </div>

              {/* Preview Table */}
              <div
                className="table-container"
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <table className="table" style={{ fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 1 }}>
                      <th style={{ width: '80px' }}>Status</th>
                      <th style={{ width: '100px' }}>Tanggal</th>
                      <th style={{ width: '90px' }}>Tipe</th>
                      <th>Keterangan</th>
                      <th>Kategori</th>
                      <th style={{ textAlign: 'right' }}>Masuk</th>
                      <th style={{ textAlign: 'right' }}>Keluar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedPreviewRows.map((row, idx) => {
                      const isRowSkipped = skipDuplicates && row.isDuplicate;
                      return (
                        <tr
                          key={idx}
                          style={{
                            opacity: isRowSkipped ? 0.55 : 1,
                            backgroundColor: !row.isValid
                              ? 'rgba(239, 68, 68, 0.05)'
                              : row.isDuplicate
                              ? 'rgba(245, 158, 11, 0.05)'
                              : undefined,
                          }}
                        >
                          <td>
                            {!row.isValid ? (
                              <span
                                className="badge badge-danger"
                                title={row.validationError}
                                style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                              >
                                Error
                              </span>
                            ) : row.isDuplicate ? (
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                  color: '#f59e0b',
                                  fontSize: '0.72rem',
                                  padding: '2px 6px',
                                }}
                                title={row.duplicateReason}
                              >
                                Duplikat
                              </span>
                            ) : (
                              <span
                                className="badge badge-success"
                                style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                              >
                                Siap
                              </span>
                            )}
                          </td>
                          <td style={{ whiteSpace: 'nowrap' }}>{row.date}</td>
                          <td>
                            <span style={{ textTransform: 'capitalize' }}>
                              {row.type === 'income'
                                ? 'Pemasukan'
                                : row.type === 'expense'
                                ? 'Pengeluaran'
                                : row.type}
                            </span>
                          </td>
                          <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.description}>
                            {row.description}
                          </td>
                          <td>{row.category || '-'}</td>
                          <td style={{ textAlign: 'right', color: row.rawIn ? 'var(--accent-green)' : 'var(--text-secondary)' }}>
                            {row.rawIn ? formatMoney(row.rawIn) : '-'}
                          </td>
                          <td style={{ textAlign: 'right', color: row.rawOut ? 'var(--accent-red)' : 'var(--text-secondary)' }}>
                            {row.rawOut ? formatMoney(row.rawOut) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImportSubmit}
            disabled={!hasParsedData || itemsToImport.length === 0 || isSubmitting}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <CheckCircle size={16} />
            {isSubmitting
              ? 'Mengimpor...'
              : hasParsedData && itemsToImport.length > 0
              ? `Impor ${itemsToImport.length} Mutasi`
              : 'Impor Mutasi'}
          </button>
        </div>
      </div>
    </div>
  );
}
