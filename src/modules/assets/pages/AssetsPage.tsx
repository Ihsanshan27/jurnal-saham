// @ts-nocheck
import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  TrendingUp,
  TrendingDown,
  Landmark,
  Coins,
  Laptop,
  Car,
  Home,
  Receipt,
  Bitcoin,
  Key,
  Box,
  Armchair,
  Search,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useData } from '@/modules/shared/context/DataContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import StatCard from '@/modules/shared/components/StatCard';
import CurrencyInput from '@/modules/shared/components/CurrencyInput';
import CustomSelect from '@/modules/shared/components/CustomSelect';
import CustomDatePicker from '@/modules/shared/components/CustomDatePicker';
import AccessDenied from '@/modules/shared/components/AccessDenied';
import {
  ASSET_CATEGORY_LABELS,
  ASSET_GROUP_LABELS,
  ASSET_STATUS_LABELS,
  calculateAssetSummary,
} from '@/modules/assets/types/assets';
import { formatRupiah, formatPercent, formatDate } from '@/modules/shared/utils/formatters';

// ─── Icon map ──────────────────────────────────────────────────────────────
const CATEGORY_ICONS = {
  gold: Coins,
  deposit: Landmark,
  crypto: Bitcoin,
  real_estate: Home,
  receivable: Receipt,
  it_equipment: Laptop,
  vehicle: Car,
  furniture: Armchair,
  software_license: Key,
  other: Box,
};

// ─── Select options ────────────────────────────────────────────────────────
const GROUP_OPTIONS = Object.entries(ASSET_GROUP_LABELS).map(([value, label]) => ({ value, label }));
const CATEGORY_OPTIONS = Object.entries(ASSET_CATEGORY_LABELS).map(([value, meta]) => ({ value, label: meta.label }));
const STATUS_OPTIONS = Object.entries(ASSET_STATUS_LABELS).map(([value, meta]) => ({ value, label: meta.label }));

const EMPTY_FORM = {
  name: '',
  code: '',
  group: 'investment',
  category: 'gold',
  purchaseDate: new Date().toISOString().split('T')[0],
  unitPrice: 0,
  purchasePrice: 0,
  currentUnitPrice: 0,
  currentValue: 0,
  quantity: 1,
  unit: 'unit',
  pic: '',
  serialNumber: '',
  warrantyExpiry: '',
  depreciationRateYearly: 0,
  notes: '',
  status: 'active',
};

function generateAssetCode(assets) {
  const list = Array.isArray(assets) ? assets : [];
  const year = new Date().getFullYear();
  const prefix = `AST-${year}-`;
  const existing = list
    .map((a) => a?.code)
    .filter((c) => c && c.startsWith(prefix))
    .map((c) => parseInt(c.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

// ─── Status Badge ──────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const meta = ASSET_STATUS_LABELS[status];
  if (!meta) return null;

  const styleMap = {
    'badge-green': { background: 'rgba(16,185,129,0.15)', color: 'var(--accent-green)' },
    'badge-yellow': { background: 'rgba(245,158,11,0.15)', color: 'var(--accent-yellow)' },
    'badge-blue': { background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)' },
    'badge-red': { background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)' },
  };
  const badgeStyle = styleMap[meta.badge] || { background: 'rgba(107,114,128,0.15)', color: 'var(--text-secondary)' };

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 10px', borderRadius: 999,
      fontSize: '0.75rem', fontWeight: 600,
      ...badgeStyle,
    }}>
      {meta.label}
    </span>
  );
}

