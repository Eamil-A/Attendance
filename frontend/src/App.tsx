import React, { useEffect, useState } from 'react';
import {
  Database,
  Server,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface HealthResponse {
  status: string;
  uptime: number;
  timestamp: string;
  database: {
    connected: boolean;
    error?: string;
    details?: {
      current_time?: string;
      version?: string;
    };
  };
}

const CORE_ENTITIES = [
  'University',
  'UniversityConfig',
  'Department',
  'User',
  'UserRole',
  'StudentProfile',
  'Organization',
  'OrganizationMember',
  'Event',
  'EventEligibility',
  'EventStaffAssignment',
  'EventApproval',
  'EventRevision',
  'EventRegistration',
  'ODRequest',
  'ODRequestStudent',
  'Attendance',
  'Resource',
  'ResourceBooking',
  'Notification',
  'AuditLog',
];

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error(`Health check returned HTTP ${res.status}`);
      }
      const data = await res.json();
      setHealth(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reach API';
      setFetchError(message);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '2.5rem 1.5rem',
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '2rem',
          marginBottom: '2.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.25rem 0.75rem',
              borderRadius: '9999px',
              backgroundColor: 'var(--accent-glow)',
              color: 'var(--accent-primary)',
              fontSize: '0.85rem',
              fontWeight: 600,
              marginBottom: '0.75rem',
            }}
          >
            <Layers size={14} /> Phase 1 Foundation
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 700,
              letterSpacing: '-0.025em',
              marginBottom: '0.5rem',
            }}
          >
            University Event & Attendance Platform
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '680px' }}>
            Multi-university event proposal coordination, faculty review, HOD approvals,
            departmental OD authorization, roster attendance marking, and audit engine.
          </p>
        </div>

        <button
          onClick={checkHealth}
          disabled={loading}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.25rem',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem',
            fontWeight: 500,
            transition: 'all 0.2s ease',
          }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          {loading ? 'Checking...' : 'Refresh Health'}
        </button>
      </header>

      {/* Grid Status Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2.5rem',
        }}
      >
        {/* Backend API Status */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            backdropFilter: 'var(--backdrop-blur)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Server color="var(--accent-primary)" size={22} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Backend Server</h2>
            </div>
            {health ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: 'var(--success)',
                  backgroundColor: 'var(--success-bg)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={13} /> ACTIVE
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: 'var(--warning)',
                  backgroundColor: 'var(--warning-bg)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={13} /> {fetchError ? 'OFFLINE' : 'PENDING'}
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Express & TypeScript REST API service with Zod validation, helmet headers, and
            modular monolith architecture.
          </p>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              backgroundColor: 'var(--bg-primary)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            Endpoint: GET /api/health
          </div>
        </div>

        {/* Database Health Card */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            backdropFilter: 'var(--backdrop-blur)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Database color="var(--accent-primary)" size={22} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>PostgreSQL Database</h2>
            </div>
            {health?.database.connected ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: 'var(--success)',
                  backgroundColor: 'var(--success-bg)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <CheckCircle2 size={13} /> CONNECTED
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  color: 'var(--warning)',
                  backgroundColor: 'var(--warning-bg)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={13} /> CONFIGURED
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            21-table relational schema with foreign key integrity, range exclusion constraints, and
            tenant isolation.
          </p>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              backgroundColor: 'var(--bg-primary)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              color: health?.database.connected ? 'var(--success)' : 'var(--text-muted)',
            }}
          >
            {health?.database.connected
              ? 'Status: Live connection established'
              : 'Status: Ready for local / cloud PostgreSQL instance'}
          </div>
        </div>

        {/* Tenant Isolation Guard */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            backdropFilter: 'var(--backdrop-blur)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldCheck color="var(--accent-primary)" size={22} />
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tenant Isolation</h2>
            </div>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--accent-primary)',
                backgroundColor: 'var(--accent-glow)',
                padding: '0.2rem 0.6rem',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              ENFORCED
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
            Row-level discriminator scoping (`university_id`) with PolicyService and multi-tier
            audit trails.
          </p>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.82rem',
              backgroundColor: 'var(--bg-primary)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
            }}
          >
            Demo Seeds: Apex Tech & Metro State
          </div>
        </div>
      </div>

      {/* 21 Core Entities Table */}
      <section
        style={{
          backgroundColor: 'var(--bg-card)',
          backdropFilter: 'var(--backdrop-blur)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h2
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Layers size={18} color="var(--accent-primary)" /> Approved Baseline: 21 Core Entities
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          All 21 entities have been codified into PostgreSQL migration scripts with foreign keys,
          indexes, and tenant scoping.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '0.75rem',
          }}
        >
          {CORE_ENTITIES.map((entity, idx) => (
            <div
              key={entity}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
                padding: '0.65rem 0.9rem',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.88rem',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  minWidth: '22px',
                }}
              >
                {String(idx + 1).padStart(2, '0')}.
              </span>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{entity}</span>
              <CheckCircle2
                size={14}
                color="var(--success)"
                style={{ marginLeft: 'auto', flexShrink: 0 }}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
