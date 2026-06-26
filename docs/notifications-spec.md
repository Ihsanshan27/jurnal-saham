# Notification Center Spec

## Ringkasan
Dokumen ini menjadi sumber kebenaran untuk desain **notification center in-app** di `Jurnal Saham`.

Tujuan v1:
- Menentukan jenis notifikasi lintas modul yang benar-benar berguna bagi pengguna.
- Membedakan dengan jelas notifikasi yang masuk ke `notification center` dan feedback instan yang cukup memakai `toast`.
- Menyediakan trigger, prioritas, CTA, dan aturan lifecycle yang cukup lengkap agar implementer tidak perlu menebak.

Batasan v1:
- Hanya untuk **in-app notification**.
- `toast` yang sudah ada tetap dipertahankan.
- Email, push notification, WhatsApp, dan channel eksternal lain belum masuk implementasi awal.

---

## 1. Tujuan Sistem Notifikasi

### Masalah yang ingin diselesaikan
Saat ini aplikasi sudah memiliki `toast` untuk feedback aksi, tetapi belum memiliki pusat notifikasi yang bisa:
- Menyimpan reminder penting untuk dilihat ulang.
- Menarik perhatian pada deadline, risiko, dan data yang belum lengkap.
- Mengarahkan user ke tindakan yang tepat lewat CTA yang konsisten.

### Sasaran produk v1
Notification center harus membantu user:
- Mengetahui apa yang perlu diperhatikan hari ini.
- Menemukan item yang butuh tindakan lanjut.
- Menghindari missed deadline pada IPO, trading, finance, dan report.

### Prinsip copy
- Bahasa Indonesia.
- Ringkas, profesional, dan langsung ke aksi.
- Hindari kalimat panjang, istilah ambigu, dan nada dramatis.

---

## 2. Model Notifikasi V1

### Pemisahan `toast` vs `notification center`
- `Toast` dipakai untuk hasil aksi yang baru saja dilakukan user.
  - Contoh: simpan berhasil, export selesai, hapus gagal, sinkronisasi sukses.
- `Notification center` dipakai untuk reminder, deadline, risiko, dan kondisi sistem yang perlu bisa dilihat ulang.
- `Hybrid` dipakai untuk kejadian penting yang perlu muncul real-time **dan** tetap tersimpan di center.
  - Contoh: IPO hari ini, gagal sinkron data server lalu fallback ke cache lokal.

### Severity
- `info`: insight atau reminder non-mendesak.
- `warning`: butuh perhatian dalam waktu dekat.
- `danger`: risiko data, deadline hari ini, kondisi rugi serius, atau pelanggaran batas/rule penting.

### Bentuk item notifikasi
Semua notifikasi v1 harus bisa dipetakan ke shape berikut:

| Field | Tipe | Keterangan |
| --- | --- | --- |
| `id` | `string` | ID tipe notifikasi, stabil dan unik. |
| `module` | `string` | Modul sumber notifikasi. |
| `title` | `string` | Judul pendek notifikasi. |
| `message` | `string` | Deskripsi singkat, maksimal 1-2 kalimat pendek. |
| `severity` | `info \| warning \| danger` | Tingkat urgensi. |
| `trigger` | `string` | Kondisi bisnis/data yang memicu notifikasi. |
| `when_to_show` | `string` | Kapan notifikasi dibuat/ditampilkan. |
| `cta_primary` | `string` | Label aksi utama. |
| `cta_target` | `string` | Halaman/fitur tujuan CTA. |
| `dedupe_rule` | `string` | Aturan agar notifikasi sejenis tidak berulang tanpa alasan. |
| `auto_resolve_rule` | `string` | Kapan notifikasi dianggap selesai/tertutup otomatis. |
| `center_only_or_toast` | `center_only \| toast_only \| hybrid` | Channel tampil v1. |

### Aturan umum lifecycle
- Satu kondisi bisnis menghasilkan maksimal satu notifikasi aktif per entitas relevan.
- Item bisa ditandai `read`, tetapi status `read` tidak menghapus kondisi masalah.
- Item `resolved` hilang dari daftar aktif jika kondisi sumber sudah tidak berlaku.
- Item `expired` dipakai untuk reminder berbasis tanggal yang sudah lewat dan tidak lagi relevan.

