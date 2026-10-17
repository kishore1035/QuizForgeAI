import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "success" | "warning" | "danger" | "outline" | "monochrome";
  size?: "sm" | "md";
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = "default",
  size = "md",
  ...props
}) => {
  const baseStyles = "inline-flex items-center font-medium rounded-full select-none";

  const variantStyles = {
    default: "bg-zinc-900 text-zinc-300 border border-zinc-800",
    success: "bg-zinc-800/80 text-zinc-200 border border-zinc-700/60",
    warning: "bg-zinc-850 text-zinc-300 border border-zinc-700/50",
    danger: "bg-zinc-900 text-zinc-400 border border-zinc-800",
    monochrome: "bg-zinc-200 text-zinc-950 font-semibold border border-zinc-300",
    outline: "border border-zinc-700 text-zinc-300 bg-transparent",
  };

  const sizeStyles = {
    sm: "text-[10px] px-2 py-0.5 gap-1 leading-normal",
    md: "text-xs px-2.5 py-0.5 gap-1.5",
  };

  return (
    <span className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)} {...props}>
      {children}
    </span>
  );
};
