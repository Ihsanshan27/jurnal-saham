import React from 'react';
import { X, Pencil, Trash2 } from 'lucide-react';
import { formatDate, formatRupiah } from '@/modules/shared/utils/formatters';
import { getFinanceTransactionTypeLabel } from '@/modules/finance/utils/finance';
import RichTextRenderer from '@/modules/shared/components/RichTextRenderer';

interface FinanceTransactionDetailModalProps {
  transaction: any;
  financeAccounts: any[];
  portfolios?: any[];
  onClose: () => void;
  onEdit?: (transaction: any) => void;
  onDelete?: (transaction: any) => void;
}

export const FinanceTransactionDetailModal: React.FC<FinanceTransactionDetailModalProps> = ({
  transaction,
  financeAccounts,
  portfolios = [],
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!transaction) return null;

  const account = financeAccounts.find((a: any) => a.id === transaction.accountId);
  const counterparty = transaction.counterpartyAccountId
    ? financeAccounts.find((a: any) => a.id === transaction.counterpartyAccountId)
    : null;
  const portfolio = transaction.linkedPortfolioId
    ? portfolios.find((p: any) => p.id === transaction.linkedPortfolioId)
    : null;

  const rawAmount = Number(transaction.amount) || 0;
  const isExpense = transaction.type === 'expense' || transaction.type === 'transfer_out';
  const isIncome = transaction.type === 'income' || transaction.type === 'transfer_in';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '520px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Detail Transaksi Keuangan</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Main Amount Card */}
          <div style={{
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            textAlign: 'center',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Nominal Transaksi</div>
            <div style={{
              fontSize: '1.6rem',
              fontWeight: 800,
              color: isExpense ? 'var(--accent-red)' : isIncome ? 'var(--accent-green)' : 'var(--text-primary)'
            }}>
              {isExpense ? '-' : isIncome ? '+' : ''}{formatRupiah(rawAmount)}
            </div>
            <div style={{ marginTop: '8px' }}>
              <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>
                {getFinanceTransactionTypeLabel(transaction.type)}
              </span>
            </div>
          </div>

          {/* Key Details Grid */}
          <div className="calc-result" style={{ margin: 0, background: 'transparent', border: 'none', padding: 0 }}>
            <div className="calc-result-row">
              <span className="calc-result-label">Tanggal Transaksi</span>
              <span className="calc-result-value">{formatDate(transaction.date)}</span>
            </div>
            {transaction.createdAt && (
              <div className="calc-result-row">
                <span className="calc-result-label">Waktu Pencatatan</span>
                <span className="calc-result-value">{new Date(transaction.createdAt).toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="calc-result-row">
              <span className="calc-result-label">Rekening</span>
              <span className="calc-result-value" style={{ fontWeight: 600 }}>
                {account?.name || 'Unknown'} {account?.institutionName ? `(${account.institutionName})` : ''}
              </span>
            </div>
            {counterparty && (
              <div className="calc-result-row">
                <span className="calc-result-label">Rekening Tujuan</span>
                <span className="calc-result-value" style={{ fontWeight: 600 }}>
                  {counterparty.name} ({counterparty.institutionName})
                </span>
              </div>
            )}
            <div className="calc-result-row">
              <span className="calc-result-label">Deskripsi</span>
              <span className="calc-result-value">{transaction.description || '-'}</span>
            </div>
            <div className="calc-result-row">
              <span className="calc-result-label">Kategori</span>
              <span className="calc-result-value">{transaction.category ? <span className="badge badge-yellow">{transaction.category}</span> : '-'}</span>
            </div>
            {portfolio && (
              <div className="calc-result-row">
                <span className="calc-result-label">Tertaut Portofolio</span>
                <span className="calc-result-value"><span className="badge badge-green">{portfolio.name}</span></span>
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Catatan Tambahan</div>
            <div style={{
              background: 'var(--bg-input)',
              borderRadius: 'var(--radius-md)',
              padding: '12px',
              border: '1px solid var(--border-color)',
              minHeight: '60px'
            }}>
              <RichTextRenderer content={transaction.notes} fallbackText="Tidak ada catatan tambahan." />
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '12px', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onEdit && !transaction.transferGroupId && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { onClose(); onEdit(transaction); }}>
                <Pencil size={14} /> Edit
              </button>
            )}
            {onDelete && (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => { onClose(); onDelete(transaction); }}>
                <Trash2 size={14} /> Hapus
              </button>
            )}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinanceTransactionDetailModal;
