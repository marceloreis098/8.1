
import React from 'react';
import * as icons from 'lucide-react';

interface IconProps {
  name: keyof typeof icons;
  color?: string;
  size?: number | string;
  className?: string;
  // --- FIXED: Added title prop to resolve assignment errors in ServiceDesk.tsx ---
  title?: string;
}

const Icon: React.FC<IconProps> = ({ name, color, size, className, title }) => {
  // @ts-ignore - dynamic access to icons
  const LucideIcon = icons[name] as React.ElementType;

  if (!LucideIcon) {
    console.warn(`Icon "${String(name)}" not found in lucide-react`);
    return null;
  }

  return <LucideIcon color={color} size={size} className={className} title={title} />;
};

export default Icon;
