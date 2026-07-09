'use client';

// ร้านใหม่ต่อเดือน (§5.3) — single-series bar, สีเดียว indigo
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const DATA_COLOR = '#4f46e5';
const GRID_COLOR = '#e5e7eb';
const AXIS_COLOR = '#9ca3af';

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('th-TH', {
    month: 'short',
    year: '2-digit',
    timeZone: 'Asia/Bangkok',
  });
}

interface TooltipProps {
  active?: boolean;
  payload?: readonly { payload: { count: number } }[];
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0 || label == null) return null;
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-medium text-gray-900">{monthLabel(String(label))}</p>
      <p className="mt-0.5 text-gray-600">
        ร้านใหม่ {payload[0].payload.count.toLocaleString('th-TH')} ร้าน
      </p>
    </div>
  );
}

type RechartsTooltip = { active?: boolean; label?: string | number; payload?: readonly unknown[] };
type CountEntry = { payload: { count: number } };

export function NewStoresChart({ data }: { data: { month: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={monthLabel}
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: GRID_COLOR }}
          minTickGap={8}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: AXIS_COLOR, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={40}
        />
        <Tooltip
          cursor={{ fill: 'rgba(79,70,229,0.06)' }}
          content={(props: RechartsTooltip) => (
            <ChartTooltip
              active={props.active}
              payload={props.payload as readonly CountEntry[] | undefined}
              label={props.label}
            />
          )}
        />
        <Bar dataKey="count" fill={DATA_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
