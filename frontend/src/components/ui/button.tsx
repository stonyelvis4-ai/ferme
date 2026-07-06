'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary:
          'border border-transparent bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white shadow-[0_16px_34px_rgba(22,163,74,0.24)] hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(22,163,74,0.3)] hover:brightness-105 active:translate-y-0',
        secondary:
          'border border-[color:rgba(22,163,74,0.18)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.84))] text-[var(--text)] shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur hover:-translate-y-0.5 hover:border-[color:rgba(22,163,74,0.28)] hover:bg-white hover:shadow-[0_18px_34px_rgba(15,23,42,0.1)] dark:bg-white/10 dark:hover:bg-white/16 active:translate-y-0',
        ghost:
          'border border-transparent text-[var(--muted)] hover:border-[color:rgba(22,163,74,0.14)] hover:bg-[color:rgba(22,163,74,0.08)] hover:text-[var(--text)] dark:hover:bg-white/8 dark:hover:text-white',
        danger:
          'border border-transparent bg-[linear-gradient(135deg,#dc2626,#b91c1c)] text-white shadow-[0_16px_34px_rgba(185,28,28,0.24)] hover:-translate-y-0.5 hover:shadow-[0_22px_44px_rgba(185,28,28,0.28)] hover:brightness-105 active:translate-y-0'
      },
      size: {
        md: 'min-h-11 px-4 py-2.5 text-sm',
        lg: 'min-h-12 px-5 py-3 text-sm',
        icon: 'h-11 w-11'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
