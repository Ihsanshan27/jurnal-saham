import { useMemo } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { calculateTradePnL, calculateUnrealizedPnL } from '@/modules/trades/calculations';
import { formatRupiah } from '@/modules/shared/utils/formatters';
import * as Icons from 'lucide-react';

type BucketStats = {
  label: string;
  count: number;
  winCount: number;
  totalPnL: number;
  winRate: number;
  avgPnL: number;
};

export default function BsjpAnalyticsPage() {
  const { bsjpTrades = [], marketPrices } = useData();

  const tradesWithPnL = useMemo(() => {
    return bsjpTrades.map(trade => {
      const calc = calculateTradePnL(trade);
      const isOpen = trade.sellPrice == null;
      let displayPnL = calc.pnl;

      if (isOpen && marketPrices && marketPrices[trade.stockCode]) {
        const currentPrice = marketPrices[trade.stockCode];
        const { pnl } = calculateUnrealizedPnL(
          trade.buyPrice,
          currentPrice,
          trade.lots,
          trade.buyFee ?? 0.15,
          trade.market || 'ID'
        );
        displayPnL = pnl;
      }
      return { ...trade, displayPnL };
    });
  }, [bsjpTrades, marketPrices]);

  const analyzeIndicator = (
    trades: any[],
    indicatorKey: string,
    bucketsConfig: { label: string; min: number; max: number }[]
  ): BucketStats[] => {
    const buckets: Record<string, BucketStats> = {};
    
    bucketsConfig.forEach(c => {
      buckets[c.label] = { label: c.label, count: 0, winCount: 0, totalPnL: 0, winRate: 0, avgPnL: 0 };
    });

    trades.forEach(t => {
      const val = t[indicatorKey];
      if (val == null) return;

      const bucket = bucketsConfig.find(c => val >= c.min && val <= c.max);
      if (bucket) {
        const b = buckets[bucket.label];
        b.count++;
        if (t.displayPnL > 0) b.winCount++;
        b.totalPnL += t.displayPnL;
      }
    });

    return Object.values(buckets).map(b => {
      b.winRate = b.count > 0 ? (b.winCount / b.count) * 100 : 0;
      b.avgPnL = b.count > 0 ? b.totalPnL / b.count : 0;
      return b;
    });
  };

  const rsiMfiBuckets = [
    { label: 'Oversold (< 30)', min: -Infinity, max: 29.99 },
    { label: 'Neutral (30 - 70)', min: 30, max: 70 },
    { label: 'Overbought (> 70)', min: 70.01, max: Infinity }
  ];

  const stochBuckets = [
    { label: 'Oversold (< 20)', min: -Infinity, max: 19.99 },
    { label: 'Neutral (20 - 80)', min: 20, max: 80 },
    { label: 'Overbought (> 80)', min: 80.01, max: Infinity }
  ];

  const rsiStats = useMemo(() => analyzeIndicator(tradesWithPnL, 'indicatorRsi14', rsiMfiBuckets), [tradesWithPnL]);
  const mfiStats = useMemo(() => analyzeIndicator(tradesWithPnL, 'indicatorMfi14', rsiMfiBuckets), [tradesWithPnL]);
  const stochKStats = useMemo(() => analyzeIndicator(tradesWithPnL, 'indicatorStoch533K', stochBuckets), [tradesWithPnL]);
  const stochDStats = useMemo(() => analyzeIndicator(tradesWithPnL, 'indicatorStoch533D', stochBuckets), [tradesWithPnL]);

  const renderStatCard = (title: string, stats: BucketStats[], icon: any, color: string) => {
    const Icon = icon;
    
    // Find max values for chart bars
    const maxWinRate = 100;
    const maxCount = Math.max(...stats.map(s => s.count), 1);
    const maxAvgPnL = Math.max(...stats.map(s => Math.abs(s.avgPnL)), 1);
    const totalTransactions = stats.reduce((acc, curr) => acc + curr.count, 0);

    return (
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 16 }}>
          <div style={{ padding: 8, background: `var(--${color}-dim)`, color: `var(--${color})`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={22} />
          </div>
          <div>
            <h3 className="card-title" style={{ margin: 0, fontSize: '1.1rem' }}>Analisis {title}</h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Terdapat <strong>{totalTransactions}</strong> transaksi dengan indikator ini
            </div>
          </div>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-container" style={{ margin: 0, border: 'none', borderTop: '1px solid var(--border-color)', borderRadius: 0 }}>
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Rentang Nilai</th>
                  <th style={{ width: '15%' }}>Frekuensi</th>
                  <th style={{ width: '30%' }}>Win Rate</th>
                  <th style={{ width: '35%' }}>Rata-rata Cuan (PnL)</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.label}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ minWidth: 40, fontWeight: 500 }}>{s.count}x</span>
                        <div style={{ flex: 1, height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${(s.count / maxCount) * 100}%`, 
                            background: `var(--${color})`,
                            borderRadius: 3
                          }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 45, fontWeight: 700, color: s.winRate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                          {s.winRate.toFixed(1)}%
                        </span>
                        <div style={{ flex: 1, height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${s.winRate}%`, 
                            background: s.winRate >= 50 ? 'var(--accent-green)' : 'var(--accent-red)',
                            borderRadius: 4
                          }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`font-mono ${s.avgPnL >= 0 ? 'text-profit' : 'text-loss'}`} style={{ minWidth: 100, fontWeight: 600 }}>
                          {s.avgPnL >= 0 ? '+' : ''}{formatRupiah(s.avgPnL)}
                        </span>
                        <div style={{ flex: 1, height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                          {s.avgPnL !== 0 && (
                            <div style={{ 
                              position: 'absolute',
                              height: '100%', 
                              width: `${(Math.abs(s.avgPnL) / maxAvgPnL) * 100}%`, 
                              background: s.avgPnL >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                              borderRadius: 4,
                              left: 0
                            }} />
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {stats.every(s => s.count === 0) && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                      Belum ada data transaksi yang menggunakan indikator ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="page-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
            <Icons.BarChart2 size={24} style={{ color: 'var(--accent-purple)' }} />
            Analitik Strategi BSJP
          </h1>
          <p className="page-subtitle" style={{ margin: '4px 0 0 0' }}>Analisis tingkat kemenangan (Win Rate) dan rata-rata profit berdasarkan indikator teknikal.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 20 }}>
          {renderStatCard('RSI (14)', rsiStats, Icons.Activity, 'accent-blue')}
          {renderStatCard('MFI (14)', mfiStats, Icons.TrendingUp, 'accent-indigo')}
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 20 }}>
          {renderStatCard('Stochastic %K', stochKStats, Icons.Zap, 'accent-purple')}
          {renderStatCard('Stochastic %D', stochDStats, Icons.ZapOff, 'accent-orange')}
        </div>
      </div>
    </div>
  );
}
