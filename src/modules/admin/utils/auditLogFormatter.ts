/**
 * Utility untuk memformat dan menyajikan Audit Logs secara jelas dan deskriptif.
 */

export const ACTION_LABELS: Record<string, string> = {
  'auth.registered': 'User Mendaftar',
  'auth.logged_in': 'User Login',
  'auth.logged_out': 'User Logout',

  'trade.created': 'Tambah Transaksi Saham',
  'trade.updated': 'Ubah Transaksi Saham',
  'trade.deleted': 'Hapus Transaksi Saham',
  'trade.batch_updated': 'Ubah Massal Transaksi',
  'trade.batch_deleted': 'Hapus Massal Transaksi',

  'watchlist.created': 'Tambah Watchlist',
  'watchlist.updated': 'Ubah Watchlist',
  'watchlist.deleted': 'Hapus Watchlist',

  'note.created': 'Buat Catatan',
  'note.updated': 'Ubah Catatan',
  'note.deleted': 'Hapus Catatan',

  'cashflow.created': 'Catat Cashflow',
  'cashflow.updated': 'Ubah Cashflow',
  'cashflow.deleted': 'Hapus Cashflow',

  'dividend.created': 'Catat Dividen',
  'dividend.updated': 'Ubah Dividen',
  'dividend.deleted': 'Hapus Dividen',

  'portfolio.created': 'Buat Portofolio',
  'portfolio.updated': 'Ubah Portofolio',
  'portfolio.deleted': 'Hapus Portofolio',

  'trading_plan.created': 'Buat Trading Plan',
  'trading_plan.updated': 'Ubah Trading Plan',
  'trading_plan.deleted': 'Hapus Trading Plan',

  'ipo_event.created': 'Buat Event IPO',
  'ipo_event.updated': 'Ubah Event IPO',
  'ipo_event.deleted': 'Hapus Event IPO',

  'ipo_account.created': 'Buat Master Akun IPO',
  'ipo_account.updated': 'Ubah Master Akun IPO',
  'ipo_account.deleted': 'Hapus Master Akun IPO',

  'ipo_entry.created': 'Tambah Entry IPO',
  'ipo_entry.updated': 'Ubah Entry IPO',
  'ipo_entry.deleted': 'Hapus Entry IPO',

  'bsjp_trade.created': 'Tambah Transaksi BSJP',
  'bsjp_trade.updated': 'Ubah Transaksi BSJP',
  'bsjp_trade.deleted': 'Hapus Transaksi BSJP',

  'asset.created': 'Tambah Aset Inventaris',
  'asset.updated': 'Ubah Aset Inventaris',
  'asset.deleted': 'Hapus Aset Inventaris',
  'asset.batch_created': 'Tambah Massal Aset',
  'asset.batch_deleted': 'Hapus Massal Aset',

  'finance_account.created': 'Buat Rekening Keuangan',
  'finance_account.updated': 'Ubah Rekening Keuangan',
  'finance_account.deleted': 'Hapus Rekening Keuangan',

  'finance_transaction.created': 'Catat Transaksi Keuangan',
  'finance_transaction.updated': 'Ubah Transaksi Keuangan',
  'finance_transaction.deleted': 'Hapus Transaksi Keuangan',

  'finance_transfer.created': 'Transfer Antar Rekening',
  'finance_portfolio_transfer.created': 'Transfer ke Dompet Trading',
  'portfolio_finance_transfer.created': 'Tarik Dana Dompet Trading',

  'settings.updated': 'Ubah Pengaturan',
  'settings.registration_updated': 'Ubah Akses Registrasi',
  'profile.display_name_updated': 'Ubah Nama Profil',
  'profile.role_updated': 'Ubah Role Pengguna',
  'workspace.created': 'Buat Workspace',
  'workspace.member_upserted': 'Update Member Workspace',
  'workspace.member_removed': 'Hapus Member Workspace',
  'admin.user_created': 'Admin Buat User',
  'data.exported': 'Ekspor Data Jurnal',
  'data.imported': 'Impor Data Jurnal',
  'data.cleared': 'Hapus Semua Data',
  'shared_access.upserted': 'Update Akses Berbagi',
  'shared_access.revoked': 'Cabut Akses Berbagi',
  'report_share.created': 'Buat Link Laporan',
  'report_share.snapshot_refreshed': 'Refresh Snapshot Laporan',
  'report_share.visibility_updated': 'Ubah Visibilitas Laporan',
  'report_share.deleted': 'Hapus Link Laporan',
  'report_share.link_copied': 'Salin Link Laporan',
};

