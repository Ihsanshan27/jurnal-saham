import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Semua field wajib diisi');
      return;
    }
    if (username.trim().length < 3) {
      setError('Username minimal 3 karakter');
      return;
    }
    if (password.length < 4) {
      setError('Password minimal 4 karakter');
      return;
    }
    if (password !== confirmPass) {
      setError('Konfirmasi password tidak cocok');
      return;
    }
    const result = register(username.trim(), password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-icon">📈</div>
          <h1>Jurnal Saham</h1>
        </div>
        <p className="login-subtitle">Buat akun untuk mulai mencatat trading Anda</p>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--accent-red-dim)',
              color: 'var(--accent-red)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              marginBottom: '16px'
            }}>
              {error}
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="Pilih username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Buat password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Konfirmasi Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Ulangi password"
              value={confirmPass}
              onChange={e => setConfirmPass(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Daftar
          </button>
        </form>

        <div className="login-footer">
          Sudah punya akun? <Link to="/login">Masuk di sini</Link>
        </div>
      </div>
    </div>
  );
}
