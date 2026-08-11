'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { getAnalyticsSummary, getAnalyticsTimeline } from './analytics.client';
import type { AnalyticsRange, AnalyticsSummary, AnalyticsTimeline } from './analytics.schemas';
import { AccessibleBarChart } from './AccessibleBarChart';

const emptySummary: AnalyticsSummary = { totalVisitors: 0, topCountries: [], topPages: [] };

export function AnalyticsAdmin() {
  const [summary, setSummary] = useState<AnalyticsSummary>(emptySummary);
  const [timeline, setTimeline] = useState<AnalyticsTimeline>([]);
  const [range, setRange] = useState<AnalyticsRange>('month');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError('');
      try {
        const [nextSummary, nextTimeline] = await Promise.all([
          getAnalyticsSummary(signal),
          getAnalyticsTimeline(range, signal),
        ]);
        setSummary(nextSummary);
        setTimeline(nextTimeline);
      } catch (cause) {
        if (!signal?.aborted) setError(getApiErrorMessageWithDetails(cause));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [range],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <section aria-labelledby="analytics-heading">
      <p className="text-primary text-sm font-semibold tracking-wide uppercase">
        Privacy-conscious measurement
      </p>
      <h1
        id="analytics-heading"
        className="text-heading mt-2 font-serif text-3xl font-semibold sm:text-4xl"
      >
        Analytics
      </h1>
      <p className="text-foreground mt-2 max-w-3xl">
        First-party page-view activity from local site paths. Counts describe recorded events, not
        identified people.
      </p>
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label>
          <span className="mb-2 block text-sm font-semibold">Timeline range</span>
          <select
            value={range}
            onChange={(event) => setRange(event.target.value as AnalyticsRange)}
            className="min-h-11 rounded-lg border bg-white px-3"
          >
            <option value="day">Today</option>
            <option value="week">Seven days</option>
            <option value="month">Thirty days</option>
          </select>
        </label>
        <Button type="button" variant="outline" disabled={loading} onClick={() => void load()}>
          <RefreshCw aria-hidden="true" /> Refresh
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900"
        >
          {error}
        </p>
      )}
      {loading ? (
        <div role="status" className="mt-6 grid gap-4">
          <p>Loading analytics…</p>
          <div className="h-52 animate-pulse rounded-xl border bg-slate-100 motion-reduce:animate-none" />
        </div>
      ) : (
        <>
          <article className="bg-card mt-6 rounded-xl border p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="bg-primary/10 text-primary rounded-lg p-3">
                <BarChart3 aria-hidden="true" className="size-6" />
              </span>
              <div>
                <p className="text-sm font-medium text-slate-600">Recorded page-view events</p>
                <p className="text-heading text-3xl font-semibold tabular-nums">
                  {summary.totalVisitors.toLocaleString()}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm">
              This is an event count and must not be interpreted as unique visitors.
            </p>
          </article>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <AccessibleBarChart
              title="Top pages"
              description="Local routes ranked by recorded page views."
              data={summary.topPages.map((item) => ({ label: item.route, value: item.visits }))}
            />
            <AccessibleBarChart
              title="Top countries"
              description="Coarse country codes supplied by privacy-conscious request metadata."
              data={summary.topCountries.map((item) => ({
                label: item.country,
                value: item.visits,
              }))}
            />
          </div>
          <div className="mt-6">
            <AccessibleBarChart
              title={`${rangeLabel(range)} timeline`}
              description="UTC daily page-view totals. Bar length, numeric labels and the accompanying table communicate the same values without relying on color."
              data={timeline.map((item) => ({ label: item.date, value: item.visitors }))}
            />
          </div>
        </>
      )}
    </section>
  );
}

function rangeLabel(range: AnalyticsRange) {
  return range === 'day' ? 'Daily' : range === 'week' ? 'Seven-day' : 'Thirty-day';
}
