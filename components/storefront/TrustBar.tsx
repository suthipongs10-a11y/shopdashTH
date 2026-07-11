// แถบความเชื่อมั่นเหนือ footer (ref T4): โลโก้ payment + SSL + จำนวนลูกค้า

import { LockIcon, QrIcon, ShieldIcon } from './icons';

export function TrustBar({ trustText }: { trustText?: string }) {
  return (
    <section className="bg-secondary">
      <div className="mx-auto flex max-w-(--container-max) flex-wrap items-center justify-center gap-x-8 gap-y-3 px-4 py-6 text-xs text-text-muted">
        <span className="flex flex-wrap items-center gap-1.5" aria-label="ช่องทางชำระเงินที่รองรับ">
          <span className="border border-border-soft bg-bg px-1.5 py-0.5 text-[10px] font-bold italic text-brand-visa">
            VISA
          </span>
          <span className="border border-border-soft bg-bg px-1.5 py-0.5 text-[10px] font-bold text-brand-mastercard">
            Mastercard
          </span>
          <span className="border border-border-soft bg-bg px-1.5 py-0.5 text-[10px] font-bold text-brand-jcb">
            JCB
          </span>
          <span className="flex items-center gap-1 border border-border-soft bg-bg px-1.5 py-0.5 text-[10px] font-bold text-text">
            <QrIcon size={11} />
            PromptPay
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          <LockIcon size={14} className="text-text" />
          เข้ารหัส SSL ทุกการชำระเงิน
        </span>
        {trustText && (
          <span className="flex items-center gap-1.5">
            <ShieldIcon size={14} className="text-text" />
            {trustText}
          </span>
        )}
      </div>
    </section>
  );
}
