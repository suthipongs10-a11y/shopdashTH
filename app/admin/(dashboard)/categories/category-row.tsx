'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { deleteCategory, moveCategory, renameCategory } from './actions';

export function CategoryRow({
  id,
  name,
  isFirst,
  isLast,
}: {
  id: string;
  name: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [movePending, startMove] = useTransition();
  const renameWithId = renameCategory.bind(null, id);
  const [renameState, renameAction, renamePending] = useActionState(renameWithId, {});

  // ปิดโหมดแก้ไขทันทีที่ submit (optimistic) แล้วเปิดกลับถ้า server ตอบ error
  useEffect(() => {
    if (renameState.error) setEditing(true);
  }, [renameState]);

  async function handleDelete() {
    if (!window.confirm(`ลบหมวดหมู่ "${name}" ใช่หรือไม่?`)) return;
    const result = await deleteCategory(id);
    setDeleteError(result.error ?? null);
  }

  if (editing) {
    return (
      <li className="flex items-center gap-2 px-4 py-3">
        <form
          action={renameAction}
          onSubmit={() => setEditing(false)}
          className="flex flex-1 items-center gap-2"
        >
          <input
            name="name"
            defaultValue={name}
            autoFocus
            className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            disabled={renamePending}
            className="rounded-lg bg-indigo-600 px-3 py-1 text-sm font-medium text-white shadow-sm disabled:opacity-50"
          >
            บันทึก
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg border border-gray-300 px-3 py-1 text-sm"
          >
            ยกเลิก
          </button>
        </form>
        {renameState.error && <p className="text-sm text-rose-600">{renameState.error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 px-4 py-3">
      <span className="text-sm text-gray-900">{name}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={isFirst || movePending}
          onClick={() => startMove(() => moveCategory(id, 'up'))}
          aria-label="เลื่อนขึ้น"
          className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30"
        >
          ↑
        </button>
        <button
          type="button"
          disabled={isLast || movePending}
          onClick={() => startMove(() => moveCategory(id, 'down'))}
          aria-label="เลื่อนลง"
          className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-30"
        >
          ↓
        </button>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-md px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
        >
          แก้ไข
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-md px-2 py-1 text-sm text-rose-600 hover:bg-rose-50"
        >
          ลบ
        </button>
      </div>
      {deleteError && <p className="text-sm text-rose-600">{deleteError}</p>}
    </li>
  );
}
