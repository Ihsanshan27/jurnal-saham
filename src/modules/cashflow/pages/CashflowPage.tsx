import { useState, useEffect } from "react";
import { useData } from "@/modules/shared/context/DataContext";
import { useDialog } from "@/modules/shared/context/DialogContext";
import SortableTableHeader from "@/modules/shared/components/SortableTableHeader";
import { useTableSort } from "@/modules/shared/hooks/useTableSort";
import {
  calculatePortfolioAssetMetrics,
  generateLedgerEntries,
} from "@/modules/trades/calculations";
import SelectionToggleCard from "@/modules/shared/components/SelectionToggleCard";
import {
  formatRupiah,
  formatUSD,
  formatDate,
} from "@/modules/shared/utils/formatters";
import {
  Coins,
  Plus,
  X,
  Trash2,
  Save,
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
} from "lucide-react";
import CurrencyInput from "@/modules/shared/components/CurrencyInput";
import CustomSelect from "@/modules/shared/components/CustomSelect";
import CustomDatePicker from "@/modules/shared/components/CustomDatePicker";
import { format } from "date-fns";

export default function CashflowPage() {
  const {
    trades,
    cashflows,
    dividends,
    marketPrices,
    addCashflow,
    updateCashflow,
    deleteCashflow,
    settings,
    cashflowFormDraft,
    setCashflowFormDraft,
    financeAccounts,
    financeTransactions,
    createFinancePortfolioTransfer,
    createPortfolioToFinanceTransfer,
    activePortfolioId,
    showToast,
  } = useData();
  const { confirm } = useDialog();
  const createInitialForm = () => ({
    type: "deposit",
    amount: cashflowFormDraft?.amount ?? "",
    date: cashflowFormDraft?.date ?? new Date().toISOString().split("T")[0],
    notes: cashflowFormDraft?.notes ?? "",
    linkToFinance: false,
    financeAccountId: "",
  });

  const [activeTab, setActiveTab] = useState(() => {
    if (cashflowFormDraft && cashflowFormDraft.activeTab)
      return cashflowFormDraft.activeTab;
    return "ID";
  });

  const [showForm, setShowForm] = useState(() => {
    if (cashflowFormDraft) return cashflowFormDraft.showForm;
    return false;
  });

  const [form, setForm] = useState(() => {
    if (cashflowFormDraft) return cashflowFormDraft.form;
    return createInitialForm();
  });

  const [editingId, setEditingId] = useState<string | null>(
    () => cashflowFormDraft?.editingId || null,
  );
  const [viewMode, setViewMode] = useState<"manual" | "ledger">("manual");

  useEffect(() => {
    setCashflowFormDraft({ form, showForm, activeTab, editingId });
  }, [form, showForm, activeTab, editingId, setCashflowFormDraft]);

  const isUS = activeTab === "US";
  const formatMoney = isUS ? formatUSD : formatRupiah;

  const initCap = isUS
    ? (settings.initialCapitalUS ?? 1000)
    : (settings.initialCapital ?? 10000000);
  const balance = calculatePortfolioAssetMetrics(
    trades,
    cashflows,
    dividends,
    initCap,
    marketPrices,
    activeTab,
  );
  const ledgerEntries = generateLedgerEntries(
    trades,
    cashflows,
    dividends,
    initCap,
    activeTab,
  );

  const filteredCashflows = cashflows.filter(
    (cf: any) => cf.market === activeTab || (!cf.market && activeTab === "ID"),
  );
  const {
    sortConfig,
    sortedItems: sortedCashflows,
    requestSort,
  } = useTableSort(filteredCashflows, {
    initialKey: "createdAt",
    initialDirection: "desc",
    getValue: (item: any, key: string) =>
      item[key] || "",
    tieBreaker: (a: any, b: any) =>
      new Date(b.createdAt || b.date).getTime() -
      new Date(a.createdAt || a.date).getTime(),
  });

  const set = (k: string, v: string) =>
    setForm((prev) => ({ ...prev, [k]: v }));
  const resetForm = () => {
    setForm(createInitialForm());
    setEditingId(null);
    setShowForm(false);
    setCashflowFormDraft(null);
  };

  const handleCancelOrToggle = () => {
    if (showForm) {
      resetForm();
    } else {
      setEditingId(null);
      setForm(createInitialForm());
      setShowForm(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || !form.date) return;
    const payload = {
      ...form,
      market: activeTab,
      amount: parseFloat(form.amount),
    };

    if (editingId) {
      updateCashflow(editingId, payload);
    } else {
      if (form.linkToFinance && form.financeAccountId) {
        if (form.type === "deposit") {
          createFinancePortfolioTransfer({
            accountId: form.financeAccountId,
            amount: payload.amount,
            date: payload.date,
            description: payload.notes || "Deposit RDN",
            portfolioId: activePortfolioId
          });
        } else {
          createPortfolioToFinanceTransfer({
            accountId: form.financeAccountId,
            amount: payload.amount,
            date: payload.date,
            description: payload.notes || "Withdraw RDN",
            portfolioId: activePortfolioId
          });
        }
      } else {
        addCashflow(payload);
      }
    }

    resetForm();
  };

  const handleEdit = (cashflow: any) => {
    setEditingId(cashflow.id);
    setShowForm(true);
    setForm({
      type: cashflow.type || "deposit",
      amount: cashflow.amount ? String(cashflow.amount) : "",
      date: cashflow.date || new Date().toISOString().split("T")[0],
      notes: cashflow.notes || "",
      linkToFinance: false,
      financeAccountId: "",
    });
    setActiveTab(cashflow.market || "ID");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm(
      "Apakah Anda yakin ingin membatalkan transaksi kas ini?",
      {
        title: "Batalkan Transaksi Kas",
        severity: "danger",
        confirmText: "Batalkan",
      },
    );
    if (isConfirmed) {
      deleteCashflow(id);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="text-zinc-600 dark:text-zinc-400">
            <Coins size={28} />
          </div>
          <div>
            <h1 className="page-title">Cash Balance & RDN</h1>
            <p className="page-subtitle">
              Kelola deposit, penarikan, dan monitor buying power Anda
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleCancelOrToggle}>
          {showForm ? (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <X size={16} />
              Batal
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Plus size={16} />
              Catat Cashflow
            </span>
          )}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 24,
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <button
          className={`tab-btn ${activeTab === "ID" ? "active" : ""}`}
          style={{
            padding: "8px 16px",
            background: "none",
            border: "none",
            borderBottom:
              activeTab === "ID"
                ? "2px solid var(--accent-blue)"
                : "2px solid transparent",
            color:
              activeTab === "ID"
                ? "var(--accent-blue)"
                : "var(--text-secondary)",
            cursor: "pointer",
            fontWeight: 600,
          }}
          onClick={() => {
            setActiveTab("ID");
            setShowForm(false);
          }}
        >
          Pasar Indonesia (IDR)
        </button>
        <button
          className={`tab-btn ${activeTab === "US" ? "active" : ""}`}
          style={{
            padding: "8px 16px",
            background: "none",
            border: "none",
            borderBottom:
              activeTab === "US"
                ? "2px solid var(--accent-blue)"
                : "2px solid transparent",
            color:
              activeTab === "US"
                ? "var(--accent-blue)"
                : "var(--text-secondary)",
            cursor: "pointer",
            fontWeight: 600,
          }}
          onClick={() => {
            setActiveTab("US");
            setShowForm(false);
          }}
        >
          Pasar Amerika (USD)
        </button>
      </div>

      <div
        className="grid-stats"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          marginBottom: 24,
        }}
      >
        <div className="stat-card">
          <div className="stat-card-label">Total Asset</div>
          <div
            className="stat-card-value"
            style={{ color: "var(--accent-blue)" }}
          >
            {formatMoney(balance.totalAsset)}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Realized P/L</div>
          <div
            className={`stat-card-value ${balance.realizedPnL >= 0 ? "text-profit" : "text-loss"}`}
          >
            {balance.realizedPnL > 0 ? "+" : ""}
            {formatMoney(balance.realizedPnL)}
          </div>
        </div>
        <div
          className="stat-card"
          style={{
            border: "1px solid var(--accent-green)",
            background: "rgba(16, 185, 129, 0.05)",
          }}
        >
          <div className="stat-card-label">Buying Power</div>
          <div className="stat-card-value text-profit">
            {formatMoney(balance.buyingPower)}
          </div>
          <div className="stat-card-change" style={{ marginTop: 4 }}>
            Dana tersedia untuk trading
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Floating P/L</div>
          <div
            className={`stat-card-value ${balance.totalFloatingPnL >= 0 ? "text-profit" : "text-loss"}`}
          >
            {balance.totalFloatingPnL > 0 ? "+" : ""}
            {formatMoney(balance.totalFloatingPnL)}
          </div>
          <div className="stat-card-change" style={{ marginTop: 4 }}>
            Potensi P/L Saat Ini
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total Mutasi</div>
          <div
            className="stat-card-value"
            style={{ color: "var(--text-primary)" }}
          >
            {ledgerEntries.length}
          </div>
          <div className="stat-card-change" style={{ marginTop: 4 }}>
            Aktivitas di RDN
          </div>
        </div>
      </div>

      {showForm && (
        <div
          className="card"
          style={{ marginBottom: 24, animation: "fadeInUp 0.3s ease" }}
        >
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <h3 className="card-title" style={{ marginBottom: 4 }}>
                  {editingId ? "Edit Cashflow" : "Tambah Cashflow"}
                </h3>
                <p className="analytics-secondary-text">
                  {editingId
                    ? "Perbarui detail transaksi kas yang sudah tercatat."
                    : "Catat deposit atau withdraw untuk menjaga saldo kas tetap akurat."}
                </p>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Jenis Transaksi</label>
                  <CustomSelect
                    value={form.type}
                    onChange={(value) => set("type", value)}
                    options={[
                      { value: "deposit", label: "Deposit (Top-up)" },
                      { value: "withdraw", label: "Withdraw (Penarikan)" },
                    ]}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Jumlah ({isUS ? "USD" : "IDR"}) *
                  </label>
                  <CurrencyInput
                    placeholder={isUS ? "100.00" : "1.000.000"}
                    value={form.amount}
                    onChange={(v) => set("amount", v)}
                    allowDecimal={isUS}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tanggal *</label>
                  <CustomDatePicker
                    value={form.date}
                    onChange={(date) => set("date", format(date, "yyyy-MM-dd"))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Catatan</label>
                  <input
                    className="form-input"
                    placeholder="Bonus tahunan, tarik profit, dll..."
                    value={form.notes}
                    onChange={(e) => set("notes", e.target.value)}
                  />
                </div>
              </div>

              {!editingId && financeAccounts.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <SelectionToggleCard
                    checked={Boolean(form.linkToFinance)}
                    onToggle={() => set("linkToFinance", (!form.linkToFinance) as any)}
                    title="Link ke Rekening Keuangan"
                    description={form.type === "deposit" ? "Tarik dana dari rekening bank untuk top-up RDN." : "Kirim dana hasil withdraw ke rekening bank."}
                  />
                  {form.linkToFinance && (
                    <div className="form-group" style={{ marginTop: 16 }}>
                      <label className="form-label">Pilih Rekening Bank</label>
                      <CustomSelect
                        value={form.financeAccountId}
                        onChange={(val) => set("financeAccountId", val)}
                        options={[
                          { value: "", label: "-- Pilih Rekening --" },
                          ...financeAccounts.map((acc: any) => ({
                            value: acc.id,
                            label: `${acc.name} (${acc.institutionName || 'Bank'})`
                          }))
                        ]}
                      />
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button type="submit" className="btn btn-primary">
                  <span
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Save size={16} />
                    {editingId ? "Update Cashflow" : "Simpan Cashflow"}
                  </span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetForm}
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div
          className="card-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <h3 className="card-title">
            Riwayat Transaksi ({isUS ? "USD" : "IDR"})
          </h3>
          <div
            style={{
              display: "flex",
              gap: 8,
              background: "var(--bg-secondary)",
              padding: 4,
              borderRadius: 8,
            }}
          >
            <button
              className={`btn btn-sm ${viewMode === "manual" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setViewMode("manual")}
              style={{ padding: "6px 12px" }}
            >
              Kas Manual
            </button>
            <button
              className={`btn btn-sm ${viewMode === "ledger" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setViewMode("ledger")}
              style={{ padding: "6px 12px" }}
            >
              Mutasi RDN
            </button>
          </div>
        </div>

        {viewMode === "manual" ? (
          filteredCashflows.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <div
                className="empty-state-icon"
                style={{ display: "flex", justifyContent: "center" }}
              >
                <Coins size={48} />
              </div>
              <div className="empty-state-title">Belum ada transaksi RDN</div>
              <div className="empty-state-desc">
                Catat setiap deposit dan withdrawal untuk melacak Buying Power
                Anda dengan akurat.
              </div>
            </div>
          ) : (
            <div
              className="table-container"
              style={{ border: "none", margin: 0 }}
            >
              <table className="table">
                <thead>
                  <tr>
                    <th>
                      <SortableTableHeader
                        label="Tanggal"
                        sortKey="date"
                        sortConfig={sortConfig}
                        onSort={requestSort}
                      />
                    </th>
                    <th>
                      <SortableTableHeader
                        label="Jenis"
                        sortKey="type"
                        sortConfig={sortConfig}
                        onSort={requestSort}
                      />
                    </th>
                    <th>
                      <SortableTableHeader
                        label="Jumlah"
                        sortKey="amount"
                        sortConfig={sortConfig}
                        onSort={requestSort}
                      />
                    </th>
                    <th>
                      <SortableTableHeader
                        label="Catatan"
                        sortKey="notes"
                        sortConfig={sortConfig}
                        onSort={requestSort}
                      />
                    </th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCashflows.map((cf: any) => (
                    <tr key={cf.id}>
                      <td>
                        <div>{formatDate(cf.date)}</div>
                        {cf.createdAt && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {format(new Date(cf.createdAt), 'HH:mm')}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${cf.type === "deposit" ? "badge-green" : "badge-red"}`}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {cf.type === "deposit" ? (
                            <ArrowDownLeft size={12} />
                          ) : (
                            <ArrowUpRight size={12} />
                          )}
                          {cf.type === "deposit" ? "Deposit" : "Withdraw"}
                        </span>
                      </td>
                      <td
                        style={{ fontWeight: 600 }}
                        className={
                          cf.type === "deposit" ? "text-profit" : "text-loss"
                        }
                      >
                        {cf.type === "deposit" ? "+" : "-"}
                        {formatMoney(cf.amount)}
                      </td>
                      <td
                        style={{
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {cf.notes || "-"}
                        {financeTransactions.some((t: any) => t.linkedCashflowId === cf.id) && (
                          <div style={{ marginTop: 4 }}>
                            <span className="badge" style={{ background: "var(--accent-purple-dim)", color: "var(--accent-purple)", fontSize: "0.7rem", padding: "2px 6px" }}>
                              Linked to Bank
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <div
                          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                        >
                          {financeTransactions.some((t: any) => t.linkedCashflowId === cf.id) ? (
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              Edit via Finance Tracker
                            </span>
                          ) : (
                            <>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => handleEdit(cf)}
                                aria-label="Edit cashflow"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                className="btn btn-ghost btn-sm text-loss"
                                onClick={() => handleDelete(cf.id)}
                                aria-label="Hapus cashflow"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : // View Mode: Ledger / Mutasi RDN
        ledgerEntries.length === 0 ? (
          <div className="empty-state" style={{ padding: "40px 20px" }}>
            <div
              className="empty-state-icon"
              style={{ display: "flex", justifyContent: "center" }}
            >
              <Coins size={48} />
            </div>
            <div className="empty-state-title">Belum ada aktivitas mutasi</div>
            <div className="empty-state-desc">
              Mutasi RDN akan otomatis tercatat saat Anda melakukan deposit,
              withdraw, beli saham, jual saham, atau menerima dividen.
            </div>
          </div>
        ) : (
          <div
            className="table-container"
            style={{ border: "none", margin: 0 }}
          >
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Keterangan</th>
                  <th>Mutasi</th>
                  <th>Saldo Berjalan (Running Balance)</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.map((entry: any) => (
                  <tr key={entry.id}>
                    <td>
                      <div>{formatDate(entry.date)}</div>
                      {entry.originalItem?.createdAt && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {format(new Date(entry.originalItem.createdAt), 'HH:mm')}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{entry.description}</div>
                      {entry.notes && (
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          {entry.notes}
                        </div>
                      )}
                    </td>
                    <td
                      style={{ fontWeight: 600 }}
                      className={
                        entry.amount >= 0 ? "text-profit" : "text-loss"
                      }
                    >
                      {entry.amount > 0 ? "+" : ""}
                      {formatMoney(entry.amount)}
                    </td>
                    <td
                      style={{ fontWeight: 600, color: "var(--text-primary)" }}
                    >
                      {formatMoney(entry.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
