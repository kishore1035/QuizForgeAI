import { CreatorQuestion, OptionItem, QuizCreatorState } from "../types/creator";
import { GeneratedQuizResponse, GeneratedQuestion } from "../types/api";


let idCounter = 0;

export function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function createNewOption(label: string): OptionItem {
  return {
    id: generateId("opt"),
    label,
    text: "",
  };
}

export function createInitialOptions(): OptionItem[] {
  return [
    createNewOption("A"),
    createNewOption("B"),
    createNewOption("C"),
    createNewOption("D"),
  ];
}

export function checkQuestionCompletion(q: CreatorQuestion): boolean {
  const hasText = q.text.trim().length > 0;

  if (q.type === "short_answer") {
    const hasExpected = !!q.expectedAnswer && q.expectedAnswer.trim().length > 0;
    return hasText && hasExpected;
  }

  const nonBlankOptions = q.options.filter((opt) => opt.text.trim().length > 0);
  const minOptions = q.type === "true_false" ? 2 : 2;
  const hasMinOptions = nonBlankOptions.length >= minOptions;
  const hasCorrectOption =
    !!q.correctOptionId &&
    q.options.some((opt) => opt.id === q.correctOptionId && opt.text.trim().length > 0);

  return hasText && hasMinOptions && hasCorrectOption;
}

export function createNewQuestion(number: number): CreatorQuestion {
  const options = createInitialOptions();
  return {
    id: generateId("q"),
    number,
    text: "",
    type: "multiple_choice",
    image: null,
    options,
    correctOptionId: null,
    expectedAnswer: null,
    explanation: "",
    isComplete: false,
  };
}

export function createInitialQuizState(): QuizCreatorState {
  const initialQ = createNewQuestion(1);
  return {
    id: "quiz-1",
    title: "Untitled Quiz",
    questions: [initialQ],
    activeQuestionId: initialQ.id,
    specification: {
      exam: "",
      subject: "",
      year: "",
    },
    timeLimit: {
      enabled: true,
      selectedLabel: "30s",
      secondsPerQuestion: 30,
    },
    hasUnsavedChanges: false,
  };
}

export function convertGeneratedQuizToCreatorState(
  generated: GeneratedQuizResponse
): QuizCreatorState {
  const questions: CreatorQuestion[] = generated.questions.map((gq: GeneratedQuestion, index: number) => {
    let options: OptionItem[] = [];

    if (gq.type === "short_answer") {
      options = [];
    } else {
      options = gq.options.map((opt, optIdx) => {
        let label = opt.id.toUpperCase();
        if (gq.type === "true_false") {
          label = opt.text.toLowerCase().includes("true") ? "True" : opt.text.toLowerCase().includes("false") ? "False" : String.fromCharCode(65 + optIdx);
        } else if (label.length > 2) {
          label = String.fromCharCode(65 + optIdx);
        }
        return {
          id: opt.id,
          label,
          text: opt.text,
        };
      });
    }

    const questionObj: CreatorQuestion = {
      id: gq.question_id || generateId("q"),
      number: index + 1,
      text: gq.question_text,
      type: gq.type,
      image: null,
      options,
      correctOptionId: gq.correct_option_id || null,
      expectedAnswer: gq.expected_answer || null,
      explanation: gq.explanation || "",
      difficulty: gq.difficulty,
      topic: gq.topic || null,
      sources: gq.sources || [],
      isComplete: false,
    };

    questionObj.isComplete = checkQuestionCompletion(questionObj);
    return questionObj;
  });

  const timeLimitSeconds = generated.settings.time_limit_seconds || 30;

  return {
    id: generated.quiz_id,
    title: generated.title,
    questions: questions.length > 0 ? questions : [createNewQuestion(1)],
    activeQuestionId: questions.length > 0 ? questions[0].id : "q1",
    specification: {
      exam: generated.settings.exam || "",
      subject: generated.settings.subject || "",
      year: generated.settings.academic_year || "",
    },
    timeLimit: {
      enabled: generated.settings.time_limit_enabled,
      secondsPerQuestion: timeLimitSeconds,
      selectedLabel: `${timeLimitSeconds}s`,
    },
    hasUnsavedChanges: false,
  };
}

export function convertCreatorStateToSavePayload(state: QuizCreatorState) {
  // If the id is a default temporary id like "quiz-1", pass undefined so backend generates a unique persistent id
  const isTemp = !state.id || state.id === "quiz-1" || (state.id.startsWith("quiz-") && !state.id.includes("_"));
  const quizId = isTemp ? undefined : state.id;

  return {
    quiz_id: quizId,
    title: state.title.trim() || "Untitled Quiz",
    difficulty: "medium",
    subject: state.specification.subject.trim() || undefined,
    exam: state.specification.exam.trim() || undefined,
    academic_year: state.specification.year.trim() || undefined,
    time_limit_enabled: state.timeLimit.enabled,
    time_limit_seconds: state.timeLimit.enabled ? state.timeLimit.secondsPerQuestion : undefined,
    questions: state.questions.map((q, idx) => {
      let options = q.options.map((opt, oIdx) => ({
        id: opt.id || String.fromCharCode(97 + oIdx),
        text: opt.text.trim(),
      }));

      if (q.type === "true_false" && options.length === 0) {
        options = [
          { id: "true", text: "True" },
          { id: "false", text: "False" },
        ];
      }

      return {
        question_id: q.id.startsWith("q-") ? `q_${idx + 1}` : q.id,
        type: q.type,
        question_text: q.text.trim(),
        options,
        correct_option_id: q.correctOptionId || undefined,
        expected_answer: q.expectedAnswer || undefined,
        explanation: q.explanation.trim() || "No explanation provided.",
        difficulty: q.difficulty || "medium",
        topic: q.topic || undefined,
        sources: q.sources || [],
      };
    }),
  };
}