---

## 3. Katalog Notifikasi Per Modul

## IPO

| Field | Value |
| --- | --- |
| `id` | `ipo-offering-today` |
| `module` | `IPO` |
| `title` | `Penawaran IPO hari ini` |
| `message` | `Masa penawaran untuk {stockCode} berlangsung hari ini. Pastikan entry akun sudah siap.` |
| `severity` | `warning` |
| `trigger` | `ipoEvents.offeringDate === today` |
| `when_to_show` | `Saat tanggal hari ini sama dengan offeringDate event IPO.` |
| `cta_primary` | `Buka IPO` |
| `cta_target` | `/ipo/{eventId}` |
| `dedupe_rule` | `Satu notifikasi aktif per event per hari.` |
| `auto_resolve_rule` | `Resolve setelah tanggal offering lewat.` |
| `center_only_or_toast` | `hybrid` |

| Field | Value |
| --- | --- |
| `id` | `ipo-listing-today` |
| `module` | `IPO` |
| `title` | `IPO listing hari ini` |
| `message` | `{stockCode} listing hari ini. Tinjau hasil partisipasi dan rencana aksi akun.` |
| `severity` | `danger` |
| `trigger` | `ipoEvents.ipoDate === today` |
| `when_to_show` | `Saat tanggal hari ini sama dengan ipoDate event IPO.` |
| `cta_primary` | `Lihat Detail` |
| `cta_target` | `/ipo/{eventId}` |
| `dedupe_rule` | `Satu notifikasi aktif per event per hari.` |
| `auto_resolve_rule` | `Resolve setelah hari listing berakhir.` |
| `center_only_or_toast` | `hybrid` |

| Field | Value |
| --- | --- |
| `id` | `ipo-milestone-near` |
| `module` | `IPO` |
| `title` | `Tanggal penting IPO mendekat` |
| `message` | `Allotment, refund, atau distribusi untuk {stockCode} akan segera terjadi.` |
| `severity` | `info` |
| `trigger` | `allotmentDate/refundDate/distributionDate berada pada H-3 sampai H-0.` |
| `when_to_show` | `Saat salah satu milestone penting berada dalam jendela pengingat.` |
| `cta_primary` | `Cek Jadwal` |
| `cta_target` | `/ipo/{eventId}` |
| `dedupe_rule` | `Satu notifikasi aktif per event per milestone aktif.` |
| `auto_resolve_rule` | `Resolve setelah milestone terkait lewat.` |
| `center_only_or_toast` | `center_only` |

| Field | Value |
| --- | --- |
| `id` | `ipo-active-without-entries` |
| `module` | `IPO` |
| `title` | `IPO aktif belum punya entry akun` |
| `message` | `Event {stockCode} sudah aktif tetapi belum memiliki catatan partisipasi akun.` |
| `severity` | `warning` |
| `trigger` | `IPO status active/upcoming dan ipoEntries untuk event = 0.` |
| `when_to_show` | `Saat event masih relevan tetapi belum punya entry akun.` |
| `cta_primary` | `Tambah Entry` |
| `cta_target` | `/ipo/{eventId}` |
| `dedupe_rule` | `Satu notifikasi aktif per event.` |
| `auto_resolve_rule` | `Resolve saat minimal satu entry ditambahkan atau event selesai.` |
| `center_only_or_toast` | `center_only` |

| Field | Value |
| --- | --- |
| `id` | `ipo-missing-key-dates` |
| `module` | `IPO` |
| `title` | `Data tanggal IPO belum lengkap` |
| `message` | `Event {stockCode} belum memiliki satu atau lebih tanggal penting IPO.` |
| `severity` | `info` |
| `trigger` | `Event IPO aktif tidak memiliki offeringDate/allotmentDate/refundDate/distributionDate yang seharusnya diisi.` |
| `when_to_show` | `Saat event aktif masih memiliki field tanggal penting kosong.` |
| `cta_primary` | `Lengkapi Data` |
| `cta_target` | `/ipo/{eventId}` |
| `dedupe_rule` | `Satu notifikasi aktif per event.` |
| `auto_resolve_rule` | `Resolve saat field yang diwajibkan tim produk sudah terisi.` |
| `center_only_or_toast` | `center_only` |

