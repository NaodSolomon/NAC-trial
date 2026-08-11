interface ChartDatum {
  label: string;
  value: number;
}

export function AccessibleBarChart({
  title,
  description,
  data,
  valueHeading = 'Page views',
}: {
  title: string;
  description: string;
  data: ChartDatum[];
  valueHeading?: string;
}) {
  const maximum = Math.max(1, ...data.map(({ value }) => value));
  return (
    <figure className="bg-card rounded-xl border p-5 shadow-sm">
      <figcaption>
        <h2 className="text-heading text-xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </figcaption>
      {data.length === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed p-5 text-center">
          No activity was recorded for this view.
        </p>
      ) : (
        <>
          <div aria-hidden="true" className="mt-6 space-y-3">
            {data.map((datum) => (
              <div
                key={datum.label}
                className="grid grid-cols-[minmax(6rem,10rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm"
              >
                <span className="truncate font-medium">{datum.label}</span>
                <span className="h-5 rounded border border-slate-900 bg-slate-100">
                  <span
                    className="block h-full rounded-sm bg-slate-800"
                    style={{ width: `${Math.max(2, (datum.value / maximum) * 100)}%` }}
                  />
                </span>
                <span className="min-w-10 text-right font-semibold tabular-nums">
                  {datum.value}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="mb-2 text-left font-semibold">{title} data table</caption>
              <thead>
                <tr className="border-b">
                  <th className="py-2 pr-4">Dimension</th>
                  <th className="py-2 text-right">{valueHeading}</th>
                </tr>
              </thead>
              <tbody>
                {data.map((datum) => (
                  <tr key={datum.label} className="border-b last:border-0">
                    <td className="py-2 pr-4">{datum.label}</td>
                    <td className="py-2 text-right font-medium tabular-nums">{datum.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </figure>
  );
}
