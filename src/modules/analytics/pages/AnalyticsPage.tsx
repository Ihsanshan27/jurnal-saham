import React, { useMemo, useState } from "react";
import { useData } from "@/modules/shared/context/DataContext";
import { formatRupiah, formatCompactNumber } from "@/modules/shared/utils/formatters";
import {
   calculateStats,
   calculateEquityCurve,
   calculateMonthlyPnL,
   calculateTopStocks
} from "@/modules/trades/calculations";
import { 
   LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
   PieChart, Pie, Cell
} from 'recharts';
import { TrendingUp, Info } from "lucide-react";
import MonthlyPnLHeatmap from "../components/MonthlyPnLHeatmap";

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#F43F5E', '#06B6D4', '#EC4899', '#84CC16'];
const RANGES = ['1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as const;
type TimeRange = typeof RANGES[number];

export default function AnalyticsPage() {
   const { trades, settings, marketPrices, financeAccounts, getFinanceAccountCurrentBalance, allDividends } = useData();
   const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
   
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
