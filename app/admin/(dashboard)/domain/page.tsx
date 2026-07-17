// โดเมนของตัวเอง — บริการ ฿590/ปี ทีมงานจัดการให้ทุกขั้นตอน (migration 017)
// flow ฝั่งร้าน: ส่งชื่อโดเมนที่อยากได้ → สแกน QR จ่าย ฿590 + อัปสลิป → ติดตามสถานะ
// ทีมงานจดโดเมน + ตั้งค่าให้ → โดเมนใช้งานได้ (ต่ออายุปีละครั้งจากหน้านี้)

import { getStoreUser, userRole } from '@/lib/auth';
import {
  DOMAIN_SERVICE_PRICE_YEARLY,
  getOpenRequest,
  listRequests,
  RENEWAL_WINDOW_DAYS,
  type DomainRequestRow,
} from '@/lib/domain-requests';
import { getCustomDomain } from '@/lib/domains';
import { formatBaht, formatThaiDate, formatThaiDateTime } from '@/lib/format';
import { getPlatformPromptpay } from '@/lib/platform-settings';
import { generatePromptpayQrSvg } from '@/lib/promptpay';
import { getTenantContext } from '@/lib/tenant-context';
import {
  CancelRequestButton,
  DomainRequestForm,
  DomainSlipUploader,
  RenewDomainButton,
} from './domain-client';

export const dynamic = 'force-dynamic';

const REQ_STATUS_TH: Record<DomainRequestRow['status'], { label: string; tone: string }> = {
  awaiting_payment: { label: 'รอชำระเงิน', tone: 'bg-amber-50 text-amber-700' },
  slip_uploaded: { label: 'ทีมงานกำลังตรวจสลิป', tone: 'bg-indigo-50 text-indigo-700' },
  in_progress: { label: 'กำลังจดโดเมนและตั้งค่า', tone: 'bg-indigo-50 text-indigo-700' },
  completed: { label: 'เสร็จสิ้น', tone: 'bg-emerald-50 text-emerald-700' },
  rejected: { label: 'ถูกปฏิเสธ', tone: 'bg-rose-50 text-rose-700' },
  cancelled: { label: 'ยกเลิก', tone: 'bg-gray-100 text-gray-500' },
};

// ขั้นของ timeline สถานะคำขอ
const STEPS = ['ส่งคำขอ', 'ชำระเงิน', 'ตรวจสอบสลิป', 'จดโดเมน + ตั้งค่า', 'ใช้งานได้'] as const;
function stepIndex(status: DomainRequestRow['status']): number {
  switch (status) {
    case 'awaiting_payment':
      return 1;
    case 'slip_uploaded':
      return 2;
    case 'in_progress':
      return 3;
    case 'completed':
      return 5;
    default:
      return 0;
  }
}

