import { useState } from 'react';
import { useData } from '../context/DataContext';
import { formatDate } from '../utils/formatters';

export default function NotesPage() {
  const { notes, addNote, updateNote, deleteNote } = useData();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', tags: '' });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return;
    const data = {
      ...form,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    };
    if (editId) {
      updateNote(editId, data);
      setEditId(null);
    } else {
      addNote(data);
    }
    setForm({ title: '', content: '', tags: '' });
    setShowForm(false);
  };

  const handleEdit = (note) => {
    setForm({
      title: note.title,
      content: note.content,
      tags: note.tags ? note.tags.join(', ') : '',
    });
    setEditId(note.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Hapus catatan ini?')) deleteNote(id);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📔 Catatan Trading</h1>
          <p className="page-subtitle">Jurnal harian dan catatan market</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ title: '', content: '', tags: '' }); }}>
          {showForm ? '✕ Batal' : '➕ Tulis Catatan'}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 24, animation: 'fadeInUp 0.3s ease' }}>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Judul *</label>
                <input className="form-input" placeholder="Contoh: Review Market Hari Ini" value={form.title} onChange={e => set('title', e.target.value)} autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Isi Catatan *</label>
                <textarea
                  className="form-textarea"
                  placeholder="Tuliskan catatan tentang kondisi market, rencana trading, lessons learned..."
                  value={form.content}
                  onChange={e => set('content', e.target.value)}
                  style={{ minHeight: 150 }}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Tags (pisah dengan koma)</label>
                <input className="form-input" placeholder="IHSG, review, plan" value={form.tags} onChange={e => set('tags', e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary">
                {editId ? '💾 Update Catatan' : '💾 Simpan Catatan'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Notes List */}
      {notes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📔</div>
          <div className="empty-state-title">Belum ada catatan</div>
          <div className="empty-state-desc">Tulis catatan harian tentang kondisi market dan rencana trading</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {notes.map(note => (
            <div key={note.id} className="card" style={{ transition: 'all 0.2s' }}>
              <div className="card-header">
                <div>
                  <h3 className="card-title">{note.title}</h3>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {formatDate(note.createdAt)}
                    {note.updatedAt && ` · Diperbarui ${formatDate(note.updatedAt)}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(note)}>✏️</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(note.id)}>🗑</button>
                </div>
              </div>
              <div className="card-body">
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>
                  {note.content}
                </div>
                {note.tags && note.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
                    {note.tags.map(tag => (
                      <span key={tag} className="badge badge-blue">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
