import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { classNames } from '~/utils/classNames';

/*
 * Structured Liquidity (structured.glass): sharp corners (global CSS), solid 2px
 * border, flat offset shadow that the button "settles into" on press. Destructive
 * stays red rather than the spec's neutral gray — this app has real delete actions
 * (chats, files, projects) where losing the red danger signal is a usability risk.
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md border-2 border-bolt-elements-borderColor font-display font-semibold shadow-hard press-hard focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-bolt-elements-borderColor disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:active:translate-x-0 disabled:active:translate-y-0 text-sm',
  {
    variants: {
      variant: {
        default: 'bg-bolt-elements-background text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2',
        destructive: 'bg-red-500 text-white hover:bg-red-600',
        outline:
          'bg-transparent hover:bg-bolt-elements-background-depth-2 hover:text-bolt-elements-textPrimary text-bolt-elements-textPrimary',
        secondary:
          'bg-bolt-elements-background-depth-1 text-bolt-elements-textPrimary hover:bg-bolt-elements-background-depth-2',
        ghost:
          'border-transparent shadow-none hover:bg-bolt-elements-background-depth-1 hover:text-bolt-elements-textPrimary',
        link: 'border-transparent shadow-none text-bolt-elements-textPrimary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-8',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  _asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, _asChild = false, ...props }, ref) => {
    return <button className={classNames(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
