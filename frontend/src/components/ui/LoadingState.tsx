import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
  message?: string;
  submessage?: string;
  className?: string;
  inline?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = "Loading...",
  submessage,
  className,
  inline = false,
}) => {
  if (inline) {
    return (
      <div className={cn("inline-flex items-center gap-2 text-xs text-zinc-400", className)}>
        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center rounded-xl bg-zinc-900/40 border border-white/10",
        className
      )}
    >
      <div className="relative mb-4">
        <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-white animate-ping" />
        </div>
      </div>
      <p className="text-sm font-medium text-white">{message}</p>
      {submessage && <p className="text-xs text-zinc-400 mt-1 max-w-sm">{submessage}</p>}
    </div>
  );
};
