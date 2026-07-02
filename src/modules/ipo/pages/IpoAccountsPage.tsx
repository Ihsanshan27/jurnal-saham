import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import { useData } from "@/modules/shared/context/DataContext";
import { useDialog } from "@/modules/shared/context/DialogContext";
import CurrencyInput from "@/modules/shared/components/CurrencyInput";
import { usePrivacyStyle } from "@/modules/shared/hooks/usePrivacyStyle";
import { formatDate, formatRupiah } from "@/modules/shared/utils/formatters";
import "@/modules/ipo/ipo.css";
import "@/modules/ipo/ipo-neobrutalism.css";

const SELECTED_ACCOUNTS_STORAGE_KEY = "ipo_accounts_selected_ids";

function createInitialForm() {
  return {
    name: "",
    email: "",
    balance: "",
    rdnBankName: "",
    rdnAccountNumber: "",
    withdrawBankName: "",
    withdrawAccountNumber: "",
    withdrawAccountHolderName: "",
    notes: "",
    isActive: true,
  };
}

type StatusFilter = "all" | "active" | "inactive";
type ViewMode = "card" | "list";

export default function IpoAccountsPage() {
  const {
    ipoAccounts,
    ipoEntries,
    addIpoAccount,
    updateIpoAccount,
    toggleIpoAccountActive,
    deleteIpoAccount,
    reorderIpoAccounts,
    canWrite,
  } = useData();
  const { confirm } = useDialog();
  const blurStyle = usePrivacyStyle();
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(createInitialForm());
  const [searchQuery, setSearchQuery] = useState("");
  const [draggedAccountId, setDraggedAccountId] = useState<string | null>(null);
  const [dragOverAccountId, setDragOverAccountId] = useState<string | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try {
      const saved = localStorage.getItem("ipo_accounts_view_mode");
      return saved === "card" || saved === "list" ? saved : "list";
    } catch {
      return "list";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ipo_accounts_view_mode", viewMode);
    } catch (e) {
      // ignore
    }
  }, [viewMode]);
  const [sortField, setSortField] = useState<string>("custom");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem(SELECTED_ACCOUNTS_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [];
    } catch {
      return [];
    }
  });

  const [isNeobrutalism, setIsNeobrutalism] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("ipo_accounts_neobrutalism_theme");
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem(
      "ipo_accounts_neobrutalism_theme",
      JSON.stringify(isNeobrutalism),
    );
  }, [isNeobrutalism]);

  const accountsWithStats = useMemo(() => {
    return [...ipoAccounts].map((account: any) => {
      const linkedEntries = ipoEntries.filter(
        (entry: any) => entry.ipoAccountId === account.id,
      );
      const eventCount = new Set(
        linkedEntries.map((entry: any) => entry.ipoEventId),
      ).size;
      const usedBalance = linkedEntries
        .filter((entry: any) => entry.isBought === true)
        .reduce((sum: number, entry: any) => {
          const lots = Number(entry.lots) || 0;
          const buyPrice = Number(entry.buyPrice) || 0;
          return sum + buyPrice * lots * 100;
        }, 0);
      const balance = Number(account.balance) || 0;
      return {
        ...account,
        balance,
        usedBalance,
        remainingBalance: balance - usedBalance,
        linkedEntriesCount: linkedEntries.length,
        eventCount,
      };
    });
  }, [ipoAccounts, ipoEntries]);

  const summary = useMemo(() => {
    const total = ipoAccounts.length;
    const active = ipoAccounts.filter(
      (account: any) => account.isActive !== false,
    ).length;
    const inactive = total - active;
    const linkedEntries = ipoEntries.filter(
      (entry: any) => entry.ipoAccountId,
    ).length;
    const totalBalance = ipoAccounts.reduce(
      (sum: number, account: any) => sum + (Number(account.balance) || 0),
      0,
    );
    const totalUsedBalance = accountsWithStats.reduce(
      (sum: number, account: any) => sum + (Number(account.usedBalance) || 0),
      0,
    );
    const totalRemainingBalance = totalBalance - totalUsedBalance;
    return {
      total,
      active,
      inactive,
      linkedEntries,
      totalBalance,
      totalUsedBalance,
      totalRemainingBalance,
    };
  }, [accountsWithStats, ipoAccounts, ipoEntries]);

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filtered = accountsWithStats.filter((account: any) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && account.isActive !== false) ||
        (statusFilter === "inactive" && account.isActive === false);

      const haystack = [
        account.name,
        account.email,
        account.balance,
        account.rdnBankName,
        account.rdnAccountNumber,
        account.withdrawBankName,
        account.withdrawAccountNumber,
        account.withdrawAccountHolderName,
        account.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesQuery = !query || haystack.includes(query);
      return matchesStatus && matchesQuery;
    });

    return filtered.sort((a: any, b: any) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = (a.name || "").localeCompare(b.name || "", "id", {
            sensitivity: "base",
          });
          break;
        case "email":
          comparison = (a.email || "").localeCompare(b.email || "", "id", {
            sensitivity: "base",
          });
          break;
        case "rdn":
          const aRdn = [a.rdnBankName, a.rdnAccountNumber]
            .filter(Boolean)
            .join(" ");
          const bRdn = [b.rdnBankName, b.rdnAccountNumber]
            .filter(Boolean)
            .join(" ");
          comparison = aRdn.localeCompare(bRdn, "id", { sensitivity: "base" });
          break;
        case "withdraw":
          const aWd = [a.withdrawBankName, a.withdrawAccountNumber]
            .filter(Boolean)
            .join(" ");
          const bWd = [b.withdrawBankName, b.withdrawAccountNumber]
            .filter(Boolean)
            .join(" ");
          comparison = aWd.localeCompare(bWd, "id", { sensitivity: "base" });
          break;
        case "balance":
          comparison = (a.balance || 0) - (b.balance || 0);
          break;
        case "usedBalance":
          comparison = (a.usedBalance || 0) - (b.usedBalance || 0);
          break;
        case "remainingBalance":
          comparison = (a.remainingBalance || 0) - (b.remainingBalance || 0);
          break;
        case "isActive":
          comparison = a.isActive === b.isActive ? 0 : a.isActive ? -1 : 1;
          break;
        case "linkedEntriesCount":
          comparison =
            (a.linkedEntriesCount || 0) - (b.linkedEntriesCount || 0);
          break;
        case "eventCount":
          comparison = (a.eventCount || 0) - (b.eventCount || 0);
          break;
        case "lastUsedAt":
          const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
          const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
          comparison = aTime - bTime;
          break;
        case "notes":
          comparison = (a.notes || "").localeCompare(b.notes || "", "id", {
            sensitivity: "base",
          });
          break;
        case "custom":
        default:
          comparison = 0; // retain original order
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [accountsWithStats, searchQuery, statusFilter, sortField, sortDirection]);

  const moveAccountCard = (sourceId: string, targetId: string) => {
    if (!sourceId || !targetId || sourceId === targetId) return;

    // Automatically switch to custom sort mode when dragging
    if (sortField !== "custom") {
      setSortField("custom");
    }

    const visibleIds = filteredAccounts.map((a: any) => a.id);
    const sourceIndex = visibleIds.indexOf(sourceId);
    const targetIndex = visibleIds.indexOf(targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextVisibleIds = [...visibleIds];
    const [movedId] = nextVisibleIds.splice(sourceIndex, 1);
    nextVisibleIds.splice(targetIndex, 0, movedId);

    const remainingIds = ipoAccounts
      .map((a: any) => a.id)
      .filter((id: string) => !nextVisibleIds.includes(id));

    reorderIpoAccounts([...nextVisibleIds, ...remainingIds]);
  };

  const selectedAccountsCount = selectedAccountIds.length;

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field)
      return <Icons.ChevronsUpDown size={14} style={{ opacity: 0.3 }} />;
    return sortDirection === "asc" ? (
      <Icons.ChevronUp size={14} />
    ) : (
      <Icons.ChevronDown size={14} />
    );
  };

  const resetForm = () => {
    setForm(createInitialForm());
    setShowForm(false);
    setEditingId(null);
  };

  const toggleSelectedAccount = (accountId: string) => {
    setSelectedAccountIds((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId],
    );
  };

  const setValue = (key: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      name: form.name,
      email: form.email,
      balance: Number(form.balance) || 0,
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
      name: account.name || "",
      email: account.email || "",
      balance: String(account.balance ?? ""),
      rdnBankName: account.rdnBankName || "",
      rdnAccountNumber: account.rdnAccountNumber || "",
      withdrawBankName: account.withdrawBankName || "",
      withdrawAccountNumber: account.withdrawAccountNumber || "",
      withdrawAccountHolderName: account.withdrawAccountHolderName || "",
      notes: account.notes || "",
      isActive: account.isActive !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!showForm) return;

    const timer = window.setTimeout(() => {
      formCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      nameInputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [showForm, editingId]);

  useEffect(() => {
    sessionStorage.setItem(
      SELECTED_ACCOUNTS_STORAGE_KEY,
      JSON.stringify(selectedAccountIds),
    );
  }, [selectedAccountIds]);

  useEffect(() => {
    const validAccountIds = new Set(
      accountsWithStats.map((account: any) => account.id),
    );
    setSelectedAccountIds((prev) => {
      const next = prev.filter((accountId) => validAccountIds.has(accountId));
      return next.length === prev.length ? prev : next;
    });
  }, [accountsWithStats]);

  const handleDelete = async (account: any) => {
    const isConfirmed = await confirm(
      `Master akun "${account.name}" akan dihapus permanen.\n\nAkun yang masih terhubung ke entry IPO tidak bisa dihapus. Lanjutkan penghapusan?`,
      {
        title: "Hapus Master Akun IPO",
        severity: "danger",
        confirmText: "Hapus",
      },
    );
    if (isConfirmed) {
      deleteIpoAccount(account.id);
    }
  };

  return (
    <div
      className={`ipo-accounts-page ${isNeobrutalism ? "neobrutal-theme" : ""}`}
    >
      <div className="page-header">
        <div className="ipo-accounts-hero">
          <div className="ipo-accounts-hero-kicker">IPO Workspace</div>
          <h1
            className="page-title ipo-accounts-title"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <Icons.Users size={24} style={{ color: "var(--accent-green)" }} />
            Master IPO Accounts
          </h1>
          <p className="page-subtitle ipo-accounts-subtitle">
            Kelola akun partisipan IPO agar entry tetap konsisten, mudah
            dipilih, dan rapi di ringkasan.
          </p>
        </div>
        <div className="ipo-actions-row">
          <button
            type="button"
            className="btn btn-secondary ipo-accounts-secondary-action"
            onClick={() => setIsNeobrutalism(!isNeobrutalism)}
            title="Toggle Neobrutalism Theme"
          >
            {isNeobrutalism ? (
              <Icons.Moon size={16} />
            ) : (
              <Icons.Palette size={16} />
            )}
            {isNeobrutalism ? "Dark Mode" : "Neo Mode"}
          </button>
          <Link
            className="btn btn-secondary ipo-accounts-secondary-action"
            to="/ipo"
          >
            <Icons.Rocket size={16} />
            IPO Journey
          </Link>
          {canWrite && (
            <button
              type="button"
              className="btn btn-primary ipo-accounts-primary-action"
              onClick={() => (showForm ? resetForm() : setShowForm(true))}
            >
              {showForm ? <Icons.X size={16} /> : <Icons.Plus size={16} />}
              {showForm ? "Batal" : "Tambah Akun"}
            </button>
          )}
        </div>
      </div>

      <div
        className="grid-stats analytics-stats-grid ipo-margin-b16"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}
      >
        <div className="stat-card ipo-accounts-stat-card">
          <div className="stat-card-label">Total Master Akun</div>
          <div className="stat-card-value">{summary.total}</div>
          <div className="ipo-accounts-stat-foot">
            Seluruh akun yang tersimpan
          </div>
        </div>
        <div className="stat-card ipo-accounts-stat-card">
          <div className="stat-card-label">Akun Aktif</div>
          <div className="stat-card-value">{summary.active}</div>
          <div className="ipo-accounts-stat-foot">
            Siap dipakai untuk entry baru
          </div>
        </div>
        <div className="stat-card ipo-accounts-stat-card">
          <div className="stat-card-label">Akun Nonaktif</div>
          <div className="stat-card-value">{summary.inactive}</div>
          <div className="ipo-accounts-stat-foot">
            Tetap aman untuk histori lama
          </div>
        </div>
        <div className="stat-card ipo-accounts-stat-card">
          <div className="stat-card-label">Saldo Total</div>
          <div className="stat-card-value">
            {formatRupiah(summary.totalBalance)}
          </div>
          <div className="ipo-accounts-stat-foot">
            Akumulasi saldo awal semua akun
          </div>
        </div>
        <div className="stat-card ipo-accounts-stat-card">
          <div className="stat-card-label">Saldo Terpakai</div>
          <div className="stat-card-value">
            {formatRupiah(summary.totalUsedBalance)}
          </div>
          <div className="ipo-accounts-stat-foot">
            Total modal yang sudah dipakai entry IPO
          </div>
        </div>
        <div className="stat-card ipo-accounts-stat-card">
          <div className="stat-card-label">Saldo Sisa</div>
          <div className="stat-card-value">
            {formatRupiah(summary.totalRemainingBalance)}
          </div>
          <div className="ipo-accounts-stat-foot">
            Sisa saldo yang masih bisa dipakai
          </div>
        </div>
      </div>

      {showForm && canWrite && (
        <div ref={formCardRef} className="card ipo-margin-b16">
          <div className="card-header">
            <div>
              <h3 className="card-title">
                {editingId ? "Edit Master Akun IPO" : "Tambah Master Akun IPO"}
              </h3>
              <p className="page-subtitle" style={{ marginTop: 6 }}>
                Nama akun menjadi sumber utama yang akan dipakai ulang di form
                entry IPO.
              </p>
            </div>
          </div>
          <form
            onSubmit={handleSubmit}
            noValidate
            className="card-body ipo-accounts-form"
          >
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="ipo-master-name">
                  Nama Akun *
                </label>
                <input
                  ref={nameInputRef}
                  id="ipo-master-name"
                  className="form-input"
                  placeholder="Contoh: Akun Pribadi Utama"
                  value={form.name}
                  onChange={(event) => setValue("name", event.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ipo-master-email">
                  Email
                </label>
                <input
                  id="ipo-master-email"
                  type="email"
                  className="form-input"
                  placeholder="email@gmail.com"
                  value={form.email}
                  onChange={(event) => setValue("email", event.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ipo-master-balance">
                  Saldo Awal (Rp)
                </label>
                <CurrencyInput
                  id="ipo-master-balance"
                  value={form.balance}
                  onChange={(value) => setValue("balance", value)}
                  placeholder="25.000.000"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="ipo-master-notes">
                  Catatan
                </label>
                <input
                  id="ipo-master-notes"
                  className="form-input"
                  placeholder="Contoh: dipakai untuk akun keluarga"
                  value={form.notes}
                  onChange={(event) => setValue("notes", event.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="ipo-master-active">
                  Status
                </label>
                <select
                  id="ipo-master-active"
                  className="form-select"
                  value={form.isActive ? "active" : "inactive"}
                  onChange={(event) =>
                    setValue("isActive", event.target.value === "active")
                  }
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
                  <label className="form-label" htmlFor="ipo-master-rdn-bank">
                    Bank RDN
                  </label>
                  <input
                    id="ipo-master-rdn-bank"
                    className="form-input"
                    placeholder="Contoh: BCA / BNI / Permata"
                    value={form.rdnBankName}
                    onChange={(event) =>
                      setValue("rdnBankName", event.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="ipo-master-rdn-number">
                    Nomor RDN
                  </label>
                  <input
                    id="ipo-master-rdn-number"
                    className="form-input"
                    placeholder="Nomor rekening dana nasabah"
                    value={form.rdnAccountNumber}
                    onChange={(event) =>
                      setValue("rdnAccountNumber", event.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="ipo-form-section">
              <h4 className="ipo-form-section-title">Rekening Withdraw</h4>
              <div className="form-row">
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="ipo-master-withdraw-bank"
                  >
                    Bank Withdraw
                  </label>
                  <input
                    id="ipo-master-withdraw-bank"
                    className="form-input"
                    placeholder="Contoh: BCA"
                    value={form.withdrawBankName}
                    onChange={(event) =>
                      setValue("withdrawBankName", event.target.value)
                    }
                  />
                </div>
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="ipo-master-withdraw-number"
                  >
                    Nomor Rekening Withdraw
                  </label>
                  <input
                    id="ipo-master-withdraw-number"
                    className="form-input"
                    placeholder="Nomor rekening penarikan dana"
                    value={form.withdrawAccountNumber}
                    onChange={(event) =>
                      setValue("withdrawAccountNumber", event.target.value)
                    }
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label
                    className="form-label"
                    htmlFor="ipo-master-withdraw-holder"
                  >
                    Nama Pemilik Rekening Withdraw
                  </label>
                  <input
                    id="ipo-master-withdraw-holder"
                    className="form-input"
                    placeholder="Nama sesuai rekening tujuan"
                    value={form.withdrawAccountHolderName}
                    onChange={(event) =>
                      setValue("withdrawAccountHolderName", event.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="ipo-flex-wrap">
              <button type="submit" className="btn btn-primary">
                <Icons.Save size={15} />
                {editingId ? "Simpan Perubahan" : "Simpan Master Akun"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetForm}
              >
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
            <p
              className="page-subtitle ipo-accounts-section-subtitle"
              style={{ marginTop: 6 }}
            >
              Akun nonaktif tidak muncul sebagai pilihan utama saat input entry
              baru, tapi histori lama tetap aman.
            </p>
          </div>
        </div>
        <div className="card-body ipo-accounts-list-shell">
          <div className="ipo-filter-bar ipo-accounts-filter-bar">
            <div className="form-group ipo-filter-search" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="ipo-account-search">
                Cari Akun
              </label>
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
              <label className="form-label" htmlFor="ipo-account-status-filter">
                Filter Status
              </label>
              <select
                id="ipo-account-status-filter"
                className="form-select"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
              >
                <option value="all">Semua</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="ipo-account-sort">
                Urutkan
              </label>
              <select
                id="ipo-account-sort"
                className="form-select"
                value={sortField}
                onChange={(event) => setSortField(event.target.value)}
              >
                <option value="custom">Kustom (Drag & Drop)</option>
                <option value="name">Nama Akun</option>
                <option value="balance">Saldo Tertinggi</option>
                <option value="remainingBalance">Sisa Saldo Tertinggi</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Mode Tampilan</label>
              <div
                className="ipo-view-toggle"
                role="tablist"
                aria-label="Mode tampilan akun IPO"
              >
                <button
                  type="button"
                  className={`ipo-view-toggle-btn ${viewMode === "card" ? "active" : ""}`}
                  onClick={() => setViewMode("card")}
                  aria-pressed={viewMode === "card"}
                >
                  <Icons.LayoutGrid size={15} />
                  Grid Card
                </button>
                <button
                  type="button"
                  className={`ipo-view-toggle-btn ${viewMode === "list" ? "active" : ""}`}
                  onClick={() => setViewMode("list")}
                  aria-pressed={viewMode === "list"}
                >
                  <Icons.Rows3 size={15} />
                  Grid List
                </button>
              </div>
            </div>
          </div>

          {selectedAccountsCount > 0 && (
            <div className="ipo-accounts-selection-bar" aria-live="polite">
              <div className="ipo-accounts-selection-copy">
                <span className="ipo-accounts-selection-badge">
                  {selectedAccountsCount}
                </span>
                <span>{selectedAccountsCount} akun dipilih</span>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm ipo-accounts-selection-clear"
                onClick={() => setSelectedAccountIds([])}
              >
                <Icons.X size={14} />
                Bersihkan pilihan
              </button>
            </div>
          )}

          {accountsWithStats.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Icons.Users size={42} />
              </div>
              <div className="empty-state-title">Belum ada master akun IPO</div>
              <div className="empty-state-desc">
                Tambahkan akun IPO yang sering dipakai agar input entry
                berikutnya lebih cepat dan konsisten.
              </div>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Icons.SearchX size={42} />
              </div>
              <div className="empty-state-title">Tidak ada akun yang cocok</div>
              <div className="empty-state-desc">
                Ubah kata kunci pencarian atau filter status untuk melihat akun
                IPO lain.
              </div>
            </div>
          ) : viewMode === "list" ? (
            <div className="ipo-account-table-wrap">
              <table className="table ipo-account-table">
                <thead>
                  <tr>
                    <th className="ipo-account-table-check-col">Pilih</th>
                    <th
                      onClick={() => handleSort("name")}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Akun {renderSortIcon("name")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("email")}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Email {renderSortIcon("email")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("rdn")}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        RDN {renderSortIcon("rdn")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("withdraw")}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Withdraw {renderSortIcon("withdraw")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("balance")}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Saldo Awal {renderSortIcon("balance")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("usedBalance")}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Terpakai {renderSortIcon("usedBalance")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("remainingBalance")}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Sisa {renderSortIcon("remainingBalance")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("isActive")}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Status {renderSortIcon("isActive")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("linkedEntriesCount")}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Entry {renderSortIcon("linkedEntriesCount")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("eventCount")}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Event {renderSortIcon("eventCount")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("lastUsedAt")}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Terakhir {renderSortIcon("lastUsedAt")}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("notes")}
                      style={{ cursor: "pointer", userSelect: "none" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Catatan {renderSortIcon("notes")}
                      </div>
                    </th>
                    {canWrite && <th>Tools</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account: any) => (
                    <tr
                      key={account.id}
                      className={
                        selectedAccountIds.includes(account.id)
                          ? "is-selected"
                          : ""
                      }
                    >
                      <td className="ipo-account-table-check-col">
                        <button
                          type="button"
                          className={`ipo-account-select-checkbox ${selectedAccountIds.includes(account.id) ? "checked" : ""}`}
                          onClick={() => toggleSelectedAccount(account.id)}
                          aria-pressed={selectedAccountIds.includes(account.id)}
                          aria-label={`${selectedAccountIds.includes(account.id) ? "Batalkan pilihan akun" : "Pilih akun"} ${account.name}`}
                          title={
                            selectedAccountIds.includes(account.id)
                              ? "Batalkan pilihan"
                              : "Pilih akun"
                          }
                        >
                          <Icons.Check size={14} />
                        </button>
                      </td>
                      <td>
                        <div className="ipo-account-table-account">
                          <div className="ipo-account-table-name">
                            {account.name}
                          </div>
                          <div className="ipo-account-table-status-line">
                            <span
                              className={`status-badge ${account.isActive === false ? "upcoming" : "active"}`}
                            >
                              {account.isActive === false
                                ? "Nonaktif"
                                : "Aktif"}
                            </span>
                          </div>
                          {account.withdrawAccountHolderName && (
                            <div className="ipo-account-table-sub">
                              {account.withdrawAccountHolderName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td
                        style={blurStyle}
                        className="ipo-account-table-secondary"
                      >
                        {account.email || "-"}
                      </td>
                      <td style={blurStyle}>
                        {account.rdnBankName || account.rdnAccountNumber
                          ? [account.rdnBankName, account.rdnAccountNumber]
                              .filter(Boolean)
                              .join(" / ")
                          : "-"}
                      </td>
                      <td
                        style={blurStyle}
                        className="ipo-account-table-secondary"
                      >
                        {account.withdrawBankName ||
                        account.withdrawAccountNumber
                          ? [
                              account.withdrawBankName,
                              account.withdrawAccountNumber,
                            ]
                              .filter(Boolean)
                              .join(" / ")
                          : "-"}
                      </td>
                      <td
                        className="ipo-account-table-metric-cell"
                        style={blurStyle}
                      >
                        {formatRupiah(account.balance || 0)}
                      </td>
                      <td
                        className="ipo-account-table-metric-cell"
                        style={blurStyle}
                      >
                        {formatRupiah(account.usedBalance || 0)}
                      </td>
                      <td
                        className="ipo-account-table-metric-cell"
                        style={{
                          ...blurStyle,
                          color:
                            account.remainingBalance >= 0
                              ? "var(--accent-green)"
                              : "var(--accent-red)",
                        }}
                      >
                        {formatRupiah(account.remainingBalance || 0)}
                      </td>
                      <td className="ipo-account-table-status-cell">
                        <span
                          className={`status-badge ${account.isActive === false ? "upcoming" : "active"}`}
                        >
                          {account.isActive === false ? "Nonaktif" : "Aktif"}
                        </span>
                      </td>
                      <td className="ipo-account-table-metric-cell">
                        {account.linkedEntriesCount}
                      </td>
                      <td className="ipo-account-table-metric-cell">
                        {account.eventCount}
                      </td>
                      <td className="ipo-account-table-secondary">
                        {account.lastUsedAt
                          ? formatDate(account.lastUsedAt)
                          : "-"}
                      </td>
                      <td className="ipo-account-table-notes">
                        {account.notes || "-"}
                      </td>
                      {canWrite && (
                        <td className="ipo-account-table-tools-cell">
                          <div className="ipo-account-table-tools">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm ipo-account-table-edit-btn"
                              onClick={() => handleEdit(account)}
                              title="Edit akun"
                            >
                              <Icons.Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm ipo-account-table-action-btn"
                              onClick={() => toggleIpoAccountActive(account.id)}
                              title={
                                account.isActive === false
                                  ? "Aktifkan akun"
                                  : "Nonaktifkan akun"
                              }
                            >
                              {account.isActive === false ? (
                                <Icons.Power size={14} />
                              ) : (
                                <Icons.PowerOff size={14} />
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm ipo-account-delete-btn"
                              disabled={account.linkedEntriesCount > 0}
                              onClick={() => handleDelete(account)}
                              title={
                                account.linkedEntriesCount > 0
                                  ? "Akun yang masih dipakai tidak bisa dihapus"
                                  : "Hapus akun"
                              }
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
            <div className={`ipo-accounts-grid card-mode`}>
              {filteredAccounts.map((account: any) => (
                <article
                  key={account.id}
                  className={`bento-card ipo-account-card card-mode ${selectedAccountIds.includes(account.id) ? "is-selected" : ""} ${draggedAccountId === account.id ? "is-dragging" : ""} ${dragOverAccountId === account.id ? "is-drag-over" : ""}`}
                  style={{
                    borderLeft:
                      account.isActive === false
                        ? "4px solid var(--border-color)"
                        : "4px solid var(--accent-green)",
                  }}
                  draggable={canWrite && sortField === "custom"}
                  onDragStart={() => {
                    if (!canWrite || sortField !== "custom") return;
                    setDraggedAccountId(account.id);
                    setDragOverAccountId(account.id);
                  }}
                  onDragOver={(e) => {
                    if (!canWrite || sortField !== "custom") return;
                    e.preventDefault();
                    if (draggedAccountId && draggedAccountId !== account.id) {
                      setDragOverAccountId(account.id);
                    }
                  }}
                  onDrop={(e) => {
                    if (!canWrite || sortField !== "custom") return;
                    e.preventDefault();
                    moveAccountCard(draggedAccountId || "", account.id);
                    setDraggedAccountId(null);
                    setDragOverAccountId(null);
                  }}
                  onDragEnd={() => {
                    setDraggedAccountId(null);
                    setDragOverAccountId(null);
                  }}
                >
                  <div className="ipo-list-head" style={{ marginBottom: 16 }}>
                    <div>
                      <div
                        className="ipo-list-meta-row"
                        style={{ marginBottom: 8 }}
                      >
                        <span
                          className="ipo-badge-pill ipo-badge-stock ipo-badge-stock-sm"
                          style={{
                            backgroundColor: "transparent",
                            border: "1px solid var(--border-color)",
                          }}
                        >
                          {account.name}
                        </span>
                        <span
                          className={`ipo-event-status-badge ${account.isActive === false ? "upcoming" : "active"}`}
                        >
                          {account.isActive === false ? (
                            <>
                              <Icons.Clock size={9} />
                              Nonaktif
                            </>
                          ) : (
                            <>
                              <Icons.CheckCircle size={9} />
                              Aktif
                            </>
                          )}
                        </span>
                      </div>
                      <div className="ipo-list-submeta" style={blurStyle}>
                        <Icons.Mail
                          size={12}
                          style={{
                            display: "inline",
                            marginRight: 4,
                            verticalAlign: "-1px",
                          }}
                        />
                        {account.email || "Tanpa email"}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {canWrite && sortField === "custom" && (
                        <button
                          type="button"
                          className="ipo-drag-handle"
                          title="Geser untuk mengatur posisi card"
                          aria-label={`Geser posisi card IPO ${account.name}`}
                        >
                          <Icons.ArrowRightLeft size={14} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={`ipo-account-select-checkbox ${selectedAccountIds.includes(account.id) ? "checked" : ""}`}
                        onClick={() => toggleSelectedAccount(account.id)}
                        aria-pressed={selectedAccountIds.includes(account.id)}
                        aria-label={`${selectedAccountIds.includes(account.id) ? "Batalkan pilihan akun" : "Pilih akun"} ${account.name}`}
                        title={
                          selectedAccountIds.includes(account.id)
                            ? "Batalkan pilihan"
                            : "Pilih akun"
                        }
                      >
                        <Icons.Check size={14} />
                      </button>
                    </div>
                  </div>

                  <div
                    className="ipo-profit-block"
                    style={{ marginTop: 0, marginBottom: 16 }}
                  >
                    <div className="ipo-profit-title">Sisa Saldo</div>
                    <div
                      className={`font-mono ${account.remainingBalance >= 0 ? "text-profit" : "text-loss"}`}
                      style={{
                        fontSize: "1.7rem",
                        fontWeight: 800,
                        letterSpacing: "-0.03em",
                        ...blurStyle,
                      }}
                    >
                      {formatRupiah(account.remainingBalance || 0)}
                    </div>
                    <div
                      className="ipo-profit-avg"
                      style={{ color: "var(--text-secondary)", ...blurStyle }}
                    >
                      Total Modal {formatRupiah(account.balance || 0)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      borderTop: "1px solid var(--border-color)",
                      paddingTop: 12,
                      paddingBottom: 12,
                      borderBottom: "1px solid var(--border-color)",
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ textAlign: "center", flex: 1 }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                        {account.linkedEntriesCount}
                      </div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Entry
                      </div>
                    </div>
                    <div style={{ textAlign: "center", flex: 1 }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                        {account.eventCount}
                      </div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Event
                      </div>
                    </div>
                    <div style={{ textAlign: "center", flex: 1 }}>
                      <div
                        style={{
                          fontSize: "1.2rem",
                          fontWeight: 800,
                          ...blurStyle,
                        }}
                      >
                        {formatRupiah(account.usedBalance || 0)
                          .replace("Rp", "")
                          .trim()}
                      </div>
                      <div
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Terpakai
                      </div>
                    </div>
                  </div>

                  <div
                    className="ipo-list-submeta"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      ...blurStyle,
                    }}
                  >
                    <div>
                      <strong>RDN:</strong>{" "}
                      {account.rdnBankName || account.rdnAccountNumber
                        ? [account.rdnBankName, account.rdnAccountNumber]
                            .filter(Boolean)
                            .join(" / ")
                        : "-"}
                    </div>
                    <div>
                      <strong>WD:</strong>{" "}
                      {account.withdrawBankName || account.withdrawAccountNumber
                        ? [
                            account.withdrawBankName,
                            account.withdrawAccountNumber,
                          ]
                            .filter(Boolean)
                            .join(" / ")
                        : "-"}
                    </div>
                  </div>

                  <div className="ipo-account-meta-row">
                    <div className="ipo-account-meta-item">
                      <Icons.Clock3 size={14} />
                      <span>
                        Terakhir dipakai:{" "}
                        {account.lastUsedAt
                          ? formatDate(account.lastUsedAt)
                          : "-"}
                      </span>
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
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm ipo-account-edit-btn"
                        onClick={() => handleEdit(account)}
                      >
                        <Icons.Pencil size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm ipo-account-inline-action"
                        onClick={() => toggleIpoAccountActive(account.id)}
                      >
                        {account.isActive === false ? (
                          <Icons.Power size={14} />
                        ) : (
                          <Icons.PowerOff size={14} />
                        )}
                        {account.isActive === false
                          ? "Aktifkan"
                          : "Nonaktifkan"}
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm ipo-account-delete-btn ipo-account-inline-action"
                        disabled={account.linkedEntriesCount > 0}
                        onClick={() => handleDelete(account)}
                        title={
                          account.linkedEntriesCount > 0
                            ? "Akun yang masih dipakai tidak bisa dihapus"
                            : "Hapus akun"
                        }
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
