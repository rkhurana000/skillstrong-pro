export const metadata = { title: 'Features — SkillStrong' };

export default function FeaturesPage() {
  return (
    <main className="container" style={{ paddingTop: 32 }}>
      <h1>Features</h1>
      <ul className="bullets">
        <li>Guided, button-first chat</li>
        <li>Geo-aware training & apprenticeships</li>
        <li>Web results + citations</li>
        <li>RIASEC-lite interest quiz</li>
        <li>Session share & plan export</li>
      </ul>
    </main>
  );
}
