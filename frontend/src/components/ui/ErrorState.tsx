import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";
import { cn } from "@/lib/utils";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  actionLabel?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Connection Error",
  message,
  onRetry,
  className,
  actionLabel = "Retry Connection",
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-10 px-6 text-center rounded-xl bg-zinc-900 border border-white/20 max-w-lg mx-auto",
        className
      )}
    >
      <div className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-3 text-white">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-white">{title}</h4>
      <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{message}</p>

      {onRetry && (
        <div className="mt-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
