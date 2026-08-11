'use client';

import { useCallback, useEffect, useState } from 'react';
import { Database, Flame, RefreshCw, Search, Server, Trash2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmedActionButton } from '@/components/admin/ConfirmationDialog';
import { useAdminFeedback } from '@/components/admin/AdminFeedbackProvider';
import { Button } from '@/components/ui/button';
import { getApiErrorMessageWithDetails, isApiRequestError } from '@/lib/api/errors';
import { clearCache, getSystemStatus, reindexSearch, warmCache } from './system.client';
import type { Liveness, Readiness, VersionInformation } from './system.schemas';

type MaintenanceAction = 'clear' | 'warm' | 'reindex' | null;

export function SystemOperationsAdmin() {
  const [live, setLive] = useState<Liveness | null>(null);
  const [ready, setReady] = useState<Readiness | null>(null);
  const [version, setVersion] = useState<VersionInformation | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [maintenance, setMaintenance] = useState<MaintenanceAction>(null);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();
  const { notify } = useAdminFeedback();
  const loadHealth = useCallback(async (signal?: AbortSignal) => {
    setLoadingHealth(true);
    setError('');
    try {
      const result = await getSystemStatus(signal);
      setLive(result.live);
      setReady(result.ready);
      setVersion(result.version);
    } catch (cause) {
      if (!signal?.aborted) setError(getApiErrorMessageWithDetails(cause));
    } finally {
      if (!signal?.aborted) setLoadingHealth(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void loadHealth(controller.signal);
    return () => controller.abort();
  }, [loadHealth]);
  async function run(action: Exclude<MaintenanceAction, null>) {
    if (maintenance) return;
    setMaintenance(action);
    setError('');
    setMaintenanceMessage(
      action === 'reindex'
        ? 'Rebuilding seven allowlisted PostgreSQL search indexes…'
        : action === 'clear'
          ? 'Clearing public cache namespaces…'
          : 'Warming public cache entries…',
    );
    try {
      if (action === 'clear') {
        await clearCache();
        queryClient.clear();
        notify({
          title: 'Application cache cleared',
          message: 'PostgreSQL remains authoritative; public data will be loaded again on demand.',
        });
      }
      if (action === 'warm') {
        const result = await warmCache();
        await queryClient.invalidateQueries();
        notify({
          title: 'Application cache warmed',
          message: `${result.warmed.length} cache entries prepared.`,
        });
      }
      if (action === 'reindex') {
        const result = await reindexSearch();
        notify({
          title: 'Search indexes rebuilt',
          message: `${result.indexes.length} allowlisted indexes completed.`,
        });
      }
      setMaintenanceMessage('Maintenance action completed successfully.');
    } catch (cause) {
      setError(
        action === 'reindex' && isApiRequestError(cause) && cause.status === 409
          ? 'Another search-index rebuild is already running. Wait for it to finish before retrying.'
          : getApiErrorMessageWithDetails(cause),
      );
      setMaintenanceMessage('');
      throw cause;
    } finally {
      setMaintenance(null);
    }
  }
  return (
    <section aria-labelledby="system-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">Operations</p>
      <h1
        id="system-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        System administration
      </h1>
      <p className="mt-2 max-w-3xl">
        Inspect application health and run audited maintenance. PostgreSQL readiness and optional
        Redis degradation are reported independently.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={loadingHealth}
          onClick={() => void loadHealth()}
        >
          <RefreshCw aria-hidden="true" /> Refresh health
        </Button>
        {version && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${version.mode === 'trial' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'}`}
          >
            {version.mode.toUpperCase()} · {version.environment}
          </span>
        )}
      </div>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900"
        >
          {error}
        </p>
      )}
      {loadingHealth ? (
        <p role="status" className="mt-6">
          Checking liveness and readiness…
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <HealthCard
            icon={Server}
            title="API liveness"
            status={live?.process === 'alive' ? 'Alive' : 'Unavailable'}
            description="Confirms the API process can answer requests."
            healthy={live?.process === 'alive'}
          />
          <HealthCard
            icon={Database}
            title="PostgreSQL readiness"
            status={ready?.checks.postgresql === 'connected' ? 'Connected' : 'Unavailable'}
            description={
              ready?.checks.postgresql === 'connected'
                ? 'The authoritative database is ready.'
                : 'Readiness has failed; traffic should receive HTTP 503.'
            }
            healthy={ready?.checks.postgresql === 'connected'}
          />
          <HealthCard
            icon={Flame}
            title="Redis cache"
            status={ready?.checks.redis === 'connected' ? 'Connected' : 'Degraded'}
            description={
              ready?.checks.redis === 'connected'
                ? 'Optional cache is available.'
                : ready?.checks.postgresql === 'connected'
                  ? 'Redis is unavailable, but PostgreSQL remains ready and the API may continue with degraded performance.'
                  : 'Cache is unavailable while overall readiness is also failing.'
            }
            healthy={ready?.checks.redis === 'connected'}
          />
        </div>
      )}
      {version && (
        <section
          aria-labelledby="version-heading"
          className="bg-card mt-6 rounded-xl border p-5 shadow-sm"
        >
          <h2 id="version-heading" className="text-heading text-xl font-semibold">
            Version and adapters
          </h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Info label="Application" value={version.name} />
            <Info label="Version" value={version.version} />
            <Info label="Storage" value={version.adapters.storage} />
            <Info label="Mail" value={version.adapters.mail} />
            <Info label="Payment" value={version.adapters.payment} />
            <Info label="Cache" value={version.adapters.cache} />
            <Info
              label="Real payments"
              value={version.realPaymentsEnabled ? 'Enabled' : 'Disabled'}
            />
          </dl>
        </section>
      )}
      <section
        aria-labelledby="cache-heading"
        className="bg-card mt-6 rounded-xl border p-5 shadow-sm"
      >
        <h2 id="cache-heading" className="text-heading text-xl font-semibold">
          Cache operations
        </h2>
        <p className="mt-2 text-sm">
          Clear public namespaces or prefill settings and localized navigation. These actions are
          audited and never change PostgreSQL content.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ConfirmedActionButton
            destructive
            disabled={Boolean(maintenance)}
            title="Clear application cache?"
            description="Public cache entries will be removed. PostgreSQL remains authoritative and subsequent reads will repopulate data."
            confirmLabel="Clear cache"
            onConfirm={() => run('clear')}
          >
            <Trash2 aria-hidden="true" /> Clear cache
          </ConfirmedActionButton>
          <ConfirmedActionButton
            destructive={false}
            disabled={Boolean(maintenance)}
            title="Warm application cache?"
            description="Frequently used public settings and navigation entries will be loaded into Redis."
            confirmLabel="Warm cache"
            onConfirm={() => run('warm')}
          >
            <Flame aria-hidden="true" /> Warm cache
          </ConfirmedActionButton>
        </div>
      </section>
      <section
        aria-labelledby="search-maintenance-heading"
        className="bg-card mt-6 rounded-xl border p-5 shadow-sm"
      >
        <h2 id="search-maintenance-heading" className="text-heading text-xl font-semibold">
          Search index maintenance
        </h2>
        <p className="mt-2 text-sm">
          Rebuild only the seven allowlisted PostgreSQL trigram indexes. An advisory lock prevents
          concurrent rebuilds.
        </p>
        <div className="mt-5">
          <ConfirmedActionButton
            destructive={false}
            disabled={Boolean(maintenance)}
            title="Rebuild search indexes?"
            description="This long-running operation uses REINDEX CONCURRENTLY. It cannot be submitted again while active."
            confirmLabel="Start rebuild"
            onConfirm={() => run('reindex')}
          >
            <Search aria-hidden="true" /> Reindex search
          </ConfirmedActionButton>
        </div>
      </section>
      {maintenanceMessage && (
        <p
          role="status"
          aria-live="polite"
          className="mt-5 rounded-lg border border-blue-300 bg-blue-50 p-4 text-blue-950"
        >
          {maintenanceMessage}
        </p>
      )}
    </section>
  );
}

function HealthCard({
  icon: Icon,
  title,
  status,
  description,
  healthy,
}: {
  icon: typeof Server;
  title: string;
  status: string;
  description: string;
  healthy: boolean;
}) {
  return (
    <article
      className={`rounded-xl border p-5 shadow-sm ${healthy ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}
    >
      <Icon aria-hidden="true" className="size-6" />
      <h2 className="mt-3 font-semibold">{title}</h2>
      <p className="mt-1 text-xl font-bold">{status}</p>
      <p className="mt-2 text-sm">{description}</p>
    </article>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-semibold text-slate-600">{label}</dt>
      <dd className="mt-1 break-words">{value}</dd>
    </div>
  );
}
