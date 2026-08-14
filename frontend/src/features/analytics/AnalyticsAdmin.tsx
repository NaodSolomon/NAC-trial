'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BarChart3, Download, FileText, HandCoins, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiErrorMessageWithDetails } from '@/lib/api/errors';
import { getAnalyticsSummary, getAnalyticsTimeline } from './analytics.client';
import type { AnalyticsRange, AnalyticsSummary, AnalyticsTimeline } from './analytics.schemas';

const AccessibleBarChart = dynamic(
  () => import('./AccessibleBarChart').then((module) => module.AccessibleBarChart),
  {
    loading: () => (
      <div
        role="status"
        aria-label="Loading chart"
        className="h-72 animate-pulse rounded-xl border bg-slate-100 motion-reduce:animate-none"
      />
    ),
  },
);

const emptySummary: AnalyticsSummary = {
  totalVisitors: 0,
  topCountries: [],
  topPages: [],
  forms: { totalSubmissions: 0, contact: 0, volunteer: 0, newsletter: 0, eventRsvp: 0 },
  resources: { totalDownloads: 0, topResources: [], topCountries: [] },
  donations: { totalDonations: 0, statusCounts: [], confirmedValues: [] },
};

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
        First-party page activity combined with authoritative form, resource and simulated-donation
        records. Counts describe activity, not identified visitors.
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
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={BarChart3}
              label="Recorded page views"
              value={summary.totalVisitors}
              description="Event count, not unique visitors"
            />
            <MetricCard
              icon={FileText}
              label="Form submissions"
              value={summary.forms.totalSubmissions}
              description="Persisted public engagement records"
            />
            <MetricCard
              icon={Download}
              label="Resource downloads"
              value={summary.resources.totalDownloads}
              description="Retained download-log records"
            />
            <MetricCard
              icon={HandCoins}
              label="Donation attempts"
              value={summary.donations.totalDonations}
              description="Trial records; not collected funds"
            />
          </div>
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
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <AccessibleBarChart
              title="Form submissions by workflow"
              description="Counts come from persisted contact, volunteer, newsletter and RSVP records."
              valueHeading="Submissions"
              data={[
                { label: 'Contact', value: summary.forms.contact },
                { label: 'Volunteer', value: summary.forms.volunteer },
                { label: 'Newsletter', value: summary.forms.newsletter },
                { label: 'Event RSVP', value: summary.forms.eventRsvp },
              ]}
            />
            <AccessibleBarChart
              title="Top downloaded resources"
              description="Published resources ranked by retained download-log records."
              valueHeading="Downloads"
              data={summary.resources.topResources.map((item) => ({
                label: item.title,
                value: item.downloads,
              }))}
            />
            <AccessibleBarChart
              title="Resource download countries"
              description="Validated coarse country codes; unknown locations are excluded from this ranking."
              valueHeading="Downloads"
              data={summary.resources.topCountries.map((item) => ({
                label: item.country,
                value: item.downloads,
              }))}
            />
            <AccessibleBarChart
              title="Donation status"
              description="Simulation records grouped by their current lifecycle status."
              valueHeading="Donations"
              data={summary.donations.statusCounts.map((item) => ({
                label: humanizeStatus(item.status),
                value: item.count,
              }))}
            />
            <AccessibleBarChart
              title="Confirmed simulated value"
              description="Confirmed trial values remain separated by currency and do not represent real collected funds."
              valueHeading="Simulated value"
              data={summary.donations.confirmedValues.map((item) => ({
                label: item.currency,
                value: Number(item.amount),
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
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <AccessibleBarChart
              title={`${rangeLabel(range)} form-submission trend`}
              description="UTC daily totals across the four persisted form workflows."
              valueHeading="Submissions"
              data={timeline.map((item) => ({ label: item.date, value: item.formSubmissions }))}
            />
            <AccessibleBarChart
              title={`${rangeLabel(range)} resource-download trend`}
              description="UTC daily retained resource-download records."
              valueHeading="Downloads"
              data={timeline.map((item) => ({ label: item.date, value: item.resourceDownloads }))}
            />
            <AccessibleBarChart
              title={`${rangeLabel(range)} donation-attempt trend`}
              description="UTC daily simulated donation creation totals."
              valueHeading="Donations"
              data={timeline.map((item) => ({ label: item.date, value: item.donationsCreated }))}
            />
            <AccessibleBarChart
              title={`${rangeLabel(range)} confirmed-donation trend`}
              description="UTC daily simulated confirmations; no real funds are represented."
              valueHeading="Confirmations"
              data={timeline.map((item) => ({ label: item.date, value: item.donationsConfirmed }))}
            />
            <AccessibleBarChart
              title={`${rangeLabel(range)} confirmed USD trend`}
              description="UTC daily confirmed simulated USD values."
              valueHeading="Simulated USD"
              data={timeline.map((item) => ({
                label: item.date,
                value: Number(item.confirmedUsd),
              }))}
            />
            <AccessibleBarChart
              title={`${rangeLabel(range)} confirmed ETB trend`}
              description="UTC daily confirmed simulated ETB values."
              valueHeading="Simulated ETB"
              data={timeline.map((item) => ({
                label: item.date,
                value: Number(item.confirmedEtb),
              }))}
            />
          </div>
        </>
      )}
    </section>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof BarChart3;
  label: string;
  value: number;
  description: string;
}) {
  return (
    <article className="bg-card rounded-xl border p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="bg-primary/10 text-primary rounded-lg p-3">
          <Icon aria-hidden="true" className="size-6" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="text-heading text-3xl font-semibold tabular-nums">
            {value.toLocaleString()}
          </p>
        </div>
      </div>
      <p className="mt-3 text-sm">{description}</p>
    </article>
  );
}

function humanizeStatus(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function rangeLabel(range: AnalyticsRange) {
  return range === 'day' ? 'Daily' : range === 'week' ? 'Seven-day' : 'Thirty-day';
}
