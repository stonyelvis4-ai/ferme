'use client';

import { cn } from '../../lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton-block', className)} aria-hidden="true" />;
}
