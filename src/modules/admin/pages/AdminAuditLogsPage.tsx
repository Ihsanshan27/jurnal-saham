import { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '@/modules/shared/context/DataContext';
import { listAuditLogs, cleanOldAuditLogs } from '@/modules/admin/services/auditLogService';
import SortableTableHeader from '@/modules/shared/components/SortableTableHeader';
import { useTableSort } from '@/modules/shared/hooks/useTableSort';
import { listProfiles } from '@/modules/shared/services/profileService';
import { formatDateTime } from '@/modules/shared/utils/formatters';
import {
  getAuditActionLabel,
  getAuditTargetTypeLabel,
  getAuditLogDescription,
  getAuditTargetName,
  formatMetadataKey,
  formatMetadataValue,
} from '@/modules/admin/utils/auditLogFormatter';
import * as Icons from 'lucide-react';

export default function AdminAuditLogsPage() {
  const { showToast, settings } = useData();
  const [logs, setLogs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const profileById = useMemo(() => {
    return profiles.reduce((profilesMap: Record<string, any>, profile: any) => {
      profilesMap[profile.id] = profile;
      return profilesMap;
    }, {});
  }, [profiles]);

  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return logs;

    return logs.filter(log => {
      const actor = profileById[log.actor_id];
      const actorName = actor?.displayName || actor?.email || log.actor_id || 'System';
      const description = getAuditLogDescription(log, actorName);
      const targetName = getAuditTargetName(log);
      const haystack = [
        log.action,
        getAuditActionLabel(log.action),
        log.target_type,
        getAuditTargetTypeLabel(log.target_type),
        log.target_id,
        targetName,
        actor?.email,
        actor?.displayName,
        description,
        JSON.stringify(log.metadata || {}),
      ].join(' ').toLowerCase();
      return haystack.includes(keyword);
    });
  }, [logs, profileById, search]);

  const { sortConfig, sortedItems: sortedLogs, requestSort } = useTableSort(filteredLogs, {
    initialKey: 'created_at',
    initialDirection: 'desc',
    getValue: (log: any, key: 'created_at' | 'actor' | 'action' | 'target' | 'detail') => {
      const actor = profileById[log.actor_id];
      const actorName = actor?.displayName || actor?.email || log.actor_id || 'System';
      if (key === 'actor') return actorName;
      if (key === 'action') return getAuditLogDescription(log, actorName);
      if (key === 'target') return `${getAuditTargetTypeLabel(log.target_type)} ${getAuditTargetName(log)}`;
      if (key === 'detail') return JSON.stringify(log.metadata || {});
      return log[key] || '';
    },
  });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const retentionDays = parseInt(settings.logRetentionDays) || 0;
      if (retentionDays > 0) {
        try {
          const deletedCount = await cleanOldAuditLogs(retentionDays);
          if (deletedCount > 0) {
            showToast(`${deletedCount} audit log lama dibersihkan`);
          }
        } catch (cleanError: any) {
          showToast(`Gagal membersihkan log usang: ${cleanError.message}`, 'error');
        }
      }
      const [logRows, profileRows] = await Promise.all([
        listAuditLogs(150),
        listProfiles(),
      ]);
      setLogs(logRows);
      setProfiles(profileRows);
    } catch (error: any) {
      showToast(`Gagal memuat audit log: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, settings.logRetentionDays]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">Pantau riwayat aktivitas dan tindakan pengguna secara detail</p>
        </div>
        <button className="btn btn-secondary" onClick={loadLogs} disabled={loading}>Refresh</button>
      </div>

      <div className="card admin-card-spaced">
        <div className="card-body">
          <div className="search-bar">
            <span className="search-bar-icon"><Icons.Search size={14} /></span>
            <input
              placeholder="Cari deskripsi tindakan, user, target, atau metadata..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-spinner" />
      ) : filteredLogs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Icons.ScrollText size={48} /></div>
          <div className="empty-state-title">Belum ada audit log</div>
          <div className="empty-state-desc">Aktivitas user dan admin akan tercatat otomatis di sini.</div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th><SortableTableHeader label="Waktu" sortKey="created_at" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Pengguna (Actor)" sortKey="actor" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Deskripsi Tindakan" sortKey="action" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Target / Subjek" sortKey="target" sortConfig={sortConfig} onSort={requestSort} /></th>
                <th><SortableTableHeader label="Detail Metadata" sortKey="detail" sortConfig={sortConfig} onSort={requestSort} /></th>
              </tr>
            </thead>
            <tbody>
              {sortedLogs.map(log => {
                const actor = profileById[log.actor_id];
                const actorName = actor?.displayName || 'System';
                const description = getAuditLogDescription(log, actorName);
                const targetName = getAuditTargetName(log);
                const metadataEntries = Object.entries(log.metadata || {});

                return (
                  <tr key={log.id}>
                    <td className="admin-audit-time-cell">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td>
                      <strong>{actorName}</strong>
                      <div className="admin-audit-subtext">
                        {actor?.email || log.actor_id || '-'}
                      </div>
                    </td>
                    <td>
                      <div className="admin-audit-desc-text" style={{ fontWeight: 500, marginBottom: '4px' }}>
                        {description}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className="badge badge-purple">{getAuditActionLabel(log.action)}</span>
                        <span className="admin-audit-action-code">{log.action}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{targetName}</div>
                      <div className="admin-audit-subtext">
                        {getAuditTargetTypeLabel(log.target_type)}
                        {log.target_id && log.target_id !== targetName ? ` • ${log.target_id.substring(0, 12)}...` : ''}
                      </div>
                    </td>
                    <td>
                      {metadataEntries.length === 0 ? (
                        <span className="admin-empty-note">Tidak ada detail ekstra</span>
                      ) : (
                        <div className="admin-audit-detail-grid">
                          {metadataEntries.map(([key, value]) => (
                            <div key={key} className="admin-audit-detail-row">
                              <strong>{formatMetadataKey(key)}:</strong>{' '}
                              <span className="admin-table-secondary">{formatMetadataValue(key, value)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
