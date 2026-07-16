'use client';

// กราฟยอดขาย (§5.2) — single-series ทั้งคู่: ยอดขาย(บาท) ต่อแกนเวลาเดียว
// ไม่มี dual-axis (จำนวนออร์เดอร์โชว์ใน tooltip แทน) — โทน indigo/violet บนพื้นขาว
// แดชบอร์ดแอดมินใช้ palette เทา/indigo ตรงๆ ได้ (กฎ no-hardcode-color บังคับเฉพาะ storefront §8.5)

import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailySalesPoint, WeeklySalesPoint } from '@/lib/analytics';

const LINE_COLOR = '#4f46e5'; // indigo-600
const BAR_TOP = '#a78bfa'; // violet-400
const BAR_BOTTOM = '#6366f1'; // indigo-500
const GRID_COLOR = '#eef2f7';
const AXIS_COLOR = '#9ca3af'; // gray-400

function bahtCompact(v: number): string {
  if (v >= 1_000_000)
    return `฿${(v / 1_000_000).toLocaleString('th-TH', { maximumFractionDigits: 1 })}M`;
  if (v >= 1_000) return `฿${(v / 1_000).toLocaleString('th-TH', { maximumFractionDigits: 1 })}k`;
  return `฿${v.toLocaleString('th-TH')}`;
}

function bahtFull(v: number): string {
  return `฿${v.toLocaleString('th-TH')}`;
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Bangkok',
  });
}

function weekLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Bangkok',
  });
}

interface TooltipProps {
  active?: boolean;
  payload?: readonly { payload: { revenue: number; order_count: number } }[];
  label?: string | number;
  labelPrefix: string;
  fmtLabel: (iso: string) => string;
}

function ChartTooltip({ active, payload, label, labelPrefix, fmtLabel }: TooltipProps) {
  if (!active || !payload || payload.length === 0 || label == null) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-900">
        {labelPrefix}
        {fmtLabel(String(label))}
      </p>
      <p className="mt-0.5 text-gray-600">ยอดขาย {bahtFull(p.revenue)}</p>
      <p className="text-gray-500">{p.order_count.toLocaleString('th-TH')} ออร์เดอร์</p>
    </div>
  );
}

type RechartsTooltip = { active?: boolean; label?: string | number; payload?: readonly unknown[] };
type SalesEntry = { payload: { revenue: number; order_count: number } };

/* หัวการ์ดกราฟ: icon chip พาสเทล + ชื่อ + ยอดรวมด้านขวา */
function ChartHead({
  icon,
  title,
  total,
  chip,
}: {
  icon: ReactNode;
  title: string;
  total: number;
  chip: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${chip}`}>{icon}</span>
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
      </div>
      <span className="text-xs font-semibold text-gray-500">รวม {bahtCompact(total)}</span>
    </div>
  );
}

function TrendGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 16l5-5 4 3 6-7" />
      <path d="M18 7h3v3" />
    </svg>
  );
}

function BarsGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 20V10M12 20V4M19 20v-7" />
    </svg>
  );
}

export function SalesCharts({
  daily,
  weekly,
}: {
  daily: DailySalesPoint[];
  weekly: WeeklySalesPoint[];
}) {
  const dailyTotal = daily.reduce((s, d) => s + d.revenue, 0);
  const weeklyTotal = weekly.reduce((s, w) => s + w.revenue, 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <ChartHead
          icon={<TrendGlyph />}
          title="ยอดขายรายวัน (30 วันล่าสุด)"
          total={dailyTotal}
          chip="bg-indigo-100 text-indigo-600"
        />
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="dailyFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.22} />
                <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={dayLabel}
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
              minTickGap={28}
            />
            <YAxis
              tickFormatter={bahtCompact}
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              content={(props: RechartsTooltip) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload as readonly SalesEntry[] | undefined}
                  label={props.label}
                  labelPrefix=""
                  fmtLabel={dayLabel}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke={LINE_COLOR}
              strokeWidth={2.5}
              fill="url(#dailyFill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <ChartHead
          icon={<BarsGlyph />}
          title="ยอดขายรายสัปดาห์ (12 สัปดาห์ล่าสุด)"
          total={weeklyTotal}
          chip="bg-violet-100 text-violet-600"
        />
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weekly} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="weeklyBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={BAR_TOP} />
                <stop offset="100%" stopColor={BAR_BOTTOM} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="week_start"
              tickFormatter={weekLabel}
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
              minTickGap={16}
            />
            <YAxis
              tickFormatter={bahtCompact}
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              cursor={{ fill: 'rgba(99,102,241,0.06)' }}
              content={(props: RechartsTooltip) => (
                <ChartTooltip
                  active={props.active}
                  payload={props.payload as readonly SalesEntry[] | undefined}
                  label={props.label}
                  labelPrefix="สัปดาห์ของ "
                  fmtLabel={weekLabel}
                />
              )}
            />
            <Bar dataKey="revenue" fill="url(#weeklyBar)" radius={[6, 6, 0, 0]} maxBarSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
