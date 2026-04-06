import { useState } from 'react';
import { useData } from '../context/DataContext';
import { calculatePortfolioBalance } from '../utils/calculations';
import { formatRupiah, formatDate } from '../utils/formatters';

export default function CashflowPage() {
  const { trades, cashflows, dividends, addCashflow, deleteCashflow, settings } = useData();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'deposit', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });

  const balance = calculatePortfolioBalance(trades, cashflows, dividends, settings.initialCapital);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount || !form.date) return;
    addCashflow({
      ...form,
      amount: parseFloat(form.amount),
    });
    setForm({ type: 'deposit', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setShowForm(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('Batalkan transaksi kas ini?')) deleteCashflow(id);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💵 Cash Balance & RDN</h1>
          <p className="page-subtitle">Kelola deposit, penarikan, dan monitor buying power Anda</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Batal' : '➕ Catat Cashflow'}
        </button>
      </div>

      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-label">Modal Awal (Setting)</div>
          <div className="stat-card-value">{formatRupiah(balance.initialCapital)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Net Cashflow</div>
          <div className={`stat-card-value ${balance.netCashflow >= 0 ? 'text-profit' : 'text-loss'}`}>
            {balance.netCashflow > 0 ? '+' : ''}{formatRupiah(balance.netCashflow)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Realized Equity (RDN Aktual)</div>
          <div className="stat-card-value" style={{ color: 'var(--accent-blue)' }}>{formatRupiah(balance.realizedEquity)}</div>
        </div>
        <div className="stat-card" style={{ border: '1px solid var(--accent-green)', background: 'rgba(16, 185, 129, 0.05)' }}>
          <div className="stat-card-label">Buying Power (Saldo Kas)</div>
          <div className="stat-card-value text-profit">{formatRupiah(balance.buyingPower)}</div>
          <div className="stat-card-change" style={{ marginTop: 4 }}>Dana tersedia untuk trading</div>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: 24, animation: 'fadeInUp 0.3s ease' }}>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jenis Transaksi</label>
                  <select className="form-select" value={form.type} onChange={e => set('type', e.target.value)}>
                    <option value="deposit">📥 Deposit (Top-up)</option>
                    <option value="withdraw">📤 Withdraw (Penarikan)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Jumlah (Rp) *</label>
                  <input type="number" className="form-input" placeholder="1000000" value={form.amount} onChange={e => set('amount', e.target.value)} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tanggal *</label>
                  <input type="date" className="form-input" value={form.date} onChange={e => set('date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Catatan</label>
                  <input className="form-input" placeholder="Bonus tahunan, tarik profit, dll..." value={form.notes} onChange={e => set('notes', e.target.value)} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">💾 Simpan Cashflow</button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h3 className="card-title">Riwayat Transaksi Kas</h3></div>
        {cashflows.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-state-icon">💸</div>
            <div className="empty-state-title">Belum ada transaksi RDN</div>
            <div className="empty-state-desc">Catat setiap deposit dan withdrawal untuk melacak Buying Power Anda dengan akurat.</div>
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', margin: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Jenis</th>
                  <th>Jumlah</th>
                  <th>Catatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {cashflows.sort((a,b) => new Date(b.date) - new Date(a.date)).map(cf => (
                  <tr key={cf.id}>
                    <td>{formatDate(cf.date)}</td>
                    <td>
                      <span className={`badge ${cf.type === 'deposit' ? 'badge-green' : 'badge-red'}`}>
                        {cf.type === 'deposit' ? '📥 Deposit' : '📤 Withdraw'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }} className={cf.type === 'deposit' ? 'text-profit' : 'text-loss'}>
                      {cf.type === 'deposit' ? '+' : '-'}{formatRupiah(cf.amount)}
                    </td>
                    <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{cf.notes || '-'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(cf.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
