import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { ShieldCheck, FileText, ArrowRight, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface PendingEvent {
  id: string;
  title: string;
  status: string;
  startTime: string;
  organizerName?: string;
  departmentName?: string;
  category: string;
  budget?: number;
}

interface OdRequest {
  id: string;
  eventTitle?: string;
  departmentName?: string;
  dutyDate: string;
  status: string;
}

export function HodDashboard() {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingEvent[]>([]);
  const [odRequests, setOdRequests] = useState<OdRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [evRes, odRes] = await Promise.all([
        fetch('/api/v1/events/approvals/pending', { credentials: 'include' }),
        fetch('/api/v1/events/od-requests/pending', { credentials: 'include' }),
      ]);

      if (!evRes.ok) {
        throw new Error('Failed to load pending proposals');
      }

      const evData = await evRes.json();
      const odData = await odRes.json();

      if (evData.data?.events) {
        const normalized = evData.data.events.map((e: any) => ({
          ...e,
          startTime: e.startTime || e.start_time,
          organizerName: e.organizerName || e.organizer_name,
          departmentName: e.departmentName || e.department_name,
        }));
        setPending(normalized);
      }
      if (odData.data?.pending) {
        setOdRequests(odData.data.pending);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            HOD Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {user?.firstName} {user?.lastName} — approve event proposals and OD requests for your department.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Button size="sm" variant="secondary" onClick={loadData}>
            <RefreshCw size={14} style={{ marginRight: '0.35rem' }} /> Refresh
          </Button>
          <Link to="/approvals">
            <Button size="sm">
              <ShieldCheck size={14} style={{ marginRight: '0.35rem' }} /> Approval Queue
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.25rem', backgroundColor: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={loadData}>Retry</Button>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <Card padding="1.125rem">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--warning)', flexShrink: 0 }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{pending.length}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Pending Approvals</div>
            </div>
          </div>
        </Card>
        <Card padding="1.125rem">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--info)', flexShrink: 0 }}>
              <FileText size={18} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{odRequests.length}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>OD Requests</div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        {/* Event approvals */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Event Proposals</h2>
            <Link to="/approvals" style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>
              View Queue →
            </Link>
          </div>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
          ) : pending.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No pending proposals.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pending.map((ev) => (
                <div key={ev.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.875rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', gap: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{ev.title}</div>
                    <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                      {ev.category} · {ev.organizerName ? `by ${ev.organizerName} · ` : ''}{new Date(ev.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <Link to={`/events/${ev.id}`}>
                    <Button size="sm" variant="outline">Review</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* OD requests */}
        <Card>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: '1.25rem' }}>OD Requests</h2>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
          ) : odRequests.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No pending OD requests.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {odRequests.map((od) => (
                <div key={od.id} style={{ padding: '0.875rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>{od.eventTitle ?? 'OD Request'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>{new Date(od.dutyDate).toLocaleDateString()}</span>
                    <Badge variant="warning">PENDING</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
