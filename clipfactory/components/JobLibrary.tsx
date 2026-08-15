'use client';

import { formatSavedAt, type SavedJob } from '@/lib/storage';
import { Pill } from './ui';

/** งานที่บันทึกไว้ในเครื่อง — ทำหลายสินค้าต่อเนื่องโดยไม่ต้องเริ่มใหม่ทุกครั้ง */
export function JobLibrary({
  jobs,
  currentId,
  canSave,
  onSave,
  onLoad,
  onDelete,
  onNew,
  saveError,
}: {
  jobs: SavedJob[];
  currentId: string | null;
  canSave: boolean;
  onSave: () => void;
  onLoad: (job: SavedJob) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
  saveError: string;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary px-3 py-1.5 text-xs" onClick={onSave} disabled={!canSave}>
          {currentId ? 'บันทึกทับงานเดิม' : 'บันทึกงานนี้'}
        </button>
        <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={onNew}>
          เริ่มสินค้าใหม่
        </button>
      </div>

      {saveError ? <p className="text-[11px] text-[var(--color-danger)]">{saveError}</p> : null}

      {jobs.length === 0 ? (
        <p className="text-[11px] leading-relaxed text-[var(--color-muted)]">
          ยังไม่มีงานที่บันทึกไว้ · งานที่กำลังทำอยู่จะถูกเก็บอัตโนมัติ ปิดแท็บแล้วเปิดใหม่ก็ยังอยู่
          <br />
          ทุกอย่างเก็บในเครื่องคุณเท่านั้น ไม่ได้ส่งขึ้นเซิร์ฟเวอร์
        </p>
      ) : (
        <ul className="grid max-h-[280px] gap-1.5 overflow-y-auto pr-1">
          {jobs.map((j) => (
            <li
              key={j.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                j.id === currentId
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/[0.07]'
                  : 'border-[var(--color-line)] bg-[var(--color-panel-2)]'
              }`}
            >
              <button type="button" onClick={() => onLoad(j)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-xs font-semibold">{j.product.name || 'ไม่ระบุชื่อ'}</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[var(--color-muted)]">
                  <span>{formatSavedAt(j.savedAt)}</span>
                  {j.script ? <Pill tone="accent">มีสคริปต์แล้ว</Pill> : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(j.id)}
                className="flex-none text-[11px] text-[var(--color-muted)] hover:text-[var(--color-danger)]"
                aria-label={`ลบงาน ${j.product.name}`}
              >
                ลบ
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] leading-relaxed text-[var(--color-muted)]">
        หมายเหตุ: บันทึกเฉพาะข้อความ — ไฟล์เสียงและรูปต้องทำใหม่เมื่อเปิดงานเก่า
      </p>
    </div>
  );
}
