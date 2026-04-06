const PREFIX = 'jurnal_saham_';

export function getItem(key) {
  try {
    const data = localStorage.getItem(PREFIX + key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export function setItem(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeItem(key) {
  localStorage.removeItem(PREFIX + key);
}

export function exportAllData() {
  const data = {};
  const keys = ['users', 'trades', 'watchlist', 'notes', 'settings', 'cashflows', 'dividends'];
  for (const key of keys) {
    data[key] = getItem(key);
  }
  data.exportDate = new Date().toISOString();
  data.version = '1.0';
  return data;
}

export function importAllData(data) {
  if (!data || !data.version) throw new Error('Format data tidak valid');
  const keys = ['trades', 'watchlist', 'notes', 'settings', 'cashflows', 'dividends'];
  for (const key of keys) {
    if (data[key] != null) {
      setItem(key, data[key]);
    }
  }
}

export function clearAllData() {
  const keys = ['trades', 'watchlist', 'notes', 'settings', 'cashflows', 'dividends'];
  for (const key of keys) {
    removeItem(key);
  }
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
