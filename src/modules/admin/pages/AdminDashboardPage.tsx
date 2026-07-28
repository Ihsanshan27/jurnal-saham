import { useEffect, useState } from 'react';
import { supabase } from '@/modules/shared/services/supabaseClient';
import { useData } from '@/modules/shared/context/DataContext';
import { formatDateTime } from '@/modules/shared/utils/formatters';
import { useAuth } from '@/modules/auth/AuthContext';
import { pushSystemBroadcast } from '@/modules/admin/services/broadcastService';
import { Activity, Users, Database, Briefcase, Bell, Send } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function AdminDashboardPage() {
  const { showToast } = useData();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSeverity, setBroadcastSeverity] = useState<'info'|'warning'|'danger'>('info');
  const [pushingBroadcast, setPushingBroadcast] = useState(false);

  const handlePushBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;
    
    setPushingBroadcast(true);
    try {
      await pushSystemBroadcast({
        title: broadcastTitle,
        message: broadcastMessage,
        severity: broadcastSeverity,
        authorName: user?.user_metadata?.display_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin',
      }, user?.id || 'system');
      showToast('Berhasil mengirim push notifikasi ke seluruh pengguna!', 'success');
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastSeverity('info');
    } catch (err: any) {
      showToast(`Gagal mengirim broadcast: ${err.message}`, 'error');
    } finally {
      setPushingBroadcast(false);
    }
  };

  useEffect(() => {
    async function fetchStats() {
      if (!supabase) return;
      try {
        const { data, error } = await supabase.rpc('get_platform_analytics');
        if (error) throw error;
        setStats(data);
      } catch (err: any) {
        showToast(`Gagal memuat analitik: ${err.message}`, 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [showToast]);

  if (loading) {
    return <div className="loading-spinner" />;
  }

  if (!stats) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Gagal memuat data</div>
      </div>
    );
  }

  // Siapkan data mockup untuk grafik agar terlihat menarik (bisa disesuaikan dengan data real nantinya)
  const chartData = [
    { name: 'Pengguna', value: stats.totalUsers },
    { name: 'Workspace', value: stats.totalWorkspaces },
    { name: 'Aktif 30H', value: stats.activeUsers30d },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dasbor Platform</h1>
          <p className="page-subtitle">Ringkasan aktivitas dan pertumbuhan SaaS Jurnal Saham</p>
        </div>
      </div>

      <div className="dashboard-metrics-grid" style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: 12, backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', color: 'var(--accent-blue)' }}>
              <Users size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Pengguna</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalUsers}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: 12, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', color: 'var(--accent-green)' }}>
              <Activity size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Aktif (30 Hari)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.activeUsers30d}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: 12, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: '50%', color: 'var(--accent-yellow)' }}>
              <Database size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Transaksi</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalTrades}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: 12, backgroundColor: 'rgba(139, 92, 246, 0.1)', borderRadius: '50%', color: 'var(--accent-purple)' }}>
              <Briefcase size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Workspace</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalWorkspaces}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 className="card-title" style={{ marginBottom: 16 }}>Perbandingan Pengguna</h3>
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                <YAxis stroke="var(--text-secondary)" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Bar dataKey="value" fill="var(--accent-blue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Aktivitas Terbaru</h3>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>User</th>
                    <th>Aktivitas</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.recentActivity || []).length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada aktivitas</td>
                    </tr>
                  ) : (
                    stats.recentActivity.map((log: any, idx: number) => (
                      <tr key={idx}>
                        <td className="admin-table-meta">{formatDateTime(log.created_at)}</td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{log.display_name || 'Tanpa Nama'}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.email}</div>
                        </td>
                        <td>
                          <span className="badge badge-gray">{log.action}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24, padding: 20 }}>
        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Bell size={20} style={{ color: 'var(--accent-purple)' }} />
          Kirim Pengumuman Global (Push Notification)
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
          Pengumuman ini akan muncul sebagai notifikasi lonceng bagi seluruh pengguna.
        </p>
        <form onSubmit={handlePushBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600 }}>
          <div className="form-group">
            <label className="form-label">Judul Pengumuman</label>
            <input 
              type="text" 
              className="form-input" 
              value={broadcastTitle}
              onChange={e => setBroadcastTitle(e.target.value)}
              placeholder="Contoh: Maintenance Server Malam Ini"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Isi Pesan</label>
            <textarea 
              className="form-textarea" 
              value={broadcastMessage}
              onChange={e => setBroadcastMessage(e.target.value)}
              placeholder="Tulis pesan pengumuman..."
              rows={3}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Tipe (Tingkat Urgensi)</label>
            <select 
              className="form-input"
              value={broadcastSeverity}
              onChange={e => setBroadcastSeverity(e.target.value as any)}
            >
              <option value="info">Info (Biru)</option>
              <option value="warning">Warning (Kuning)</option>
              <option value="danger">Danger (Merah/Kritis)</option>
            </select>
          </div>
          <div style={{ marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={pushingBroadcast} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {pushingBroadcast ? <div className="loading-spinner" style={{ width: 16, height: 16 }} /> : <Send size={16} />}
              Kirim Broadcast Sekarang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
