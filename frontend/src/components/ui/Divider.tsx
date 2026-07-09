interface DividerProps {
  weight?: 'thick' | 'ultra';
  className?: string;
}

export default function Divider({ weight = 'thick', className = '' }: DividerProps) {
  const height = weight === 'ultra' ? 'h-2' : 'h-1';
  return <hr className={`${height} border-0 bg-foreground my-8 ${className}`} />;
}
