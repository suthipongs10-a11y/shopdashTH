// แถบสมาชิกใต้ header (ref T3): "สมาชิก Silver | คูปองของฉัน 3 ใบ | คะแนนสะสม 1,250"
// ระบบสมาชิกจริงเป็น Future — แถบนี้เป็นเนื้อหาโชว์ของธีมจาก __content (บันทึกใน DECISIONS)

import { StarIcon, TagIcon, UserIcon } from './icons';
import type { MemberBarContent } from '@/lib/theme-content';

const ITEM_ICONS = [TagIcon, StarIcon];

export function MemberBar({ content }: { content: MemberBarContent }) {
  return (
    <div className="border-b border-border-soft bg-surface">
      <div className="mx-auto flex max-w-(--container-max) items-center gap-4 overflow-x-auto px-4 py-2 text-xs">
        <span className="flex shrink-0 items-center gap-1.5 font-semibold text-text">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-fg">
            <UserIcon size={11} />
          </span>
          {content.title}
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-4 text-text-muted">
          {content.items.map((item, i) => {
            const Icon = ITEM_ICONS[i % ITEM_ICONS.length];
            return (
              <span key={item} className="flex items-center gap-1.5 whitespace-nowrap">
                <Icon size={13} className="text-text" />
                {item}
              </span>
            );
          })}
        </span>
      </div>
    </div>
  );
}
