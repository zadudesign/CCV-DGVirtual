import React from 'react';
import * as LucideIcons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface DynamicIconProps extends LucideProps {
  name?: string;
  className?: string;
}

export function DynamicIcon({ name, ...props }: DynamicIconProps) {
  const Icon = (LucideIcons as any)[name || 'BookOpen'];
  
  if (!Icon) {
    const DefaultIcon = LucideIcons.BookOpen;
    return <DefaultIcon {...props} />;
  }
  
  return <Icon {...props} />;
}
