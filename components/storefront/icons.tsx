// ชุดไอคอน SVG กลางของ storefront — stroke ตาม currentColor เสมอ (สีมาจาก token ผ่าน class)

interface IconProps {
  className?: string;
  size?: number;
}

function base(size: number) {
  return {
    viewBox: '0 0 24 24',
    width: size,
    height: size,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  };
}

export function CartIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

export function SearchIcon({ className, size = 20 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

export function PhoneIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export function MapPinIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function TruckIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M14 9h4l4 4v4a1 1 0 0 1-1 1h-2" />
      <circle cx="7.5" cy="18" r="2" />
      <circle cx="17.5" cy="18" r="2" />
      <path d="M9.5 18h6" />
    </svg>
  );
}

export function QrIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14h1M14 20h1M17 20h4" />
    </svg>
  );
}

export function ShieldIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function PackageIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  );
}

export function ArrowRightIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronDownIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function CloseIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function TagIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r="1" />
    </svg>
  );
}

export function ClockIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

export function LockIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

export function HeadsetIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
      <path d="M20 18v1a3 3 0 0 1-3 3h-3" />
    </svg>
  );
}

export function HeartIcon({ className, size = 18, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} className={className} fill={filled ? 'currentColor' : 'none'}>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
    </svg>
  );
}

export function UserIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function CreditCardIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}

export function BankIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
      <path d="M3 20h18" />
    </svg>
  );
}

export function CashIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="2" y="7" width="20" height="12" rx="2" />
      <circle cx="12" cy="13" r="2.6" />
      <path d="M5.5 10h.01M18.5 16h.01" />
    </svg>
  );
}

export function StarIcon({ className, size = 14, filled = true }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base(size)} className={className} fill={filled ? 'currentColor' : 'none'} strokeWidth={1.5}>
      <path d="M12 2.6 14.9 8.5l6.5.94-4.7 4.58 1.1 6.47L12 17.44l-5.8 3.05 1.1-6.47L2.6 9.44l6.5-.94z" />
    </svg>
  );
}

export function BellIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function ClipboardIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <rect x="6" y="4" width="12" height="18" rx="2" />
      <path d="M9 4a2 2 0 0 1 6 0" />
      <path d="M9 10h6M9 14h6M9 18h4" />
    </svg>
  );
}

export function ShirtIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m9 3-5.2 3.1a1 1 0 0 0-.42 1.28l1.5 3.4a1 1 0 0 0 1.3.52L8 10.5V20a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1v-9.5l1.82.8a1 1 0 0 0 1.3-.52l1.5-3.4a1 1 0 0 0-.42-1.27L15 3a3 3 0 0 1-6 0z" />
    </svg>
  );
}

export function CheckIcon({ className, size = 16 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

export function BagIcon({ className, size = 18 }: IconProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 7h12l1 13a1.5 1.5 0 0 1-1.5 1.6h-11A1.5 1.5 0 0 1 5 20z" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    </svg>
  );
}

/* โลโก้ช่องทางแชท (ref T1 — ปุ่ม LINE/Facebook) — fill ตามสีตัวอักษรปุ่ม */
export function LineLogoIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden>
      <path d="M12 3C6.9 3 2.8 6.4 2.8 10.6c0 3.7 3.3 6.9 7.7 7.5.3.1.7.2.8.5.1.2.1.6 0 .8l-.1.8c0 .2-.2.9.8.5s5.2-3.1 7.1-5.3c1.3-1.4 1.9-2.9 1.9-4.8C21.2 6.4 17.1 3 12 3z" />
    </svg>
  );
}

export function FacebookLogoIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden>
      <path d="M13.5 21v-7h2.4l.36-2.8H13.5V9.4c0-.81.22-1.36 1.38-1.36h1.48V5.55c-.26-.03-1.14-.11-2.16-.11-2.14 0-3.6 1.3-3.6 3.7v2.06H8.2V14h2.4v7z" />
    </svg>
  );
}

export function InfoIcon({ size = 14, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 7.8v.2" />
    </svg>
  );
}

export function HomeIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m3.5 10.5 8.5-7 8.5 7" />
      <path d="M5.5 9v10.5h5v-6h3v6h5V9" />
    </svg>
  );
}

export function PageIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M7 3.5h7l4 4v13H7z" />
      <path d="M14 3.5V8h4M10 12.5h5M10 16h5" />
    </svg>
  );
}

export function ChatIcon({ size = 18, className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 4c-4.7 0-8.5 3.1-8.5 7 0 2.2 1.2 4.1 3.1 5.4L6 20.5l4-1.7c.6.1 1.3.2 2 .2 4.7 0 8.5-3.1 8.5-7S16.7 4 12 4z" />
    </svg>
  );
}