export const TARGET_TYPE_LABELS: Record<string, string> = {
  auth_user: 'User',
  trade: 'Transaksi Saham',
  watchlist_item: 'Watchlist',
  note: 'Catatan',
  cashflow: 'Cashflow',
  dividend: 'Dividen',
  portfolio: 'Portofolio',
  trading_plan: 'Trading Plan',
  ipo_event: 'Event IPO',
  ipo_account: 'Akun IPO',
  ipo_entry: 'Entry IPO',
  bsjp_trade: 'Transaksi BSJP',
  asset: 'Aset & Inventaris',
  finance_account: 'Rekening Keuangan',
  finance_transaction: 'Transaksi Keuangan',
  settings: 'Pengaturan',
  profile: 'Profil User',
  workspace: 'Workspace',
  app_settings: 'Pengaturan Aplikasi',
  shared_access: 'Akses Berbagi',
  report_share: 'Link Laporan',
  journal_data: 'Data Jurnal',
};

export function getAuditActionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

export function getAuditTargetTypeLabel(targetType: string): string {
  return TARGET_TYPE_LABELS[targetType] || targetType || '-';
}

/**
 * Format nominal uang ke mata uang lokal/USD
 */
function formatAmount(amount: any, currency = 'IDR'): string {
  const num = Number(amount);
  if (isNaN(num)) return amount ? String(amount) : '';
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(num);
  }
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
}

/**
 * Mengambil nama objek target yang mudah dibaca (bukan sekadar ID mentah)
 */
export function getAuditTargetName(log: any): string {
  const m = log.metadata || {};
  
  if (m.stockCode) return m.stockCode;
  if (m.name) return m.name;
  if (m.title) return m.title;
  if (m.accountName) return m.accountName;
  if (m.portfolioName) return m.portfolioName;
  if (m.companyName) return m.companyName;
  if (m.institutionName) return m.institutionName;
  if (m.email) return m.email;
  if (m.displayName) return m.displayName;

  // Jika target_id tampak seperti ID sintetis, potong agar rapi
  const rawId = log.target_id || '';
  if (rawId.length > 24) {
    return `${rawId.substring(0, 8)}...${rawId.substring(rawId.length - 4)}`;
  }
  return rawId || '-';
}

/**
 * Menghasilkan kalimat deskripsi tindakan dalam Bahasa Indonesia yang alami dan jelas.
 */
