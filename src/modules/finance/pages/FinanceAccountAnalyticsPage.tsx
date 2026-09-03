import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Activity, TrendingUp, TrendingDown, Wallet, ShoppingBag, ArrowRightLeft, Target } from 'lucide-react';
import { useData } from '@/modules/shared/context/DataContext';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { formatRupiah, formatPercent, formatDate } from '@/modules/shared/utils/formatters';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isSameMonth, subDays } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
const EXPENSE_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1'];
const INCOME_COLORS = ['#10b981', '#22c55e', '#84cc16', '#eab308', '#3b82f6', '#0ea5e9', '#06b6d4'];

export default function FinanceAccountAnalyticsPage() {
  const { id: accountId } = useParams();
  const { financeAccounts, getFinanceTransactionsByAccount, portfolios } = useData();
  const blurStyle = usePrivacyStyle();
  
  const account = financeAccounts.find((item: any) => item.id === accountId);
  const accountTransactions = useMemo(() => getFinanceTransactionsByAccount(accountId), [getFinanceTransactionsByAccount, accountId]);

  const [periodMonths, setPeriodMonths] = useState(6);

  const analyticsData = useMemo(() => {
    if (!account) return null;

    const openingBalance = account.openingBalance || 0;
    
    const chronTransactions = [...accountTransactions].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    let currentBalance = openingBalance;
    const balanceHistory: { date: string; balance: number; displayDate: string }[] = [];
    
    if (chronTransactions.length > 0) {
      const firstDate = new Date(chronTransactions[0].date);
      balanceHistory.push({ 
        date: subDays(firstDate, 1).toISOString(), 
        displayDate: format(subDays(firstDate, 1), 'dd MMM yyyy', { locale: localeID }),
        balance: openingBalance 
      });
    }

    chronTransactions.forEach((t: any) => {
      if (t.type === 'income' || t.type === 'transfer_in') currentBalance += t.amount;
      else if (t.type === 'expense' || t.type === 'transfer_out') currentBalance -= t.amount;
      else if (t.type === 'adjustment') currentBalance += t.amount;
      
      balanceHistory.push({ 
        date: t.date, 
        displayDate: format(new Date(t.date), 'dd MMM yyyy', { locale: localeID }),
        balance: currentBalance 
      });
    });

    const startDate = startOfMonth(subMonths(new Date(), periodMonths - 1));
    const endDate = endOfMonth(new Date());
    
    const recentTransactions = chronTransactions.filter(t => {
      const date = new Date(t.date);
      return date >= startDate && date <= endDate;
    });

    let totalIncome = 0;
    let totalExpense = 0;
    
    const expensesByCategory: Record<string, number> = {};
    const incomesByCategory: Record<string, number> = {};
    const transferFlow: Record<string, number> = {};
    
    // For MoM calculation
    const thisMonth = new Date();
    const lastMonth = subMonths(thisMonth, 1);
    let thisMonthExpense = 0;
    let lastMonthExpense = 0;

    recentTransactions.forEach((t: any) => {
      const tDate = new Date(t.date);
      
      // Categorize Income/Expense
      if (t.type === 'income') {
        totalIncome += t.amount;
        const cat = t.category || 'Pemasukan Lainnya';
        incomesByCategory[cat] = (incomesByCategory[cat] || 0) + t.amount;
      } 
      else if (t.type === 'expense') {
        totalExpense += t.amount;
        const cat = t.category || 'Pengeluaran Lainnya';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.amount;
        
        if (isSameMonth(tDate, thisMonth)) thisMonthExpense += t.amount;
        else if (isSameMonth(tDate, lastMonth)) lastMonthExpense += t.amount;
      }
      // Track Transfer Flow
      else if (t.type === 'transfer_out') {
        const dest = t.linkedPortfolioId 
          ? `Ke Dompet: ${portfolios.find((p: any) => p.id === t.linkedPortfolioId)?.name || 'Trading'}`
          : `Ke Rekening Lain`;
        transferFlow[dest] = (transferFlow[dest] || 0) + t.amount;
      }
      else if (t.type === 'transfer_in') {
        // Excluded from standard income KPIs, but good to know
      }
    });

    const expensePieData = Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
      
    const incomePieData = Object.entries(incomesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // MoM comparison
    const momExpenseChange = lastMonthExpense > 0 
      ? ((thisMonthExpense - lastMonthExpense) / lastMonthExpense) * 100 
      : 0;

    // Monthly Cashflow Bar Chart
    const monthlyCashflow = [];
    const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });
    let totalMonthsCount = 0;
    
    for (const month of monthsInterval) {
      const monthLabel = format(month, 'MMM yy', { locale: localeID });
      const monthTrans = recentTransactions.filter(t => isSameMonth(new Date(t.date), month));
      
      let mIncome = 0;
      let mExpense = 0;
      
      monthTrans.forEach(t => {
        if (t.type === 'income' || t.type === 'transfer_in') mIncome += t.amount;
        if (t.type === 'expense' || t.type === 'transfer_out') mExpense += t.amount;
      });
      
      if (new Date() >= month) {
        totalMonthsCount++;
      }
      
      monthlyCashflow.push({
        date: monthLabel,
        Pemasukan: mIncome,
        Pengeluaran: mExpense,
        Net: mIncome - mExpense
      });
    }

    const avgMonthlyExpense = totalMonthsCount > 0 ? totalExpense / totalMonthsCount : 0;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    
    // Top Spending Transactions
    const topExpenses = recentTransactions
      .filter(t => t.type === 'expense' || t.type === 'transfer_out')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 7);

    return {
      balanceHistory,
      expensePieData,
      incomePieData,
      monthlyCashflow,
      totalIncome,
      totalExpense,
      currentBalance,
      savingsRate,
      avgMonthlyExpense,
      momExpenseChange,
      thisMonthExpense,
      topExpenses,
      transferFlow
    };
  }, [account, accountTransactions, periodMonths, portfolios]);

  if (!account || !analyticsData) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><Activity size={48} /></div>
        <div className="empty-state-title">Data Rekening Tidak Valid</div>
        <Link to="/finance" className="btn btn-primary">Kembali ke Finance Tracker</Link>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="card" style={{ padding: '12px', border: '1px solid var(--border-color)', boxShadow: '0 8px 16px -4px rgba(0, 0, 0, 0.1)', background: 'var(--bg-card)', zIndex: 1000 }}>
          <p className="font-semibold" style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', gap: '24px', marginBottom: '4px' }}>
              <span style={{ color: entry.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-medium" style={{ ...blurStyle, color: 'var(--text-primary)' }}>
                {formatter ? formatter(entry.value) : formatRupiah(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const getMoMColor = (val: number) => {
    if (val === 0) return 'var(--text-secondary)';
    return val > 0 ? 'var(--accent-red)' : 'var(--accent-green)';
  };

  return (
    <div className="finance-analytics-page pb-12">
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <Link to={`/finance/${accountId}`} className="btn btn-secondary" style={{ marginBottom: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={16} />
              Kembali ke Detail Rekening
            </span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="text-zinc-600 dark:text-zinc-400">
              <Activity size={28} />
            </div>
            <div>
              <h1 className="page-title" style={{ marginBottom: 4 }}>Analitik: {account.name}</h1>
              <p className="page-subtitle">Wawasan mendalam seputar arus kas dan pengeluaran</p>
            </div>
          </div>
        </div>
        
        <div className="form-group" style={{ minWidth: 150 }}>
          <select 
            className="form-input" 
            value={periodMonths} 
            onChange={(e) => setPeriodMonths(Number(e.target.value))}
            style={{ fontWeight: 600 }}
          >
            <option value={3}>3 Bulan Terakhir</option>
            <option value={6}>6 Bulan Terakhir</option>
            <option value={12}>12 Bulan Terakhir</option>
            <option value={60}>5 Tahun Terakhir</option>
          </select>
        </div>
      </div>

      <div className="grid-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', marginBottom: 24 }}>
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ background: 'var(--accent-green-dim)', padding: 8, borderRadius: 8, color: 'var(--accent-green)' }}>
              <TrendingUp size={18} />
            </div>
            <div className="stat-card-label" style={{ margin: 0 }}>Total Pemasukan</div>
          </div>
          <div className="stat-card-value text-profit" style={{ ...blurStyle, fontSize: '1.5rem', fontWeight: 700 }}>
            {formatRupiah(analyticsData.totalIncome)}
          </div>
        </div>
        
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ background: 'var(--accent-red-dim)', padding: 8, borderRadius: 8, color: 'var(--accent-red)' }}>
              <TrendingDown size={18} />
            </div>
            <div className="stat-card-label" style={{ margin: 0 }}>Total Pengeluaran</div>
          </div>
          <div className="stat-card-value text-loss" style={{ ...blurStyle, fontSize: '1.5rem', fontWeight: 700 }}>
            {formatRupiah(analyticsData.totalExpense)}
          </div>
          <div style={{ fontSize: '0.85rem', color: getMoMColor(analyticsData.momExpenseChange), display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontWeight: 500 }}>
            {analyticsData.momExpenseChange > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {analyticsData.momExpenseChange > 0 ? '+' : ''}{analyticsData.momExpenseChange.toFixed(1)}% vs bulan lalu
          </div>
        </div>

        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ background: 'var(--accent-blue-dim)', padding: 8, borderRadius: 8, color: 'var(--accent-blue)' }}>
              <Target size={18} />
            </div>
            <div className="stat-card-label" style={{ margin: 0 }}>Savings Rate</div>
          </div>
          <div className="stat-card-value" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {analyticsData.savingsRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Persentase uang yang dihemat
          </div>
        </div>
        
        <div className="stat-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ background: 'var(--bg-secondary)', padding: 8, borderRadius: 8, color: 'var(--text-secondary)' }}>
              <Wallet size={18} />
            </div>
            <div className="stat-card-label" style={{ margin: 0 }}>Rata-rata Pengeluaran</div>
          </div>
          <div className="stat-card-value" style={{ ...blurStyle, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatRupiah(analyticsData.avgMonthlyExpense)}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            Per bulan selama periode
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
        <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <div>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Activity size={18} style={{ color: 'var(--accent-blue)' }} />
              Saldo Berjalan (Running Balance)
            </h3>
            <p className="analytics-secondary-text" style={{ fontSize: '0.85rem' }}>Perkembangan total uang di rekening ini sejak awal dibuka.</p>
          </div>
        </div>
        <div className="card-body" style={{ padding: '0 20px 20px 20px' }}>
          {analyticsData.balanceHistory.length > 0 ? (
            <div style={{ height: 320, width: '100%', marginTop: 20 }}>
              <ResponsiveContainer>
                <AreaChart data={analyticsData.balanceHistory} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-blue)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--accent-blue)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                  <XAxis 
                    dataKey="displayDate" 
                    stroke="var(--text-secondary)" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                    tickMargin={10}
                  />
                  <YAxis 
                    stroke="var(--text-secondary)" 
                    fontSize={11}
                    tickFormatter={(value) => `Rp${(value / 1000000).toFixed(0)}M`}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                    tickMargin={10}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="balance" 
                    name="Saldo" 
                    stroke="var(--accent-blue)" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorBalance)" 
                    activeDot={{ r: 6, fill: 'var(--accent-blue)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-state-title">Belum ada data historis</div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <div>
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <ArrowRightLeft size={18} style={{ color: 'var(--accent-purple)' }} />
              Pemasukan vs Pengeluaran Bulanan
            </h3>
            <p className="analytics-secondary-text" style={{ fontSize: '0.85rem' }}>Perbandingan *cash-in* dan *cash-out* setiap bulan (termasuk transfer).</p>
          </div>
        </div>
        <div className="card-body">
          <div style={{ height: 320, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={analyticsData.monthlyCashflow} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="var(--text-secondary)" 
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <YAxis 
                  stroke="var(--text-secondary)" 
                  fontSize={11}
                  tickFormatter={(value) => `Rp${(value / 1000000).toFixed(0)}M`}
                  tickLine={false}
                  axisLine={false}
                  width={50}
                  tickMargin={10}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border-color)', opacity: 0.2 }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: 20 }} />
                <Bar dataKey="Pemasukan" fill="var(--accent-green)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Pengeluaran" fill="var(--accent-red)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingBag size={18} style={{ color: 'var(--accent-orange)' }} />
              Kategori Pengeluaran
            </h3>
          </div>
          <div className="card-body">
            {analyticsData.expensePieData.length > 0 ? (
              <div style={{ height: 280, width: '100%' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={analyticsData.expensePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {analyticsData.expensePieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '0.85rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state" style={{ height: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="empty-state-title">Belum ada pengeluaran</div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TrendingUp size={18} style={{ color: 'var(--accent-green)' }} />
              Kategori Pemasukan
            </h3>
          </div>
          <div className="card-body">
            {analyticsData.incomePieData.length > 0 ? (
              <div style={{ height: 280, width: '100%' }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={analyticsData.incomePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {analyticsData.incomePieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" iconType="circle" wrapperStyle={{ fontSize: '0.85rem' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="empty-state" style={{ height: 280, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div className="empty-state-title">Belum ada pemasukan</div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-header">
          <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} style={{ color: 'var(--accent-red)' }} />
            Transaksi Keluar Terbesar (Top Spending)
          </h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {analyticsData.topExpenses.length > 0 ? (
            <div className="table-container" style={{ margin: 0, border: 'none', borderRadius: 0 }}>
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Deskripsi</th>
                    <th>Kategori</th>
                    <th style={{ textAlign: 'right' }}>Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  {analyticsData.topExpenses.map((t: any) => (
                    <tr key={t.id}>
                      <td style={{ width: '120px' }}>{formatDate(t.date)}</td>
                      <td style={{ fontWeight: 500 }}>{t.description}</td>
                      <td>
                        <span className="badge" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                          {t.category || (t.type === 'transfer_out' ? 'Transfer Keluar' : 'Lainnya')}
                        </span>
                      </td>
                      <td className="font-mono text-loss" style={{ textAlign: 'right', fontWeight: 600, ...blurStyle }}>
                        -{formatRupiah(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '30px 20px' }}>
              <div className="empty-state-title">Tidak ada transaksi keluar</div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
