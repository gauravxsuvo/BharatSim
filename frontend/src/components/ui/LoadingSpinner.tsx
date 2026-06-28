'use client';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function LoadingSpinner({ label, size = 'md' }: LoadingSpinnerProps) {
  const sizes = { sm: 24, md: 40, lg: 64 };
  const px = sizes[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{
        width: px,
        height: px,
        borderRadius: '50%',
        border: `3px solid rgba(0,212,170,0.15)`,
        borderTopColor: 'var(--accent-primary)',
        animation: 'spin 0.8s linear infinite',
      }} />
      {label && <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{label}</span>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