| Field | Value |
| --- | --- |
| `id` | `ipo-inactive-account-still-referenced` |
| `module` | `IPO` |
| `title` | `Akun IPO nonaktif masih dipakai histori` |
| `message` | `Ada akun IPO nonaktif yang masih memiliki riwayat partisipasi dan mungkin perlu ditinjau.` |
| `severity` | `info` |
| `trigger` | `ipoAccounts.isActive === false && account pernah dipakai di ipoEntries.` |
| `when_to_show` | `Saat akun IPO nonaktif masih punya referensi histori.` |
| `cta_primary` | `Buka Akun IPO` |
| `cta_target` | `/ipo/accounts` |
| `dedupe_rule` | `Satu notifikasi aktif per accountId.` |
| `auto_resolve_rule` | `Resolve jika akun diaktifkan kembali atau diputus dari kebutuhan review.` |
| `center_only_or_toast` | `center_only` |

## Trades

| Field | Value |
| --- | --- |
| `id` | `trade-near-stop-loss` |
| `module` | `Trades` |
| `title` | `Harga mendekati stop loss` |
| `message` | `{stockCode} sudah dekat dengan batas stop loss. Tinjau rencana keluar.` |
| `severity` | `warning` |
| `trigger` | `Harga live berada dalam ambang dekat stop loss pada trade terbuka.` |
| `when_to_show` | `Saat marketPrices tersedia dan trade terbuka punya stop loss.` |
| `cta_primary` | `Lihat Trade` |
| `cta_target` | `/trades/{tradeId}` |
| `dedupe_rule` | `Satu notifikasi aktif per tradeId selama kondisi near-stop-loss masih sama.` |
| `auto_resolve_rule` | `Resolve saat harga menjauh dari ambang, trade ditutup, atau stop loss diubah.` |
| `center_only_or_toast` | `center_only` |

| Field | Value |
| --- | --- |
| `id` | `trade-target-hit` |
| `module` | `Trades` |
| `title` | `Harga menyentuh target profit` |
| `message` | `{stockCode} telah mencapai area target profit. Evaluasi realisasi atau trailing plan.` |
| `severity` | `info` |
| `trigger` | `Harga live menyentuh atau melewati target profit pada trade terbuka.` |
| `when_to_show` | `Saat marketPrices tersedia dan target profit valid.` |
| `cta_primary` | `Review Trade` |
| `cta_target` | `/trades/{tradeId}` |
| `dedupe_rule` | `Satu notifikasi aktif per tradeId per target aktif.` |
| `auto_resolve_rule` | `Resolve saat trade ditutup atau target diperbarui ke level baru.` |
| `center_only_or_toast` | `center_only` |

| Field | Value |
| --- | --- |
| `id` | `trade-open-without-review` |
| `module` | `Trades` |
| `title` | `Trade terbuka belum punya review lanjutan` |
| `message` | `Trade {stockCode} masih terbuka tetapi review atau rencana exit belum lengkap.` |
| `severity` | `info` |
| `trigger` | `Trade terbuka belum memiliki data review atau rencana exit yang disepakati produk.` |
| `when_to_show` | `Setelah trade terbuka melewati ambang waktu review minimal.` |
| `cta_primary` | `Isi Review` |
| `cta_target` | `/trades/{tradeId}` |
| `dedupe_rule` | `Satu notifikasi aktif per tradeId.` |
| `auto_resolve_rule` | `Resolve saat review/rencana exit lengkap atau trade ditutup.` |
| `center_only_or_toast` | `center_only` |

