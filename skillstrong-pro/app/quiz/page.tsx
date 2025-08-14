'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';

type Q = { id: string; text: string; key: 'R'|'I'|'A'|'S'|'E'|'C' };

const QUESTIONS: Q[] = [
  { id: 'q1', text: 'I enjoy working with tools or machinery.', key: 'R' },
  { id: 'q2', text: 'I like fixing or building things with my hands.', key: 'R' },
  { id: 'q3', text: 'I like figuring out how things work.', key: 'I' },
  { id: 'q4', text: 'I enjoy solving technical problems.', key: 'I' },
  { id: 'q5', text: 'I like designing or making things look better.', key: 'A' },
  { id: 'q6', text: 'I enjoy creative projects or prototyping.', key: 'A' },
  { id: 'q7', text: 'I like helping people learn or be safe.', key: 'S' },
  { id: 'q8', text: 'I enjoy teamwork and clear communication.', key: 'S' },
  { id: 'q9', text: 'I like organizing plans and taking the lead.', key: 'E' },
  { id: 'q10', text: 'I enjoy meeting goals and improving processes.', key: 'C' },
];

const ROLES: Record<string, string[]> = {
  R: ['Welder', 'CNC Operator', 'Industrial Maintenance Tech', 'Electrician Apprentice'],
  I: ['Quality Technician', 'Manufacturing Technician', 'Mechatronics Tech'],
  A: ['CAD Technician', 'Additive Manufacturing Tech', 'Industrial Designer (junior)'],
  S: ['Safety Technician', 'Trainer (shop floor)', 'Production Team Lead'],
  E: ['Production Coordinator', 'Shift Lead', 'Operations Assistant'],
  C: ['Supply Chain Assistant', 'Planner / Scheduler', 'Quality Documentation'],
};

export default function QuizPage() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const complete = Object.keys(answers).length === QUESTIONS.length;

  const scores = useMemo(() => {
    const s: Record<'R'|'I'|'A'|'S'|'E'|'C', number> = { R:0, I:0, A:0, S:0, E:0, C:0 };
    for (const q of QUESTIONS) {
      const v = answers[q.id] ?? 0;
      s[q.key] += v;
    }
    return s;
  }, [answers]);

  const topKeys = useMemo(() => {
    const pairs = Object.entries(scores) as [Q['key'], number][];
    pairs.sort((a,b)=>b[1]-a[1]);
    return pairs.slice(0,2).map(p=>p[0]).join('');
  }, [scores]);

  const suggestions = useMemo(() => {
    // merge top 2 buckets (avoid duplicates)
    const ordered = Object.entries(scores).sort((a,b)=>b[1]-a[1]).map(([k])=>k as Q['key']);
    const pick = new Set<string>();
    for (const k of ordered.slice(0,2)) ROLES[k].forEach(r=>pick.add(r));
    return Array.from(pick);
  }, [scores]);

  function set(qid: string, value: number) {
    setAnswers(prev => ({ ...prev, [qid]: value }));
  }

  return (
    <div className="page">
      <div className="container">
        <h1 className="h1">Interest Quiz</h1>
        <p className="muted">A quick RIASEC-lite check to pair you with manufacturing roles. Rate each 1–5.</p>

        {!submitted && (
          <form
            className="card stack"
            onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
          >
            <div className="stack">
              {QUESTIONS.map((q, i) => (
                <div key={q.id} className="quiz-row">
                  <div className="quiz-q">{i+1}. {q.text}</div>
                  <div className="chip-group" role="radiogroup" aria-label={q.text}>
                    {[1,2,3,4,5].map(v => (
                      <label key={v} className={`chip ${answers[q.id]===v?'is-selected':''}`}>
                        <input
                          type="radio"
                          name={q.id}
                          value={v}
                          checked={answers[q.id]===v}
                          onChange={() => set(q.id, v)}
                        />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="row between">
              <div className="muted">Progress: {Object.keys(answers).length}/{QUESTIONS.length}</div>
              <button className="btn btn-primary" disabled={!complete}>See my matches</button>
            </div>
          </form>
        )}

        {submitted && (
          <div className="stack">
            <div className="card">
              <h2 className="h2">Your profile: <span className="badge">{topKeys}</span></h2>
              <p className="muted">Top interests across Realistic / Investigative / Artistic / Social / Enterprising / Conventional.</p>
              <ul className="list two-col">
                {suggestions.map((r)=>(
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>

            <div className="row gap">
              <Link className="btn" href="/quiz" onClick={()=>{ setAnswers({}); setSubmitted(false); }}>Retake</Link>
              <Link className="btn btn-primary" href={`/explore?focus=${encodeURIComponent(topKeys)}`}>Start exploring →</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
