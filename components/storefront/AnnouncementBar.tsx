// แถบประกาศบนสุด — ใช้เฉพาะธีมกลุ่ม Professional ขึ้นไป (§4.6)
export function AnnouncementBar({ text }: { text?: string | null }) {
  if (!text) return null;
  return (
    <div className="bg-primary px-4 py-2 text-center text-sm text-primary-fg">{text}</div>
  );
}
