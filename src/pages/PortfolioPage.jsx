import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { calculateTradePnL } from '../utils/calculations';
import { formatRupiah, formatPercent } from '../utils/formatters';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Link } from 'react-router-dom';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#F43F5E', '#06B6D4', '#EC4899', '#84CC16'];

export default function PortfolioPage() {
  const { trades, settings } = useData();

  const openTrades = useMemo(() => {
    return trades
      .filter(t => !t.sellPrice || !t.dateSell)
      .map(t => {
        const totalBuy = t.buyPrice * t.lots * 100;
        const fee = totalBuy * ((t.buyFee || 0.15) / 100);
        return { ...t, totalBuy, fee };
      });
  }, [trades]);

  const totalInvested = openTrades.reduce((s, t) => s + t.totalBuy, 0);

  const pieData = openTrades.map(t => ({
    name: t.stockCode,
    value: t.totalBuy,
  }));

  if (openTrades.length === 0) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">💼 Portfolio</h1>
            <p className="page-subtitle">Posisi saham yang masih terbuka</p>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-state-icon">💼</div>
          <div className="empty-state-title">Tidak ada posisi terbuka</div>
          <div className="empty-state-desc">Semua transaksi sudah ditutup, atau belum ada transaksi</div>
          <Link to="/trades/new" className="btn btn-primary">➕ Catat Transaksi</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💼 Portfolio</h1>
          <p className="page-subtitle">{openTrades.length} posisi terbuka</p>
        </div>
      </div>

      <div className="grid-stats" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--accent-blue-dim)' }}>💰</div>
          <div className="stat-card-label">Total Investasi</div>
          <div className="stat-card-value">{formatRupiah(totalInvested)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'var(--accent-purple-dim)' }}>📊</div>
          <div className="stat-card-label">Jumlah Saham</div>
          <div className="stat-card-value">{openTrades.length}</div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* Table */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Posisi Terbuka</h3></div>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Harga Beli</th>
                  <th>Lot</th>
                  <th>Total Investasi</th>
                  <th>Alokasi</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {openTrades.map(t => (
                  <tr key={t.id}>
                    <td><strong>{t.stockCode}</strong></td>
                    <td>{formatRupiah(t.buyPrice)}</td>
                    <td>{t.lots}</td>
                    <td>{formatRupiah(t.totalBuy)}</td>
                    <td><span className="badge badge-blue">{totalInvested > 0 ? ((t.totalBuy / totalInvested) * 100).toFixed(1) : 0}%</span></td>
                    <td><Link to={`/trades/${t.id}`} className="btn btn-ghost btn-sm">👁</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <div className="card-header"><h3 className="card-title">Alokasi Portfolio</h3></div>
          <div className="card-body" style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={2}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => formatRupiah(v)} contentStyle={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: '0.8rem' }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px 16px', marginTop: 8 }}>
              {pieData.map((item, i) => (
                <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                  <span>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
