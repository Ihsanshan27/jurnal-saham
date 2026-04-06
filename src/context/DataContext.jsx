import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getItem, setItem, generateId } from '../utils/storage';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [trades, setTrades] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [notes, setNotes] = useState([]);
  const [settings, setSettings] = useState({
    initialCapital: 10000000,
    monthlyTarget: 5,
    defaultBuyFee: 0.15,
    defaultSellFee: 0.25,
  });
  const [toasts, setToasts] = useState([]);

  // Load data
  useEffect(() => {
    setTrades(getItem('trades') || []);
    setWatchlist(getItem('watchlist') || []);
    setNotes(getItem('notes') || []);
    const savedSettings = getItem('settings');
    if (savedSettings) setSettings(savedSettings);
  }, []);

  // Persist trades
  const saveTrades = useCallback((newTrades) => {
    setTrades(newTrades);
    setItem('trades', newTrades);
  }, []);

  // Toast helper
  const showToast = useCallback((message, type = 'success') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  // === TRADE CRUD ===
  const addTrade = (trade) => {
    const newTrade = { ...trade, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newTrade, ...trades];
    saveTrades(updated);
    showToast('Transaksi berhasil ditambahkan');
    return newTrade;
  };

  const updateTrade = (id, updates) => {
    const updated = trades.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t);
    saveTrades(updated);
    showToast('Transaksi berhasil diperbarui');
  };

  const deleteTrade = (id) => {
    const updated = trades.filter(t => t.id !== id);
    saveTrades(updated);
    showToast('Transaksi berhasil dihapus');
  };

  const getTradeById = (id) => trades.find(t => t.id === id);

  // === WATCHLIST CRUD ===
  const addWatchlistItem = (item) => {
    const newItem = { ...item, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newItem, ...watchlist];
    setWatchlist(updated);
    setItem('watchlist', updated);
    showToast('Item watchlist ditambahkan');
  };

  const updateWatchlistItem = (id, updates) => {
    const updated = watchlist.map(w => w.id === id ? { ...w, ...updates } : w);
    setWatchlist(updated);
    setItem('watchlist', updated);
  };

  const deleteWatchlistItem = (id) => {
    const updated = watchlist.filter(w => w.id !== id);
    setWatchlist(updated);
    setItem('watchlist', updated);
    showToast('Item watchlist dihapus');
  };

  // === NOTES CRUD ===
  const addNote = (note) => {
    const newNote = { ...note, id: generateId(), createdAt: new Date().toISOString() };
    const updated = [newNote, ...notes];
    setNotes(updated);
    setItem('notes', updated);
    showToast('Catatan disimpan');
  };

  const updateNote = (id, updates) => {
    const updated = notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n);
    setNotes(updated);
    setItem('notes', updated);
  };

  const deleteNote = (id) => {
    const updated = notes.filter(n => n.id !== id);
    setNotes(updated);
    setItem('notes', updated);
    showToast('Catatan dihapus');
  };

  // === SETTINGS ===
  const updateSettings = (updates) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    setItem('settings', newSettings);
    showToast('Pengaturan disimpan');
  };

  return (
    <DataContext.Provider value={{
      trades, addTrade, updateTrade, deleteTrade, getTradeById,
      watchlist, addWatchlistItem, updateWatchlistItem, deleteWatchlistItem,
      notes, addNote, updateNote, deleteNote,
      settings, updateSettings,
      toasts,
      showToast,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
