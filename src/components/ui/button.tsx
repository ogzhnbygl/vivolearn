"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary:
          "bg-primary-600 text-white shadow-sm hover:bg-primary-700 focus-visible:ring-primary-500",
        secondary:
          "bg-transparent border border-primary-200 text-primary-700 hover:bg-primary-50",
        ghost:
          "text-primary-700 hover:bg-primary-50",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500",
      },
      size: {
        sm: "h-9 px-3",
        md: "h-10 px-4",
        lg: "h-11 px-5 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  isLoading?: boolean;
  loadingText?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      isLoading = false,
      loadingText,
      children,
      disabled,
      type,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = Boolean(disabled ?? false) || isLoading;
    const displayedText = isLoading && loadingText ? loadingText : children;

    return (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({ variant, size }),
          isLoading && "cursor-progress",
          className
        )}
        data-loading={isLoading ? "true" : undefined}
        aria-busy={isLoading || undefined}
        type={type ?? (!asChild ? "button" : undefined)}
        {...(asChild
          ? {
              "aria-disabled": isDisabled || undefined,
            }
          : { disabled: isDisabled })}
        {...props}
      >
        <span className="inline-flex items-center justify-center gap-2">
          {isLoading && (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-[2px] border-current border-r-transparent"
            />
          )}
          <span
            aria-live={isLoading ? "polite" : undefined}
            className={cn(isLoading && "opacity-90")}
          >
            {displayedText}
          </span>
          {isLoading && !loadingText && (
            <span className="sr-only">Yükleniyor</span>
          )}
        </span>
      </Comp>
    );
  }
);

Button.displayName = "Button";