function Timeline({ status }: { status: DomainRequestRow['status'] }) {
  const current = stepIndex(status);
  return (
    <ol className="flex flex-wrap items-center gap-y-2">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center">
            {i > 0 && <span className={`mx-2 h-px w-6 ${done ? 'bg-indigo-400' : 'bg-gray-200'}`} />}
            <span
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                done
                  ? 'bg-indigo-600 text-white'
                  : active
                    ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {done ? '✓' : `${i + 1}.`} {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

const SERVICE_BULLETS = [
  `ค่าบริการ ${DOMAIN_SERVICE_PRICE_YEARLY.toLocaleString('th-TH')} บาท/ปี รวมค่าจดโดเมนและการตั้งค่าทั้งหมด`,
  'ทีมงานจดโดเมน ตั้งค่า DNS และเชื่อมเข้าร้านของคุณให้ — ไม่ต้องทำอะไรเองเลย',
  'ปกติใช้เวลา 1-2 วันทำการหลังยืนยันการชำระเงิน',
  'ต่ออายุปีละครั้งจากหน้านี้ — ระบบจะแจ้งเตือนล่วงหน้าก่อนหมดอายุ',
];

export default async function DomainPage() {
  const ctx = await getTenantContext();
  const user = await getStoreUser(ctx);
  const rootDomain = process.env.ROOT_DOMAIN ?? 'shopdashth.com';

  if (user && userRole(user) !== 'store_owner') {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
        เฉพาะเจ้าของร้านเท่านั้นที่จัดการโดเมนได้
      </div>
    );
  }

  if (!ctx.features.custom_domain) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <h1 className="text-lg font-semibold text-gray-900">โดเมนของตัวเอง</h1>
        <p className="mt-2 text-sm text-gray-500">
          ฟีเจอร์นี้ใช้ได้กับแพลน Pro ขึ้นไป —{' '}
          <a href="/admin/plan" className="font-medium text-gray-900 underline underline-offset-2">
            อัปเกรดแพลน
          </a>{' '}
          เพื่อเปิดใช้งาน
        </p>
      </div>
    );
  }

  const [domain, openRequest, history] = await Promise.all([
    getCustomDomain(ctx.tenantId),
    getOpenRequest(ctx.tenantId),
    listRequests(ctx.tenantId),
  ]);

  const activeDomain = domain?.status === 'active' ? domain : null;
  const lastRejected =
    !openRequest && history[0]?.status === 'rejected' ? history[0] : undefined;

  // ปุ่มต่ออายุ: โดเมนที่ระบบดูแล + เหลืออายุ ≤ RENEWAL_WINDOW_DAYS วัน (หรือเลยแล้ว)
  const daysLeft = activeDomain?.service_ends_at
    ? Math.ceil((new Date(activeDomain.service_ends_at).getTime() - Date.now()) / 86_400_000)
    : null;
  const canRenew =
    !!activeDomain?.managed && !openRequest && daysLeft != null && daysLeft <= RENEWAL_WINDOW_DAYS;

  // QR จ่ายเงิน — เฉพาะคำขอสถานะรอชำระ
  let qrSvg: string | null = null;
  const { id: platformPromptpayId, name: platformPromptpayName } = await getPlatformPromptpay();
  if (openRequest?.status === 'awaiting_payment' && platformPromptpayId) {
    try {
      qrSvg = await generatePromptpayQrSvg(platformPromptpayId, openRequest.amount);
    } catch {
      qrSvg = null;
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">โดเมนของตัวเอง</h1>
        <p className="mt-1 text-sm text-gray-500">
          subdomain {ctx.slug}.{rootDomain} ยังใช้งานได้ปกติเสมอ — โดเมนส่วนตัวเป็นการเพิ่มช่องทาง
          ไม่ใช่แทนที่
        </p>
      </div>

      {/* โดเมนที่ใช้งานอยู่ */}
      {activeDomain && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900">{activeDomain.domain}</h2>
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
              ใช้งานได้
            </span>
          </div>
          {activeDomain.managed && activeDomain.service_ends_at && (
            <p className="mt-2 text-sm text-gray-600">
              อายุบริการถึง <b>{formatThaiDate(activeDomain.service_ends_at)}</b>
              {daysLeft != null && daysLeft <= RENEWAL_WINDOW_DAYS && (
                <span className={daysLeft <= 7 ? 'ml-1 font-medium text-rose-600' : 'ml-1 text-amber-700'}>
                  ({daysLeft <= 0 ? 'หมดอายุแล้ว' : `เหลืออีก ${daysLeft} วัน`})
                </span>
              )}
            </p>
          )}
          {canRenew && (
            <div className="mt-3">
              <RenewDomainButton />
            </div>
          )}
        </section>
      )}

      {/* คำขอที่กำลังดำเนินการ */}
      {openRequest && (
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-900">
              คำขอ{openRequest.kind === 'renewal' ? 'ต่ออายุ' : 'จด'}โดเมน: {openRequest.domain}
            </h2>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${REQ_STATUS_TH[openRequest.status].tone}`}
            >
              {REQ_STATUS_TH[openRequest.status].label}
            </span>
            <span className="text-xs text-gray-400">
              ส่งคำขอ {formatThaiDateTime(openRequest.created_at)}
            </span>
          </div>

          <Timeline status={openRequest.status} />

          {openRequest.status === 'awaiting_payment' && (
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <div className="flex flex-wrap items-start gap-6">
                <div className="w-52 shrink-0">
                  {qrSvg ? (
                    <>
                      {/* SVG จาก lib ฝั่ง server — ไม่ใช่ user input */}
                      <div
                        className="rounded-md border border-gray-200 p-2"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                      />
                      <p className="mt-2 text-center text-xs text-gray-500">
                        PromptPay: {platformPromptpayName}
                      </p>
                    </>
                  ) : (
                    <div className="flex h-52 items-center justify-center rounded-md border border-dashed border-gray-300 p-4 text-center text-xs text-gray-400">
                      ยังไม่สามารถสร้าง QR ได้ — กรุณาติดต่อทีมงาน
                    </div>
                  )}
                </div>
                <div className="min-w-64 flex-1 space-y-4">
                  <p className="text-sm text-gray-600">
                    สแกนจ่ายค่าบริการ{' '}
                    <span className="text-xl font-bold text-gray-900">
                      {formatBaht(openRequest.amount)}
                    </span>{' '}
                    /ปี แล้วแนบสลิปด้านล่าง — ทีมงานจะเริ่มดำเนินการทันทีหลังตรวจสอบ
                  </p>
                  <DomainSlipUploader requestId={openRequest.id} />
                  <CancelRequestButton requestId={openRequest.id} />
                </div>
              </div>
            </div>
          )}

          {openRequest.status === 'slip_uploaded' && (
            <p className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
              ได้รับสลิปแล้ว — ทีมงานกำลังตรวจสอบ โดยปกติไม่เกิน 1 วันทำการ
            </p>
          )}
          {openRequest.status === 'in_progress' && (
            <p className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
              ยืนยันการชำระเงินแล้ว — ทีมงานกำลัง{openRequest.kind === 'renewal' ? 'ต่ออายุ' : 'จด'}
              โดเมนและตั้งค่าให้ (ปกติ 1-2 วันทำการ) เสร็จแล้วจะเห็นโดเมนขึ้น "ใช้งานได้" ที่หน้านี้
            </p>
          )}
        </section>
      )}

      {/* คำขอล่าสุดถูกปฏิเสธ */}
      {lastRejected && (
        <section className="rounded-xl border border-rose-200 bg-rose-50/50 p-5">
          <h2 className="text-sm font-semibold text-gray-900">
            คำขอโดเมน {lastRejected.domain} ถูกปฏิเสธ
          </h2>
          <p className="mt-1 text-sm text-rose-700">
            เหตุผล: {lastRejected.reject_reason_th ?? '-'}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            ส่งคำขอใหม่ได้จากฟอร์มด้านล่าง — หากชำระเงินไปแล้ว ทีมงานจะติดต่อกลับเรื่องการคืนเงิน
          </p>
        </section>
      )}

      {/* ฟอร์มขอโดเมนใหม่ — เมื่อไม่มีคำขอค้าง และยังไม่มีโดเมน (หรือมีแต่อยากเปลี่ยน) */}
      {!openRequest && !activeDomain && (
        <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              ใช้โดเมนของตัวเอง — {formatBaht(DOMAIN_SERVICE_PRICE_YEARLY)}/ปี
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm text-gray-600">
              {SERVICE_BULLETS.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="text-emerald-500">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <DomainRequestForm />
          </div>
        </section>
      )}

      {/* ประวัติคำขอ */}
      {history.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">ประวัติคำขอโดเมน</h2>
          <ul className="divide-y divide-gray-100 text-sm">
            {history.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="font-medium text-gray-800">{r.domain}</span>
                <span className="text-xs text-gray-400">
                  {r.kind === 'renewal' ? 'ต่ออายุ' : 'จดใหม่'} · {formatBaht(r.amount)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${REQ_STATUS_TH[r.status].tone}`}
                >
                  {REQ_STATUS_TH[r.status].label}
                </span>
                <span className="ml-auto text-xs text-gray-400">
                  {formatThaiDateTime(r.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
