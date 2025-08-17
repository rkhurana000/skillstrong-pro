// /app/quiz/page.tsx

"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// This is the list of questions for the quiz.
const quizQuestions = [
  "I enjoy working with tools or machinery.",
  "I like fixing or building things with my hands.",
  "I like figuring out how things work.",
  "I enjoy solving technical problems.",
  "I like designing or making things look better.",
  "I enjoy creative projects or prototyping.",
  "I like helping people learn or be safe.",
  "I enjoy organizing information or processes.",
  "I like working in a team towards a clear goal.",
  "I prefer tasks with clear, measurable results."
];

export default function QuizPage() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const router = useRouter();

  const handleAnswerChange = (questionIndex: number, value: number) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: value }));
  };

  const handleSubmit = () => {
    // Check if all questions have been answered.
    if (Object.keys(answers).length < quizQuestions.length) {
      alert("Please answer all questions before proceeding.");
      return;
    }
    
    // **THIS IS THE CRITICAL LOGIC**
    // It saves the results to the browser's storage before redirecting.
    localStorage.setItem('skillstrong-quiz-results', JSON.stringify({ answers, questions: quizQuestions }));
    
    // Redirect to the explore/chat page.
    router.push('/explore');
  };
  
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / quizQuestions.length) * 100;

  return (
    <div className="bg-gray-50 min-h-screen py-12">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="bg-white p-8 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Interest Quiz</h1>
          <p className="text-gray-600 mb-8">A quick check to pair your interests with manufacturing roles. Rate each statement from 1 (Disagree) to 5 (Agree).</p>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
            <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
          
          <div className="space-y-8">
            {quizQuestions.map((question, index) => (
              <div key={index}>
                <p className="font-semibold text-gray-700 mb-3">{`${index + 1}. ${question}`}</p>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Disagree</span>
                  <div className="flex space-x-2 sm:space-x-4">
                    {[1, 2, 3, 4, 5].map(value => (
                      <label key={value} className="flex flex-col items-center cursor-pointer p-2 rounded-md hover:bg-gray-100">
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={value}
                          checked={answers[index] === value}
                          onChange={() => handleAnswerChange(index, value)}
                          className="h-6 w-6 accent-blue-600"
                        />
                        <span className="mt-1 font-semibold">{value}</span>
                      </label>
                    ))}
                  </div>
                  <span>Agree</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <button
              onClick={handleSubmit}
              disabled={answeredCount < quizQuestions.length}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
            >
              See My Matches
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
