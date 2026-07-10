// แถบประกาศบนสุด — ใช้เฉพาะธีมกลุ่ม Professional ขึ้นไป (§4.6)
export function AnnouncementBar({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <div className="bg-primary px-4 py-2 text-center text-xs font-medium tracking-wide text-primary-fg">
      <span aria-hidden className="mr-2 opacity-70">
        ✦
      </span>
      {text}
      <span aria-hidden className="ml-2 opacity-70">
        ✦
      </span>
    </div>
  );
}
