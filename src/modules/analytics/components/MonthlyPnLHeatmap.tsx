import React, { useMemo } from 'react';
import { calculateYearlyMonthlyPnL } from '@/modules/trades/calculations';
import { formatCompactNumber, formatRupiah } from '@/modules/shared/utils/formatters';
import { Calendar } from 'lucide-react';

interface MonthlyPnLHeatmapProps {
  trades: any[];
}

export default function MonthlyPnLHeatmap({ trades }: MonthlyPnLHeatmapProps) {
  const yearlyData = useMemo(() => calculateYearlyMonthlyPnL(trades), [trades]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const getHeatmapColor = (pnl: number) => {
    if (pnl === 0) return 'var(--bg-card)';
    // A more modern transparent gradient color based on positive/negative
    if (pnl > 0) {
      return 'rgba(16, 185, 129, 0.2)'; // Emerald 500 with opacity
    } else {
      return 'rgba(244, 63, 94, 0.2)'; // Rose 500 with opacity
    }
  };

  const getTextColor = (pnl: number) => {
    if (pnl === 0) return 'var(--text-muted)';
    if (pnl > 0) return 'var(--accent-green)';
    return 'var(--accent-red)';
  };

  return (
    <div className="card glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={18} />
          Monthly P&L by Year
        </h3>
      </div>
      <div className="card-body" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ minWidth: 800, margin: 0 }}>
          <thead>
            <tr>
              <th style={{ width: 60, textAlign: 'center', background: 'transparent' }}>Year</th>
              {monthNames.map(month => (
                <th key={month} style={{ textAlign: 'center', background: 'transparent' }}>{month}</th>
              ))}
              <th style={{ textAlign: 'right', background: 'transparent', width: 100 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {yearlyData.length === 0 && (
              <tr>
                <td colSpan={14} style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)' }}>
                  Belum ada data PnL tertutup.
                </td>
              </tr>
            )}
            {yearlyData.map(({ year, months, totalPnL }) => (
              <tr key={year} style={{ borderBottom: '1px solid var(--border-color-light, rgba(255,255,255,0.05))' }}>
                <td style={{ fontWeight: 'bold', textAlign: 'center', background: 'var(--bg-card)' }}>{year}</td>
                {months.map((pnl, index) => (
                  <td 
                    key={index} 
                    style={{ 
                      textAlign: 'center', 
                      backgroundColor: getHeatmapColor(pnl),
                      color: getTextColor(pnl),
                      fontWeight: pnl !== 0 ? 600 : 'normal',
                      borderRight: '1px solid var(--bg-main)',
                      borderLeft: '1px solid var(--bg-main)',
                      fontSize: '0.85rem'
                    }}
                    title={pnl !== 0 ? formatRupiah(pnl) : ''}
                  >
                    {pnl !== 0 ? (pnl > 0 ? '+' : '') + formatCompactNumber(pnl) : '-'}
                  </td>
                ))}
                <td style={{ textAlign: 'right', fontWeight: 'bold', color: getTextColor(totalPnL), background: 'var(--bg-card)' }}>
                   {totalPnL > 0 ? '+' : ''}{formatCompactNumber(totalPnL)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
