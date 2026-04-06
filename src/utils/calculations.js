// === Trade Calculations ===

export function calculateTradePnL(trade) {
  const { buyPrice, sellPrice, lots, buyFee = 0.15, sellFee = 0.25 } = trade;
  const shares = lots * 100;

  const totalBuy = buyPrice * shares;
  const totalSell = sellPrice ? sellPrice * shares : 0;

  const buyCommission = totalBuy * (buyFee / 100);
  const sellCommission = totalSell * (sellFee / 100);
  const totalFee = buyCommission + sellCommission;

  const pnl = sellPrice ? totalSell - totalBuy - totalFee : 0;
  const pnlPercent = totalBuy > 0 ? (pnl / totalBuy) * 100 : 0;

  return {
    totalBuy,
    totalSell,
    buyCommission,
    sellCommission,
    totalFee,
    pnl,
    pnlPercent,
    shares,
  };
}

export function calculateUnrealizedPnL(buyPrice, currentPrice, lots, buyFee = 0.15) {
  const shares = lots * 100;
  const totalBuy = buyPrice * shares;
  const totalCurrent = currentPrice * shares;
  const fee = totalBuy * (buyFee / 100);
  const pnl = totalCurrent - totalBuy - fee;
  const pnlPercent = totalBuy > 0 ? (pnl / totalBuy) * 100 : 0;
  return { pnl, pnlPercent, totalBuy, totalCurrent };
}

// === Portfolio/Stats ===

export function calculateStats(trades) {
  const closedTrades = trades.filter(t => t.sellPrice && t.dateSell);

  if (closedTrades.length === 0) {
    return {
      totalTrades: 0,
      totalPnL: 0,
      winRate: 0,
      avgWin: 0,
      avgLoss: 0,
      profitFactor: 0,
      bestTrade: null,
      worstTrade: null,
      avgHoldingDays: 0,
      expectancy: 0,
      winCount: 0,
      lossCount: 0,
    };
  }

  const results = closedTrades.map(t => {
    const calc = calculateTradePnL(t);
    return { ...t, ...calc };
  });

  const wins = results.filter(r => r.pnl > 0);
  const losses = results.filter(r => r.pnl <= 0);

  const totalPnL = results.reduce((sum, r) => sum + r.pnl, 0);
  const totalWin = wins.reduce((sum, r) => sum + r.pnl, 0);
  const totalLoss = Math.abs(losses.reduce((sum, r) => sum + r.pnl, 0));

  const avgWin = wins.length > 0 ? totalWin / wins.length : 0;
  const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
  const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0;

  const holdingDays = closedTrades
    .filter(t => t.dateBuy && t.dateSell)
    .map(t => {
      const d1 = new Date(t.dateBuy);
      const d2 = new Date(t.dateSell);
      return Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
    });
  const avgHoldingDays = holdingDays.length > 0
    ? holdingDays.reduce((s, d) => s + d, 0) / holdingDays.length
    : 0;

  const sortedByPnL = [...results].sort((a, b) => b.pnl - a.pnl);
  const bestTrade = sortedByPnL[0] || null;
  const worstTrade = sortedByPnL[sortedByPnL.length - 1] || null;

  const winRate = (wins.length / closedTrades.length) * 100;
  const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss;

  return {
    totalTrades: closedTrades.length,
    totalPnL,
    winRate,
    avgWin,
    avgLoss,
    profitFactor,
    bestTrade,
    worstTrade,
    avgHoldingDays,
    expectancy,
    winCount: wins.length,
    lossCount: losses.length,
  };
}

// === Equity Curve ===

export function calculateEquityCurve(trades, initialCapital = 10000000) {
  const closed = trades
    .filter(t => t.sellPrice && t.dateSell)
    .sort((a, b) => new Date(a.dateSell) - new Date(b.dateSell));

  let equity = initialCapital;
  const curve = [{ date: closed[0]?.dateBuy || new Date().toISOString().split('T')[0], equity: initialCapital }];

  for (const t of closed) {
    const { pnl } = calculateTradePnL(t);
    equity += pnl;
    curve.push({ date: t.dateSell, equity });
  }

  return curve;
}

// === Monthly P&L ===

export function calculateMonthlyPnL(trades) {
  const closed = trades.filter(t => t.sellPrice && t.dateSell);
  const monthly = {};

  for (const t of closed) {
    const date = new Date(t.dateSell);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const { pnl } = calculateTradePnL(t);
    monthly[key] = (monthly[key] || 0) + pnl;
  }

  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, pnl]) => {
      const [y, m] = month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return { month: `${monthNames[parseInt(m) - 1]} ${y}`, pnl };
    });
}

// === Strategy Stats ===

export function calculateStrategyStats(trades) {
  const closed = trades.filter(t => t.sellPrice && t.dateSell && t.strategy);
  const strategies = {};

  for (const t of closed) {
    if (!strategies[t.strategy]) {
      strategies[t.strategy] = { wins: 0, losses: 0, totalPnL: 0, count: 0 };
    }
    const { pnl } = calculateTradePnL(t);
    strategies[t.strategy].count++;
    strategies[t.strategy].totalPnL += pnl;
    if (pnl > 0) strategies[t.strategy].wins++;
    else strategies[t.strategy].losses++;
  }

  return Object.entries(strategies).map(([name, data]) => ({
    name,
    ...data,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
  }));
}

// === Day of Week ===

