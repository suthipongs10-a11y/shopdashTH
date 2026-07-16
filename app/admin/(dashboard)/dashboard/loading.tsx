// Skeleton ระหว่างโหลดแดชบอร์ด (§5.5) — ทรงตรงกับการ์ดจริง (rounded-2xl)
export default function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="กำลังโหลดแดชบอร์ด">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-gray-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-72 animate-pulse rounded-2xl bg-gray-100" />
        <div className="h-72 animate-pulse rounded-2xl bg-gray-100" />
      </div>
      <div className="h-52 animate-pulse rounded-2xl bg-gray-100" />
    </div>
  );
}
