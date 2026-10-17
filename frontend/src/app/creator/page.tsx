"use client";

import { QuizCreator } from "@/components/creator/QuizCreator";
import { useRouter } from "next/navigation";

export default function CreatorPage() {
  const router = useRouter();

  return (
    <QuizCreator onBackToWorkspace={() => router.push("/")} />
  );
}
