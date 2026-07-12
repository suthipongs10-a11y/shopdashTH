// ไอคอนชุด Store Admin — stroke 1.8 บน viewBox 24 โทนเดียวกันทั้ง backend
// (แยกจาก components/storefront/icons.tsx — ฝั่งร้านใช้ token ธีม ฝั่ง admin ใช้ palette คงที่)

interface IconProps {
  size?: number;
  className?: string;
}

function base(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true as const,
  };
}

export function DashboardIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="3" width="7.5" height="9" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5" />
      <rect x="13.5" y="12" width="7.5" height="9" rx="1.5" />
      <rect x="3" y="15.5" width="7.5" height="5.5" rx="1.5" />
    </svg>
  );
}

export function OrdersIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6.5 6h13l-1.5 9.5a2 2 0 0 1-2 1.7H9.7a2 2 0 0 1-2-1.7L6 4.8A1.5 1.5 0 0 0 4.5 3.5H3" />
      <circle cx="9.5" cy="20.2" r="1.3" />
      <circle cx="16.5" cy="20.2" r="1.3" />
    </svg>
  );
}

export function SlipIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 3.5h12v17l-2.4-1.6-2.4 1.6-1.2-.9-1.2.9-2.4-1.6L6 20.5z" />
      <path d="M9 8h6M9 11.5h6M9 15h3.5" />
    </svg>
  );
}

export function ProductsIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3 4 7v10l8 4 8-4V7z" />
      <path d="M4 7l8 4 8-4M12 11v10" />
    </svg>
  );
}

export function CategoriesIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M3.5 6.5 A 2 2 0 0 1 5.5 4.5 H 9 l2 2.5h7.5a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
    </svg>
  );
}

export function CustomersIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M15.5 5.4a3.2 3.2 0 0 1 0 5.2M17.8 15.4c1.5.8 2.4 2.3 2.7 4.6" />
    </svg>
  );
}

export function DiscountIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m5 19 14-14" />
      <circle cx="7.5" cy="7.5" r="2.2" />
      <circle cx="16.5" cy="16.5" r="2.2" />
    </svg>
  );
}

export function PagesIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M7 3.5h7l4 4v13H7z" />
      <path d="M14 3.5V8h4M10 12.5h5M10 16h5" />
    </svg>
  );
}

export function ContentIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M7 13h4M7 16h6" />
      <rect x="14.5" y="12" width="3.5" height="4.5" rx="0.5" />
    </svg>
  );
}

export function ThemeIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.9 2-2 0-.6-.2-1-.5-1.4-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.3A4.7 4.7 0 0 0 21 10.5C20.4 6.2 16.6 3 12 3z" />
      <circle cx="7.8" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="16.2" cy="10.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function DomainIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5s1.3-6.2 3.8-8.5z" />
    </svg>
  );
}

export function StaffIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="10" cy="8" r="3.2" />
      <path d="M4.5 20c.6-3.2 2.8-5 5.5-5 1.5 0 2.9.6 3.9 1.6" />
      <path d="M17.5 14.5v6M14.5 17.5h6" />
    </svg>
  );
}

export function SettingsIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13.5a7.8 7.8 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.7 7.7 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.6a7.7 7.7 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a7.7 7.7 0 0 0 2.6 1.5l.5 2.6h4l.5-2.6a7.7 7.7 0 0 0 2.6-1.5l2.3 1 2-3.4z" />
    </svg>
  );
}

export function PlanIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </svg>
  );
}

export function LogoutIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M14 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2" />
      <path d="M9 12h11m0 0-3-3m3 3-3 3" />
    </svg>
  );
}

export function ExternalIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M13.5 5.5H18a.5.5 0 0 1 .5.5v4.5M18 6l-7.5 7.5" />
      <path d="M18.5 14v4.5a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2H10" />
    </svg>
  );
}

export function MenuIcon({ size = 20, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 6.5h16M4 12h16M4 17.5h16" />
    </svg>
  );
}

export function CloseIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function PlusIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function BahtIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.5 7.5h3.2a2 2 0 0 1 0 4H9.5m0 0h3.7a2 2 0 0 1 0 4H9.5V7.5M12 5.8v12.4" />
    </svg>
  );
}

export function ClockIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function CheckCircleIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </svg>
  );
}

export function BoxIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="4" y="7" width="16" height="13" rx="2" />
      <path d="M4 11h16M9.5 3.5h5L16 7H8z" />
    </svg>
  );
}

export function TruckIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3v3.5h-7" />
      <circle cx="6.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </svg>
  );
}

export function AlertIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 4 2.8 19.5h18.4z" />
      <path d="M12 10v4.2M12 16.8v.2" />
    </svg>
  );
}

export function SearchIcon({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.4-4.4" />
    </svg>
  );
}

export function StarIcon({ size = 14, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z" />
    </svg>
  );
}
