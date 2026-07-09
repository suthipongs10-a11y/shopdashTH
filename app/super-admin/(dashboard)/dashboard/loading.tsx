// Skeleton ระหว่างโหลดแดชบอร์ดแพลตฟอร์ม (§5.5)
export default function PlatformDashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="กำลังโหลดแดชบอร์ด">
      <div className="h-6 w-48 animate-pulse rounded bg-gray-200" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
    </div>
  );
}
