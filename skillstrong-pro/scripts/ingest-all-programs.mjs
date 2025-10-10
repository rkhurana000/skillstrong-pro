// scripts/ingest-all-programs.mjs

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_ROUTE = `${BASE_URL}/api/ingest/programs/scorecard`;

const CIP_CODES = {
  "4805": "Precision Metal Working (Welding & Machining)",
  "1504": "Electromechanical & Mechatronics Technology (Robotics)",
  "1506": "Industrial / Manufacturing Production Technologies",
  "1507": "Quality Control / QA"
};

const ALL_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", 
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", 
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", 
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

async function ingestPrograms(cip4, states) {
  console.log(`\nFetching programs for CIP: ${cip4} (${CIP_CODES[cip4]}) in ${states.length} states...`);
  try {
    const response = await fetch(API_ROUTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cip4,
        states,
        pages: 10, // Fetch up to 10 pages per state batch
        perPage: 100,
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Success for CIP ${cip4}: Ingested ${result.count} programs.`);
    return result.count;
  } catch (error) {
    console.error(`❌ Error fetching for CIP ${cip4}:`, error.message);
    return 0;
  }
}

async function runAll() {
  console.log(`Starting program ingestion from ${BASE_URL}...`);
  let totalIngested = 0;

  for (const cip of Object.keys(CIP_CODES)) {
    // We can process states in batches to be friendly to the API
    const stateBatches = [];
    for (let i = 0; i < ALL_STATES.length; i += 10) {
      stateBatches.push(ALL_STATES.slice(i, i + 10));
    }

    for (const batch of stateBatches) {
      const count = await ingestPrograms(cip, batch);
      totalIngested += count;
      // Add a small delay between batches
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n\n🎉 Ingestion complete! Total programs added: ${totalIngested}`);
}

runAll();
