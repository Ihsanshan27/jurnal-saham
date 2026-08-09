import React, { useMemo, useState, useRef, useEffect } from "react";
import { useData } from "@/modules/shared/context/DataContext";
import { formatRupiah, formatCompactNumber } from "@/modules/shared/utils/formatters";
import {
   calculateStats,
   calculateEquityCurve,
   calculateMonthlyPnL,
   calculateTopStocks,
   calculateTradePnL
} from "@/modules/trades/calculations";
import { 
   LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
   PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Info, ChevronDown } from "lucide-react";
import MonthlyPnLHeatmap from "../components/MonthlyPnLHeatmap";

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#F43F5E', '#06B6D4', '#EC4899', '#84CC16'];
const RANGES = ['1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as const;
type TimeRange = typeof RANGES[number];

const YearSelector = ({ selectedYear, onSelect, years }: { selectedYear: string, onSelect: (y: string) => void, years: string[] }) => {
   const [isOpen, setIsOpen] = useState(false);
   const ref = useRef<HTMLDivElement>(null);

   useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
         if (ref.current && !ref.current.contains(e.target as Node)) {
            setIsOpen(false);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);

   return (
      <div ref={ref} style={{ position: 'relative', zIndex: 11 }}>
         <button 
            className="btn btn-sm hover-lift"
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 8 }}
            onClick={() => setIsOpen(!isOpen)}
         >
            {selectedYear === 'ALL' ? 'Semua Tahun' : `Tahun ${selectedYear}`}
            <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
         </button>
         
         {isOpen && (
            <div className="glass-card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, padding: 12, minWidth: 160, borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', maxHeight: 300, overflowY: 'auto' }}>
               <div
                  style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', background: selectedYear === 'ALL' ? 'var(--accent-primary)' : 'var(--bg-card)', color: selectedYear === 'ALL' ? '#fff' : 'var(--text-primary)', fontWeight: selectedYear === 'ALL' ? 600 : 400, marginBottom: 8, transition: 'all 0.2s', textAlign: 'center', fontSize: '0.85rem' }}
                  onClick={() => { onSelect('ALL'); setIsOpen(false); }}
               >
                  Semua Tahun
               </div>
               <div style={{ display: 'grid', gap: 4 }}>
                  {years.map(y => (
                     <div
                        key={y}
                        style={{ padding: '8px 12px', textAlign: 'center', fontSize: '0.85rem', fontWeight: selectedYear === y ? 600 : 400, borderRadius: 8, cursor: 'pointer', background: selectedYear === y ? 'var(--accent-primary)' : 'var(--bg-card)', color: selectedYear === y ? '#fff' : 'var(--text-primary)', transition: 'all 0.2s', border: selectedYear === y ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)' }}
                        onClick={() => { onSelect(y); setIsOpen(false); }}
                     >
                        {y}
                     </div>
                  ))}
               </div>
            </div>
         )}
      </div>
   );
};

const MonthSelector = ({ selectedMonth, onSelect }: { selectedMonth: string, onSelect: (m: string) => void }) => {
   const [isOpen, setIsOpen] = useState(false);
   const ref = useRef<HTMLDivElement>(null);

   useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
         if (ref.current && !ref.current.contains(e.target as Node)) {
            setIsOpen(false);
         }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);

   const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
   const monthCodes = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];

   const getLabel = () => {
      if (selectedMonth === 'ALL') return 'Semua Bulan';
      return monthNames[parseInt(selectedMonth) - 1];
   };

   return (
      <div ref={ref} style={{ position: 'relative', zIndex: 10 }}>
         <button 
            className="btn btn-sm hover-lift"
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 8 }}
            onClick={() => setIsOpen(!isOpen)}
         >
            {getLabel()}
            <ChevronDown size={14} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
         </button>
         
         {isOpen && (
            <div className="glass-card" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, padding: 12, minWidth: 260, borderRadius: 12, border: '1px solid var(--border-color)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', maxHeight: 350, overflowY: 'auto' }}>
               <div
                  style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', background: selectedMonth === 'ALL' ? 'var(--accent-primary)' : 'var(--bg-card)', color: selectedMonth === 'ALL' ? '#fff' : 'var(--text-primary)', fontWeight: selectedMonth === 'ALL' ? 600 : 400, marginBottom: 12, transition: 'all 0.2s', textAlign: 'center', fontSize: '0.85rem' }}
                  onClick={() => { onSelect('ALL'); setIsOpen(false); }}
               >
                  Semua Bulan
               </div>
               
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {monthCodes.map((m, idx) => {
                     const isSelected = selectedMonth === m;
                     const label = monthNames[idx].slice(0, 3);
                     
                     return (
                        <div
                           key={m}
                           style={{ padding: '8px 6px', textAlign: 'center', fontSize: '0.75rem', fontWeight: isSelected ? 600 : 400, borderRadius: 6, cursor: 'pointer', background: isSelected ? 'var(--accent-primary)' : 'var(--bg-card)', color: isSelected ? '#fff' : 'var(--text-primary)', transition: 'all 0.2s', border: isSelected ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)' }}
                           onClick={() => { onSelect(m); setIsOpen(false); }}
                        >
                           {label}
                        </div>
                     );
                  })}
               </div>
            </div>
         )}
      </div>
   );
};