| Field | Value |
| --- | --- |
| `id` | `trade-daily-limit-near-or-hit` |
| `module` | `Trades` |
| `title` | `Batas transaksi harian terpantau` |
| `message` | `Aktivitas trade hari ini mendekati atau sudah mencapai batas harian yang ditetapkan.` |
| `severity` | `danger` |
| `trigger` | `Jumlah trade pada satu hari mendekati atau melewati settings.behaviorDailyTradeLimit.` |
| `when_to_show` | `Saat user masih aktif bertransaksi pada tanggal yang sama.` |
| `cta_primary` | `Lihat Transaksi` |
| `cta_target` | `/trades` |
| `dedupe_rule` | `Satu notifikasi aktif per tanggal per user.` |
| `auto_resolve_rule` | `Resolve saat hari berganti.` |
| `center_only_or_toast` | `hybrid` |

| Field | Value |
| --- | --- |
| `id` | `trade-draft-incomplete` |
| `module` | `Trades` |
| `title` | `Draft trade belum selesai` |
| `message` | `Masih ada draft input atau edit trade yang belum diselesaikan.` |
| `severity` | `info` |
| `trigger` | `tradeFormDraft atau tradeEditDraft berisi data yang belum kosong.` |
| `when_to_show` | `Saat draft masih tersimpan dan user kembali ke modul trading.` |
| `cta_primary` | `Lanjutkan Draft` |
| `cta_target` | `/trades/new` atau `/trades/{tradeId}` |
| `dedupe_rule` | `Satu notifikasi aktif per jenis draft.` |
| `auto_resolve_rule` | `Resolve saat draft disimpan, dibatalkan, atau dibersihkan.` |
| `center_only_or_toast` | `center_only` |

## Portfolio

| Field | Value |
| --- | --- |
| `id` | `portfolio-loss-threshold` |
| `module` | `Portfolio` |
| `title` | `Posisi rugi melewati ambang` |
| `message` | `Salah satu posisi terbuka melewati ambang kerugian yang perlu ditinjau.` |
| `severity` | `danger` |
| `trigger` | `Floating loss posisi melewati threshold produk atau setting risiko.` |
| `when_to_show` | `Saat harga live tersedia dan posisi terbuka aktif.` |
| `cta_primary` | `Buka Portofolio` |
| `cta_target` | `/portfolio` |
| `dedupe_rule` | `Satu notifikasi aktif per posisi.` |
| `auto_resolve_rule` | `Resolve saat rugi kembali di bawah ambang atau posisi ditutup.` |
| `center_only_or_toast` | `center_only` |

| Field | Value |
| --- | --- |
| `id` | `portfolio-overconcentration` |
| `module` | `Portfolio` |
| `title` | `Konsentrasi portofolio terlalu besar` |
| `message` | `Eksposur pada satu emiten sudah terlalu dominan dibanding total portofolio.` |
| `severity` | `warning` |
| `trigger` | `Bobot satu emiten melebihi threshold konsentrasi.` |
| `when_to_show` | `Saat komposisi portofolio dihitung ulang.` |
| `cta_primary` | `Tinjau Alokasi` |
| `cta_target` | `/portfolio` |
| `dedupe_rule` | `Satu notifikasi aktif per emiten dominan.` |
| `auto_resolve_rule` | `Resolve saat bobot kembali di bawah threshold.` |
| `center_only_or_toast` | `center_only` |

| Field | Value |
| --- | --- |
| `id` | `portfolio-price-refresh-stale` |
| `module` | `Portfolio` |
| `title` | `Harga live belum terbarui` |
| `message` | `Data harga live belum berhasil diperbarui atau sudah terlalu lama.` |
| `severity` | `warning` |
| `trigger` | `Fetch harga gagal atau timestamp harga sudah stale.` |
| `when_to_show` | `Saat refresh harga gagal atau hasil harga dianggap kadaluarsa.` |
| `cta_primary` | `Refresh Harga` |
| `cta_target` | `/portfolio` |
| `dedupe_rule` | `Satu notifikasi aktif per sesi stale.` |
| `auto_resolve_rule` | `Resolve saat refresh harga berikutnya berhasil.` |
| `center_only_or_toast` | `hybrid` |

## Finance

