import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { QuizSourceType } from "@/types/quiz";

interface FeatureCardProps {
  type: QuizSourceType;
  title: string;
  description: string;
  example: string;
  icon: React.ReactNode;
  badgeText: string;
  onSelect: (type: QuizSourceType) => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  type,
  title,
  description,
  example,
  icon,
  badgeText,
  onSelect,
}) => {
  return (
    <div
      onClick={() => onSelect(type)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(type);
        }
      }}
      className="group relative flex flex-col justify-between p-6 rounded-2xl bg-zinc-950/60 hover:bg-zinc-900/60 border border-white/10 hover:border-white/30 transition-all duration-200 cursor-pointer shadow-lg hover:-translate-y-0.5 text-left focus:outline-none focus:ring-1 focus:ring-white/40"
    >
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white group-hover:text-black group-hover:bg-white group-hover:border-white transition-all">
            {icon}
          </div>
          <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-white/5 text-zinc-400 border border-white/10">
            {badgeText}
          </span>
        </div>

        <h3 className="text-base font-bold text-white transition-colors">
          {title}
        </h3>
        <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
          {description}
        </p>

        <div className="mt-4 p-2.5 rounded-lg bg-black/60 border border-white/10">
          <span className="text-[10px] uppercase font-semibold text-zinc-500 block">Example prompt</span>
          <span className="text-xs text-zinc-300 italic truncate block mt-0.5">
            &ldquo;{example}&rdquo;
          </span>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-zinc-400 group-hover:text-white transition-colors">
        <span>Configure quiz</span>
        <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};
