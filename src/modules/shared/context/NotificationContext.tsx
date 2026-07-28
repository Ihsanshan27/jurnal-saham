import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { useData } from '@/modules/shared/context/DataContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { getScopedItem, setScopedItem } from '@/modules/shared/utils/storage';
import { buildNotificationItems, isNotificationExpired, type NotificationItem, type ReportShareLike } from '@/modules/shared/utils/notificationCenter';
import { listReportShares } from '@/modules/shared/services/reportShareService';
import { getSystemBroadcasts, type SystemBroadcast } from '@/modules/admin/services/broadcastService';
import { isSupabaseConfigured, supabase } from '@/modules/shared/services/supabaseClient';

export interface NotificationWithReadStatus extends NotificationItem {
  isRead: boolean;
}

export interface NotificationContextType {
  notifications: NotificationWithReadStatus[];
  unreadCount: number;
  markAsRead: (notification: NotificationItem) => void;
  markAllAsRead: () => void;
}

const STORAGE_KEY_READS = 'notification_reads';
const STORAGE_KEY_META = 'notification_meta';
const STORAGE_KEY_LAST_ROLE = 'notification_last_role';

const NotificationContext = createContext<NotificationContextType | null>(null);

type NotificationReadState = Record<string, string>;
type NotificationMetaState = Record<string, { fingerprint: string; firstSeenAt: string }>;

function isMetaEqual(a: NotificationMetaState, b: NotificationMetaState) {
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  for (const key of keysA) {
    const valA = a[key];
    const valB = b[key];
    if (!valB || valA.fingerprint !== valB.fingerprint || valA.firstSeenAt !== valB.firstSeenAt) return false;
  }
  return true;
}