export function getAuditLogDescription(log: any, actorName?: string): string {
  const m = log.metadata || {};
  const action = log.action || '';
  const isUs = m.market === 'US' || m.currency === 'USD';
  const currency = isUs ? 'USD' : 'IDR';

  const actorStr = actorName ? `${actorName}` : 'User';

  switch (action) {
    // === AUTH ===
    case 'auth.registered':
      return `${actorStr} mendaftar akun baru (${m.email || 'email tidak dicantumkan'})`;
    case 'auth.logged_in':
      return `${actorStr} berhasil login ke aplikasi`;
    case 'auth.logged_out':
      return `${actorStr} keluar dari aplikasi (logout)`;

    // === TRADES ===
    case 'trade.created': {
      const stock = m.stockCode ? `saham ${m.stockCode}` : 'saham';
      const typeStr = m.isClosed ? 'transaksi (selesai)' : 'transaksi aktif';
      return `${actorStr} menambah ${typeStr} ${stock} (${isUs ? 'Pasar US' : 'Pasar ID'})`;
    }
    case 'trade.updated': {
      const stock = m.stockCode ? `saham ${m.stockCode}` : `ID: ${log.target_id}`;
      const fields = Array.isArray(m.fieldsUpdated) && m.fieldsUpdated.length > 0 ? ` (${m.fieldsUpdated.join(', ')})` : '';
      return `${actorStr} memperbarui data transaksi ${stock}${fields}`;
    }
    case 'trade.deleted': {
      const stock = m.stockCode ? `saham ${m.stockCode}` : `ID: ${log.target_id}`;
      return `${actorStr} menghapus transaksi ${stock}`;
    }
    case 'trade.batch_updated':
      return `${actorStr} memperbarui ${m.count || ''} transaksi saham secara massal`;
    case 'trade.batch_deleted':
      return `${actorStr} menghapus ${m.count || ''} transaksi saham secara massal`;

    // === WATCHLIST ===
    case 'watchlist.created':
      return `${actorStr} menambahkan saham ${m.stockCode || log.target_id} ke Watchlist`;
    case 'watchlist.updated':
      return `${actorStr} memperbarui Watchlist saham ${m.stockCode || log.target_id}`;
    case 'watchlist.deleted':
      return `${actorStr} menghapus saham ${m.stockCode || log.target_id} dari Watchlist`;

    // === NOTES ===
    case 'note.created':
      return `${actorStr} membuat catatan baru "${m.title || m.stockCode || 'Tanpa Judul'}"`;
    case 'note.updated':
      return `${actorStr} mengedit catatan "${m.title || log.target_id}"`;
    case 'note.deleted':
      return `${actorStr} menghapus catatan "${m.title || log.target_id}"`;

    // === CASHFLOW ===
    case 'cashflow.created': {
      const flowType = m.type === 'in' ? 'Masuk' : m.type === 'out' ? 'Keluar' : '';
      const amt = m.amount ? ` sebesar ${formatAmount(m.amount, currency)}` : '';
      const cat = m.category ? ` (${m.category})` : '';
      return `${actorStr} mencatat arus kas ${flowType}${amt}${cat}`;
    }
    case 'cashflow.updated': {
      const amt = m.amount ? ` (${formatAmount(m.amount, currency)})` : '';
      return `${actorStr} mengubah entri cashflow${amt}`;
    }
    case 'cashflow.deleted': {
      const amt = m.amount ? ` (${formatAmount(m.amount, currency)})` : '';
      return `${actorStr} menghapus entri cashflow${amt}`;
    }

    // === DIVIDEND ===
    case 'dividend.created': {
      const stock = m.stockCode ? ` saham ${m.stockCode}` : '';
      const amt = m.totalAmount || m.amount ? ` sebesar ${formatAmount(m.totalAmount || m.amount, currency)}` : '';
      return `${actorStr} mencatat penerimaan dividen${stock}${amt}`;
    }
    case 'dividend.updated':
      return `${actorStr} memperbarui catatan dividen ${m.stockCode || ''}`;
    case 'dividend.deleted':
      return `${actorStr} menghapus catatan dividen ${m.stockCode || ''}`;

    // === ASSETS ===
    case 'asset.created': {
      const name = m.name || log.target_id;
      const amt = m.purchasePrice || m.currentValue ? ` senilai ${formatAmount(m.purchasePrice || m.currentValue)}` : '';
      return `${actorStr} menambah aset inventaris "${name}"${amt}`;
    }
    case 'asset.updated':
      return `${actorStr} mengedit data aset "${m.name || log.target_id}"`;
    case 'asset.deleted':
      return `${actorStr} menghapus aset "${m.name || log.target_id}"`;
    case 'asset.batch_created':
      return `${actorStr} menambahkan ${m.count || ''} item aset secara massal`;
    case 'asset.batch_deleted':
      return `${actorStr} menghapus ${m.count || ''} item aset secara massal`;

    // === FINANCE ACCOUNTS ===
    case 'finance_account.created': {
      const name = m.name || log.target_id;
      const inst = m.institutionName ? ` (${m.institutionName})` : '';
      return `${actorStr} menambahkan rekening keuangan "${name}"${inst}`;
    }
    case 'finance_account.updated':
      return `${actorStr} mengedit rekening keuangan "${m.name || log.target_id}"`;
    case 'finance_account.deleted':
      return `${actorStr} menghapus rekening keuangan "${m.name || log.target_id}"`;

    // === FINANCE TRANSACTIONS & TRANSFERS ===
    case 'finance_transaction.created': {
      const typeLabel = m.type === 'income' ? 'Pemasukan' : m.type === 'expense' ? 'Pengeluaran' : m.type || 'Transaksi';
      const amt = m.amount ? ` sebesar ${formatAmount(m.amount, currency)}` : '';
      const acc = m.accountName ? ` pada rekening ${m.accountName}` : '';
      return `${actorStr} mencatat ${typeLabel}${amt}${acc}`;
    }
    case 'finance_transaction.updated':
      return `${actorStr} memperbarui data transaksi keuangan`;
    case 'finance_transaction.deleted':
      return `${actorStr} menghapus data transaksi keuangan`;

    case 'finance_transfer.created': {
      const amt = m.amount ? ` sebesar ${formatAmount(m.amount)}` : '';
      const from = m.fromAccountName ? ` dari ${m.fromAccountName}` : '';
      const to = m.toAccountName ? ` ke ${m.toAccountName}` : '';
      return `${actorStr} melakukan transfer antar rekening${amt}${from}${to}`;
    }
    case 'finance_portfolio_transfer.created': {
      const amt = m.amount ? ` sebesar ${formatAmount(m.amount)}` : '';
      const acc = m.accountName ? ` dari ${m.accountName}` : '';
      const port = m.portfolioName ? ` ke portofolio ${m.portfolioName}` : '';
      return `${actorStr} melakukan deposit / transfer ke dompet trading${amt}${acc}${port}`;
    }
    case 'portfolio_finance_transfer.created': {
      const amt = m.amount ? ` sebesar ${formatAmount(m.amount)}` : '';
      const port = m.portfolioName ? ` dari portofolio ${m.portfolioName}` : '';
      const acc = m.accountName ? ` ke ${m.accountName}` : '';
      return `${actorStr} melakukan penarikan dana dari dompet trading${amt}${port}${acc}`;
    }

    // === PORTFOLIO ===
    case 'portfolio.created':
      return `${actorStr} membuat portofolio baru "${m.name || log.target_id}"`;
    case 'portfolio.updated':
      return `${actorStr} mengubah data portofolio "${m.name || log.target_id}"`;
    case 'portfolio.deleted':
      return `${actorStr} menghapus portofolio "${m.name || log.target_id}"`;

    // === TRADING PLAN & BSJP & IPO ===
    case 'trading_plan.created':
      return `${actorStr} membuat trading plan saham ${m.stockCode || log.target_id}`;
    case 'trading_plan.updated':
      return `${actorStr} mengedit trading plan saham ${m.stockCode || log.target_id}`;
    case 'trading_plan.deleted':
      return `${actorStr} menghapus trading plan saham ${m.stockCode || log.target_id}`;
    case 'bsjp_trade.created':
      return `${actorStr} mencatat transaksi BSJP saham ${m.stockCode || log.target_id}`;
    case 'bsjp_trade.updated':
      return `${actorStr} memperbarui transaksi BSJP saham ${m.stockCode || log.target_id}`;
    case 'bsjp_trade.deleted':
      return `${actorStr} menghapus transaksi BSJP saham ${m.stockCode || log.target_id}`;
    case 'ipo_event.created':
      return `${actorStr} menambahkan event IPO ${m.stockCode || m.companyName || log.target_id}`;
    case 'ipo_event.updated':
      return `${actorStr} memperbarui event IPO ${m.stockCode || log.target_id}`;
    case 'ipo_event.deleted':
      return `${actorStr} menghapus event IPO ${m.stockCode || log.target_id}`;

    // === SETTINGS & PROFILE & ADMIN ===
    case 'settings.updated':
      return `${actorStr} memperbarui konfigurasi / pengaturan aplikasi`;
    case 'settings.registration_updated':
      return `${actorStr} mengubah akses pendaftaran pengguna (${m.allowRegistration ? 'Diizinkan / Terbuka' : 'Ditutup'})`;
    case 'profile.display_name_updated':
      return `${actorStr} mengubah nama profil menjadi "${m.displayName || ''}"`;
    case 'profile.role_updated':
      return `${actorStr} mengubah role user menjadi "${m.newRole || ''}"`;
    case 'admin.user_created':
      return `${actorStr} membuat user baru (${m.email || log.target_id})`;
    case 'workspace.created':
      return `${actorStr} membuat workspace "${m.name || log.target_id}"`;
    case 'data.exported':
      return `${actorStr} melakukan ekspor seluruh data jurnal ke file JSON`;
    case 'data.imported':
      return `${actorStr} melakukan impor data jurnal dari file JSON`;
    case 'data.cleared':
      return `${actorStr} menghapus seluruh data jurnal`;
    case 'shared_access.upserted':
      return `${actorStr} menambahkan / memperbarui hak akses berbagi laporan`;
    case 'shared_access.revoked':
      return `${actorStr} mencabut hak akses berbagi laporan`;
    case 'report_share.created':
      return `${actorStr} membuat link publik untuk laporan "${m.title || ''}"`;
    case 'report_share.deleted':
      return `${actorStr} menghapus link publik laporan`;

    default:
      return `${actorStr} melakukan ${getAuditActionLabel(action)} pada ${getAuditTargetTypeLabel(log.target_type)}`;
  }
}

