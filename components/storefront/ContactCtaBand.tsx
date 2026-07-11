// แถบ CTA คู่ LINE/Facebook (ref T1) — แผงพื้นเขียวอ่อน แบ่งครึ่งด้วยเส้นกลาง
// สีปุ่ม/พื้นมาจาก brand token (--brand-line / --brand-facebook — ข้อยกเว้นโลโก้แบรนด์ §5.3)

import type { ContactChannels } from '@/lib/theme-content';
import { ArrowRightIcon, FacebookLogoIcon, LineLogoIcon } from './icons';

export function ContactCtaBand({ contact }: { contact: ContactChannels }) {
  const hasLine = !!contact.lineUrl;
  const hasFacebook = !!contact.facebookUrl;
  if (!hasLine && !hasFacebook) return null;

  return (
    <section className="mx-auto max-w-(--container-max) px-4">
      <div className="grid overflow-hidden rounded-md bg-brand-line/10 md:grid-cols-2">
        {hasLine && (
          <div className="flex items-center gap-5 px-7 py-8 md:px-10">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-line text-primary-fg">
              <LineLogoIcon size={34} />
            </span>
            <div>
              <p className="font-heading text-lg font-bold text-text">สนใจสั่งซื้อ / สอบถามสินค้า</p>
              <p className="mt-0.5 text-sm text-text-muted">ทักมาได้เลย ตอบไว แนะนำไซส์ให้</p>
              <a
                href={contact.lineUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-brand-line px-4 py-2.5 text-sm font-semibold text-primary-fg transition-opacity hover:opacity-90"
              >
                ติดต่อสั่งซื้อผ่าน LINE
                <ArrowRightIcon size={14} />
              </a>
            </div>
          </div>
        )}
        {hasFacebook && (
          <div
            className={`flex items-center gap-5 px-7 py-8 md:px-10 ${
              hasLine ? 'border-t border-border-soft md:border-l md:border-t-0' : ''
            }`}
          >
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-facebook text-primary-fg">
              <FacebookLogoIcon size={34} />
            </span>
            <div>
              <p className="font-heading text-lg font-bold text-text">หรือทักข้อความ Facebook</p>
              <p className="mt-0.5 text-sm text-text-muted">ส่งข้อความหาเราได้ตลอดเวลา</p>
              <a
                href={contact.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-brand-facebook px-4 py-2.5 text-sm font-semibold text-primary-fg transition-opacity hover:opacity-90"
              >
                ส่งข้อความผ่าน Facebook
                <ArrowRightIcon size={14} />
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
