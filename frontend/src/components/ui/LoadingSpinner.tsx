'use client';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  /** White-on-black variant for use on inverted (black) surfaces. */
  inverted?: boolean;
}

const SIZES = { sm: 24, md: 40, lg: 64 };

export default function LoadingSpinner({ label, size = 'md', inverted = false }: LoadingSpinnerProps) {
  const px = SIZES[size];
  const trackColor = inverted ? 'rgba(255,255,255,0.25)' : 'var(--color-border)';
  const spinColor = inverted ? '#FFFFFF' : 'var(--color-foreground)';
  const labelColor = inverted ? 'text-white/70' : 'text-muted-foreground';

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        style={{
          width: px,
          height: px,
          borderRadius: '50%',
          border: `3px solid ${trackColor}`,
          borderTopColor: spinColor,
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {label && <span className={`text-sm font-mono uppercase tracking-widest ${labelColor}`}>{label}</span>}
    </div>
  );
}
