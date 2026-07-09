import { ReactNode } from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export default function Header({ title, subtitle, children }: HeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b-4 border-foreground pb-6">
      <div>
        <h1 className="font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 font-body text-base text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
