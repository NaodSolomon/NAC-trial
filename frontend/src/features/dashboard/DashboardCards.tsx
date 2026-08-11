'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied';
import { getApiErrorMessage, isApiRequestError } from '@/lib/api/errors';
import type { AdminRole } from '@/lib/auth/constants';
import { loadDashboardMetrics, type DashboardMetric } from './dashboard.client';

type DashboardState =
  | { status: 'loading' }
  | { status: 'ready'; metrics: DashboardMetric[] }
  | { status: 'forbidden' }
  | { status: 'error'; message: string };

export function DashboardCards({ role }: { role: AdminRole }) {
  const [state, setState] = useState<DashboardState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    void loadDashboardMetrics(role, controller.signal)
      .then((metrics) => setState({ status: 'ready', metrics }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState(
          isApiRequestError(error) && error.status === 403
            ? { status: 'forbidden' }
            : { status: 'error', message: getApiErrorMessage(error) },
        );
      });
    return () => controller.abort();
  }, [role]);

  if (state.status === 'forbidden') {
    return <AdminAccessDenied description="The API rejected access to this dashboard summary." />;
  }
  if (state.status === 'error') {
    return (
      <section
        role="status"
        className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-950"
      >
        <h2 className="font-semibold">Dashboard summary is temporarily unavailable</h2>
        <p className="mt-2 text-sm">{state.message}</p>
      </section>
    );
  }
  if (state.status === 'loading') {
    return (
      <div
        role="status"
        aria-label="Loading dashboard summary"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="bg-card h-40 animate-pulse rounded-xl border motion-reduce:animate-none"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {state.metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader>
            <div className="bg-primary/10 text-primary mb-2 flex size-10 items-center justify-center rounded-lg">
              <BarChart3 aria-hidden="true" className="size-5" />
            </div>
            <CardDescription>{metric.label}</CardDescription>
            <CardTitle className="text-heading text-3xl">{metric.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground text-sm">{metric.description}</p>
            <Link
              href={metric.href}
              className="text-primary mt-4 inline-flex min-h-11 items-center gap-2 font-semibold"
            >
              Open section <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