// ─── Asset Modal ───────────────────────────────────────────────────────────
function AssetModal({ isOpen, editItem, assets, onClose, onSave }) {
  const isEdit = Boolean(editItem);

  const getInitialForm = () =>
    editItem ? { ...editItem } : { ...EMPTY_FORM, code: generateAssetCode(assets) };

  const [form, setForm] = useState(getInitialForm);

  // Sync form when editItem changes (e.g. switching between edit targets)
  useEffect(() => {
    setForm(getInitialForm());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItem]);

  const set = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const handleCategoryChange = (cat) => {
    const group = ASSET_CATEGORY_LABELS[cat]?.group || 'investment';
    setForm((prev) => ({ ...prev, category: cat, group }));
  };

  const handleQuantityChange = (qtyVal) => {
    const qty = parseFloat(qtyVal) || 0;
    setForm((prev) => {
      const uPrice = prev.unitPrice || (qty > 0 && prev.purchasePrice ? prev.purchasePrice / qty : 0);
      const currUPrice = prev.currentUnitPrice || (qty > 0 && prev.currentValue ? prev.currentValue / qty : 0);
      const totalP = uPrice * qty;
      const totalCurr = currUPrice * qty;
      return {
        ...prev,
        quantity: qty,
        unitPrice: uPrice,
        purchasePrice: totalP,
        currentUnitPrice: currUPrice,
        currentValue: totalCurr > 0 ? totalCurr : (prev.currentValue || totalP),
      };
    });
  };

  const handleUnitPriceChange = (valStr) => {
    const uPrice = parseFloat(valStr) || 0;
    setForm((prev) => {
      const qty = prev.quantity || 1;
      const totalP = uPrice * qty;
      const currUPrice = prev.currentUnitPrice ? prev.currentUnitPrice : uPrice;
      const totalCurr = currUPrice * qty;
      return {
        ...prev,
        unitPrice: uPrice,
        purchasePrice: totalP,
        currentUnitPrice: currUPrice,
        currentValue: totalCurr,
      };
    });
  };

  const handlePurchasePriceChange = (valStr) => {
    const totalP = parseFloat(valStr) || 0;
    setForm((prev) => {
      const qty = prev.quantity || 1;
      const uPrice = qty > 0 ? totalP / qty : totalP;
      return {
        ...prev,
        purchasePrice: totalP,
        unitPrice: uPrice,
        currentValue: prev.currentValue || totalP,
        currentUnitPrice: prev.currentUnitPrice || uPrice,
      };
    });
  };

  const handleCurrentUnitPriceChange = (valStr) => {
    const currUPrice = parseFloat(valStr) || 0;
    setForm((prev) => {
      const qty = prev.quantity || 1;
      const totalCurr = currUPrice * qty;
      return {
        ...prev,
        currentUnitPrice: currUPrice,
        currentValue: totalCurr,
      };
    });
  };

  const handleCurrentValueChange = (valStr) => {
    const totalCurr = parseFloat(valStr) || 0;
    setForm((prev) => {
      const qty = prev.quantity || 1;
      const currUPrice = qty > 0 ? totalCurr / qty : totalCurr;
      return {
        ...prev,
        currentValue: totalCurr,
        currentUnitPrice: currUPrice,
      };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: 680, width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Aset / Inventaris' : 'Tambah Aset / Inventaris'}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          <form id="asset-form" onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

              {/* Name */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">
                  Nama Aset / Item <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Contoh: Emas Antam 50gr, MacBook Pro M3..."
                  value={form.name || ''}
                  onChange={(e) => set('name', e.target.value)}
                  required
                />
              </div>

              {/* Code */}
              <div className="form-group">
                <label className="form-label">Kode Aset</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.code || ''}
                  onChange={(e) => set('code', e.target.value)}
                  placeholder="AST-2026-001"
                />
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label">Status</label>
                <CustomSelect
                  options={STATUS_OPTIONS}
                  value={form.status || 'active'}
                  onChange={(v) => set('status', v)}
                />
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="form-label">
                  Kategori <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <CustomSelect
                  options={CATEGORY_OPTIONS}
                  value={form.category || 'gold'}
                  onChange={(v) => handleCategoryChange(v)}
                />
              </div>

              {/* Group (auto from category, read-only) */}
              <div className="form-group">
                <label className="form-label">Kelompok</label>
                <input
                  type="text"
                  className="form-input"
                  readOnly
                  style={{ opacity: 0.7, cursor: 'default' }}
                  value={ASSET_GROUP_LABELS[form.group] || ''}
                />
              </div>

              {/* Purchase Date */}
              <div className="form-group">
                <label className="form-label">
                  Tanggal Perolehan <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <CustomDatePicker
                  value={form.purchaseDate || ''}
                  onChange={(v) => set('purchaseDate', v)}
                />
              </div>

              {/* Quantity + Unit */}
              <div className="form-group">
                <label className="form-label">Jumlah &amp; Satuan</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    className="form-input"
                    style={{ width: '60%' }}
                    min={0}
                    step="any"
                    value={form.quantity ?? 1}
                    onChange={(e) => handleQuantityChange(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '40%' }}
                    placeholder="unit / gram"
                    value={form.unit || ''}
                    onChange={(e) => set('unit', e.target.value)}
                  />
                </div>
              </div>

              {/* Unit Purchase Price */}
              <div className="form-group">
                <label className="form-label">Harga Satuan Perolehan (Rp)</label>
                <CurrencyInput
                  market="ID"
                  placeholder="0"
                  value={form.unitPrice ?? ''}
                  onChange={handleUnitPriceChange}
                />
              </div>

              {/* Total Purchase Price */}
              <div className="form-group">
                <label className="form-label">
                  Total Harga Perolehan (Rp) <span style={{ color: 'var(--accent-red)' }}>*</span>
                </label>
                <CurrencyInput
                  market="ID"
                  value={form.purchasePrice ?? ''}
                  onChange={handlePurchasePriceChange}
                />
              </div>

              {/* Current Unit Price */}
              <div className="form-group">
                <label className="form-label">Harga Satuan Saat Ini (Rp)</label>
                <CurrencyInput
                  market="ID"
                  placeholder="0"
                  value={form.currentUnitPrice ?? ''}
                  onChange={handleCurrentUnitPriceChange}
                />
              </div>

              {/* Total Current Value */}
              <div className="form-group">
                <label className="form-label">Total Nilai Saat Ini (Rp)</label>
                <CurrencyInput
                  market="ID"
                  value={form.currentValue ?? ''}
                  onChange={handleCurrentValueChange}
                />
              </div>

              {/* PIC */}
              <div className="form-group">
                <label className="form-label">PIC / Lokasi</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Penanggung jawab / lokasi"
                  value={form.pic || ''}
                  onChange={(e) => set('pic', e.target.value)}
                />
              </div>

              {/* Serial Number */}
              <div className="form-group">
                <label className="form-label">Serial Number / No. Sertifikat</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Opsional"
                  value={form.serialNumber || ''}
                  onChange={(e) => set('serialNumber', e.target.value)}
                />
              </div>

              {/* Warranty */}
              <div className="form-group">
                <label className="form-label">Garansi s.d.</label>
                <CustomDatePicker
                  value={form.warrantyExpiry || ''}
                  onChange={(v) => set('warrantyExpiry', v)}
                />
              </div>

              {/* Depreciation */}
              <div className="form-group">
                <label className="form-label">Penyusutan / Tahun (%)</label>
                <input
                  type="number"
                  className="form-input"
                  min={0}
                  max={100}
                  step="0.1"
                  placeholder="0"
                  value={form.depreciationRateYearly ?? ''}
                  onChange={(e) => set('depreciationRateYearly', parseFloat(e.target.value) || 0)}
                />
              </div>

              {/* Notes */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Catatan</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Keterangan tambahan..."
                  value={form.notes || ''}
                  onChange={(e) => set('notes', e.target.value)}
                />
              </div>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button type="submit" form="asset-form" className="btn btn-primary">
            {isEdit ? 'Simpan Perubahan' : 'Tambah Aset'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function AssetsPage() {
  const { assets, addAsset, updateAsset, deleteAsset, showToast } = useData();
  const rawAssets = useMemo(() => (Array.isArray(assets) ? assets : []), [assets]);
  const { isAdmin, roleLabel } = usePermissions();

  // ── All useState hooks first ─────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortKey, setSortKey] = useState('purchaseDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  // ── All useMemo hooks (must be before any early return) ──────────────────
  const summary = useMemo(() => calculateAssetSummary(rawAssets), [rawAssets]);

  const filtered = useMemo(() => {
    let list = [...rawAssets];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name?.toLowerCase().includes(q) ||
          a.code?.toLowerCase().includes(q) ||
          a.pic?.toLowerCase().includes(q)
      );
    }
    if (filterGroup !== 'all') list = list.filter((a) => a.group === filterGroup);
    if (filterStatus !== 'all') list = list.filter((a) => a.status === filterStatus);

    list.sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av;
      return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return list;
  }, [rawAssets, search, filterGroup, filterStatus, sortKey, sortAsc]);

  // ── Guard (after all hooks) ──────────────────────────────────────────────
  if (!isAdmin) {
    return <AccessDenied roleLabel={roleLabel} message="Halaman Aset & Inventaris hanya bisa diakses oleh Admin." />;
  }

  // ── Derived values ───────────────────────────────────────────────────────
  const totalActive = rawAssets.filter((a) => a.status === 'active').length;
  const totalInvestment = rawAssets.filter((a) => a.group === 'investment' && a.status !== 'disposed').length;
  const totalInventory = rawAssets.filter((a) => a.group === 'office_inventory' && a.status !== 'disposed').length;
  const gainLossColor = summary.totalGainLoss >= 0 ? 'text-profit' : 'text-loss';
  const GainLossIcon = summary.totalGainLoss >= 0 ? TrendingUp : TrendingDown;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleOpenAdd = () => { setEditItem(null); setModalOpen(true); };
  const handleOpenEdit = (item) => { setEditItem(item); setModalOpen(true); };
  const handleCloseModal = () => { setModalOpen(false); setEditItem(null); };

  const handleSave = (data) => {
    if (editItem) {
      updateAsset(editItem.id, data);
    } else {
      addAsset(data);
    }
    handleCloseModal();
  };

  const handleDelete = (id) => {
    deleteAsset(id);
    setDeleteConfirmId(null);
    showToast('Aset berhasil dihapus', 'success');
  };

  const toggleSort = (key) => {
    if (sortKey === key) setSortAsc((prev) => !prev);
    else { setSortKey(key); setSortAsc(true); }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return null;
    return sortAsc ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
  };

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Aset &amp; Inventaris</h1>
          <p className="page-subtitle">Kelola aset investasi pribadi dan inventaris peralatan kantor</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleOpenAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Plus size={16} /> Tambah Aset
        </button>
      </div>

      {/* Bento Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard
          icon={Package}
          label="Total Aset Aktif"
          value={String(totalActive)}
          subValue={`${totalInvestment} investasi · ${totalInventory} inventaris`}
          bgColor="rgba(139,92,246,0.15)"
        />
        <StatCard
          icon={Landmark}
          label="Total Harga Perolehan"
          value={formatRupiah(summary.totalPurchaseCost)}
          bgColor="rgba(59,130,246,0.15)"
        />
        <StatCard
          icon={Coins}
          label="Total Nilai Saat Ini"
          value={formatRupiah(summary.totalCurrentValue)}
          bgColor="rgba(16,185,129,0.15)"
          colorClass="text-profit"
        />
        <StatCard
          icon={GainLossIcon}
          label="Unrealized Gain / Loss"
          value={`${summary.totalGainLoss >= 0 ? '+' : ''}${formatRupiah(summary.totalGainLoss)}`}
          subValue={formatPercent(summary.gainLossPercent)}
          colorClass={gainLossColor}
          bgColor={summary.totalGainLoss >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}
        />
        <StatCard
          icon={Home}
          label="Nilai Investasi"
          value={formatRupiah(summary.investmentValue)}
          bgColor="rgba(245,158,11,0.15)"
        />
        <StatCard
          icon={Laptop}
          label="Nilai Inventaris Kantor"
          value={formatRupiah(summary.inventoryValue)}
          bgColor="rgba(107,114,128,0.15)"
        />
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-body" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: 32 }}
              placeholder="Cari nama, kode, PIC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ flex: '0 1 200px' }}>
            <CustomSelect
              options={[{ value: 'all', label: 'Semua Kelompok' }, ...GROUP_OPTIONS]}
              value={filterGroup}
              onChange={(v) => setFilterGroup(v)}
            />
          </div>
          <div style={{ flex: '0 1 180px' }}>
            <CustomSelect
              options={[{ value: 'all', label: 'Semua Status' }, ...STATUS_OPTIONS]}
              value={filterStatus}
              onChange={(v) => setFilterStatus(v)}
            />
          </div>
          {(search || filterGroup !== 'all' || filterStatus !== 'all') && (
            <button
              className="btn btn-ghost"
              style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}
              onClick={() => { setSearch(''); setFilterGroup('all'); setFilterStatus('all'); }}
            >
              <X size={14} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 0' }}>
              <Package size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
              <div className="empty-state-title">Belum ada aset</div>
              <div className="empty-state-desc">Klik "Tambah Aset" untuk mulai mencatat.</div>
              <button
                className="btn btn-primary"
                style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                onClick={handleOpenAdd}
              >
                <Plus size={14} /> Tambah Aset
              </button>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('name')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Nama <SortIcon col="name" />
                    </span>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('category')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Kategori <SortIcon col="category" />
                    </span>
                  </th>
                  <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('purchaseDate')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Tanggal <SortIcon col="purchaseDate" />
                    </span>
                  </th>
                  <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('purchasePrice')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      Harga Perolehan <SortIcon col="purchasePrice" />
                    </span>
                  </th>
                  <th style={{ textAlign: 'right', cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort('currentValue')}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      Nilai Saat Ini <SortIcon col="currentValue" />
                    </span>
                  </th>
                  <th style={{ textAlign: 'right' }}>G/L</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => {
                  const CatIcon = CATEGORY_ICONS[item.category] || Box;
                  const catMeta = ASSET_CATEGORY_LABELS[item.category];
                  const gl = (item.currentValue || 0) - (item.purchasePrice || 0);
                  const glPct = (item.purchasePrice || 0) > 0 ? (gl / item.purchasePrice) * 100 : 0;
                  const isExpanded = expandedRow === item.id;

                  return (
                    <React.Fragment key={item.id}>
                      {/* Main row */}
                      <tr
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpandedRow(isExpanded ? null : item.id)}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: item.group === 'investment' ? 'rgba(245,158,11,0.15)' : 'rgba(59,130,246,0.15)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              color: item.group === 'investment' ? 'var(--accent-yellow)' : 'var(--accent-blue)',
                              flexShrink: 0,
                            }}>
                              <CatIcon size={16} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {item.code} · {item.quantity} {item.unit}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontSize: '0.82rem' }}>{catMeta?.label || item.category}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {ASSET_GROUP_LABELS[item.group]}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {formatDate(item.purchaseDate)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                          {formatRupiah(item.purchasePrice)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                          {formatRupiah(item.currentValue || item.purchasePrice)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span
                            className={gl >= 0 ? 'text-profit' : 'text-loss'}
                            style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.85rem' }}
                          >
                            {gl >= 0 ? '+' : ''}{formatRupiah(gl)}
                            <br />
                            <span style={{ fontSize: '0.72rem' }}>{formatPercent(glPct)}</span>
                          </span>
                        </td>
                        <td><StatusBadge status={item.status} /></td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '4px 8px' }}
                              title="Edit"
                              onClick={() => handleOpenEdit(item)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className="btn btn-ghost"
                              style={{ padding: '4px 8px', color: 'var(--accent-red)' }}
                              title="Hapus"
                              onClick={() => setDeleteConfirmId(item.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} style={{ padding: 0, background: 'var(--bg-secondary)' }}>
                            <div style={{
                              padding: '12px 20px',
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                              gap: 12,
                              fontSize: '0.82rem',
                            }}>
                              {item.pic && (
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>PIC / Lokasi: </span>
                                  <strong>{item.pic}</strong>
                                </div>
                              )}
                              {item.serialNumber && (
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>Serial / Sertifikat: </span>
                                  <strong>{item.serialNumber}</strong>
                                </div>
                              )}
                              {item.warrantyExpiry && (
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>Garansi s.d.: </span>
                                  <strong>{formatDate(item.warrantyExpiry)}</strong>
                                </div>
                              )}
                              {item.depreciationRateYearly > 0 && (
                                <div>
                                  <span style={{ color: 'var(--text-muted)' }}>Penyusutan/Thn: </span>
                                  <strong>{item.depreciationRateYearly}%</strong>
                                </div>
                              )}
                              {item.notes && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Catatan: </span>
                                  {item.notes}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {filtered.length > 0 && (
          <div className="card-footer" style={{
            display: 'flex', justifyContent: 'space-between',
            color: 'var(--text-muted)', fontSize: '0.82rem', padding: '10px 16px',
          }}>
            <span>Menampilkan <strong>{filtered.length}</strong> dari <strong>{assets.length}</strong> aset</span>
            <span>Klik baris untuk detail</span>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <AssetModal
          isOpen={modalOpen}
          editItem={editItem}
          assets={rawAssets}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmId && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Hapus Aset</h2>
              <button className="modal-close" onClick={() => setDeleteConfirmId(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)' }}>
                Yakin ingin menghapus aset ini? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setDeleteConfirmId(null)}>Batal</button>
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(deleteConfirmId)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 size={14} /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
