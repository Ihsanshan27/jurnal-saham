import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { useData } from '@/modules/shared/context/DataContext';
import { useDialog } from '@/modules/shared/context/DialogContext';
import { usePrivacyStyle } from '@/modules/shared/hooks/usePrivacyStyle';
import { formatDate } from '@/modules/shared/utils/formatters';
import '@/modules/ipo/ipo.css';

function createInitialForm() {
  return {
    name: '',
    email: '',
    rdnBankName: '',
    rdnAccountNumber: '',
    withdrawBankName: '',
    withdrawAccountNumber: '',
    withdrawAccountHolderName: '',
    notes: '',
    isActive: true,
  };
}

type StatusFilter = 'all' | 'active' | 'inactive';
type ViewMode = 'card' | 'list';

export default function IpoAccountsPage() {
  const {
    ipoAccounts,
    ipoEntries,
    addIpoAccount,
    updateIpoAccount,
    toggleIpoAccountActive,
    deleteIpoAccount,
    canWrite,
  } = useData();
  const { confirm } = useDialog();
  const blurStyle = usePrivacyStyle();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(createInitialForm());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  const accountsWithStats = useMemo(() => {
    return [...ipoAccounts]
      .map((account: any) => {
        const linkedEntries = ipoEntries.filter((entry: any) => entry.ipoAccountId === account.id);
        const eventCount = new Set(linkedEntries.map((entry: any) => entry.ipoEventId)).size;
        return {
          ...account,
          linkedEntriesCount: linkedEntries.length,
          eventCount,
        };
      })
      .sort((left: any, right: any) => {
        if ((left.isActive !== false) !== (right.isActive !== false)) {
          return left.isActive === false ? 1 : -1;
        }
        return left.name.localeCompare(right.name, 'id', { sensitivity: 'base' });
      });
  }, [ipoAccounts, ipoEntries]);

  const summary = useMemo(() => {
    const total = ipoAccounts.length;
    const active = ipoAccounts.filter((account: any) => account.isActive !== false).length;
    const inactive = total - active;
    const linkedEntries = ipoEntries.filter((entry: any) => entry.ipoAccountId).length;
    return { total, active, inactive, linkedEntries };
  }, [ipoAccounts, ipoEntries]);

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return accountsWithStats.filter((account: any) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && account.isActive !== false) ||
        (statusFilter === 'inactive' && account.isActive === false);

      const haystack = [
        account.name,
        account.email,
        account.rdnBankName,
        account.rdnAccountNumber,
        account.withdrawBankName,
        account.withdrawAccountNumber,
        account.withdrawAccountHolderName,
        account.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesQuery = !query || haystack.includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [accountsWithStats, searchQuery, statusFilter]);

  const resetForm = () => {
    setForm(createInitialForm());
    setShowForm(false);
    setEditingId(null);
  };

  const setValue = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      name: form.name,
      email: form.email,
      rdnBankName: form.rdnBankName,
      rdnAccountNumber: form.rdnAccountNumber,
      withdrawBankName: form.withdrawBankName,
      withdrawAccountNumber: form.withdrawAccountNumber,
      withdrawAccountHolderName: form.withdrawAccountHolderName,
      notes: form.notes,
      isActive: form.isActive,
    };

    if (editingId) {
      const updated = updateIpoAccount(editingId, payload);
      if (updated) resetForm();
      return;
    }

    const created = addIpoAccount(payload);
    if (created) resetForm();
  };

  const handleEdit = (account: any) => {
    setEditingId(account.id);
    setShowForm(true);
    setForm({
      name: account.name || '',
      email: account.email || '',
      rdnBankName: account.rdnBankName || '',
      rdnAccountNumber: account.rdnAccountNumber || '',
      withdrawBankName: account.withdrawBankName || '',
      withdrawAccountNumber: account.withdrawAccountNumber || '',
      withdrawAccountHolderName: account.withdrawAccountHolderName || '',
      notes: account.notes || '',
      isActive: account.isActive !== false,
    });
  };

  const handleDelete = async (account: any) => {
    const isConfirmed = await confirm(
      `Master akun "${account.name}" akan dihapus permanen.\n\nAkun yang masih terhubung ke entry IPO tidak bisa dihapus. Lanjutkan penghapusan?`,
      {
        title: 'Hapus Master Akun IPO',
        severity: 'danger',
        confirmText: 'Hapus',
      },
    );
    if (isConfirmed) {
      deleteIpoAccount(account.id);
    }
  };

  return (
    <div className="ipo-accounts-page">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icons.Users size={26} style={{ color: 'var(--accent-green)' }} />
            Master IPO Accounts
          </h1>
          <p className="page-subtitle">
            Kelola akun partisipan IPO agar entry tetap konsisten, mudah dipilih, dan rapi di ringkasan.
          </p>
        </div>
        <div className="ipo-actions-row">
          <Link className="btn btn-secondary" to="/ipo">
            <Icons.Rocket size={16} />
            IPO Journey
          </Link>
          {canWrite && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => (showForm ? resetForm() : setShowForm(true))}
            >
              {showForm ? <Icons.X size={16} /> : <Icons.Plus size={16} />}
              {showForm ? 'Batal' : 'Tambah Akun'}
            </button>
          )}
        </div>
      </div>

      <div className="grid-stats analytics-stats-grid ipo-margin-b16" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="stat-card ipo-accounts-stat-card">
          <div className="stat-card-label">Total Master Akun</div>
          <div className="stat-card-value">{summary.total}</div>
        </div>
        <div className="stat-card ipo-accounts-stat-card">
          <div className="stat-card-label">Akun Aktif</div>
          <div className="stat-card-value">{summary.active}</div>
        </div>
        <div className="stat-card ipo-accounts-stat-card">
          <div className="stat-card-label">Akun Nonaktif</div>
          <div className="stat-card-value">{summary.inactive}</div>
        </div>
        <div className="stat-card ipo-accounts-stat-card">
          <div className="stat-card-label">Entry Tertaut</div>
          <div className="stat-card-value">{summary.linkedEntries}</div>
        </div>
      </div>

      {showForm && canWrite && (
        <div className="card ipo-margin-b16">
          <div className="card-header">
            <div>
              <h3 className="card-title">{editingId ? 'Edit Master Akun IPO' : 'Tambah Master Akun IPO'}</h3>
              <p className="page-subtitle" style={{ marginTop: 6 }}>
                Nama akun menjadi sumber utama yang akan dipakai ulang di form entry IPO.
              </p>
            </div>
          </div>
          <form onSubmit={handleSubmit} noValidate className="card-body ipo-accounts-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="ipo-master-name">Nama Akun *</label>
                <input
                  id="ipo-master-name"
                  className="form-input"
                  placeholder="Contoh: Akun Pribadi Utama"
                  value={form.name}
                  onChange={(event) => setValue('name', event.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ipo-master-email">Email</label>
                <input
                  id="ipo-master-email"
                  type="email"
                  className="form-input"
                  placeholder="email@gmail.com"
                  value={form.email}
                  onChange={(event) => setValue('email', event.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="ipo-master-notes">Catatan</label>
                <input
                  id="ipo-master-notes"
                  className="form-input"
                  placeholder="Contoh: dipakai untuk akun keluarga"
                  value={form.notes}
                  onChange={(event) => setValue('notes', event.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ipo-master-active">Status</label>
                <select
                  id="ipo-master-active"
                  className="form-select"
                  value={form.isActive ? 'active' : 'inactive'}
                  onChange={(event) => setValue('isActive', event.target.value === 'active')}
                >
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>
            </div>

            <div className="ipo-form-section">
              <h4 className="ipo-form-section-title">Informasi RDN</h4>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="ipo-master-rdn-bank">Bank RDN</label>
                  <input
                    id="ipo-master-rdn-bank"
                    className="form-input"
                    placeholder="Contoh: BCA / BNI / Permata"
                    value={form.rdnBankName}
                    onChange={(event) => setValue('rdnBankName', event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ipo-master-rdn-number">Nomor RDN</label>
                  <input
                    id="ipo-master-rdn-number"
                    className="form-input"
                    placeholder="Nomor rekening dana nasabah"
                    value={form.rdnAccountNumber}
                    onChange={(event) => setValue('rdnAccountNumber', event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="ipo-form-section">
              <h4 className="ipo-form-section-title">Rekening Withdraw</h4>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="ipo-master-withdraw-bank">Bank Withdraw</label>
                  <input
                    id="ipo-master-withdraw-bank"
                    className="form-input"
                    placeholder="Contoh: BCA"
                    value={form.withdrawBankName}
                    onChange={(event) => setValue('withdrawBankName', event.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ipo-master-withdraw-number">Nomor Rekening Withdraw</label>
                  <input
                    id="ipo-master-withdraw-number"
                    className="form-input"
                    placeholder="Nomor rekening penarikan dana"
                    value={form.withdrawAccountNumber}
                    onChange={(event) => setValue('withdrawAccountNumber', event.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="ipo-master-withdraw-holder">Nama Pemilik Rekening Withdraw</label>
                  <input
                    id="ipo-master-withdraw-holder"
                    className="form-input"
                    placeholder="Nama sesuai rekening tujuan"
                    value={form.withdrawAccountHolderName}
                    onChange={(event) => setValue('withdrawAccountHolderName', event.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="ipo-flex-wrap">
              <button type="submit" className="btn btn-primary">
                <Icons.Save size={15} />
                {editingId ? 'Simpan Perubahan' : 'Simpan Master Akun'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                <Icons.RotateCcw size={15} />
                Reset
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">Daftar Master Akun</h3>
            <p className="page-subtitle" style={{ marginTop: 6 }}>
              Akun nonaktif tidak muncul sebagai pilihan utama saat input entry baru, tapi histori lama tetap aman.
            </p>
          </div>
        </div>
        <div className="card-body ipo-accounts-list-shell">
          <div className="ipo-filter-bar ipo-accounts-filter-bar">
            <div className="form-group ipo-filter-search" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="ipo-account-search">Cari Akun</label>
              <div className="ipo-search-input-wrapper">
                <Icons.Search size={16} className="ipo-search-icon" />
                <input
                  id="ipo-account-search"
                  className="form-input ipo-search-input"
                  placeholder="Cari nama akun, email, bank RDN, atau rekening withdraw..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="ipo-account-status-filter">Filter Status</label>
              <select
                id="ipo-account-status-filter"
                className="form-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
              >
                <option value="all">Semua</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Mode Tampilan</label>
              <div className="ipo-view-toggle" role="tablist" aria-label="Mode tampilan akun IPO">
                <button
                  type="button"
                  className={`ipo-view-toggle-btn ${viewMode === 'card' ? 'active' : ''}`}
                  onClick={() => setViewMode('card')}
                  aria-pressed={viewMode === 'card'}
                >
                  <Icons.LayoutGrid size={15} />
                  Grid Card
                </button>
                <button
                  type="button"
                  className={`ipo-view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-pressed={viewMode === 'list'}
                >
                  <Icons.Rows3 size={15} />
                  Grid List
                </button>
              </div>
            </div>
          </div>

          {accountsWithStats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Icons.Users size={42} />
              </div>
              <div className="empty-state-title">Belum ada master akun IPO</div>
              <div className="empty-state-desc">
                Tambahkan akun IPO yang sering dipakai agar input entry berikutnya lebih cepat dan konsisten.
              </div>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Icons.SearchX size={42} />
              </div>
              <div className="empty-state-title">Tidak ada akun yang cocok</div>
              <div className="empty-state-desc">
                Ubah kata kunci pencarian atau filter status untuk melihat akun IPO lain.
              </div>
            </div>
          ) : viewMode === 'list' ? (
            <div className="ipo-account-table-wrap">
              <table className="table ipo-account-table">
                <thead>
                  <tr>
                    <th>Akun</th>
                    <th>Email</th>
                    <th>RDN</th>
                    <th>Withdraw</th>
                    <th>Status</th>
                    <th>Entry</th>
                    <th>Event</th>
                    <th>Terakhir</th>
                    <th>Catatan</th>
                    {canWrite && <th>Tools</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account: any) => (
                    <tr key={account.id}>
                      <td>
                        <div className="ipo-account-table-account">
                          <div className="ipo-account-table-name">{account.name}</div>
                          {account.withdrawAccountHolderName && (
                            <div className="ipo-account-table-sub">{account.withdrawAccountHolderName}</div>
                          )}
                        </div>
                      </td>
                      <td style={blurStyle}>{account.email || '-'}</td>
                      <td style={blurStyle}>
                        {account.rdnBankName || account.rdnAccountNumber
                          ? [account.rdnBankName, account.rdnAccountNumber].filter(Boolean).join(' / ')
                          : '-'}
                      </td>
                      <td style={blurStyle}>
                        {account.withdrawBankName || account.withdrawAccountNumber
                          ? [account.withdrawBankName, account.withdrawAccountNumber].filter(Boolean).join(' / ')
                          : '-'}
                      </td>
                      <td>
                        <span className={`status-badge ${account.isActive === false ? 'upcoming' : 'active'}`}>
                          {account.isActive === false ? 'Nonaktif' : 'Aktif'}
                        </span>
                      </td>
                      <td>{account.linkedEntriesCount}</td>
                      <td>{account.eventCount}</td>
                      <td>{account.lastUsedAt ? formatDate(account.lastUsedAt) : '-'}</td>
                      <td className="ipo-account-table-notes">{account.notes || '-'}</td>
                      {canWrite && (
                        <td>
                          <div className="ipo-account-table-tools">
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleEdit(account)} title="Edit akun">
                              <Icons.Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => toggleIpoAccountActive(account.id)}
                              title={account.isActive === false ? 'Aktifkan akun' : 'Nonaktifkan akun'}
                            >
                              {account.isActive === false ? <Icons.Power size={14} /> : <Icons.PowerOff size={14} />}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm ipo-account-delete-btn"
                              disabled={account.linkedEntriesCount > 0}
                              onClick={() => handleDelete(account)}
                              title={account.linkedEntriesCount > 0 ? 'Akun yang masih dipakai tidak bisa dihapus' : 'Hapus akun'}
                            >
                              <Icons.Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`ipo-accounts-grid ${viewMode === 'list' ? 'list-mode' : 'card-mode'}`}>
              {filteredAccounts.map((account: any) => (
                <article key={account.id} className={`ipo-account-card ${viewMode === 'list' ? 'list-mode' : 'card-mode'}`}>
                  <div className="ipo-account-card-header">
                    <div>
                      <div className="ipo-account-card-title-row">
                        <h4 className="ipo-account-card-title">{account.name}</h4>
                        <span className={`status-badge ${account.isActive === false ? 'upcoming' : 'active'}`}>
                          {account.isActive === false ? 'Nonaktif' : 'Aktif'}
                        </span>
                      </div>
                      <div className="ipo-account-card-email" style={blurStyle}>
                        <Icons.Mail size={14} />
                        <span>{account.email || 'Tanpa email'}</span>
                      </div>
                    </div>
                    <div className="ipo-account-card-metrics">
                      <div className="ipo-account-metric">
                        <span className="ipo-account-metric-label">Entry</span>
                        <strong>{account.linkedEntriesCount}</strong>
                      </div>
                      <div className="ipo-account-metric">
                        <span className="ipo-account-metric-label">Event</span>
                        <strong>{account.eventCount}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="ipo-account-info-grid">
                    <section className="ipo-account-info-card" style={blurStyle}>
                      <div className="ipo-account-info-kicker">RDN</div>
                      <div className="ipo-account-info-main">
                        {account.rdnBankName || account.rdnAccountNumber
                          ? [account.rdnBankName, account.rdnAccountNumber].filter(Boolean).join(' / ')
                          : 'Belum diisi'}
                      </div>
                    </section>
                    <section className="ipo-account-info-card" style={blurStyle}>
                      <div className="ipo-account-info-kicker">Rekening Withdraw</div>
                      <div className="ipo-account-info-main">
                        {account.withdrawBankName || account.withdrawAccountNumber
                          ? [account.withdrawBankName, account.withdrawAccountNumber].filter(Boolean).join(' / ')
                          : 'Belum diisi'}
                      </div>
                      {account.withdrawAccountHolderName && (
                        <div className="ipo-account-info-sub">{account.withdrawAccountHolderName}</div>
                      )}
                    </section>
                  </div>

                  <div className="ipo-account-meta-row">
                    <div className="ipo-account-meta-item">
                      <Icons.Clock3 size={14} />
                      <span>Terakhir dipakai: {account.lastUsedAt ? formatDate(account.lastUsedAt) : '-'}</span>
                    </div>
                    {account.notes && (
                      <div className="ipo-account-meta-item">
                        <Icons.NotebookPen size={14} />
                        <span>{account.notes}</span>
                      </div>
                    )}
                  </div>

                  {canWrite && (
                    <div className="ipo-account-actions">
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleEdit(account)}>
                        <Icons.Pencil size={14} />
                        Edit
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => toggleIpoAccountActive(account.id)}>
                        {account.isActive === false ? <Icons.Power size={14} /> : <Icons.PowerOff size={14} />}
                        {account.isActive === false ? 'Aktifkan' : 'Nonaktifkan'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm ipo-account-delete-btn"
                        disabled={account.linkedEntriesCount > 0}
                        onClick={() => handleDelete(account)}
                        title={account.linkedEntriesCount > 0 ? 'Akun yang masih dipakai tidak bisa dihapus' : 'Hapus akun'}
                      >
                        <Icons.Trash2 size={14} />
                        Hapus
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
