"use client";

import React from "react";
import { LayoutGrid, Plus } from "lucide-react";
import { QuestionCard } from "./QuestionCard";
import { CreatorQuestion } from "@/types/creator";

interface QuestionNavigatorProps {
  questions: CreatorQuestion[];
  activeQuestionId: string;
  onSelectQuestion: (id: string) => void;
  onAddQuestion: () => void;
  onDeleteQuestion: (id: string) => void;
}

export const QuestionNavigator: React.FC<QuestionNavigatorProps> = ({
  questions,
  activeQuestionId,
  onSelectQuestion,
  onAddQuestion,
  onDeleteQuestion,
}) => {
  return (
    <aside className="w-72 lg:w-80 flex flex-col h-full bg-zinc-950 border-r border-zinc-800">
      {/* Heading with layout icon */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-100">
            Questions ({questions.length})
          </h2>
        </div>
        <span className="text-xs text-zinc-500 font-medium">
          {questions.filter((q) => q.isComplete).length}/{questions.length} Ready
        </span>
      </div>

      {/* Vertically scrollable question cards */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2.5">
        {questions.map((question, index) => (
          <QuestionCard
            key={question.id}
            question={question}
            index={index}
            isSelected={question.id === activeQuestionId}
            onSelect={() => onSelectQuestion(question.id)}
            onDelete={(e) => {
              e.stopPropagation();
              onDeleteQuestion(question.id);
            }}
            canDelete={questions.length > 1}
          />
        ))}
      </div>

      {/* Refined Add Question Button pinned at bottom */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-950">
        <button
          type="button"
          onClick={onAddQuestion}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl border border-zinc-800 bg-zinc-900/90 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-200 hover:text-white font-semibold text-xs transition-all duration-150 active:scale-[0.98] shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Question</span>
        </button>
      </div>
    </aside>
  );
};
