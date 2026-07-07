import { useState, useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "@/modules/shared/context/DataContext";
import { useDialog } from "@/modules/shared/context/DialogContext";
import { usePrivacyStyle } from "@/modules/shared/hooks/usePrivacyStyle";
import { formatRupiah, formatDate } from "@/modules/shared/utils/formatters";
import type { IpoEvent, IpoSummary } from "@/modules/ipo/types/ipo";
import { getIpoEventStatus, getIpoOfferingStartDate, getIpoOfferingEndDate, parseDateOnly } from "@/modules/ipo/utils/ipoStatus";
import * as Icons from "lucide-react";
import CustomSelect from '@/modules/shared/components/CustomSelect';
import CustomDatePicker from '@/modules/shared/components/CustomDatePicker';
import { format } from 'date-fns';
import "@/modules/ipo/ipo.css";

const DRAFT_KEY = "ipo_list_form_draft";
const DRAFT_OPEN_KEY = "ipo_list_form_open";
const EDIT_EVENT_KEY = "ipo_list_edit_event_id";

const EMPTY_FORM = {
   stockCode: "",
   underwriter: "",
   offeringDate: "",
   ipoDate: "",
   offeringPrice: "",
   notes: "",
   sector: "",
   registrar: "",
   targetBoard: "Utama",
   bookbuildingStartDate: "",
   bookbuildingEndDate: "",
   lotPoolingAmount: "",
   allotmentDate: "",
   refundDate: "",
   distributionDate: "",
};

const EMPTY_ERRORS = {
   stockCode: "",
   offeringDate: "",
   ipoDate: "",
   offeringPrice: "",
   bookbuildingStartDate: "",
};

function stripLeadingEmojiLabel(value: string) {
   return value
      .replace(/^[^\p{L}\p{N}]+/u, "")
      .trim();
}

function formatOfferingRange(start?: string, end?: string) {
   if (!start && !end) return "—";
   if (start && end && start !== end) {
      return `${formatDate(start)} - ${formatDate(end)}`;
   }
   return formatDate(start || end);
}

/** Hitung countdown label menuju offeringDate atau ipoDate */
function getCountdownInfo(event: IpoEvent): { label: string; cls: string } | null {
   const today = new Date();
   today.setHours(0, 0, 0, 0);

   const ipoDate = parseDateOnly(event.ipoDate);
   const offeringStartDate = getIpoOfferingStartDate(event);
   const offeringEndDate = getIpoOfferingEndDate(event);
   if (!ipoDate) return null;
   ipoDate.setHours(0, 0, 0, 0);
   if (offeringStartDate) offeringStartDate.setHours(0, 0, 0, 0);
   if (offeringEndDate) offeringEndDate.setHours(0, 0, 0, 0);

   const diffMs = (d: Date) => d.getTime() - today.getTime();
   const diffDays = (d: Date) => Math.round(diffMs(d) / 86400000);

   // IPO sudah lewat
   if (today > ipoDate) return null;

   // Cek apakah IPO hari ini
   if (ipoDate.getTime() === today.getTime()) {
      return { label: "IPO Hari Ini!", cls: "today-label" };
   }

   // Cek apakah penawaran hari ini
   if (offeringStartDate && offeringStartDate.getTime() === today.getTime()) {
      return { label: "Penawaran Hari Ini", cls: "urgent" };
   }

   if (offeringStartDate && offeringEndDate && today >= offeringStartDate && today <= offeringEndDate) {
      const offeringRange = formatOfferingRange(
         event.offeringStartDate || event.offeringDate,
         event.offeringEndDate || event.offeringDate,
      );
      return { label: `Penawaran berlangsung (${offeringRange})`, cls: "urgent" };
   }

   // Hitung countdown penawaran (jika belum lewat) atau IPO
   if (offeringStartDate && today < offeringStartDate) {
      const days = diffDays(offeringStartDate);
      const offeringRange = formatOfferingRange(
         event.offeringStartDate || event.offeringDate,
         event.offeringEndDate || event.offeringDate,
      );
      return { label: `${days} hari lagi penawaran (${offeringRange})`, cls: days <= 3 ? "urgent" : "" };
   }

   const days = diffDays(ipoDate);
   return { label: `${days} hari lagi listing IPO`, cls: days <= 3 ? "urgent" : "" };
}

/** Cek apakah event adalah IPO hari ini */
function isIpoToday(event: IpoEvent): boolean {
   const today = new Date();
   today.setHours(0, 0, 0, 0);
   const ipoDate = parseDateOnly(event.ipoDate);
   if (!ipoDate) return false;
   ipoDate.setHours(0, 0, 0, 0);
   return ipoDate.getTime() === today.getTime();
}

export default function IpoListPage() {
   const {
      ipoEvents,
      ipoEntries,
      addIpoEvent,
      updateIpoEvent,
      batchAddIpoEntries,
      deleteIpoEvent,
      reorderIpoEvents,
      canWrite,
   } = useData();
   const navigate = useNavigate();
   const blurStyle = usePrivacyStyle();
   const { alert, confirm } = useDialog();

   const [formErrors, setFormErrors] = useState(EMPTY_ERRORS);

   const [editingEventId, setEditingEventId] = useState<string | null>(
      () => sessionStorage.getItem(EDIT_EVENT_KEY) || null,
   );
   const editingEvent = editingEventId
      ? ipoEvents.find((event: IpoEvent) => event.id === editingEventId) || null
      : null;

   // Persist form state across navigation using sessionStorage
   const [showForm, setShowFormState] = useState<boolean>(
      () => sessionStorage.getItem(DRAFT_OPEN_KEY) === "true",
   );
   const [form, setFormState] = useState(() => {
      try {
         const saved = sessionStorage.getItem(DRAFT_KEY);
         return saved ? JSON.parse(saved) : EMPTY_FORM;
      } catch {
         return EMPTY_FORM;
      }
   });

   // Filters state
   const [searchQuery, setSearchQuery] = useState("");
   const [statusFilter, setStatusFilter] = useState("all");
   const [underwriterFilter, setUnderwriterFilter] = useState("all");
   const [yearFilter, setYearFilter] = useState("all");
   const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
   const [dragOverEventId, setDragOverEventId] = useState<string | null>(null);

   // Get unique list of underwriters
   const uniqueUnderwriters = useMemo(() => {
      return Array.from(
         new Set<string>(
            ipoEvents
               .map((e) => e.underwriter?.trim())
               .filter((uw): uw is string => !!uw)
         )
      ).sort();
   }, [ipoEvents]);

   // Get unique list of years based on ipoDate
   const uniqueYears = useMemo(() => {
      return Array.from(
         new Set<string>(
            ipoEvents
               .map((e) => {
                  const d = parseDateOnly(e.ipoDate);
                  return d ? String(d.getFullYear()) : null;
               })
               .filter((y): y is string => !!y)
         )
      ).sort((a, b) => b.localeCompare(a)); // Descending order
   }, [ipoEvents]);

   const setShowForm = (v: boolean) => {
      setShowFormState(v);
      sessionStorage.setItem(DRAFT_OPEN_KEY, String(v));
   };

   const setEditingEvent = (eventId: string | null) => {
      setEditingEventId(eventId);
      if (eventId) sessionStorage.setItem(EDIT_EVENT_KEY, eventId);
      else sessionStorage.removeItem(EDIT_EVENT_KEY);
   };

   const set = (k: string, v: string) =>
      setFormState((prev) => {
         const next = { ...prev, [k]: v };
         sessionStorage.setItem(DRAFT_KEY, JSON.stringify(next));
         return next;
      });

   const clearDraft = () => {
      sessionStorage.removeItem(DRAFT_KEY);
      sessionStorage.removeItem(DRAFT_OPEN_KEY);
      sessionStorage.removeItem(EDIT_EVENT_KEY);
      setFormState(EMPTY_FORM);
      setShowFormState(false);
   };

   const handleOpenAdd = () => {
      setEditingEvent(null);
      clearDraft();
      setShowForm(true);
   };

   const handleOpenEdit = (event: IpoEvent) => {
      const nextForm = {
         stockCode: event.stockCode,
         underwriter: event.underwriter || "",
         offeringDate: event.offeringDate || "",
         ipoDate: event.ipoDate,
         offeringPrice: String(event.offeringPrice),
         notes: event.notes || "",
         sector: event.sector || "",
         registrar: event.registrar || "",
         targetBoard: event.targetBoard || "Utama",
         bookbuildingStartDate: event.bookbuildingStartDate || "",
         bookbuildingEndDate: event.bookbuildingEndDate || "",
         lotPoolingAmount: event.lotPoolingAmount != null ? String(event.lotPoolingAmount) : "",
         allotmentDate: event.allotmentDate || "",
         refundDate: event.refundDate || "",
         distributionDate: event.distributionDate || "",
      };
      setEditingEvent(event.id);
      setFormState(nextForm);
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(nextForm));
      sessionStorage.removeItem(DRAFT_OPEN_KEY);
      setShowFormState(false);
   };

   const handleCancel = () => {
      clearDraft();
      setEditingEvent(null);
   };

   const validateForm = (): boolean => {
      const errors = { ...EMPTY_ERRORS };
      let valid = true;

      if (!form.stockCode.trim()) {
         errors.stockCode = "Kode saham wajib diisi.";
         valid = false;
      }
      if (!form.ipoDate) {
         errors.ipoDate = "Tanggal IPO wajib diisi.";
         valid = false;
      }
      const price = parseFloat(form.offeringPrice);
      if (!form.offeringPrice || isNaN(price) || price <= 0) {
         errors.offeringPrice = "Harga penawaran harus lebih dari 0.";
         valid = false;
      }
      if (form.offeringDate && form.ipoDate && form.offeringDate >= form.ipoDate) {
         errors.offeringDate = "Tanggal penawaran harus sebelum tanggal IPO.";
         valid = false;
      }
      if (form.bookbuildingStartDate && form.bookbuildingEndDate && form.bookbuildingStartDate >= form.bookbuildingEndDate) {
         errors.bookbuildingStartDate = "Mulai harus sebelum akhir bookbuilding.";
         valid = false;
      }

      setFormErrors(errors);
      return valid;
   };

   const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateForm()) return;

      const payload = {
         stockCode: form.stockCode.toUpperCase(),
         underwriter: form.underwriter.trim() || undefined,
         offeringDate: form.offeringDate || undefined,
         ipoDate: form.ipoDate,
         offeringPrice: parseFloat(form.offeringPrice) || 0,
         notes: form.notes,
         sector: form.sector || undefined,
         registrar: form.registrar.trim() || undefined,
         targetBoard: form.targetBoard || undefined,
         bookbuildingStartDate: form.bookbuildingStartDate || undefined,
         bookbuildingEndDate: form.bookbuildingEndDate || undefined,
         lotPoolingAmount: form.lotPoolingAmount !== "" ? parseFloat(form.lotPoolingAmount) : undefined,
         allotmentDate: form.allotmentDate || undefined,
         refundDate: form.refundDate || undefined,
         distributionDate: form.distributionDate || undefined,
      };

      if (editingEvent) {
         updateIpoEvent(editingEvent.id, payload);
         clearDraft();
         setEditingEvent(null);
         setShowForm(false);
      } else {
         const newEvent = addIpoEvent(payload);
         clearDraft();
         if (newEvent?.id) navigate(`/ipo/${newEvent.id}`);
      }
      setFormErrors(EMPTY_ERRORS);
   };

   const handleDuplicateEvent = (event: IpoEvent) => {
         const newEvent = addIpoEvent({
            stockCode: `${event.stockCode}`,
            underwriter: event.underwriter,
            offeringDate: event.offeringDate,
            offeringStartDate: event.offeringStartDate,
            offeringEndDate: event.offeringEndDate,
            ipoDate: event.ipoDate,
            offeringPrice: event.offeringPrice,
            notes: event.notes ? `${event.notes} (Kopi)` : "(Kopi)",
         sector: event.sector,
         registrar: event.registrar,
         targetBoard: event.targetBoard,
         bookbuildingStartDate: event.bookbuildingStartDate,
         bookbuildingEndDate: event.bookbuildingEndDate,
         lotPoolingAmount: event.lotPoolingAmount,
         allotmentDate: event.allotmentDate,
         refundDate: event.refundDate,
         distributionDate: event.distributionDate,
      });
      if (!newEvent?.id) return;
      const originalEntries = ipoEntries
         .filter((e: any) => e.ipoEventId === event.id)
         .map((e: any) => ({
            ipoEventId: newEvent.id,
            accountName: e.accountName,
            email: e.email,
            buyPrice: newEvent.offeringPrice,
            lots: e.lots,
            sellPrice: e.sellPrice,
            slTl: e.slTl,
            action: e.action,
            notes: e.notes,
         }));
      if (originalEntries.length > 0) {
         batchAddIpoEntries(originalEntries);
      }
      navigate(`/ipo/${newEvent.id}`);
   };

   const getSummary = (eventId: string): IpoSummary => {
      const event = ipoEvents.find((item: IpoEvent) => item.id === eventId);
      const entries = ipoEntries.filter((e: any) => e.ipoEventId === eventId);
      let totalCapital = 0,
         totalReturn = 0,
         sellCount = 0,
         keepCount = 0;
      entries.forEach((e: any) => {
         const isZonk = e.allotmentStatus === 'NOT_ALLOTTED';
         const effectiveLots = isZonk ? 0 : (Number(e.lots) || 0);
         const shares = effectiveLots * 100;
         const buyPrice = event?.offeringPrice ?? e.buyPrice;
         const buy = buyPrice * shares;
         const sell = e.sellPrice > 0 ? e.sellPrice * shares : buy;
         const profit = sell - buy;
         totalCapital += buy;
         totalReturn += profit;
         if (e.action === "SELL") sellCount++;
         else keepCount++;
      });
      return {
         totalCapital,
         totalReturn,
         avgReturnPct: totalCapital > 0 ? (totalReturn / totalCapital) * 100 : 0,
         accountCount: entries.length,
         sellCount,
         keepCount,
      };
   };

   const sorted = useMemo(() => [...ipoEvents], [ipoEvents]);

   const filteredEvents = useMemo(() => {
      return sorted.filter((event) => {
         // 1. Search Query
         const query = searchQuery.toLowerCase().trim();
         const matchQuery =
            !query ||
            event.stockCode.toLowerCase().includes(query) ||
            (event.underwriter && event.underwriter.toLowerCase().includes(query));

         // 2. Status Filter
         const status = getIpoEventStatus(event);
         const matchStatus = statusFilter === "all" || status === statusFilter;

         // 3. Underwriter Filter
         const matchUnderwriter =
            underwriterFilter === "all" ||
            (event.underwriter && event.underwriter.trim() === underwriterFilter);

         // 4. Year Filter
         const d = parseDateOnly(event.ipoDate);
         const year = d ? String(d.getFullYear()) : "";
         const matchYear = yearFilter === "all" || year === yearFilter;

         return matchQuery && matchStatus && matchUnderwriter && matchYear;
      });
   }, [sorted, searchQuery, statusFilter, underwriterFilter, yearFilter]);

   const moveEventCard = (sourceId: string, targetId: string) => {
      if (!sourceId || !targetId || sourceId === targetId) return;
      const visibleIds = filteredEvents.map((event) => event.id);
      const sourceIndex = visibleIds.indexOf(sourceId);
      const targetIndex = visibleIds.indexOf(targetId);
      if (sourceIndex < 0 || targetIndex < 0) return;

      const nextVisibleIds = [...visibleIds];
      const [movedId] = nextVisibleIds.splice(sourceIndex, 1);
      nextVisibleIds.splice(targetIndex, 0, movedId);

      const remainingIds = ipoEvents
         .map((event) => event.id)
         .filter((eventId) => !nextVisibleIds.includes(eventId));

      reorderIpoEvents([...nextVisibleIds, ...remainingIds]);
   };

   const renderEventForm = (submitLabel: string, submitIcon: ReactNode, mode: "inline" | "modal" = "inline") => (
      <form onSubmit={handleSubmit} noValidate>
         {/* Datalist BAE */}
         <datalist id="bae-list">
            <option value="PT Raya Saham Registra" />
            <option value="PT Datindo Entrycom" />
            <option value="PT Adimitra Jasa Korpora" />
            <option value="PT Ficomindo Buana Registrar" />
            <option value="PT Sinartama Gunita" />
            <option value="PT Bima Registra" />
         </datalist>

         {/* Seksi 1: Informasi Utama */}
         <div className="ipo-form-section">
            <h4 className="ipo-form-section-title">Informasi Utama</h4>
            <div className={`form-row ${mode === "modal" ? "ipo-grid-2" : "ipo-grid-4"}`}>
               <div className="form-group">
                  <label className="form-label" htmlFor="ipo-list-stock-code">Kode Saham *</label>
                  <input
                     id="ipo-list-stock-code"
                     className={`form-input${formErrors.stockCode ? " input-error" : ""}`}
                     placeholder="Contoh: WBSA"
                     value={form.stockCode}
                     onChange={(e) => { set("stockCode", e.target.value.toUpperCase()); setFormErrors(p => ({ ...p, stockCode: "" })); }}
                  />
                  {formErrors.stockCode && (
                     <div className="ipo-field-error"><Icons.AlertCircle size={12} />{formErrors.stockCode}</div>
                  )}
               </div>
               <div className="form-group">
                  <label className="form-label" htmlFor="ipo-list-underwriter">Underwriter (UW)</label>
                  <input
                     id="ipo-list-underwriter"
                     className="form-input"
                     placeholder="Contoh: NH Korindo / Mandiri Sekuritas"
                     value={form.underwriter}
                     onChange={(e) => set("underwriter", e.target.value)}
                  />
               </div>
               <div className="form-group">
                  <label className="form-label" htmlFor="ipo-list-target-board">Papan Pencatatan</label>
                  <CustomSelect
                     id="ipo-list-target-board"
                     value={form.targetBoard}
                     onChange={(value) => set("targetBoard", value)}
                     options={[
                        { value: "Utama", label: "Utama" },
                        { value: "Pengembangan", label: "Pengembangan" },
                        { value: "Akselerasi", label: "Akselerasi" },
                        { value: "Ekonomi Baru", label: "Ekonomi Baru" }
                     ]}
                  />
               </div>
               <div className="form-group">
                  <label className="form-label" htmlFor="ipo-list-sector">Sektor Industri</label>
                  <CustomSelect
                     id="ipo-list-sector"
                     value={form.sector}
                     onChange={(value) => set("sector", value)}
                     options={[
                        { value: "", label: "-- Pilih Sektor --" },
                        { value: "Energi", label: "Energi" },
                        { value: "Barang Baku", label: "Barang Baku" },
                        { value: "Industri", label: "Industri" },
                        { value: "Barang Konsumen Primer", label: "Barang Konsumen Primer" },
                        { value: "Barang Konsumen Non-Primer", label: "Barang Konsumen Non-Primer" },
                        { value: "Kesehatan", label: "Kesehatan" },
                        { value: "Keuangan", label: "Keuangan" },
                        { value: "Properti & Real Estat", label: "Properti & Real Estat" },
                        { value: "Teknologi", label: "Teknologi" },
                        { value: "Infrastruktur", label: "Infrastruktur" },
                        { value: "Transportasi & Logistik", label: "Transportasi & Logistik" },
                        { value: "Lainnya", label: "Lainnya" }
                     ]}
                  />
               </div>
            </div>
         </div>

         {/* Seksi 2: Detail Finansial & BAE */}
         <div className="ipo-form-section">
            <h4 className="ipo-form-section-title">Detail Finansial & BAE</h4>
            <div className={`form-row ${mode === "modal" ? "ipo-grid-2" : "ipo-grid-4"}`}>
               <div className="form-group">
                  <label className="form-label" htmlFor="ipo-list-offering-price">Harga Penawaran (Rp) *</label>
                  <input
                     id="ipo-list-offering-price"
                     type="number"
                     step="any"
                     min="1"
                     className={`form-input${formErrors.offeringPrice ? " input-error" : ""}`}
                     placeholder="Contoh: 100"
                     value={form.offeringPrice}
                     onChange={(e) => { set("offeringPrice", e.target.value); setFormErrors(p => ({ ...p, offeringPrice: "" })); }}
                  />
                  {formErrors.offeringPrice && (
                     <div className="ipo-field-error"><Icons.AlertCircle size={12} />{formErrors.offeringPrice}</div>
                  )}
               </div>
               <div className="form-group">
                  <label className="form-label" htmlFor="ipo-list-lot-pooling">Lot Pooling / Ritel (%)</label>
                  <input
                     id="ipo-list-lot-pooling"
                     type="number"
                     step="any"
                     min="0"
                     max="100"
                     className="form-input"
                     placeholder="Contoh: 2.5"
                     value={form.lotPoolingAmount}
                     onChange={(e) => set("lotPoolingAmount", e.target.value)}
                  />
               </div>
               <div className="form-group">
                  <label className="form-label" htmlFor="ipo-list-registrar">Registrar / BAE</label>
                  <input
                     id="ipo-list-registrar"
                     className="form-input"
                     placeholder="Ketik nama BAE..."
                     value={form.registrar}
                     onChange={(e) => set("registrar", e.target.value)}
                     list="bae-list"
                  />
               </div>
            </div>
         </div>

         {/* Seksi 3: Timeline Penting */}
         <div className="ipo-form-section">
            <h4 className="ipo-form-section-title">Timeline Penting</h4>
            <div className={`form-row ${mode === "modal" ? "ipo-grid-2" : "ipo-grid-4"}`}>
               <div className="form-group">
                  <label className="form-label" htmlFor="ipo-list-bb-start">Bookbuilding Mulai</label>
                  <CustomDatePicker
                     value={form.bookbuildingStartDate}
                     onChange={(date) => { set("bookbuildingStartDate", format(date, 'yyyy-MM-dd')); setFormErrors(p => ({ ...p, bookbuildingStartDate: "" })); }}
                  />
                  {formErrors.bookbuildingStartDate && (
                     <div className="ipo-field-error"><Icons.AlertCircle size={12} />{formErrors.bookbuildingStartDate}</div>
                  )}
               </div>
               <div className="form-group">
                  <label className="form-label" htmlFor="ipo-list-bb-end">Bookbuilding Selesai</label>
                  <CustomDatePicker
                     value={form.bookbuildingEndDate}
                     onChange={(date) => set("bookbuildingEndDate", format(date, 'yyyy-MM-dd'))}
                  />
               </div>
               <div className="form-group">
                  <label className="form-label" htmlFor="ipo-list-offering-date">Tanggal Penawaran</label>
                  <CustomDatePicker
                     value={form.offeringDate}
                     onChange={(date) => { set("offeringDate", format(date, 'yyyy-MM-dd')); setFormErrors(p => ({ ...p, offeringDate: "" })); }}
                  />
                  {formErrors.offeringDate && (
                     <div className="ipo-field-error"><Icons.AlertCircle size={12} />{formErrors.offeringDate}</div>
                  )}
               </div>
               <div className="form-group">
                  <label className="form-label" htmlFor="ipo-list-allotment-date">Tanggal Penjatahan (Allotment)</label>
                  <CustomDatePicker
                     value={form.allotmentDate}
                     onChange={(date) => set("allotmentDate", format(date, 'yyyy-MM-dd'))}
                  />
               </div>
               <div className="form-group">
                  <label className="form-label" htmlFor="ipo-list-refund-date">Tanggal Refund</label>
                  <CustomDatePicker
                     value={form.refundDate}
                     onChange={(date) => set("refundDate", format(date, 'yyyy-MM-dd'))}
                  />
               </div>
               <div className="form-group">
                  <label className="form-label" htmlFor="ipo-list-distribution-date">Tanggal Distribusi Saham</label>
                  <CustomDatePicker
                     value={form.distributionDate}
                     onChange={(date) => set("distributionDate", format(date, 'yyyy-MM-dd'))}
                  />
               </div>
               <div className="form-group">
                  <label className="form-label" htmlFor="ipo-list-ipo-date">Tanggal Listing / IPO *</label>
                  <CustomDatePicker
                     value={form.ipoDate}
                     onChange={(date) => { set("ipoDate", format(date, 'yyyy-MM-dd')); setFormErrors(p => ({ ...p, ipoDate: "" })); }}
                  />
                  {formErrors.ipoDate && (
                     <div className="ipo-field-error"><Icons.AlertCircle size={12} />{formErrors.ipoDate}</div>
                  )}
               </div>
            </div>
         </div>

         <div className="form-group ipo-margin-b16">
              <label className="form-label" htmlFor="ipo-list-notes">Catatan</label>
              <textarea
                 id="ipo-list-notes"
                 className="form-input"
                placeholder="Catatan singkat tentang IPO ini..."
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={mode === "modal" ? 4 : 1}
                style={{ resize: "vertical", minHeight: mode === "modal" ? 108 : undefined }}
             />
         </div>
         <div className="ipo-flex-wrap">
            <button type="submit" className="btn btn-primary">
               {submitIcon}
               {submitLabel}
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
               <Icons.X size={15} />
               Batal
            </button>
         </div>
      </form>
   );

   return (
      <div>
         <div className="page-header">
            <div>
               <h1
                  className="page-title"
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
               >
                  <Icons.Rocket size={26} style={{ color: "var(--accent-green)" }} />
                  IPO Journey
               </h1>
               <p className="page-subtitle">
                  Lacak partisipasi IPO dari berbagai akun dalam satu tempat
               </p>
            </div>
             <div className="ipo-actions-row">
                <button
                   className="btn btn-secondary"
                   onClick={() => navigate("/ipo/accounts")}
                >
                  <Icons.Users size={16} />
                  Master Akun
               </button>
               <button
                   className="btn btn-secondary"
                   onClick={() => navigate("/ipo/summary")}
                >
                  <Icons.BarChart3 size={16} />
                  Ringkasan IPO
               </button>
               {canWrite && (
                  <button
                     className="btn btn-primary"
                     onClick={() => {
                        if (showForm || editingEvent) {
                           handleCancel();
                        } else {
                           handleOpenAdd();
                        }
                     }}
                  >
                     {showForm || editingEvent ? <Icons.X size={16} /> : <Icons.Plus size={16} />}
                     {showForm || editingEvent ? "Batal" : "Buat IPO Baru"}
                  </button>
               )}
            </div>
         </div>

         {showForm && !editingEvent && (
              <div className="card ipo-card-accent-wide">
                <div className="card-header">
                   <h3 className="card-title">
                      <Icons.PlusCircle size={16} style={{ color: "var(--accent-green)" }} />
                      Buat IPO Event Baru
                   </h3>
                </div>
                <div className="card-body">
                   {renderEventForm(" Buat & Mulai Catat", <Icons.Rocket size={15} />)}
                </div>
              </div>
         )}

         {sorted.length > 0 && (
            <div className="ipo-filter-bar" style={{ marginBottom: 24 }}>
               <div className="form-group ipo-filter-search" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Cari</label>
                  <div className="ipo-search-input-wrapper">
                     <Icons.Search className="ipo-search-icon" size={16} />
                     <input
                        type="text"
                        className="form-input ipo-search-input"
                        placeholder="Cari Kode Saham / Underwriter..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                     />
                  </div>
               </div>
               <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Status</label>
                  <CustomSelect
                     value={statusFilter}
                     onChange={(value) => setStatusFilter(value)}
                     options={[
                        { value: "all", label: "Semua Status" },
                        { value: "active", label: "Active" },
                        { value: "upcoming", label: "Upcoming" },
                        { value: "completed", label: "Completed" }
                     ]}
                  />
               </div>
               <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Underwriter</label>
                  <CustomSelect
                     value={underwriterFilter}
                     onChange={(value) => setUnderwriterFilter(value)}
                     options={[
                        { value: "all", label: "Semua Underwriter" },
                        ...uniqueUnderwriters.map((uw) => ({ value: uw, label: uw }))
                     ]}
                  />
               </div>
               <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.72rem' }}>Tahun</label>
                  <CustomSelect
                     value={yearFilter}
                     onChange={(value) => setYearFilter(value)}
                     options={[
                        { value: "all", label: "Semua Tahun" },
                        ...uniqueYears.map((yr) => ({ value: yr, label: yr }))
                     ]}
                  />
               </div>
            </div>
         )}

         {sorted.length === 0 ? (
            <div className="empty-state">
               <div className="empty-state-icon ipo-empty-icon">
                  <Icons.Rocket size={48} style={{ color: "var(--text-muted)" }} />
               </div>
               <div className="empty-state-title">Belum ada IPO Journey</div>
               <div className="empty-state-desc">
                  Buat IPO event pertama Anda untuk mulai mencatat partisipasi dari berbagai akun.
               </div>
               {canWrite && (
                  <button
                     className="btn btn-primary ipo-empty-cta"
                     onClick={handleOpenAdd}
                  >
                     <Icons.Plus size={16} /> Buat IPO Pertama
                  </button>
               )}
            </div>
         ) : filteredEvents.length === 0 ? (
            <div className="empty-state">
               <div className="empty-state-icon ipo-empty-icon">
                  <Icons.Search size={48} style={{ color: "var(--text-muted)" }} />
               </div>
               <div className="empty-state-title">Hasil filter tidak ditemukan</div>
               <div className="empty-state-desc">
                  Tidak ada IPO Journey yang cocok dengan kriteria filter Anda. Silakan ubah filter atau cari dengan kata kunci lain.
               </div>
               <button
                  className="btn btn-secondary ipo-empty-cta"
                  onClick={() => {
                     setSearchQuery("");
                     setStatusFilter("all");
                     setUnderwriterFilter("all");
                     setYearFilter("all");
                  }}
               >
                  Reset Filter
               </button>
            </div>
         ) : (
            <div className="ipo-list-grid">
               {filteredEvents.map((event: IpoEvent) => {
                  const summary = getSummary(event.id);
                  const isProfit = summary.totalReturn >= 0;
                  const hasEntries = summary.accountCount > 0;
                  const status = getIpoEventStatus(event);
                  const todayHighlight = isIpoToday(event);
                  const countdown = getCountdownInfo(event);
                  const borderColor = todayHighlight
                     ? "4px solid #f59e0b"
                     : hasEntries
                     ? `4px solid ${isProfit ? "var(--accent-green)" : "var(--accent-red)"}`
                     : "4px solid var(--border-color)";

                  // Label dan class untuk badge status
                  const statusLabel = status === "upcoming" ? "Upcoming" : status === "active" ? "Active" : "Completed";
                  const statusBadgeClass = todayHighlight ? "today" : status;

                  return (
                     <div
                        key={event.id}
                        className={`bento-card ipo-list-card${todayHighlight ? " today-highlight" : ""} ${draggedEventId === event.id ? "is-dragging" : ""} ${dragOverEventId === event.id ? "is-drag-over" : ""}`}
                        style={{ borderLeft: borderColor }}
                        draggable={canWrite}
                        onDragStart={() => {
                           if (!canWrite) return;
                           setDraggedEventId(event.id);
                           setDragOverEventId(event.id);
                        }}
                        onDragOver={(dragEvent) => {
                           if (!canWrite) return;
                           dragEvent.preventDefault();
                           if (draggedEventId && draggedEventId !== event.id) {
                              setDragOverEventId(event.id);
                           }
                        }}
                        onDrop={(dragEvent) => {
                           if (!canWrite) return;
                           dragEvent.preventDefault();
                           moveEventCard(draggedEventId || "", event.id);
                           setDraggedEventId(null);
                           setDragOverEventId(null);
                        }}
                        onDragEnd={() => {
                           setDraggedEventId(null);
                           setDragOverEventId(null);
                        }}
                        onClick={() => navigate(`/ipo/${event.id}`)}
                     >
                        <div className="ipo-list-head">
                           <div>
                              <div className="ipo-list-meta-row">
                                 <span className="ipo-badge-pill ipo-badge-stock ipo-badge-stock-sm">
                                    {event.stockCode}
                                 </span>
                                 <span className="ipo-small-label">IPO</span>
                                 <span className={`ipo-event-status-badge ${statusBadgeClass}`}>
                                    {todayHighlight ? (
                                       <><Icons.Zap size={9} />Hari Ini!</>
                                    ) : status === "upcoming" ? (
                                       <><Icons.Clock size={9} />{statusLabel}</>
                                    ) : status === "active" ? (
                                       <><Icons.Rocket size={9} />{statusLabel}</>
                                    ) : (
                                       <><Icons.CheckCircle size={9} />{statusLabel}</>
                                    )}
                                 </span>
                              </div>
                              <div className="ipo-list-submeta">
                                 {event.underwriter
                                    ? `UW: ${event.underwriter} · `
                                    : ""}
                                 {(event.offeringStartDate || event.offeringEndDate || event.offeringDate)
                                    ? `Penawaran: ${formatOfferingRange(event.offeringStartDate || event.offeringDate, event.offeringEndDate || event.offeringDate)} · `
                                    : ""}
                                 IPO: {formatDate(event.ipoDate)} &nbsp;·&nbsp; Harga:{" "}
                                 <strong>{formatRupiah(event.offeringPrice)}</strong>
                              </div>
                              {countdown && (
                                 <div className={`ipo-countdown ${countdown.cls}`}>
                                    {countdown.cls === "today-label" || countdown.cls === "urgent" && /Hari Ini/i.test(countdown.label)
                                       ? <Icons.Zap size={11} />
                                       : <Icons.Timer size={11} />}
                                    {stripLeadingEmojiLabel(countdown.label)}
                                 </div>
                              )}
                           </div>
                           <div className="ipo-list-tools" onClick={(e) => e.stopPropagation()}>
                              {canWrite && (
                                 <button
                                    type="button"
                                    className="ipo-drag-handle"
                                    title="Geser untuk mengatur posisi card"
                                    aria-label={`Geser posisi card IPO ${event.stockCode}`}
                                 >
                                    <Icons.ArrowRightLeft size={14} />
                                 </button>
                              )}
                              {canWrite && (
                                 <>
                                    <button
                                       className="btn btn-ghost btn-sm ipo-btn-tool ipo-btn-tool-copy"
                                       onClick={() => handleOpenEdit(event)}
                                       title="Edit IPO"
                                       aria-label={`Edit IPO ${event.stockCode}`}
                                    >
                                       <Icons.Edit3 size={14} />
                                    </button>
                                    <button
                                       className="btn btn-ghost btn-sm ipo-btn-tool ipo-btn-tool-copy"
                                       onClick={() => handleDuplicateEvent(event)}
                                       title="Duplikat IPO ini (salin semua akun)"
                                       aria-label={`Duplikat IPO ${event.stockCode}`}
                                    >
                                       <Icons.Copy size={14} />
                                    </button>
                                    <button
                                       className="btn btn-ghost btn-sm ipo-btn-tool ipo-btn-close"
                                       onClick={async () => {
                                          const isConfirmed = await confirm(
                                             `Apakah Anda yakin ingin menghapus IPO ${event.stockCode}? Semua catatan akun dalam IPO ini juga akan dihapus. Tindakan ini tidak dapat dibatalkan.`,
                                             {
                                                title: "Hapus IPO Event",
                                                severity: "danger",
                                                confirmText: "Hapus",
                                             },
                                          );
                                          if (isConfirmed) {
                                             deleteIpoEvent(event.id);
                                          }
                                       }}
                                       title="Hapus IPO"
                                       aria-label={`Hapus IPO ${event.stockCode}`}
                                    >
                                       <Icons.Trash2 size={14} />
                                    </button>
                                 </>
                              )}
                           </div>
                        </div>

                        {hasEntries ? (
                           <div className="ipo-profit-block">
                              <div className="ipo-profit-title">
                                 Total Profit / Loss
                              </div>
                              <div
                                 className={`font-mono ${isProfit ? "text-profit" : "text-loss"}`}
                                 style={{
                                    fontSize: "1.7rem",
                                    fontWeight: 800,
                                    letterSpacing: "-0.03em",
                                    ...blurStyle,
                                 }}
                              >
                                 {isProfit ? "+" : ""}
                                 {formatRupiah(summary.totalReturn)}
                              </div>
                              <div className="ipo-profit-avg" style={{ color: isProfit ? "var(--accent-green)" : "var(--accent-red)", ...blurStyle }}>
                                 {isProfit ? "+" : ""}
                                 {summary.avgReturnPct.toFixed(2)}% avg return
                              </div>
                           </div>
                        ) : (
                           <div className="ipo-profit-empty">
                              Belum ada catatan akun - klik untuk mulai mengisi
                           </div>
                        )}

                        <div
                           style={{
                              display: "flex",
                              gap: 12,
                              borderTop: "1px solid var(--border-color)",
                              paddingTop: 12,
                           }}
                        >
                           <div style={{ textAlign: "center", flex: 1 }}>
                              <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                                 {summary.accountCount}
                              </div>
                              <div
                                 style={{
                                    fontSize: "0.68rem",
                                    color: "var(--text-muted)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                  }}
                              >
                                 Akun
                              </div>
                           </div>
                           <div style={{ textAlign: "center", flex: 1 }}>
                              <div
                                 style={{
                                    fontSize: "1.2rem",
                                    fontWeight: 800,
                                    color: "var(--accent-green)",
                                 }}
                              >
                                 {summary.sellCount}
                              </div>
                              <div
                                 style={{
                                    fontSize: "0.68rem",
                                    color: "var(--text-muted)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                 }}
                              >
                                 Sell
                              </div>
                           </div>
                           <div style={{ textAlign: "center", flex: 1 }}>
                              <div
                                 style={{
                                    fontSize: "1.2rem",
                                    fontWeight: 800,
                                    color: "var(--accent-yellow)",
                                 }}
                              >
                                 {summary.keepCount}
                              </div>
                              <div
                                 style={{
                                    fontSize: "0.68rem",
                                    color: "var(--text-muted)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                 }}
                              >
                                 Keep
                              </div>
                           </div>
                           {hasEntries && (
                              <div style={{ textAlign: "center", flex: 1 }}>
                                 <div
                                    style={{ fontSize: "1.2rem", fontWeight: 800, ...blurStyle }}
                                 >
                                    {formatRupiah(summary.totalCapital).replace("Rp", "").trim()}
                                 </div>
                                 <div
                                    style={{
                                       fontSize: "0.68rem",
                                       color: "var(--text-muted)",
                                       textTransform: "uppercase",
                                       letterSpacing: "0.05em",
                                    }}
                                 >
                                    Modal
                                 </div>
                              </div>
                           )}
                        </div>

                        {event.notes && (
                           <div
                              style={{
                                 marginTop: 10,
                                 fontSize: "0.75rem",
                                 color: "var(--text-secondary)",
                                 borderTop: "1px solid var(--border-color)",
                                 paddingTop: 8,
                                 display: "flex",
                                 alignItems: "flex-start",
                                 gap: 6,
                              }}
                           >
                              <Icons.NotebookPen size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                              <span>{event.notes}</span>
                           </div>
                        )}

                     </div>
                  );
               })}
            </div>
         )}

         {editingEvent && canWrite && (
            <div className="modal-overlay ipo-modal-overlay" onClick={handleCancel}>
               <div className="modal ipo-modal ipo-modal-wide" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header ipo-modal-header">
                     <div>
                        <h3 style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                           <Icons.Edit3 size={17} style={{ color: "var(--accent-blue-light)" }} />
                           Edit IPO Event
                        </h3>
                        <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-secondary)" }}>
                           Rapikan detail kode saham, tanggal, harga penawaran, dan catatan IPO tanpa mengganggu card di belakang.
                        </p>
                     </div>
                     <button
                        className="btn btn-ghost btn-icon ipo-btn-close"
                        onClick={handleCancel}
                        aria-label="Tutup modal edit IPO"
                     >
                        <Icons.X size={18} />
                     </button>
                  </div>
                  <div className="modal-body ipo-modal-body">
                     {renderEventForm(" Simpan Perubahan", <Icons.Save size={15} />, "modal")}
                  </div>
               </div>
            </div>
         )}
      </div>
   );
}