export function formatMetadataKey(key: string): string {
  const customLabels: Record<string, string> = {
    stockCode: 'Kode Saham',
    market: 'Pasar',
    portfolioId: 'Portofolio ID',
    portfolioName: 'Portofolio',
    accountId: 'Rekening ID',
    accountName: 'Rekening',
    fromAccountId: 'Rekening Asal ID',
    fromAccountName: 'Rekening Asal',
    toAccountId: 'Rekening Tujuan ID',
    toAccountName: 'Rekening Tujuan',
    amount: 'Jumlah Nominal',
    targetAmount: 'Nominal Tujuan',
    targetUsdAmount: 'Nominal USD',
    exchangeRate: 'Kurs Kursus/USD',
    fieldsUpdated: 'Field Diubah',
    dateBuy: 'Tanggal Beli',
    dateSell: 'Tanggal Jual',
    isClosed: 'Status Selesai',
    category: 'Kategori',
    institutionName: 'Nama Lembaga/Bank',
    type: 'Tipe',
    name: 'Nama',
    title: 'Judul',
    totalAmount: 'Total Nominal',
    fields: 'Field Terpengaruh',
    count: 'Jumlah Data',
    deletedTransactionCount: 'Jumlah Transaksi Terhapus',
    unlinkedPortfolioCount: 'Portofolio Terlepas',
    allowRegistration: 'Izinkan Pendaftaran',
  };

  if (customLabels[key]) return customLabels[key];

  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, c => c.toUpperCase());
}

export function formatMetadataValue(key: string, value: any): string {
  if (value == null || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'Ya' : 'Tidak';
  if (Array.isArray(value)) return value.length === 0 ? '-' : value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);

  // Formatting currency fields
  const lowerKey = key.toLowerCase();
  if (typeof value === 'number' && (lowerKey.includes('amount') || lowerKey.includes('price') || lowerKey.includes('capital') || lowerKey.includes('balance'))) {
    if (lowerKey.includes('usd')) {
      return formatAmount(value, 'USD');
    }
    return formatAmount(value, 'IDR');
  }

  return String(value);
}