| Field | Value |
| --- | --- |
| `id` | `finance-account-inactive-mutation` |
| `module` | `Finance` |
| `title` | `Rekening aktif lama tanpa mutasi` |
| `message` | `Ada rekening finance aktif yang belum memiliki mutasi dalam periode cukup lama.` |
| `severity` | `info` |
| `trigger` | `financeAccounts aktif tanpa financeTransactions baru dalam window waktu yang ditentukan.` |
| `when_to_show` | `Saat halaman finance dibuka atau summary dihitung.` |
| `cta_primary` | `Buka Finance Tracker` |
| `cta_target` | `/finance` |
| `dedupe_rule` | `Satu notifikasi aktif per accountId.` |
| `auto_resolve_rule` | `Resolve saat ada transaksi baru atau rekening dinonaktifkan.` |
| `center_only_or_toast` | `center_only` |

| Field | Value |
| --- | --- |
| `id` | `finance-transfer-sync-problem` |
| `module` | `Finance` |
| `title` | `Transfer internal perlu ditinjau` |
| `message` | `Ada transfer internal dengan pasangan data yang tidak lengkap atau gagal sinkron.` |
| `severity` | `danger` |
| `trigger` | `Transfer group tidak memiliki pasangan transaksi lengkap atau inkonsisten.` |
| `when_to_show` | `Saat ledger atau validasi transaksi finance dijalankan.` |
| `cta_primary` | `Periksa Ledger` |
| `cta_target` | `/finance` atau `/finance/{accountId}` |
| `dedupe_rule` | `Satu notifikasi aktif per transferGroupId.` |
| `auto_resolve_rule` | `Resolve saat pasangan transfer sudah lengkap atau transaksi dihapus.` |
| `center_only_or_toast` | `hybrid` |

| Field | Value |
| --- | --- |
| `id` | `finance-balance-low-or-negative` |
| `module` | `Finance` |
| `title` | `Saldo rekening perlu perhatian` |
| `message` | `Saldo rekening mendekati nol atau sudah negatif.` |
| `severity` | `warning` |
| `trigger` | `getFinanceAccountCurrentBalance(accountId) berada di bawah ambang minimum.` |
| `when_to_show` | `Saat saldo terkini dihitung.` |
| `cta_primary` | `Lihat Rekening` |
| `cta_target` | `/finance/{accountId}` |
| `dedupe_rule` | `Satu notifikasi aktif per accountId per status threshold.` |
| `auto_resolve_rule` | `Resolve saat saldo kembali aman.` |
| `center_only_or_toast` | `center_only` |

## Reports

| Field | Value |
| --- | --- |
| `id` | `report-link-disabled` |
| `module` | `Reports` |
| `title` | `Link report nonaktif` |
| `message` | `Salah satu link report saat ini tidak aktif dan mungkin perlu diaktifkan kembali.` |
| `severity` | `info` |
| `trigger` | `Report sharing link memiliki status nonaktif.` |
| `when_to_show` | `Saat user membuka modul report atau saat status link berubah.` |
| `cta_primary` | `Buka Reports` |
| `cta_target` | `/reports` |
| `dedupe_rule` | `Satu notifikasi aktif per report link nonaktif.` |
| `auto_resolve_rule` | `Resolve saat link diaktifkan kembali atau dihapus.` |
| `center_only_or_toast` | `center_only` |

| Field | Value |
| --- | --- |
| `id` | `report-snapshot-stale` |
| `module` | `Reports` |
| `title` | `Snapshot report sudah lama` |
| `message` | `Snapshot report belum diperbarui dalam periode yang cukup lama.` |
| `severity` | `warning` |
| `trigger` | `Timestamp snapshot report melebihi ambang stale.` |
| `when_to_show` | `Saat daftar report dimuat.` |
| `cta_primary` | `Perbarui Snapshot` |
| `cta_target` | `/reports` |
| `dedupe_rule` | `Satu notifikasi aktif per reportId.` |
| `auto_resolve_rule` | `Resolve saat snapshot berhasil diperbarui.` |
| `center_only_or_toast` | `center_only` |

## Admin / Workspace

