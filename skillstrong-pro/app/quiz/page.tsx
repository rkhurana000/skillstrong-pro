'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Code = 'R'|'I'|'A'|'S'|'E'|'C';

const QUESTIONS: { id: string; code: Code; text: string }[] = [
  { id: 'q1', code: 'R', text: 'I enjoy working with tools or machinery.' },
  { id: 'q2', code: 'R', text: 'I like fixing or building things with my hands.' },
  { id: 'q3', code: 'I', text: 'I like figuring out how things work.' },
  { id: 'q4', code: 'I', text: 'I enjoy solving technical problems.' },
  { id: 'q5', code: 'A', text: 'I like designing or making things look better.' },
  { id: 'q6', code: 'A', text: 'I enjoy creative projects or prototyping.' },
  { id: 'q7', code: 'S', text: 'I like helping people learn or be safe.' },
  { id: 'q8', code: 'S', text: 'I enjoy teamwork and clear communication.' },
  { id: 'q9', code: 'E', text: 'I like organizing plans and taking the lead.' },
  { id: 'q10', code: 'E', text: 'I enjoy meeting goals and improving processes.' },
  { id: 'q11', code: 'C', text: 'I like accuracy, checklists, and standards.' },
  { id: 'q12', code: 'C', text: 'I enjoy quality checks and documentation.' },
];

const ROLE_SUGGESTIONS: Record<Code, string[]> = {
  R: ['Welder', 'CNC Machinist', 'Maintenance Technician'],
  I: ['Automation Technician', 'Robotics Tech', 'Industrial Engineering Tech'],
  A: ['Additive Manufacturing (3D Printing) Tech', 'CAD Technician', 'Prototype Tech'],
  S: ['Safety Technician', 'Production Trainer', 'Logistics Coordinator'],
  E: ['Production Supervisor', 'Operations Coordinator', 'Supply Chain Associate'],
  C: ['Quality Control Inspector', 'Process Technician', 'Document Control Clerk'],
};

export default function Quiz() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  const scores = useMemo(() => {
    const s: Record<Code, number> = { R:0, I:0, A:0, S:0, E:0, C:0 };
    for (const q of QUESTIONS) s[q.code] += (answers[q.id] ?? 0);
    return s;
  }, [answers]);

  const topCodes = useMemo(() => {
    const entries = Object.entries(scores) as [Code, number][];
    return entries.sort((a,b)=>b[1]-a[1]).slice(0,2).map(([c])=>c);
  }, [scores]);

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of topCodes) {
      for (const role of ROLE_SUGGESTIONS[c]) {
        if (!seen.has(role)) { seen.add(role); out.push(role); }
      }
    }
    return out.slice(0,6);
  }, [topCodes]);

  const startOver = () => {
    setAnswers({});
    setDone(false);
  };

  const openInCoach = (prompt?: string) => {
    const query = prompt ??
      `Based on RIASEC codes ${topCodes.join(' & ')}, suggest manufacturing roles, pay, and required training.`;
    router.push(`/explore?q=${encodeURIComponent(query)}`);
  };

  return (
    <main className="quiz">
      <div className="quiz-wrap">
        <h1>Interest Quiz</h1>
        <p className="sub">A quick RIASEC-lite check to pair you with manufacturing roles.</p>

        {!done && (
          <form
            className="quiz-form"
            onSubmit={(e) => {
              e.preventDefault();
              setDone(true);
            }}
          >
            {QUESTIONS.map((q) => (
              <div key={q.id} className="q">
                <div className="qt">{q.text}</div>
                <div className="scale">
                  {[1,2,3,4,5].map((n) => (
                    <label key={n}>
                      <input
                        type="radio"
                        name={q.id}
                        value={n}
                        checked={answers[q.id] === n}
                        onChange={() => setAnswers(a => ({ ...a, [q.id]: n }))}
                        required
                      />
                      <span>{n}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button className="primary" type="submit">See my matches</button>
          </form>
        )}

        {done && (
          <section className="results">
            <h2>Your top codes: <span className="codes">{topCodes.join(' • ')}</span></h2>

            <div className="cards">
              <div className="card">
                <h3>Suggested roles</h3>
                <ul>
                  {suggestions.map((r) => <li key={r}>{r}</li>)}
                </ul>
                <button className="primary" onClick={() => openInCoach()}>
                  Ask the coach about these
                </button>
              </div>

              <div className="card">
                <h3>Next steps</h3>
                <ul>
                  <li>See local certificates & apprenticeships.</li>
                  <li>Compare salary and day-to-day tasks.</li>
                  <li>Explore training length & cost options.</li>
                </ul>
                <button
                  className="ghost"
                  onClick={() => openInCoach('Show nearby training and apprenticeships for my best-fit roles.')}
                >
                  Browse training →
                </button>
              </div>
            </div>

            <div className="actions">
              <button className="ghost" onClick={startOver}>Retake</button>
              <Link className="link" href="/explore">Open the coach</Link>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
