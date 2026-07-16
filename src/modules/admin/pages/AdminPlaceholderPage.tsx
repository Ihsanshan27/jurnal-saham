import { Puzzle } from 'lucide-react';

export default function AdminPlaceholderPage({ title, description }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{description}</p>
        </div>
      </div>
      <div className="empty-state">
        <div className="empty-state-icon"><Puzzle size={48} className="text-gray-400" /></div>
        <div className="empty-state-title">Belum diimplementasikan</div>
        <div className="empty-state-desc">Fondasi role sudah siap. Fitur ini masuk tahap admin panel berikutnya.</div>
      </div>
    </div>
  );
}