| Field | Value |
| --- | --- |
| `id` | `workspace-invite-pending` |
| `module` | `Admin` |
| `title` | `Invite member masih pending` |
| `message` | `Masih ada undangan workspace yang belum ditindaklanjuti.` |
| `severity` | `info` |
| `trigger` | `Ada invite/member workspace dengan status pending.` |
| `when_to_show` | `Saat admin membuka halaman workspace.` |
| `cta_primary` | `Kelola Workspace` |
| `cta_target` | `/admin/workspaces` |
| `dedupe_rule` | `Satu notifikasi aktif per workspace dengan invite pending.` |
| `auto_resolve_rule` | `Resolve saat invite selesai, dibatalkan, atau kedaluwarsa.` |
| `center_only_or_toast` | `center_only` |

| Field | Value |
| --- | --- |
| `id` | `workspace-role-changed` |
| `module` | `Admin` |
| `title` | `Role atau akses berubah` |
| `message` | `Ada perubahan role atau hak akses yang perlu diketahui pengguna/admin.` |
| `severity` | `warning` |
| `trigger` | `Role user atau akses jurnal/workspace berubah.` |
| `when_to_show` | `Setelah perubahan akses berhasil tersimpan.` |
| `cta_primary` | `Lihat Pengaturan` |
| `cta_target` | `/settings` atau `/admin/users` |
| `dedupe_rule` | `Satu notifikasi aktif per perubahan akses terbaru yang belum dibaca.` |
| `auto_resolve_rule` | `Resolve setelah dibaca atau digantikan perubahan akses baru.` |
| `center_only_or_toast` | `hybrid` |

| Field | Value |
| --- | --- |
| `id` | `admin-audit-cleanup-failed` |
| `module` | `Admin` |
| `title` | `Cleanup audit log gagal` |
| `message` | `Pembersihan audit log lama gagal dan perlu ditinjau.` |
| `severity` | `danger` |
| `trigger` | `Proses cleanup audit retention melempar error.` |
| `when_to_show` | `Saat cleanup dipicu dan gagal.` |
| `cta_primary` | `Lihat Audit Log` |
| `cta_target` | `/admin/audit-logs` |
| `dedupe_rule` | `Satu notifikasi aktif per kegagalan cleanup terbaru.` |
| `auto_resolve_rule` | `Resolve saat cleanup berikutnya berhasil.` |
| `center_only_or_toast` | `hybrid` |

## System

| Field | Value |
| --- | --- |
| `id` | `system-sync-fallback-local-cache` |
| `module` | `System` |
| `title` | `Koneksi server gagal, memakai cache lokal` |
| `message` | `Sinkronisasi ke server gagal sehingga aplikasi sementara memakai data cache lokal.` |
| `severity` | `danger` |
| `trigger` | `Load/sync remote data gagal dan DataContext melakukan fallback ke local cache.` |
| `when_to_show` | `Saat fallback ke cache lokal benar-benar terjadi.` |
| `cta_primary` | `Lihat Status Data` |
| `cta_target` | `/settings` |
| `dedupe_rule` | `Satu notifikasi aktif per sesi fallback.` |
| `auto_resolve_rule` | `Resolve saat koneksi sinkron berikutnya berhasil.` |
| `center_only_or_toast` | `hybrid` |

| Field | Value |
| --- | --- |
| `id` | `system-import-export-critical` |
| `module` | `System` |
| `title` | `Proses data perlu perhatian` |
| `message` | `Export atau import data mengalami hasil penting yang perlu ditinjau ulang.` |
| `severity` | `warning` |
| `trigger` | `Import/export gagal atau selesai dengan kondisi penting yang perlu dilihat ulang.` |
| `when_to_show` | `Setelah proses import/export selesai dengan error atau warning signifikan.` |
| `cta_primary` | `Buka Settings` |
| `cta_target` | `/settings` |
| `dedupe_rule` | `Satu notifikasi aktif per proses penting terakhir.` |
| `auto_resolve_rule` | `Resolve saat user meninjau atau proses berikutnya berhasil normal.` |
| `center_only_or_toast` | `hybrid` |

