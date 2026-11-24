'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { AppShell } from '@/components/layout';
import { auditService, AuditLogEntry } from '@/lib/api/audit';
import {
  ShieldAlert,
  Search,
  Filter,
  Clock,
  Terminal,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  FileCode,
} from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [selectedPayload, setSelectedPayload] = useState<AuditLogEntry | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    async function fetchLogs() {
      try {
        const data = await auditService.getAuditLogs();
        setLogs(data);
      } catch (err) {
        console.error('Failed to load audit logs', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const q = search.toLowerCase();
      const matchesSearch =
        log.action.toLowerCase().includes(q) ||
        (log.userName && log.userName.toLowerCase().includes(q)) ||
        (log.userEmail && log.userEmail.toLowerCase().includes(q)) ||
        (log.ipAddress && log.ipAddress.includes(q)) ||
        log.resource.toLowerCase().includes(q);

      const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

      return matchesSearch && matchesAction;
    });
  }, [logs, search, actionFilter]);

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, currentPage, pageSize]);

  return (
    <AppShell
      allowedRoles={['FOUNDER_SUPER_ADMIN', 'ADMIN']}
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-seg-plum/10 text-seg-plum">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Security & Immutable Audit Trail
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cryptographic audit logs, authentication access events, and sensitive data mutation histories.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-2xs">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search audit trail by actor, IP, or resource..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
              />
            </div>

            <div>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-seg-plum focus:outline-hidden focus:ring-1 focus:ring-seg-plum"
              >
                <option value="ALL">All Recorded Actions</option>
                <option value="USER_LOGIN">USER_LOGIN</option>
                <option value="PAYMENT_CONFIRMED">PAYMENT_CONFIRMED</option>
                <option value="STUDENT_ENROLLED">STUDENT_ENROLLED</option>
                <option value="TASK_EVALUATION_RECORDED">TASK_EVALUATION_RECORDED</option>
                <option value="ROLE_PERMISSION_UPDATED">ROLE_PERMISSION_UPDATED</option>
                <option value="BATCH_CREATED">BATCH_CREATED</option>
              </select>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-xl border border-border bg-card shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/30 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Origin IP</th>
                  <th className="py-3 px-4 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-muted-foreground">
                      Loading audit records...
                    </td>
                  </tr>
                ) : paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-muted-foreground">
                      No security audit events match the active search.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        {new Date(log.createdAt).toISOString().replace('T', ' ').slice(0, 19)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{log.userName || 'System Service'}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{log.userRole || 'SYSTEM'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] font-bold text-seg-plum border border-border/60">
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-foreground font-mono text-[11px]">
                          {log.resource}
                          {log.resourceId && `:${log.resourceId}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                        {log.ipAddress || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedPayload(log)}
                          className="rounded-md border border-border bg-background px-2 py-1 text-[11px] font-semibold text-seg-plum hover:bg-muted transition-colors inline-flex items-center gap-1"
                        >
                          <FileCode className="h-3 w-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-border/80 px-4 py-3 bg-muted/10 text-xs">
            <div className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredLogs.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-foreground">{Math.min(currentPage * pageSize, filteredLogs.length)}</span> of{' '}
              <span className="font-semibold text-foreground">{filteredLogs.length}</span> audit logs
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage <= 1}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-foreground disabled:opacity-40 hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 font-mono font-medium text-foreground">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card text-foreground disabled:opacity-40 hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Payload Snapshot Modal */}
        {selectedPayload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-seg-plum" />
                  <h3 className="text-sm font-bold text-foreground">
                    Audit Event Payload Snapshot
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedPayload(null)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 space-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Action:</span>{' '}
                  <span className="font-mono font-bold text-seg-plum">{selectedPayload.action}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Resource Target:</span>{' '}
                  <span className="font-mono text-foreground">{selectedPayload.resource} ({selectedPayload.resourceId})</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Actor:</span>{' '}
                  <span className="font-semibold text-foreground">{selectedPayload.userName}</span> ({selectedPayload.userEmail})
                </div>

                <div className="pt-2">
                  <span className="text-muted-foreground block mb-1">State Payload JSON:</span>
                  <pre className="max-h-60 overflow-auto rounded-lg border border-border/80 bg-muted/40 p-3 font-mono text-[11px] text-foreground">
                    {JSON.stringify(selectedPayload.payload, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/80 mt-4">
                <button
                  onClick={() => setSelectedPayload(null)}
                  className="rounded-lg bg-seg-plum px-4 py-1.5 text-xs font-semibold text-white hover:bg-seg-plum/90"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
