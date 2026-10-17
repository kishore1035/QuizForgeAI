import React from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-white/50 disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-[0.98]";

  const variantStyles = {
    primary:
      "bg-zinc-100 hover:bg-white text-zinc-950 font-semibold border border-zinc-200/80 shadow-xs",
    secondary:
      "bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-800",
    outline:
      "border border-zinc-800 hover:border-zinc-600 text-zinc-300 hover:text-zinc-100 bg-transparent hover:bg-zinc-900/60",
    ghost:
      "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60",
    danger:
      "bg-zinc-900 hover:bg-zinc-850 text-zinc-200 border border-zinc-700/80",
  };

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2 gap-2",
    lg: "text-sm px-5 py-2.5 gap-2.5",
  };

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      ) : (
        leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};
