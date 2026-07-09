import { SEVERITY_COLORS, SEVERITY_TEXT_COLORS } from '@/lib/constants';

interface SeverityBadgeProps {
  severity: string | null | undefined;
  className?: string;
}

export default function SeverityBadge({ severity, className = '' }: SeverityBadgeProps) {
  const key = severity?.toLowerCase() || 'low';
  const fill = SEVERITY_COLORS[key] ?? SEVERITY_COLORS.low;
  const text = SEVERITY_TEXT_COLORS[key] ?? SEVERITY_TEXT_COLORS.low;
  const borderWidth = key === 'critical' ? 2 : 1;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 text-xs font-mono uppercase tracking-widest ${className}`}
      style={{ background: fill, color: text, border: `${borderWidth}px solid #000000` }}
    >
      {key}
    </span>
  );
}
