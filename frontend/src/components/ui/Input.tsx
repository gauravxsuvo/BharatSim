import { InputHTMLAttributes, SelectHTMLAttributes, Ref } from 'react';

const FIELD_CLASSES = 'w-full bg-transparent border-0 border-b-2 border-foreground py-2 font-body text-base text-foreground focus:border-b-4 focus:outline-none transition-[border-width] duration-100';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  ref?: Ref<HTMLInputElement>;
}

export default function Input({ className = '', ref, ...props }: InputProps) {
  return (
    <input
      ref={ref}
      className={`${FIELD_CLASSES} placeholder:italic placeholder:text-muted-foreground ${className}`}
      {...props}
    />
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  ref?: Ref<HTMLSelectElement>;
}

export function Select({ className = '', children, ref, ...props }: SelectProps) {
  return (
    <select ref={ref} className={`${FIELD_CLASSES} cursor-pointer ${className}`} {...props}>
      {children}
    </select>
  );
}