function isReadEqual(a: NotificationReadState, b: NotificationReadState) {
  const keysA = Object.keys(a);
  if (keysA.length !== Object.keys(b).length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const {
    ipoEvents,
    ipoEntries,
    ipoAccounts,
    allTrades,
    marketPrices,
    settings,
    financeAccounts,
    financeTransactions,
    tradeFormDraft,
    tradeEditDraft,
    getFinanceAccountCurrentBalance,
    usedLocalCacheFallback,
    dataLoading,
  } = useData();
  const { role, can } = usePermissions();
  const [reportShares, setReportShares] = useState<ReportShareLike[]>([]);
  const [broadcasts, setBroadcasts] = useState<SystemBroadcast[]>([]);
  const [readState, setReadState] = useState<NotificationReadState>(() => (
    userId ? getScopedItem(STORAGE_KEY_READS, userId) || {} : {}
  ));
  const [metaState, setMetaState] = useState<NotificationMetaState>(() => (
    userId ? getScopedItem(STORAGE_KEY_META, userId) || {} : {}
  ));

  useEffect(() => {
    if (!userId) {
      setReadState({});
      setMetaState({});
      return;
    }
    setReadState(getScopedItem(STORAGE_KEY_READS, userId) || {});
    setMetaState(getScopedItem(STORAGE_KEY_META, userId) || {});
  }, [userId]);

  useEffect(() => {
    if (!userId || !can('report:manage') || !isSupabaseConfigured) {
      setReportShares([]);
      return;
    }

    let cancelled = false;

    const fetchShares = async () => {
      try {
        const rows = await listReportShares(userId);
        if (!cancelled) setReportShares(rows || []);
      } catch (error) {
        if (!cancelled) setReportShares([]);
      }
    };

    fetchShares();

    return () => {
      cancelled = true;
    };
  }, [can, userId]);

  useEffect(() => {
    let cancelled = false;
    const fetchBroadcasts = async () => {
      try {
        const data = await getSystemBroadcasts();
        if (!cancelled) setBroadcasts(data);
      } catch (err) {
        if (!cancelled) setBroadcasts([]);
      }
    };
    fetchBroadcasts();
    
    // Auto-refresh fallback every 5 minutes
    const interval = setInterval(fetchBroadcasts, 300000);

    // Supabase Realtime subscription
    let channel: any;
    if (isSupabaseConfigured && supabase) {
      channel = supabase.channel('system_broadcasts_realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'app_settings',
          filter: 'key=eq.system_broadcasts'
        }, (payload: any) => {
          if (payload.new && payload.new.value) {
            setBroadcasts(payload.new.value as SystemBroadcast[]);
          }
        })
        .subscribe();
    }

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const roleChangeNotification = useMemo(() => {
    if (!userId || !role) return null;
    const previousRole = getScopedItem(STORAGE_KEY_LAST_ROLE, userId) || role;
    if (previousRole === role) return null;
    return {
      key: `workspace-role-changed:${previousRole}:${role}`,
      typeId: 'workspace-role-changed',
      module: 'Admin',
      title: 'Role atau akses berubah',
      message: `Role Anda berubah dari ${String(previousRole).toUpperCase()} ke ${String(role).toUpperCase()}. Tinjau akses yang tersedia.`,
      severity: 'warning',
      delivery: 'hybrid',
      ctaLabel: 'Lihat Pengaturan',
      ctaTarget: '/settings',
      fingerprint: `${previousRole}|${role}`,
      createdAt: new Date().toISOString(),
      meta: { previousRole, nextRole: role },
    } satisfies NotificationItem & { meta: { previousRole: string; nextRole: string } };
  }, [role, userId]);

  useEffect(() => {
    if (!userId || !role) return;
    const storedRole = getScopedItem(STORAGE_KEY_LAST_ROLE, userId);
    if (!storedRole) {
      setScopedItem(STORAGE_KEY_LAST_ROLE, userId, role);
    }
  }, [role, userId]);

  const generatedNotifications = useMemo(() => {
    const items = buildNotificationItems({
      ipoEvents,
      ipoEntries,
      ipoAccounts,
      trades: allTrades,
      marketPrices,
      settings,
      tradeFormDraft,
      tradeEditDraft,
      financeAccounts,
      financeTransactions,
      getFinanceAccountCurrentBalance,
      reportShares,
      usedLocalCacheFallback,
    });
    if (roleChangeNotification) {
      items.unshift(roleChangeNotification);
    }
    
    const broadcastItems = broadcasts.map(b => ({
      key: b.id,
      typeId: 'admin-broadcast',
      module: 'System',
      title: b.title,
      message: b.authorName ? `${b.message}\n\n— Dikirim oleh: ${b.authorName}` : b.message,
      severity: b.severity,
      delivery: 'hybrid' as const,
      ctaLabel: 'Tutup',
      ctaTarget: '#',
      fingerprint: b.id,
      createdAt: b.createdAt,
    } as NotificationItem));
    
    return [...broadcastItems, ...items];
  }, [
    ipoEvents,
    ipoEntries,
    ipoAccounts,
    allTrades,
    marketPrices,
    settings,
    tradeFormDraft,
    tradeEditDraft,
    financeAccounts,
    financeTransactions,
    getFinanceAccountCurrentBalance,
    reportShares,
    usedLocalCacheFallback,
    roleChangeNotification,
    broadcasts,
  ]);

  const persistReadState = useCallback((nextState: NotificationReadState) => {
    setReadState(nextState);
    if (userId) {
      setScopedItem(STORAGE_KEY_READS, userId, nextState);
    }
  }, [userId]);

  const persistMetaState = useCallback((nextState: NotificationMetaState) => {
    setMetaState(nextState);
    if (userId) {
      setScopedItem(STORAGE_KEY_META, userId, nextState);
    }
  }, [userId]);

  useEffect(() => {
    if (dataLoading) return;
    const now = new Date();
    
    // Retain existing meta states to avoid purging when data briefly disappears, but expire after 30 days
    const nextMetaState: NotificationMetaState = {};
    for (const [key, meta] of Object.entries(metaState)) {
      if (now.getTime() - new Date(meta.firstSeenAt).getTime() < 30 * 86400000) {
        nextMetaState[key] = meta;
      }
    }

    generatedNotifications.forEach((notification) => {
      const existingMeta = nextMetaState[notification.key];
      const firstSeenAt = existingMeta?.fingerprint === notification.fingerprint
        ? existingMeta.firstSeenAt
        : notification.createdAt;
      nextMetaState[notification.key] = {
        fingerprint: notification.fingerprint,
        firstSeenAt,
      };
    });

    const metaChanged = !isMetaEqual(nextMetaState, metaState);
    if (metaChanged) {
      persistMetaState(nextMetaState);
    }

    const nextReadState: NotificationReadState = {};
    for (const [key, fingerprint] of Object.entries(readState)) {
      const meta = nextMetaState[key];
      if (meta && meta.fingerprint === fingerprint) {
        nextReadState[key] = fingerprint;
      }
    }

    const readChanged = !isReadEqual(nextReadState, readState);
    if (readChanged) {
      persistReadState(nextReadState);
    }
  }, [generatedNotifications, metaState, persistMetaState, persistReadState, readState]);

  const markAsRead = useCallback((notification: NotificationItem) => {
    const nextState = {
      ...readState,
      [notification.key]: notification.fingerprint,
    };
    persistReadState(nextState);
    if (userId && notification.typeId === 'workspace-role-changed') {
      setScopedItem(STORAGE_KEY_LAST_ROLE, userId, role);
    }
  }, [persistReadState, readState, role, userId]);

  const markAllAsRead = useCallback(() => {
    const nextState = generatedNotifications.reduce<Record<string, string>>((acc, notification) => {
      acc[notification.key] = notification.fingerprint;
      return acc;
    }, { ...readState });
    persistReadState(nextState);
    if (userId && role) {
      setScopedItem(STORAGE_KEY_LAST_ROLE, userId, role);
    }
  }, [generatedNotifications, persistReadState, readState, role, userId]);

  const notifications = useMemo(() => {
    const now = new Date();
    return generatedNotifications
      .map((notification) => {
        const storedMeta = metaState[notification.key];
        const createdAt = storedMeta?.fingerprint === notification.fingerprint
          ? storedMeta.firstSeenAt
          : notification.createdAt;
        return {
          ...notification,
          createdAt,
          isRead: readState[notification.key] === notification.fingerprint,
        };
      })
      .filter((notification) => !isNotificationExpired(notification, now));
  }, [generatedNotifications, metaState, readState]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