export function calculateDayOfWeekPnL(trades) {
  const closed = trades.filter(t => t.sellPrice && t.dateSell);
  const days = {
    Senin: { pnl: 0, count: 0 },
    Selasa: { pnl: 0, count: 0 },
    Rabu: { pnl: 0, count: 0 },
    Kamis: { pnl: 0, count: 0 },
    Jumat: { pnl: 0, count: 0 },
  };

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  for (const t of closed) {
    const dayName = dayNames[new Date(t.dateSell).getDay()];
    if (days[dayName]) {
      const { pnl } = calculateTradePnL(t);
      days[dayName].pnl += pnl;
      days[dayName].count++;
    }
  }

  return Object.entries(days).map(([day, data]) => ({ day, ...data }));
}

// === Emotion Stats ===

export function calculateEmotionStats(trades) {
  const closed = trades.filter(t => t.sellPrice && t.dateSell && t.emotion);
  const emotions = {};

  for (const t of closed) {
    if (!emotions[t.emotion]) {
      emotions[t.emotion] = { wins: 0, losses: 0, totalPnL: 0, count: 0 };
    }
    const { pnl } = calculateTradePnL(t);
    emotions[t.emotion].count++;
    emotions[t.emotion].totalPnL += pnl;
    if (pnl > 0) emotions[t.emotion].wins++;
    else emotions[t.emotion].losses++;
  }

  return Object.entries(emotions).map(([emotion, data]) => ({
    emotion,
    ...data,
    winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
  }));
}

// === Calendar Heatmap Data ===

export function calculateDailyPnL(trades) {
  const closed = trades.filter(t => t.sellPrice && t.dateSell);
  const daily = {};

  for (const t of closed) {
    const date = t.dateSell;
    const { pnl } = calculateTradePnL(t);
    daily[date] = (daily[date] || 0) + pnl;
  }

  return daily;
}

// === Top Stocks ===

export function calculateTopStocks(trades) {
  const closed = trades.filter(t => t.sellPrice && t.dateSell);
  const stocks = {};

  for (const t of closed) {
    if (!stocks[t.stockCode]) {
      stocks[t.stockCode] = { trades: 0, totalPnL: 0, wins: 0 };
    }
    const { pnl } = calculateTradePnL(t);
    stocks[t.stockCode].trades++;
    stocks[t.stockCode].totalPnL += pnl;
    if (pnl > 0) stocks[t.stockCode].wins++;
  }

  return Object.entries(stocks)
    .map(([code, data]) => ({
      code,
      ...data,
      winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
    }))
    .sort((a, b) => b.totalPnL - a.totalPnL);
}

// === Calculator Functions ===

export function calcProfitLoss({ buyPrice, sellPrice, lots, buyFee = 0.15, sellFee = 0.25 }) {
  return calculateTradePnL({ buyPrice, sellPrice, lots, buyFee, sellFee });
}

export function calcBrokerFee({ price, lots, buyFeePercent = 0.15, sellFeePercent = 0.25, ppnPercent = 11 }) {
  const shares = lots * 100;
  const totalValue = price * shares;

  const buyCommission = totalValue * (buyFeePercent / 100);
  const buyPPN = buyCommission * (ppnPercent / 100);
  const totalBuyFee = buyCommission + buyPPN;

  const sellCommission = totalValue * (sellFeePercent / 100);
  const sellPPN = sellCommission * (ppnPercent / 100);
  const pphSell = totalValue * 0.001; // 0.1% PPh Final
  const totalSellFee = sellCommission + sellPPN + pphSell;

  return {
    totalValue,
    buyCommission,
    buyPPN,
    totalBuyFee,
    sellCommission,
    sellPPN,
    pphSell,
    totalSellFee,
    totalFee: totalBuyFee + totalSellFee,
  };
}

export function calcAveragePrice(purchases) {
  // purchases = [{ price, lots }, ...]
  let totalValue = 0;
  let totalLots = 0;

  for (const p of purchases) {
    if (p.price > 0 && p.lots > 0) {
      totalValue += p.price * p.lots * 100;
      totalLots += p.lots;
    }
  }

  const avgPrice = totalLots > 0 ? totalValue / (totalLots * 100) : 0;

  return { avgPrice, totalLots, totalValue, totalShares: totalLots * 100 };
}

export function calcPositionSize({ capital, riskPercent, entryPrice, stopLoss }) {
  const riskAmount = capital * (riskPercent / 100);
  const riskPerShare = Math.abs(entryPrice - stopLoss);

  if (riskPerShare <= 0) return { lots: 0, riskAmount, totalInvestment: 0, riskPerShare: 0 };

  const shares = Math.floor(riskAmount / riskPerShare);
  const lots = Math.floor(shares / 100);
  const totalInvestment = lots * 100 * entryPrice;

  return { lots, riskAmount, totalInvestment, riskPerShare, shares: lots * 100 };
}

export function calcTargetPrice({ buyPrice, targetPercent, buyFee = 0.15, sellFee = 0.25 }) {
  const targetPrice = buyPrice * (1 + targetPercent / 100);
  const shares = 100; // per lot
  const totalBuy = buyPrice * shares;
  const totalSell = targetPrice * shares;
  const fee = totalBuy * (buyFee / 100) + totalSell * (sellFee / 100);
  const profit = totalSell - totalBuy - fee;

  return { targetPrice, profitPerLot: profit, feePerLot: fee };
}