| Field | Value |
| --- | --- |
| `id` | `system-database-setup-error` |
| `module` | `System` |
| `title` | `Sistem data belum siap` |
| `message` | `Ada masalah pada setup database atau pemuatan data inti aplikasi.` |
| `severity` | `danger` |
| `trigger` | `databaseSetupError`, `dataError`, atau error remote penting lain tersedia di DataContext.` |
| `when_to_show` | `Saat aplikasi gagal menyiapkan state data inti.` |
| `cta_primary` | `Lihat Pengaturan` |
| `cta_target` | `/settings` |
| `dedupe_rule` | `Satu notifikasi aktif per error setup dominan.` |
| `auto_resolve_rule` | `Resolve saat load data berikutnya berhasil.` |
| `center_only_or_toast` | `hybrid` |

---

## 4. Aturan Prioritas, Lifecycle, dan CTA

### Prioritas tampilan
- `danger` muncul paling atas.
- `warning` muncul setelah `danger`.
- `info` muncul setelah `warning`.
- Untuk severity yang sama, urutkan berdasarkan waktu kejadian terbaru.

### Deduplikasi
- Jangan membuat notifikasi baru jika:
  - `id` sama,
  - entitas target sama,
  - dan kondisi sumbernya belum berubah.
- Jika kondisi memburuk dalam severity yang lebih tinggi, item lama boleh di-upgrade.

### Auto resolve
- Notifikasi harus auto-resolve jika:
  - kondisi pemicu sudah tidak ada,
  - milestone tanggal sudah lewat,
  - data yang hilang sudah dilengkapi,
  - atau aksi bisnis sudah selesai.

### CTA
- Semua notifikasi harus punya satu CTA utama yang langsung membawa user ke konteks penyelesaian.
- Hindari CTA generik seperti `Lihat`.
- Gunakan CTA yang spesifik seperti:
  - `Buka IPO`
  - `Tambah Entry`
  - `Review Trade`
  - `Refresh Harga`
  - `Perbarui Snapshot`

### Kapan cukup `toast`
`Toast-only` tetap dipakai untuk:
- Simpan berhasil
- Hapus berhasil
- Export berhasil
- Import berhasil
- Aksi konfirmasi tunggal yang tidak butuh riwayat

### Kapan wajib ke notification center
`Center-only` dipakai untuk:
- Reminder tanggal
- Risiko yang belum selesai
- Data yang belum lengkap
- Kondisi yang perlu bisa ditinjau ulang setelah user pindah halaman

### Kapan `hybrid`
`Hybrid` dipakai jika:
- Kejadian penting perlu menarik perhatian segera,
- tetapi juga perlu tetap tersedia di pusat notifikasi.

Contoh utama:
- IPO listing hari ini
- Gagal sinkron ke server lalu fallback ke cache lokal
- Gagal cleanup audit log
- Daily trade limit tercapai

---

## 5. Fase Implementasi Berikutnya

### Fase 1
- Buat schema notifikasi internal berdasarkan field di dokumen ini.
- Tambahkan generator/selector notifikasi dari data yang sudah ada di `DataContext` dan modul terkait.
- Bangun UI notification center sederhana:
  - daftar notifikasi aktif,
  - badge unread,
  - mark as read,
  - CTA utama.

### Fase 2
- Tambahkan filter:
  - semua,
  - unread,
  - severity,
  - modul.
- Tambahkan auto grouping per modul atau per entitas.

### Fase 3
- Tambahkan preferensi pengguna:
  - modul yang ingin diprioritaskan,
  - severity minimum,
  - mute untuk tipe tertentu.

### Di luar scope v1
- Email notification
- Push notification
- Jadwal reminder background di luar sesi aplikasi
- Integrasi pihak ketiga seperti Telegram atau WhatsApp

---

## Validasi Dengan Data Yang Sudah Ada

Spec ini sengaja dibatasi pada data yang sudah terlihat tersedia di repo saat ini:
- `ipoEvents`, `ipoEntries`, `ipoAccounts`
- `trades`, `marketPrices`, `settings`
- `financeAccounts`, `financeTransactions`
- `reports`
- admin/workspace flows yang sudah memakai `showToast`
- `dataError`, `databaseSetupError`, dan fallback sync di `DataContext`

Acceptance criteria artifact:
- Implementer bisa membangun schema notifikasi tanpa menebak field inti.
- PM/designer bisa mengaudit copy, severity, dan CTA langsung dari dokumen ini.
- Setiap notifikasi punya trigger konkret, dedupe rule, dan auto resolve rule yang jelas.
