import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Brain, Plus, Trash2, Search, AlertCircle, Info } from 'lucide-react';
import { predictionsService, WatchlistItem, Prediction } from '../services/predictionsService';
import { formatRupiah } from '@/modules/shared/utils/formatters';

export default function PredictionsPage() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [selectedStock, setSelectedStock] = useState<string>('^JKSE');
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadWatchlist();
  }, []);

  useEffect(() => {
    if (selectedStock) {
      loadPredictions(selectedStock);
    }
  }, [selectedStock]);

  const loadWatchlist = async () => {
    try {
      const data = await predictionsService.getWatchlist();
      setWatchlist(data);
      if (data.length > 0 && !data.find(w => w.stock_code === selectedStock)) {
         setSelectedStock(data[0].stock_code);
      }
    } catch (err: any) {
      console.error(err);
      // fallback for demo without auth
      setWatchlist([{ id: '1', user_id: 'demo', stock_code: '^JKSE', created_at: '' }]);
    } finally {
      setLoading(false);
    }
  };

  const loadPredictions = async (code: string) => {
    try {
      setLoading(true);
      const data = await predictionsService.getPredictions(code);
      setPredictions(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!searchQuery) return;
    
    try {
      await predictionsService.addToWatchlist(searchQuery);
      setSearchQuery('');
      loadWatchlist();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menambahkan saham.');
    }
  };

  const handleRemoveWatchlist = async (code: string) => {
    try {
      await predictionsService.removeFromWatchlist(code);
      loadWatchlist();
    } catch (err) {
      console.error(err);
    }
  };

  // Format data for chart
  const chartData = useMemo(() => {
    // We only have predictions for now, but ideally we merge with historical prices
    return predictions.map(p => ({
      date: p.target_date,
      prediction: p.predicted_price
    }));
  }, [predictions]);

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="page-title">
            <Brain size={26} style={{ color: "var(--accent-purple)", minWidth: 26 }} />
            AI Stock Prediction
          </h1>
          <p className="page-subtitle">Prediksi harga saham menggunakan LSTM Neural Network</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        
        {/* Sidebar Watchlist */}
        <div className="card glass-card hover-lift" style={{ flex: '1 1 300px', maxWidth: '400px' }}>
          <div className="card-header">
            <h3 className="card-title">My Watchlist</h3>
            <span className="badge badge-primary">{watchlist.length} / 10</span>
          </div>
          <div className="card-body">
            
            <form onSubmit={handleAddWatchlist} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Kode Saham (e.g. BBCA)" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  style={{ paddingLeft: 36, width: '100%' }}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={watchlist.length >= 10 || !searchQuery}>
                <Plus size={18} />
              </button>
            </form>

            {errorMsg && (
              <div style={{ padding: 12, background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)', borderRadius: 8, fontSize: '0.85rem', marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {watchlist.map(item => (
                <div 
                  key={item.id} 
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '12px 16px', 
                    borderRadius: 8, 
                    border: `1px solid ${selectedStock === item.stock_code ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    background: selectedStock === item.stock_code ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-card)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => setSelectedStock(item.stock_code)}
                >
                  <strong style={{ fontSize: '1.1rem' }}>{item.stock_code}</strong>
                  <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={(e) => { e.stopPropagation(); handleRemoveWatchlist(item.stock_code); }}
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              
              {watchlist.length === 0 && !loading && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                  Watchlist kosong. Tambahkan saham pertama Anda.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="card glass-card hover-lift" style={{ flex: '3 1 600px', display: 'flex', flexDirection: 'column', minHeight: 500 }}>
          <div className="card-header">
            <h3 className="card-title">AI Forecast: {selectedStock}</h3>
            <span className="badge badge-ghost">LSTM Model (7 Days)</span>
          </div>
          <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            <div style={{ flex: 1, minHeight: 400 }}>
              {loading ? (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Memuat data AI...
                </div>
              ) : predictions.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border-color)' }}
                      tickFormatter={(val) => new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border-color)' }}
                      tickFormatter={(val) => `Rp${val.toLocaleString('id-ID')}`}
                    />
                    <RechartsTooltip 
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8 }}
                      labelStyle={{ color: 'var(--text-secondary)' }}
                      formatter={(value: number) => [formatRupiah(value), 'Prediksi']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    />
                    <Legend wrapperStyle={{ paddingTop: 20 }} />
                    <Line 
                      type="monotone" 
                      dataKey="prediction" 
                      name="Prediksi AI (LSTM)"
                      stroke="var(--accent-purple)" 
                      strokeWidth={3} 
                      strokeDasharray="5 5"
                      dot={{ r: 4, fill: 'var(--accent-purple)' }} 
                      activeDot={{ r: 6 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Data prediksi belum tersedia.
                </div>
              )}
            </div>

            <div style={{ padding: 16, background: 'rgba(139, 92, 246, 0.1)', borderRadius: 12, marginTop: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <Info size={20} style={{ color: 'var(--accent-purple)', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                <strong>Disclaimer:</strong> Prediksi ini dihasilkan oleh model AI (Long Short-Term Memory) berdasarkan data riwayat harga historis. Pergerakan harga saham dipengaruhi oleh banyak faktor fundamental dan sentimen pasar yang tidak dapat diprediksi secara pasti. <strong>Gunakan hanya sebagai referensi.</strong>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
