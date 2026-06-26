import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import { useData } from '@/modules/shared/context/DataContext';
import { usePermissions } from '@/modules/shared/context/PermissionContext';
import { getScopedItem, setScopedItem } from '@/modules/shared/utils/storage';
import { buildNotificationItems, isNotificationExpired, type NotificationItem } from '@/modules/shared/utils/notificationCenter';
import { listReportShares } from '@/modules/shared/services/reportShareService';
import { isSupabaseConfigured } from '@/modules/shared/services/supabaseClient';

const NotificationContext = createContext<any>(null);
type NotificationReadState = Record<string, string>;
type NotificationMetaState = Record<string, { fingerprint: string; firstSeenAt: string }>;

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
  } = useData();
  const { role, can } = usePermissions();
  const [reportShares, setReportShares] = useState<any[]>([]);
  const [readState, setReadState] = useState<NotificationReadState>(() => (
    userId ? getScopedItem('notification_reads', userId) || {} : {}
  ));
  const [metaState, setMetaState] = useState<NotificationMetaState>(() => (
    userId ? getScopedItem('notification_meta', userId) || {} : {}
  ));

  useEffect(() => {
    if (!userId) {
      setReadState({});
      setMetaState({});
      return;
    }
    setReadState(getScopedItem('notification_reads', userId) || {});
    setMetaState(getScopedItem('notification_meta', userId) || {});
  }, [userId]);

  useEffect(() => {
    if (!userId || !can('report:manage') || !isSupabaseConfigured) {
      setReportShares([]);
      return;
    }

    let cancelled = false;
    listReportShares(userId)
      .then((rows) => {
        if (!cancelled) setReportShares(rows || []);
      })
      .catch(() => {
        if (!cancelled) setReportShares([]);
      });

    return () => {
      cancelled = true;
    };
  }, [can, userId]);

  const roleChangeNotification = useMemo(() => {
    if (!userId || !role) return null;
    const previousRole = getScopedItem('notification_last_role', userId) || role;
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
    const storedRole = getScopedItem('notification_last_role', userId);
    if (!storedRole) {
      setScopedItem('notification_last_role', userId, role);
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
    return items;
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
  ]);

  const persistReadState = useCallback((nextState: NotificationReadState) => {
    setReadState(nextState);
    if (userId) {
      setScopedItem('notification_reads', userId, nextState);
    }
  }, [userId]);

  const persistMetaState = useCallback((nextState: NotificationMetaState) => {
    setMetaState(nextState);
    if (userId) {
      setScopedItem('notification_meta', userId, nextState);
    }
  }, [userId]);

  useEffect(() => {
    const now = new Date();
    const nextMetaState = generatedNotifications.reduce<NotificationMetaState>((acc, notification) => {
      const existingMeta = metaState[notification.key];
      const firstSeenAt = existingMeta?.fingerprint === notification.fingerprint
        ? existingMeta.firstSeenAt
        : notification.createdAt;
      acc[notification.key] = {
        fingerprint: notification.fingerprint,
        firstSeenAt,
      };
      return acc;
    }, {});

    const metaChanged = JSON.stringify(nextMetaState) !== JSON.stringify(metaState);
    if (metaChanged) {
      persistMetaState(nextMetaState);
    }

    const validKeys = new Set(Object.keys(nextMetaState));
    const nextReadState = Object.entries(readState).reduce<NotificationReadState>((acc, [key, fingerprint]) => {
      if (!validKeys.has(key)) return acc;
      const notification = generatedNotifications.find((item) => item.key === key);
      const currentMeta = nextMetaState[key];
      if (!notification || !currentMeta) return acc;
      if (fingerprint !== notification.fingerprint) return acc;
      if (isNotificationExpired({ severity: notification.severity, createdAt: currentMeta.firstSeenAt }, now)) {
        return acc;
      }
      acc[key] = fingerprint;
      return acc;
    }, {});

    const readChanged = JSON.stringify(nextReadState) !== JSON.stringify(readState);
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
      setScopedItem('notification_last_role', userId, role);
    }
  }, [persistReadState, readState, role, userId]);

  const markAllAsRead = useCallback(() => {
    const nextState = generatedNotifications.reduce<Record<string, string>>((acc, notification) => {
      acc[notification.key] = notification.fingerprint;
      return acc;
    }, { ...readState });
    persistReadState(nextState);
    if (userId && role) {
      setScopedItem('notification_last_role', userId, role);
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
