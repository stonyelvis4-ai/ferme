import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
  {
    variants: {
      variant: {
        neutral: 'border-[var(--border-strong)] bg-white/70 text-[var(--muted)] dark:bg-white/10',
        success: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        warning: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300',
        critical: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
        info: 'border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300'
      }
    },
    defaultVariants: {
      variant: 'neutral'
    }
  }
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
