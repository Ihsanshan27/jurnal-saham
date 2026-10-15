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
  Filter,
} from 'lucide-react';
import { FinanceAccount, FinanceTransaction } from '@/modules/finance/types/finance';
import { useData } from '@/modules/shared/context/DataContext';
import { formatRupiah, formatUSD } from '@/modules/shared/utils/formatters';
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

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setRawText('');
      setParseResult(null);
      setSkipDuplicates(true);
      setFilterPreviewStatus('all');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    readFile(selectedFile);
  };

  const readFile = (f: File) => {
    setFile(f);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRawText(content || '');
      const result = parseLedgerCsv(content || '', account.id, existingTransactions);
      setParseResult(result);
    };
    reader.readAsText(f);
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

  return (
    <div className="modal-overlay" style={{ zIndex: 1050 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '850px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <ArrowRightLeft size={20} className="text-primary" />
              Impor Mutasi Transaksi
            </h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Rekening: <strong>{account.name}</strong> ({account.institutionName})
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            aria-label="Tutup Modal"
            style={{ padding: '6px 8px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Action Bar / Template Download */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
              padding: '12px 16px',
              backgroundColor: 'var(--bg-card-hover)',
              borderRadius: 8,
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Mendukung CSV standar & mutasi bank Indonesia (BCA, Mandiri, BRI, BNI, e-Wallet).
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

          {/* Upload Drop Zone */}
          {!parseResult || parseResult.rows.length === 0 ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '2px dashed var(--border-color)',
                borderRadius: 12,
                padding: '36px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: 'var(--bg-card)',
                transition: 'border-color 0.2s',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .txt"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Upload size={36} style={{ color: 'var(--text-secondary)', marginBottom: 12 }} />
              <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>
                Pilih atau seret file CSV mutasi ke sini
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Format file: .csv atau .txt (Header: Tanggal, Keterangan, Masuk/Keluar atau Debet/Kredit)
              </div>
            </div>
          ) : null}

          {/* Error Message if parsing failed */}
          {parseResult?.error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--accent-red)',
                color: 'var(--accent-red)',
                padding: '12px 16px',
                borderRadius: 8,
                fontSize: '0.9rem',
              }}
            >
              <AlertCircle size={20} />
              <div>{parseResult.error}</div>
            </div>
          )}

          {/* Parse Result Summary & Controls */}
          {parseResult && parseResult.rows.length > 0 && (
            <>
              {/* File Info Bar */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-card-hover)',
                  borderRadius: 6,
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={16} className="text-primary" />
                  <strong>{file?.name || 'File Mutasi'}</strong> (
                  {parseResult.rows.length} baris terbaca)
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setFile(null);
                    setParseResult(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                >
                  Ganti File
                </button>
              </div>

              {/* Summary Metric Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    backgroundColor: 'var(--bg-card-hover)',
                    padding: '12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Siap Diimpor</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                    {itemsToImport.length} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>baris</span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-card-hover)',
                    padding: '12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Duplikat Terdeteksi</div>
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: parseResult.totalDuplicate > 0 ? 'var(--accent-yellow, #f59e0b)' : 'var(--text-secondary)',
                    }}
                  >
                    {parseResult.totalDuplicate} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>baris</span>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-card-hover)',
                    padding: '12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Uang Masuk</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                    {formatMoney(parseResult.totalIn)}
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-card-hover)',
                    padding: '12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Uang Keluar</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-red)' }}>
                    {formatMoney(parseResult.totalOut)}
                  </div>
                </div>
              </div>

              {/* Duplicate Handling Option */}
              {parseResult.totalDuplicate > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                  }}
                >
                  <AlertTriangle size={18} style={{ color: '#f59e0b', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    Ditemukan {parseResult.totalDuplicate} transaksi yang sama persis (tanggal, nominal & keterangan) dengan mutasi yang sudah ada.
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600 }}>
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
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Pratinjau Data Mutasi:</div>
                <div style={{ display: 'flex', gap: 6 }}>
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
                  borderRadius: 8,
                }}
              >
                <table className="table" style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr>
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
                                style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                              >
                                Error
                              </span>
                            ) : row.isDuplicate ? (
                              <span
                                className="badge"
                                style={{
                                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                  color: '#f59e0b',
                                  fontSize: '0.75rem',
                                  padding: '2px 6px',
                                }}
                                title={row.duplicateReason}
                              >
                                Duplikat
                              </span>
                            ) : (
                              <span
                                className="badge badge-success"
                                style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                              >
                                Siap
                              </span>
                            )}
                          </td>
                          <td>{row.date}</td>
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
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
            backgroundColor: 'var(--bg-card)',
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleImportSubmit}
            disabled={!parseResult || itemsToImport.length === 0 || isSubmitting}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <CheckCircle size={16} />
            {isSubmitting
              ? 'Mengimpor...'
              : `Impor ${itemsToImport.length} Mutasi`}
          </button>
        </div>
      </div>
    </div>
  );
}
