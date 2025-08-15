// app/quiz/page.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const QUESTIONS = [
  "I enjoy working with tools or machinery.",
  "I like fixing or building things with my hands.",
  "I like figuring out how things work.",
  "I enjoy solving technical problems.",
  "I like designing or making things look better.",
  "I enjoy creative projects or prototyping.",
  "I like helping people learn or be safe.",
  "I enjoy organizing information or processes.",
  "I like working with numbers and data.",
  "I enjoy collaborating as part of a team.",
];

export default function QuizPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Array<number | null>>(
    Array(QUESTIONS.length).fill(null)
  );

  const progress = useMemo(
    () => answers.filter((a) => a !== null).length,
    [answers]
  );

  function setAnswer(qIndex: number, value: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = value;
      return next;
    });
  }

  function goToMatches(e: React.FormEvent) {
    e.preventDefault();
    // You can encode answers in the URL if you want to use them later:
    // const encoded = encodeURIComponent(JSON.stringify(answers));
    // router.push(`/explore?quiz=${encoded}`);
    router.push("/explore");
  }

  return (
    <main className="page-shell quiz-page">
      <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
        Interest Quiz
      </h1>
      <p className="mt-1 text-slate-600">
        A quick RIASEC-lite check to pair you with manufacturing roles. Rate each
        1–5.
      </p>

      <form onSubmit={goToMatches} className="page-card mt-4 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="text-slate-700 font-medium">Progress: {progress}/10</div>
          <button
            type="submit"
            disabled={progress === 0}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            See my matches
          </button>
        </div>

        {QUESTIONS.map((q, idx) => (
          <fieldset key={idx}>
            <legend>{idx + 1}. {q}</legend>
            <div className="scale" role="radiogroup" aria-label={`Question ${idx + 1}`}>
              {[1, 2, 3, 4, 5].map((n) => {
                const id = `q${idx}-${n}`;
                return (
                  <label key={id} htmlFor={id} className="inline-flex items-center gap-2">
                    <input
                      id={id}
                      type="radio"
                      name={`q${idx}`}
                      value={n}
                      checked={answers[idx] === n}
                      onChange={() => setAnswer(idx, n)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-slate-700">{n}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}

        <div className="pt-2">
          <button
            type="submit"
            disabled={progress === 0}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700"
          >
            See my matches
          </button>
        </div>
      </form>
    </main>
  );
}
