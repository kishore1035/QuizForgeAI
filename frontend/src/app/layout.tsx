import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuizForge AI — Turn Anything Into a Quiz",
  description:
    "Generate personalized quizzes from any topic, study notes, or PDF. Practice, learn, and track your progress with Nemotron 3 Nano 30B Cloud.",
  keywords: ["QuizForge AI", "quiz generator", "Nemotron", "Ollama Cloud", "study AI", "active recall"],
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#090a0f] text-zinc-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
