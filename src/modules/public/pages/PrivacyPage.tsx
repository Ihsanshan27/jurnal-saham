import { useNavigate } from 'react-router-dom';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="container" style={{ maxWidth: 800, padding: '40px 20px' }}>
      <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: 24 }}>
        &larr; Kembali
      </button>

      <h1 className="page-title">Kebijakan Privasi (Privacy Policy)</h1>
      <p className="page-subtitle" style={{ marginBottom: 40 }}>Terakhir diperbarui: 9 Juli 2026</p>

      <div className="card">
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 20, lineHeight: 1.6 }}>
          <section>
            <h3 style={{ marginBottom: 12 }}>1. Informasi yang Kami Kumpulkan</h3>
            <p>
              Kami mengumpulkan informasi yang Anda berikan secara langsung saat membuat akun, termasuk namun tidak terbatas pada: nama, alamat email, dan data portofolio/transaksi saham yang Anda masukkan secara manual ke dalam sistem (jurnal trading, harga beli/jual, strategi, dll).
            </p>
          </section>

          <section>
            <h3 style={{ marginBottom: 12 }}>2. Penggunaan Informasi</h3>
            <p>
              Informasi yang dikumpulkan digunakan semata-mata untuk:
            </p>
            <ul style={{ marginLeft: 20, marginTop: 8 }}>
              <li>Menyediakan layanan aplikasi pencatatan jurnal saham Anda.</li>
              <li>Menghitung analitik portofolio dan riwayat trading Anda.</li>
              <li>Memperbaiki dan meningkatkan fitur aplikasi.</li>
            </ul>
          </section>

          <section>
            <h3 style={{ marginBottom: 12 }}>3. Keamanan Data</h3>
            <p>
              Keamanan data transaksi finansial Anda adalah prioritas utama kami. Kami menggunakan fitur <i>Row Level Security (RLS)</i> tingkat database, memastikan bahwa data Anda dikunci dan secara matematis tidak dapat diakses oleh pengguna lain. Komunikasi antara perangkat Anda dan server kami sepenuhnya dienkripsi menggunakan protokol SSL/HTTPS.
            </p>
          </section>

          <section>
            <h3 style={{ marginBottom: 12 }}>4. Penyimpanan dan Penghapusan Data</h3>
            <p>
              Data Anda disimpan dengan aman di server cloud kami. Anda memiliki kendali penuh atas data Anda. <strong>Right to be Forgotten</strong>: Anda berhak menggunakan fitur "Hapus Akun" di halaman Pengaturan untuk menghapus akun Anda. Melakukan hal tersebut akan menghapus seluruh data portofolio, histori, dan profil Anda secara permanen dari server kami.
            </p>
          </section>

          <section>
            <h3 style={{ marginBottom: 12 }}>5. Pihak Ketiga</h3>
            <p>
              Kami tidak pernah menjual, menyewakan, atau menukar data finansial atau profil pribadi Anda kepada pihak ketiga untuk tujuan pemasaran. Data hanya diproses oleh sub-pemroses infrastruktur inti kami (contoh: Supabase sebagai pengelola basis data dan autentikasi).
            </p>
          </section>

          <section>
            <h3 style={{ marginBottom: 12 }}>6. Kontak Kami</h3>
            <p>
              Jika Anda memiliki pertanyaan terkait Kebijakan Privasi ini atau pengelolaan data Anda, silakan hubungi tim dukungan kami melalui layanan bantuan di dalam aplikasi.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
