// Helper จัดรูปแบบตัวเลข/วันที่ — ราคาเป็น "บาทเต็ม" int (§3.4)
// เวลาเก็บ UTC แสดงผล Asia/Bangkok เสมอ (§7.6)

export function formatBaht(amount: number): string {
  return `฿${amount.toLocaleString('th-TH')}`;
}

/** ช่วงราคา เช่น ฿890 หรือ ฿890–฿1,290 (variant มี price_override ต่างกัน) */
export function formatBahtRange(min: number, max?: number): string {
  if (max === undefined || max === min) return formatBaht(min);
  return `${formatBaht(min)}–${formatBaht(max)}`;
}

export function formatThaiDateTime(iso: string | Date): string {
  return new Date(iso).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Bangkok',
  });
}

export function formatThaiDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    dateStyle: 'medium',
    timeZone: 'Asia/Bangkok',
  });
}
