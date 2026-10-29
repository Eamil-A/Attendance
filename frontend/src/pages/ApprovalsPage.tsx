import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApprovalQueue } from '../components/ApprovalQueue';
import { normalizeEvent } from './BrowseEventsPage';
import { EventApprovalItem } from '../types/event';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function ApprovalsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/events/approvals/pending', { credentials: 'include' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error?.message || 'Failed to fetch pending approvals');
      }
      const data = await res.json();
      const rawEvents = data.data?.events || [];
      setEvents(rawEvents.map(normalizeEvent));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const primaryRole = user?.roles[0]?.role || 'GUEST';

  const handleReview = async (eventId: string, decision: 'APPROVED' | 'REJECTED', remarks: string) => {
    const res = await fetch(`/api/v1/events/${eventId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ decision, remarks }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to record review');
    }
    showToast('success', json.data?.message || `Proposal ${decision.toLowerCase()} successfully`);
    await loadPending();
  };

  const handleReturn = async (eventId: string, reason: string) => {
    const res = await fetch(`/api/v1/events/${eventId}/return`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to return proposal');
    }
    showToast('success', json.data?.message || 'Proposal returned for revision');
    await loadPending();
  };

  const handleApprove = async (eventId: string, remarks?: string) => {
    const res = await fetch(`/api/v1/events/${eventId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ remarks: remarks || 'Approved by HOD' }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to approve proposal');
    }
    showToast('success', json.data?.message || 'Event approved successfully');
    await loadPending();
  };

  const handleReject = async (eventId: string, reason: string) => {
    const res = await fetch(`/api/v1/events/${eventId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason }),
    });
    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error?.message || 'Failed to reject proposal');
    }
    showToast('success', json.data?.message || 'Event proposal rejected');
    await loadPending();
  };

  const handleFetchHistory = async (eventId: string): Promise<EventApprovalItem[]> => {
    const res = await fetch(`/api/v1/events/${eventId}`, { credentials: 'include' });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.approvals || [];
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '0.875rem 1.25rem', borderRadius: 'var(--radius-md)',
          backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--danger)',
          color: '#fff', boxShadow: 'var(--shadow-lg)', fontSize: '0.875rem', fontWeight: 600,
          animation: 'fadeIn 0.2s ease', maxWidth: '420px',
        }}>
          {toast.msg}
        </div>
      )}

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.875rem 1.25rem', backgroundColor: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)',
          color: 'var(--danger)', marginBottom: '1.5rem', fontSize: '0.875rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <Button size="sm" variant="secondary" onClick={loadPending}>
            <RefreshCw size={13} style={{ marginRight: '0.3rem' }} /> Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '4rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{
            width: '36px', height: '36px', border: '3px solid var(--border-color)',
            borderTopColor: 'var(--accent-primary)', borderRadius: '50%',
            animation: 'spin 0.7s linear infinite', margin: '0 auto 1rem',
          }} />
          <span>Loading approval queue…</span>
        </div>
      ) : (
        <ApprovalQueue
          events={events}
          userRole={primaryRole}
          userId={user?.id || ''}
          onReview={handleReview}
          onReturn={handleReturn}
          onApprove={handleApprove}
          onReject={handleReject}
          onFetchHistory={handleFetchHistory}
        />
      )}
    </div>
  );
}

