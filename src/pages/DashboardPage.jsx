import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { calculateStats, calculateTradePnL, calculateEquityCurve, calculateMonthlyPnL, calculateDailyPnL } from '../utils/calculations';
import { formatRupiah, formatPercent, formatDate, formatNumber } from '../utils/formatters';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';

function StatCard({ icon, label, value, subValue, colorClass, bgColor }) {
  return (
    <div className="stat-card">
      <div className="stat-card-icon" style={{ background: bgColor || 'var(--accent-blue-dim)' }}>
        {icon}
      </div>
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value ${colorClass || ''}`}>{value}</div>
      {subValue && <div className={`stat-card-change ${colorClass === 'text-profit' ? 'positive' : colorClass === 'text-loss' ? 'negative' : ''}`}>{subValue}</div>}
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatValue }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 14px',
      fontSize: '0.8rem',
    }}>
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: payload[0].value >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
        {formatValue ? formatValue(payload[0].value) : formatRupiah(payload[0].value)}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { trades, settings } = useData();

  const stats = useMemo(() => calculateStats(trades), [trades]);
  const equityCurve = useMemo(() => calculateEquityCurve(trades, settings.initialCapital), [trades, settings.initialCapital]);
  const monthlyPnL = useMemo(() => calculateMonthlyPnL(trades), [trades]);
  const dailyPnL = useMemo(() => calculateDailyPnL(trades), [trades]);

  const openTrades = trades.filter(t => !t.sellPrice || !t.dateSell);
  const recentTrades = trades
    .filter(t => t.sellPrice && t.dateSell)
    .sort((a, b) => new Date(b.dateSell) - new Date(a.dateSell))
    .slice(0, 8);

  // Calendar heatmap for current month
  const now = new Date();
  const calendarDays = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const pnl = dailyPnL[dateStr] || 0;
      days.push({ day: d, date: dateStr, pnl });
    }
    return days;
  }, [dailyPnL]);

  const portfolioValue = settings.initialCapital + stats.totalPnL;

  if (trades.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">Selamat Datang di Jurnal Saham!</div>
        <div className="empty-state-desc">
          Mulai catat transaksi trading Anda untuk melihat dashboard performa di sini.
        </div>
        <Link to="/trades/new" className="btn btn-primary btn-lg">
          ➕ Catat Transaksi Pertama
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Stat Cards */}
      <div className="grid-stats">
        <StatCard
          icon="💰"
          label="Total Portfolio"
          value={formatRupiah(portfolioValue)}
          bgColor="var(--accent-blue-dim)"
        />
        <StatCard
          icon={stats.totalPnL >= 0 ? '📈' : '📉'}
          label="Total Profit/Loss"
          value={formatRupiah(stats.totalPnL)}
          subValue={formatPercent(stats.totalPnL / settings.initialCapital * 100)}
          colorClass={stats.totalPnL >= 0 ? 'text-profit' : 'text-loss'}
          bgColor={stats.totalPnL >= 0 ? 'var(--accent-green-dim)' : 'var(--accent-red-dim)'}
        />
        <StatCard
          icon="🎯"
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          subValue={`${stats.winCount}W / ${stats.lossCount}L`}
          colorClass={stats.winRate >= 50 ? 'text-profit' : 'text-loss'}
          bgColor="var(--accent-purple-dim)"
        />
        <StatCard
          icon="📝"
          label="Total Transaksi"
          value={formatNumber(stats.totalTrades)}
          subValue={`${openTrades.length} posisi terbuka`}
          bgColor="var(--accent-yellow-dim)"
        />
      </div>

      {/* Charts Row */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Equity Curve */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📈 Equity Curve</h3>
          </div>
          <div className="card-body" style={{ height: 280 }}>
            {equityCurve.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                  <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => `${(v/1000000).toFixed(1)}Jt`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#10B981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state" style={{ padding: 40 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  Butuh minimal 2 transaksi untuk menampilkan grafik
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Calendar Heatmap */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📅 Kalender {now.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</h3>
          </div>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
              {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--text-muted)', padding: 4 }}>
                  {d}
                </div>
              ))}
            </div>
            <div className="heatmap-grid">
              {calendarDays.map((cell, i) => (
                <div
                  key={i}
                  className={`heatmap-cell ${cell ? (cell.pnl > 0 ? 'profit' : cell.pnl < 0 ? 'loss' : 'neutral') : ''}`}
                  title={cell ? `${cell.date}: ${formatRupiah(cell.pnl)}` : ''}
                >
                  {cell?.day || ''}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 12, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              <span>🟢 Profit</span>
              <span>🔴 Loss</span>
              <span>⚫ Tidak ada trade</span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly P&L */}
      {monthlyPnL.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3 className="card-title">📊 Profit/Loss Bulanan</h3>
          </div>
          <div className="card-body" style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyPnL}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                <XAxis dataKey="month" tick={{ fill: '#94A3B8', fontSize: 11 }} />
                <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} tickFormatter={(v) => `${(v/1000000).toFixed(1)}Jt`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                  {monthlyPnL.map((entry, i) => (
                    <Cell key={i} fill={entry.pnl >= 0 ? '#10B981' : '#F43F5E'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Trades */}
      {recentTrades.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🕐 Transaksi Terakhir</h3>
            <Link to="/trades" className="btn btn-ghost btn-sm">Lihat Semua →</Link>
          </div>
          <div className="table-container" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Tanggal</th>
                  <th>Buy</th>
                  <th>Sell</th>
                  <th>Lot</th>
                  <th>P/L</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map(trade => {
                  const calc = calculateTradePnL(trade);
                  return (
                    <tr key={trade.id}>
                      <td><strong>{trade.stockCode}</strong></td>
                      <td style={{ color: 'var(--text-secondary)' }}>{formatDate(trade.dateSell)}</td>
                      <td>{formatRupiah(trade.buyPrice)}</td>
                      <td>{formatRupiah(trade.sellPrice)}</td>
                      <td>{trade.lots}</td>
                      <td className={calc.pnl >= 0 ? 'text-profit' : 'text-loss'}>
                        <strong>{formatRupiah(calc.pnl)}</strong>
                      </td>
                      <td className={calc.pnlPercent >= 0 ? 'text-profit' : 'text-loss'}>
                        {formatPercent(calc.pnlPercent)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
