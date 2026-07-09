'use client';

import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const BASE = 'inline-flex items-center justify-center gap-2 font-mono uppercase tracking-widest transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100';

const SIZES: Record<Size, string> = {
  sm: 'px-3.5 py-1.5 text-xs',
  md: 'px-8 py-3 text-sm',
};

const VARIANTS: Record<Variant, string> = {
  primary: 'border border-foreground bg-foreground text-background hover:bg-background hover:text-foreground',
  secondary: 'border border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background',
  ghost: 'border-0 bg-transparent px-0 py-1 text-foreground underline-offset-4 hover:underline',
};

export default function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  const sizeClasses = variant === 'ghost' ? '' : SIZES[size];
  return (
    <button className={`${BASE} ${sizeClasses} ${VARIANTS[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
