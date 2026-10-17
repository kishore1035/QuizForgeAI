"use client";

import React, { useRef } from "react";
import { HelpCircle, Info, Image as ImageIcon, X, AlertCircle, BookOpen } from "lucide-react";
import { OptionEditor } from "./OptionEditor";
import { CreatorQuestion, QuestionImage } from "@/types/creator";

interface QuestionEditorProps {
  question: CreatorQuestion;
  questionIndex: number;
  onUpdateQuestionText: (text: string) => void;
  onUpdateImage: (image: QuestionImage | null) => void;
  onUpdateOptionText: (optionId: string, text: string) => void;
  onSelectCorrectOption: (optionId: string) => void;
  onAddOption: () => void;
  onRemoveOption: (optionId: string) => void;
  onUpdateExplanation: (explanation: string) => void;
  onUpdateExpectedAnswer?: (answer: string) => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  questionIndex,
  onUpdateQuestionText,
  onUpdateImage,
  onUpdateOptionText,
  onSelectCorrectOption,
  onAddOption,
  onRemoveOption,
  onUpdateExplanation,
  onUpdateExpectedAnswer,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = React.useState<string | null>(null);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setImageError("Please select a valid image file (JPG, PNG, WebP, or GIF).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setImageError("Image file size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      onUpdateImage({
        name: file.name,
        dataUrl,
        size: file.size,
      });
    };
    reader.onerror = () => {
      setImageError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    onUpdateImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isShortAnswer = question.type === "short_answer";

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Top Heading */}
      <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-base font-bold text-zinc-100">
            Question {questionIndex + 1}
          </h2>

          {question.type && (
            <span className="text-[10px] font-mono font-medium uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800">
              {question.type === "multiple_choice"
                ? "MCQ"
                : question.type === "true_false"
                ? "True / False"
                : "Short Answer"}
            </span>
          )}

          {question.sources && question.sources.length > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-900 text-zinc-400 border border-zinc-800">
              <BookOpen className="w-2.5 h-2.5 text-zinc-400" />
              <span>
                {question.sources
                  .map((s) => (s.page ? `Page ${s.page}` : "Verified Reference"))
                  .join(", ")}
              </span>
            </span>
          )}
        </div>

        <span className="text-xs">
          {question.isComplete ? (
            <span className="text-zinc-200 font-semibold">Ready</span>
          ) : (
            <span className="text-zinc-500 font-medium">Incomplete question</span>
          )}
        </span>
      </div>

      {/* Main Scrollable Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {/* 1. Large Question Field */}
        <div className="relative">
          <div className="absolute top-3.5 left-3.5 pointer-events-none text-zinc-500">
            <HelpCircle className="w-5 h-5" />
          </div>
          <textarea
            value={question.text}
            onChange={(e) => onUpdateQuestionText(e.target.value)}
            rows={3}
            placeholder="Enter question"
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-sm font-medium text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 resize-none leading-relaxed transition-all"
          />
        </div>

        {/* 2. Optional Image Section */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageFileChange}
            accept="image/*"
            className="hidden"
          />

          {question.image ? (
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={question.image.dataUrl}
                  alt={question.image.name}
                  className="w-14 h-14 object-cover rounded-lg border border-zinc-800"
                />
                <div>
                  <p className="text-xs font-semibold text-zinc-200 truncate max-w-xs">
                    {question.image.name}
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    {(question.image.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 text-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                <span className="text-xs font-medium text-zinc-300">
                  Choose image to add to this question (optional)
                </span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 bg-zinc-200 hover:bg-white transition-colors shadow-xs active:scale-[0.98] whitespace-nowrap cursor-pointer"
              >
                Add Image
              </button>
            </div>
          )}

          {imageError && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-300 font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{imageError}</span>
            </div>
          )}
        </div>

        {/* 3. Answer Options OR Short Answer Field */}
        {isShortAnswer ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Expected Answer
              </label>
              <span className="text-[11px] text-zinc-500">
                Specify the expected correct answer for this question
              </span>
            </div>
            <input
              type="text"
              value={question.expectedAnswer || ""}
              onChange={(e) => onUpdateExpectedAnswer?.(e.target.value)}
              placeholder="Enter expected answer..."
              className="w-full px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-sm font-medium text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 transition-all"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                {question.type === "true_false" ? "True / False Options" : "Answer Options"}
              </label>
              <span className="text-[11px] text-zinc-500">
                Select the radio button on the right to mark the correct answer
              </span>
            </div>
            <OptionEditor
              options={question.options}
              correctOptionId={question.correctOptionId}
              onUpdateOptionText={onUpdateOptionText}
              onSelectCorrectOption={onSelectCorrectOption}
              onAddOption={onAddOption}
              onRemoveOption={onRemoveOption}
            />
          </div>
        )}

        {/* 4. Explanation Field */}
        <div className="space-y-1.5 pt-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Explanation (Optional)
          </label>
          <div className="relative">
            <div className="absolute top-3.5 left-3.5 pointer-events-none text-zinc-500">
              <Info className="w-4 h-4" />
            </div>
            <textarea
              value={question.explanation}
              onChange={(e) => onUpdateExplanation(e.target.value)}
              rows={3}
              placeholder="Enter explanation (optional)"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/30 resize-none leading-relaxed transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