export default function AnalyticsPage() {
   const { trades, settings, marketPrices, financeAccounts, getFinanceAccountCurrentBalance, allDividends } = useData();
   const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
   const [selectedHistoryYear, setSelectedHistoryYear] = useState<string>('ALL');
   const [selectedHistoryMonth, setSelectedHistoryMonth] = useState<string>('ALL');
   
   const usdToIdrRate = settings.usdToIdrRate ?? 16200;
   const initialCapital = settings.initialCapital ?? 10000000;

   // 1. Convert USD trades and dividends to IDR
   const idrTrades = useMemo(() => {
      return trades.map((trade) => {
         if (trade.market === "US") {
            return {
               ...trade,
               buyPrice: trade.buyPrice * usdToIdrRate,
               sellPrice: trade.sellPrice ? trade.sellPrice * usdToIdrRate : null,
            };
         }
         return trade;
      });
   }, [trades, usdToIdrRate]);

   const idrDividends = useMemo(() => {
      return allDividends.map(d => ({
         ...d,
         totalAmount: d.market === 'US' ? d.totalAmount * usdToIdrRate : d.totalAmount
      }));
   }, [allDividends, usdToIdrRate]);

   // 2. Filter data based on timeRange
   const filterDate = useMemo(() => {
       if (timeRange === 'ALL') return null;
       const d = new Date();
       if (timeRange === '1W') d.setDate(d.getDate() - 7);
       else if (timeRange === '1M') d.setMonth(d.getMonth() - 1);
       else if (timeRange === '3M') d.setMonth(d.getMonth() - 3);
       else if (timeRange === '1Y') d.setFullYear(d.getFullYear() - 1);
       else if (timeRange === 'YTD') { d.setMonth(0); d.setDate(1); }
       return d.getTime();
   }, [timeRange]);

   const filteredClosedTrades = useMemo(() => {
      return idrTrades.filter(t => {
         if (!t.dateSell || t.sellPrice == null) return false;
         if (!filterDate) return true;
         return new Date(t.dateSell).getTime() >= filterDate;
      });
   }, [idrTrades, filterDate]);

   const filteredDividends = useMemo(() => {
      return idrDividends.filter(d => {
         if (!filterDate) return true;
         return new Date(d.dateReceived).getTime() >= filterDate;
      });
   }, [idrDividends, filterDate]);
   
   const openTrades = useMemo(() => idrTrades.filter(t => !t.dateSell || t.sellPrice == null), [idrTrades]);

   // Stats for Filtered Trades
   const stats = useMemo(() => calculateStats(filteredClosedTrades), [filteredClosedTrades]);
   const fullEquityCurve = useMemo(() => calculateEquityCurve(idrTrades, initialCapital), [idrTrades, initialCapital]);
   
   const filteredEquityCurve = useMemo(() => {
      if (!filterDate) return fullEquityCurve;
      return fullEquityCurve.filter(p => new Date(p.date).getTime() >= filterDate);
   }, [fullEquityCurve, filterDate]);
   
   const monthlyPnL = useMemo(() => calculateMonthlyPnL(filteredClosedTrades), [filteredClosedTrades]);

   // --- Trade History Feature ---
   const historyYears = useMemo(() => {
      const years = new Set<string>();
      filteredClosedTrades.forEach(t => {
         if (t.dateSell) {
            years.add(new Date(t.dateSell).getFullYear().toString());
         }
      });
      return Array.from(years).sort().reverse();
   }, [filteredClosedTrades]);

   const historyMonthTrades = useMemo(() => {
      let base = filteredClosedTrades;
      if (selectedHistoryYear !== 'ALL') {
         base = base.filter(t => t.dateSell && new Date(t.dateSell).getFullYear().toString() === selectedHistoryYear);
      }
      if (selectedHistoryMonth !== 'ALL') {
         base = base.filter(t => t.dateSell && String(new Date(t.dateSell).getMonth() + 1).padStart(2, '0') === selectedHistoryMonth);
      }
      return base.map(t => {
         const pnlData = calculateTradePnL(t);
         return { ...t, ...pnlData };
      }).sort((a, b) => new Date(b.dateSell!).getTime() - new Date(a.dateSell!).getTime());
   }, [filteredClosedTrades, selectedHistoryYear, selectedHistoryMonth]);

   const historyMonthStats = useMemo(() => {
      let totalTrades = historyMonthTrades.length;
      let totalPnL = 0;
      let winCount = 0;
      let lossCount = 0;
      
      historyMonthTrades.forEach(t => {
         totalPnL += t.pnl;
         if (t.pnl > 0) winCount++;
         else if (t.pnl < 0) lossCount++;
      });
      
      const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
      
      return { totalTrades, totalPnL, winRate, winCount, lossCount };
   }, [historyMonthTrades]);

   // Portfolio Allocation (Open Trades)
   const portfolioAllocation = useMemo(() => {
      const allocation = openTrades.reduce((acc, trade) => {
         const isMutualFund = trade.assetType === 'mutual_fund';
         const shares = isMutualFund ? trade.lots : (trade.market === 'US' ? trade.lots : trade.lots * 100);
         
         const currentPrice = marketPrices[trade.stockCode] || trade.buyPrice || 0;
         const currentPriceIdr = trade.market === 'US' ? currentPrice * usdToIdrRate : currentPrice;
         
         const value = currentPriceIdr * shares;
         
         if (acc[trade.stockCode]) {
            acc[trade.stockCode].value += value;
         } else {
            acc[trade.stockCode] = { name: trade.stockCode, value };
         }
         return acc;
      }, {} as Record<string, { name: string, value: number }>);

      const sorted = Object.values(allocation).sort((a, b) => b.value - a.value);
      const totalValue = sorted.reduce((sum, item) => sum + item.value, 0);
      
      return sorted.map((item, index) => ({
         ...item,
         percent: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
         color: COLORS[index % COLORS.length]
      }));
   }, [openTrades, marketPrices, usdToIdrRate]);

   const totalInvestedValue = useMemo(() => portfolioAllocation.reduce((sum, item) => sum + item.value, 0), [portfolioAllocation]);
   
   // Bank Balances
   const totalBankBalance = useMemo(() => {
      return financeAccounts
         .filter(a => a.isActive !== false)
         .reduce((sum, a) => sum + (getFinanceAccountCurrentBalance(a.id) || 0), 0);
   }, [financeAccounts, getFinanceAccountCurrentBalance]);

   const currentTotalEquity = totalBankBalance + totalInvestedValue;
   
   // Top Gainers / Losers
   const topPerformers = useMemo(() => calculateTopStocks(filteredClosedTrades), [filteredClosedTrades]);
   const topGainers = useMemo(() => topPerformers.filter(t => t.totalPnL > 0).sort((a,b) => b.totalPnL - a.totalPnL), [topPerformers]);
   const topLosers = useMemo(() => topPerformers.filter(t => t.totalPnL < 0).sort((a,b) => a.totalPnL - b.totalPnL), [topPerformers]);

   // Top Dividends
   const topDividends = useMemo(() => {
       const map: Record<string, number> = {};
       filteredDividends.forEach(d => {
           if (!map[d.stockCode]) map[d.stockCode] = 0;
           map[d.stockCode] += d.totalAmount;
       });
       return Object.entries(map).map(([code, total]) => ({ code, total: total as number })).sort((a,b) => b.total - a.total);
   }, [filteredDividends]);

   // Realized Gain Details
   const totalStockGain = stats.avgWin * stats.winCount;
   const totalStockLoss = stats.avgLoss * stats.lossCount;
   const totalDividendSum = topDividends.reduce((sum, d) => sum + d.total, 0);
   const netRealized = totalStockGain - totalStockLoss + totalDividendSum;

   // Monthly PnL formatted for Area Chart
   const realizedGainData = useMemo(() => {
      let cumulative = 0;
      return monthlyPnL.map(m => {
         cumulative += m.pnl;
         return { ...m, cumulative };
      });
   }, [monthlyPnL]);
   
   const monthToDateGain = monthlyPnL.length > 0 ? monthlyPnL[monthlyPnL.length - 1].pnl : 0;
   const winRate = stats.winRate || 0;

   return (
      <div>
         <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
               <h1 className="page-title">
                  <TrendingUp size={26} style={{ color: "var(--accent-green)" }} />
                  Analitik &amp; Statistik
               </h1>
               <p className="page-subtitle">Analisis mendalam performa trading Anda</p>
            </div>
            
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
               {RANGES.map(r => (
                  <button
                     key={r}
                     onClick={() => setTimeRange(r)}
                     className={`btn btn-sm ${timeRange === r ? 'btn-primary' : 'btn-ghost'}`}
                  >
                     {r}
                  </button>
               ))}
            </div>
         </div>

         {/* Top Row */}
         <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {/* Total Equity Chart */}
            <div className="card glass-card hover-lift" style={{ flex: '2 1 300px', display: 'flex', flexDirection: 'column' }}>
               <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Total Equity <Info size={14} /></h3>
                  <span className="badge badge-primary">{timeRange}</span>
               </div>
               <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 8 }}>{formatRupiah(currentTotalEquity)}</div>
                  <div style={{ flex: 1, minHeight: 200 }}>
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={filteredEquityCurve} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                           <XAxis dataKey="date" hide />
                           <Line type="monotone" dataKey="equity" stroke="var(--accent-green)" strokeWidth={2} dot={false} />
                           <RechartsTooltip 
                              content={({ active, payload, label }) => {
                                 if (active && payload && payload.length) {
                                    return (
                                       <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 8, fontSize: '0.8rem' }}>
                                          <p style={{ color: 'var(--text-secondary)' }}>
                                             {new Date(label).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                          </p>
                                          <p style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{formatRupiah(payload[0].value as number)}</p>
                                       </div>
                                    );
                                 }
                                 return null;
                              }}
                           />
                        </LineChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>

            {/* Total Equity Return Table */}
            <div className="card glass-card hover-lift" style={{ flex: '1.5 1 250px', display: 'flex', flexDirection: 'column' }}>
               <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Total Equity Return</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                     <span className="badge badge-primary">Daily</span>
                  </div>
               </div>
               <div className="card-body" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column' }}>
                  <div className="table-container" style={{ border: 'none', flex: 1, maxHeight: '250px', overflowY: 'auto', margin: 0, borderRadius: '0 0 12px 12px' }}>
                     <table className="table" style={{ margin: 0 }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                           <tr>
                              <th>Date</th>
                              <th style={{ textAlign: 'right' }}>Equity</th>
                              <th style={{ textAlign: 'right' }}>P&L</th>
                           </tr>
                        </thead>
                        <tbody>
                           {[...filteredEquityCurve].reverse().map((point, i, arr) => {
                              const prevEquity = i < arr.length - 1 ? arr[i + 1].equity : initialCapital;
                              const pnl = point.equity - prevEquity;
                              const pnlPercent = prevEquity > 0 ? (pnl / prevEquity) * 100 : 0;
                              const isPositive = pnl >= 0;
                              
                              return (
                                 <tr key={point.date + i}>
                                    <td>{new Date(point.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: '2-digit' })}</td>
                                    <td style={{ textAlign: 'right' }}>{formatCompactNumber(point.equity)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 600 }} className={isPositive ? 'text-profit' : 'text-loss'}>
                                       {isPositive ? '+' : ''}{formatCompactNumber(pnl)} ({isPositive ? '+' : ''}{pnlPercent.toFixed(2)}%)
                                    </td>
                                 </tr>
                              );
                           })}
                           {filteredEquityCurve.length === 0 && (
                              <tr><td colSpan={3} style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)' }}>Belum ada data</td></tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>

            {/* Portfolio Allocation */}
            <div className="card glass-card hover-lift" style={{ flex: '1.5 1 250px', display: 'flex', flexDirection: 'column' }}>
               <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 className="card-title">Portfolio Allocation</h3>
                  <span className="badge badge-primary">Stocks</span>
               </div>
               <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
                  {portfolioAllocation.length > 0 ? (
                     <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flex: 1 }}>
                        <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                 <Pie
                                    data={portfolioAllocation}
                                    innerRadius={50}
                                    outerRadius={70}
                                    paddingAngle={2}
                                    dataKey="value"
                                 >
                                    {portfolioAllocation.map((entry, index) => (
                                       <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                 </Pie>
                                 <RechartsTooltip 
                                    content={({ active, payload }) => {
                                       if (active && payload && payload.length) {
                                          return (
                                             <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 8, fontSize: '0.8rem' }}>
                                                <p style={{ color: 'var(--text-secondary)' }}>{payload[0].name}</p>
                                                <p style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatRupiah(payload[0].value as number)}</p>
                                             </div>
                                          );
                                       }
                                       return null;
                                    }}
                                 />
                              </PieChart>
                           </ResponsiveContainer>
                        </div>
                        
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 160, overflowY: 'auto' }}>
                           {portfolioAllocation.map((item) => (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', paddingBottom: 4, borderBottom: '1px solid var(--border-color)' }} key={item.name}>
                                 <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color }} />
                                    <strong>{item.name}</strong>
                                 </div>
                                 <strong style={{ color: 'var(--text-secondary)' }}>{item.percent.toFixed(1)}%</strong>
                              </div>
                           ))}
                        </div>
                     </div>
                  ) : (
                     <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Belum ada data alokasi</div>
                  )}
               </div>
            </div>
         </div>

         {/* Middle Row: Top Performers */}
         <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {/* Top Gainers */}
            <div className="card glass-card hover-lift" style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column' }}>
               <div className="card-header"><h3 className="card-title">Top Gainers</h3></div>
               <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-container" style={{ border: 'none', maxHeight: '200px', overflowY: 'auto', margin: 0, borderRadius: '0 0 12px 12px' }}>
                     <table className="table" style={{ margin: 0 }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                           <tr>
                              <th>Stock</th>
                              <th style={{ textAlign: 'right' }}>Realized Gain</th>
                           </tr>
                        </thead>
                        <tbody>
                           {topGainers.map(t => (
                              <tr key={t.code}>
                                 <td><strong>{t.code}</strong></td>
                                 <td style={{ textAlign: 'right' }} className="text-profit">+{formatRupiah(t.totalPnL)}</td>
                              </tr>
                           ))}
                           {topGainers.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>

            {/* Top Losers */}
            <div className="card glass-card hover-lift" style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column' }}>
               <div className="card-header"><h3 className="card-title">Top Losers</h3></div>
               <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-container" style={{ border: 'none', maxHeight: '200px', overflowY: 'auto', margin: 0, borderRadius: '0 0 12px 12px' }}>
                     <table className="table" style={{ margin: 0 }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                           <tr>
                              <th>Stock</th>
                              <th style={{ textAlign: 'right' }}>Realized Loss</th>
                           </tr>
                        </thead>
                        <tbody>
                           {topLosers.map(t => (
                              <tr key={t.code}>
                                 <td><strong>{t.code}</strong></td>
                                 <td style={{ textAlign: 'right' }} className="text-loss">{formatRupiah(t.totalPnL)}</td>
                              </tr>
                           ))}
                           {topLosers.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>

            {/* Top Dividends */}
            <div className="card glass-card hover-lift" style={{ flex: '1 1 250px', display: 'flex', flexDirection: 'column' }}>
               <div className="card-header"><h3 className="card-title">Top Dividend Received</h3></div>
               <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-container" style={{ border: 'none', maxHeight: '200px', overflowY: 'auto', margin: 0, borderRadius: '0 0 12px 12px' }}>
                     <table className="table" style={{ margin: 0 }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                           <tr>
                              <th>Stock</th>
                              <th style={{ textAlign: 'right' }}>Dividend</th>
                           </tr>
                        </thead>
                        <tbody>
                           {topDividends.map(d => (
                              <tr key={d.code}>
                                 <td><strong>{d.code}</strong></td>
                                 <td style={{ textAlign: 'right' }} className="text-profit">+{formatRupiah(d.total)}</td>
                              </tr>
                           ))}
                           {topDividends.length === 0 && <tr><td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data</td></tr>}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         </div>

         {/* Monthly PnL Heatmap */}
         <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
               <MonthlyPnLHeatmap trades={filteredClosedTrades} />
            </div>
         </div>

         {/* Riwayat Trade Bulanan */}
         <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="card glass-card hover-lift" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
               <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <h3 className="card-title">Riwayat Trade</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                     <YearSelector 
                        selectedYear={selectedHistoryYear}
                        onSelect={setSelectedHistoryYear}
                        years={historyYears}
                     />
                     <MonthSelector 
                        selectedMonth={selectedHistoryMonth} 
                        onSelect={setSelectedHistoryMonth} 
                     />
                  </div>
               </div>
               
               <div style={{ padding: '12px 16px', display: 'flex', gap: 16, borderBottom: '1px solid var(--border-color)', background: 'var(--bg-card)' }}>
                  <div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total Trade</div>
                     <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{historyMonthStats.totalTrades}</div>
                  </div>
                  <div style={{ width: 1, background: 'var(--border-color)' }}></div>
                  <div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Win Rate</div>
                     <div style={{ fontSize: '1.1rem', fontWeight: 600 }} className="text-profit">
                        {historyMonthStats.winRate.toFixed(1)}%
                     </div>
                  </div>
                  <div style={{ width: 1, background: 'var(--border-color)' }}></div>
                  <div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Total P&L</div>
                     <div style={{ fontSize: '1.1rem', fontWeight: 600 }} className={historyMonthStats.totalPnL >= 0 ? 'text-profit' : 'text-loss'}>
                        {historyMonthStats.totalPnL >= 0 ? '+' : ''}{formatRupiah(historyMonthStats.totalPnL)}
                     </div>
                  </div>
               </div>

               <div className="card-body" style={{ padding: 0 }}>
                  <div className="table-container" style={{ border: 'none', maxHeight: '400px', overflowY: 'auto', margin: 0, borderRadius: '0 0 12px 12px' }}>
                     <table className="table" style={{ margin: 0, minWidth: 600 }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                           <tr>
                              <th>Tanggal Jual</th>
                              <th>Saham</th>
                              <th style={{ textAlign: 'right' }}>LOT</th>
                              <th style={{ textAlign: 'right' }}>Harga Beli</th>
                              <th style={{ textAlign: 'right' }}>Harga Jual</th>
                              <th style={{ textAlign: 'right' }}>Realized P&L</th>
                           </tr>
                        </thead>
                        <tbody>
                           {historyMonthTrades.map((t, idx) => (
                              <tr key={t.id || idx}>
                                 <td>{new Date(t.dateSell!).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                 <td><strong>{t.stockCode}</strong> {t.market === 'US' ? <span className="badge badge-sm badge-ghost">US</span> : ''}</td>
                                 <td style={{ textAlign: 'right' }}>
                                    {t.lots}
                                 </td>
                                 <td style={{ textAlign: 'right' }}>{formatRupiah(t.buyPrice)}</td>
                                 <td style={{ textAlign: 'right' }}>{formatRupiah(t.sellPrice!)}</td>
                                 <td style={{ textAlign: 'right', fontWeight: 600 }} className={t.pnl >= 0 ? 'text-profit' : 'text-loss'}>
                                    {t.pnl >= 0 ? '+' : ''}{formatRupiah(t.pnl)} ({t.pnl >= 0 ? '+' : ''}{t.pnlPercent.toFixed(2)}%)
                                 </td>
                              </tr>
                           ))}
                           {historyMonthTrades.length === 0 && (
                              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 16, color: 'var(--text-muted)' }}>Belum ada data history trade</td></tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         </div>

         {/* Bottom Row */}
         <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
            {/* Trade Summary */}
            <div className="card glass-card hover-lift" style={{ flex: '1.5 1 250px', display: 'flex', flexDirection: 'column' }}>
               <div className="card-header">
                  <h3 className="card-title">Trade Summary</h3>
               </div>
               <div className="card-body" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ width: 140, height: 120, position: 'relative' }}>
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={[{ value: winRate }, { value: 100 - winRate }]}
                              cx="50%"
                              cy="100%"
                              startAngle={180}
                              endAngle={0}
                              innerRadius={50}
                              outerRadius={70}
                              dataKey="value"
                              stroke="none"
                           >
                              <Cell fill="var(--accent-green)" />
                              <Cell fill="var(--accent-red)" />
                           </Pie>
                        </PieChart>
                     </ResponsiveContainer>
                     <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -10%)', textAlign: 'center' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.totalTrades}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Trades</div>
                     </div>
                  </div>
                  
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 150 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Win Rate</div>
                           <div className="text-profit" style={{ fontSize: '1.2rem', fontWeight: 700 }}>{winRate.toFixed(1)}%</div>
                        </div>
                        <div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Profit Factor</div>
                           <div style={{ fontSize: '1.2rem', fontWeight: 700 }}>{stats.profitFactor.toFixed(2)}</div>
                        </div>
                     </div>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, borderTop: '1px solid var(--border-color)', paddingTop: 12 }}>
                        <div>
                           <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Max Profit</div>
                           <div className="text-profit" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{stats.bestTrade ? formatCompactNumber(stats.bestTrade.pnl) : '-'}</div>
                           <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 4 }}>Avg Profit</div>
                           <div className="text-profit" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{formatCompactNumber(stats.avgWin)}</div>
                        </div>
                        <div>
                           <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Max Loss</div>
                           <div className="text-loss" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{stats.worstTrade ? formatCompactNumber(stats.worstTrade.pnl) : '-'}</div>
                           <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 4 }}>Avg Loss</div>
                           <div className="text-loss" style={{ fontSize: '0.9rem', fontWeight: 600 }}>{formatCompactNumber(stats.avgLoss)}</div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Total Realized Gain */}
            <div className="card glass-card hover-lift" style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column' }}>
               <div className="card-header">
                  <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>Total Realized Gain <Info size={14} /></h3>
               </div>
               <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                     <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Net Realized</div>
                        <div className={netRealized >= 0 ? 'text-profit' : 'text-loss'} style={{ fontSize: '1.4rem', fontWeight: 700 }}>
                           {netRealized >= 0 ? '+' : ''}{formatRupiah(netRealized)}
                        </div>
                     </div>
                     <div style={{ display: 'flex', gap: 16 }}>
                        <div>
                           <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stock Gain</div>
                           <div className="text-profit" style={{ fontWeight: 600 }}>+{formatCompactNumber(totalStockGain)}</div>
                        </div>
                        <div>
                           <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Stock Loss</div>
                           <div className="text-loss" style={{ fontWeight: 600 }}>-{formatCompactNumber(totalStockLoss)}</div>
                        </div>
                        <div>
                           <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Dividend</div>
                           <div className="text-profit" style={{ fontWeight: 600 }}>+{formatCompactNumber(totalDividendSum)}</div>
                        </div>
                     </div>
                  </div>
                  
                  <div style={{ flex: 1, minHeight: 120 }}>
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={realizedGainData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                           <defs>
                              <linearGradient id="colorGain" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="var(--accent-green)" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="var(--accent-green)" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <Area type="monotone" dataKey="cumulative" stroke="var(--accent-green)" fillOpacity={1} fill="url(#colorGain)" />
                           <RechartsTooltip 
                              content={({ active, payload }) => {
                                 if (active && payload && payload.length) {
                                    return (
                                       <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: 8, fontSize: '0.8rem' }}>
                                          <p style={{ color: 'var(--text-secondary)' }}>{payload[0].payload.month}</p>
                                          <p style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{formatRupiah(payload[0].value as number)}</p>
                                       </div>
                                    );
                                 }
                                 return null;
                              }}
                           />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
