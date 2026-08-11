export function UploadProgress({ value }: { value: number }) {
  return (
    <div className="mt-3" role="status" aria-label={`Upload ${value}% complete`}>
      <div className="mb-1 flex justify-between text-xs">
        <span>Uploading</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="bg-primary h-full transition-[width] motion-reduce:transition-none"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
