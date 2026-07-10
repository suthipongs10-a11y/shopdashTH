// map ชื่อสีภาษาไทย (product_variants.color) → ค่าสีสำหรับจุดสีบนการ์ด/quick view
// ชื่อที่ไม่รู้จัก = จุดเทากลาง (ยังกดเลือกได้ตามชื่อ)

const COLOR_MAP: Record<string, string> = {
  ดำ: '#111214',
  ขาว: '#ffffff',
  เบจ: '#d8c6ae',
  ครีม: '#f1e8d8',
  เทา: '#9ca3af',
  เทาอ่อน: '#c9cdd3',
  เทาเข้ม: '#4b5158',
  กรม: '#1f2a44',
  นาวี: '#1f2a44',
  น้ำเงิน: '#27498f',
  ฟ้า: '#93b4d1',
  เขียว: '#4c7a4f',
  โอลีฟ: '#6b7048',
  เขียวขี้ม้า: '#6b7048',
  น้ำตาล: '#8b6f47',
  แทน: '#c2a878',
  แดง: '#d6453d',
  ชมพู: '#e8a3b5',
  ส้ม: '#e08b3d',
  เหลือง: '#e3c34d',
  ม่วง: '#7d5ba6',
};

export function colorFromName(name: string | null | undefined): string {
  if (!name) return '#c9cdd3';
  return COLOR_MAP[name.trim()] ?? '#c9cdd3';
}
