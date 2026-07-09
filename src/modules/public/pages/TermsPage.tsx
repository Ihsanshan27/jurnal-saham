import { useNavigate } from 'react-router-dom';

export default function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="container" style={{ maxWidth: 800, padding: '40px 20px' }}>
      <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>
        &larr; Kembali
      </button>

      <h1 className="page-title">Syarat dan Ketentuan (Terms of Service)</h1>
      <p className="page-subtitle" style={{ marginBottom: 40 }}>Terakhir diperbarui: 9 Juli 2026</p>

      <div className="card">
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20, lineHeight: 1.6 }}>
          <section>
            <h3 style={{ marginBottom: 12 }}>1. Penerimaan Syarat</h3>
            <p>
              Dengan mengakses dan menggunakan aplikasi Jurnal Saham, Anda menyetujui untuk terikat oleh Syarat dan Ketentuan ini. Jika Anda tidak setuju dengan bagian mana pun dari syarat ini, Anda tidak diperkenankan untuk menggunakan layanan kami.
            </p>
          </section>

          <section>
            <h3 style={{ marginBottom: 12 }}>2. Penggunaan Layanan</h3>
            <p>
              Jurnal Saham menyediakan platform pencatatan dan analitik portofolio saham. Anda bertanggung jawab penuh atas segala aktivitas yang terjadi di bawah akun Anda. Anda setuju untuk menjaga kerahasiaan kata sandi dan informasi akun Anda.
            </p>
          </section>

          <section>
            <h3 style={{ marginBottom: 12 }}>3. Privasi dan Data</h3>
            <p>
              Kami sangat menghargai privasi Anda. Penggunaan data Anda diatur dalam Kebijakan Privasi kami. Seluruh data transaksi saham yang Anda masukkan adalah hak milik Anda dan diamankan menggunakan sistem basis data terenkripsi dan <i>Row Level Security</i>.
            </p>
          </section>

          <section>
            <h3 style={{ marginBottom: 12 }}>4. Batasan Tanggung Jawab</h3>
            <p>
              Aplikasi ini disediakan "sebagaimana adanya". Jurnal Saham tidak memberikan saran investasi, rekomendasi pembelian/penjualan saham, atau jaminan keuntungan. Jurnal Saham <strong>tidak bertanggung jawab</strong> atas kerugian finansial, kerusakan, atau konsekuensi apa pun yang timbul akibat keputusan investasi yang Anda buat menggunakan data dari aplikasi ini.
            </p>
          </section>

          <section>
            <h3 style={{ marginBottom: 12 }}>5. Penghentian Layanan</h3>
            <p>
              Kami berhak untuk menangguhkan atau menghentikan akses Anda ke aplikasi sewaktu-waktu tanpa pemberitahuan sebelumnya, jika kami mendeteksi adanya pelanggaran terhadap Syarat dan Ketentuan ini atau aktivitas berbahaya (<i>malicious activities</i>).
            </p>
          </section>

          <section>
            <h3 style={{ marginBottom: 12 }}>6. Perubahan Syarat</h3>
            <p>
              Kami dapat merevisi Syarat dan Ketentuan ini sewaktu-waktu. Perubahan akan berlaku segera setelah diposting di halaman ini. Penggunaan layanan secara berkelanjutan setelah perubahan menandakan penerimaan Anda terhadap syarat yang baru.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
