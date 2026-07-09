'use client';

// กราฟยอดขาย (§5.2) — single-series ทั้งคู่: ยอดขาย(บาท) ต่อแกนเวลาเดียว
// ไม่มี dual-axis (จำนวนออร์เดอร์โชว์ใน tooltip แทน) — สีเดียว indigo contrast ผ่านบนพื้นขาว
// แดชบอร์ดแอดมินใช้ palette เทา/indigo ตรงๆ ได้ (กฎ no-hardcode-color บังคับเฉพาะ storefront §8.5)

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DailySalesPoint, WeeklySalesPoint } from '@/lib/analytics';

const DATA_COLOR = '#4f46e5'; // indigo-600
const GRID_COLOR = '#e5e7eb'; // gray-200
const AXIS_COLOR = '#9ca3af'; // gray-400

function bahtCompact(v: number): string {
  if (v >= 1_000_000) return `฿${(v / 1_000_000).toLocaleString('th-TH', { maximumFractionDigits: 1 })}M`;
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
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-gray-900">
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

export function SalesCharts({
  daily,
  weekly,
}: {
  daily: DailySalesPoint[];
  weekly: WeeklySalesPoint[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-medium text-gray-700">ยอดขายรายวัน (30 วันล่าสุด)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={daily} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
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
            <Line
              type="monotone"
              dataKey="revenue"
              stroke={DATA_COLOR}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-sm font-medium text-gray-700">ยอดขายรายสัปดาห์ (12 สัปดาห์ล่าสุด)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weekly} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
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
              cursor={{ fill: 'rgba(79,70,229,0.06)' }}
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
            <Bar dataKey="revenue" fill={DATA_COLOR} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
