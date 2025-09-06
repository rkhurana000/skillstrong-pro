// Node 18+ (fetch is built-in). Run with:
// node --env-file=.env.local scripts/seed-programs-local.mjs
// or: ADMIN_SECRET=... node scripts/seed-programs-local.mjs

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const BASE = process.env.SEED_BASE_URL || "http://localhost:3000"; // change to prod if needed

if (!ADMIN_SECRET) {
  console.error("Missing ADMIN_SECRET (set it in .env.local or the shell)");
  process.exit(1);
}

const METROS = [
  "Bay Area, CA",
  "Los Angeles, CA",
  "San Diego, CA",
  "Phoenix, AZ",
  "Tucson, AZ",
  "Denver, CO",
  "Dallas–Fort Worth, TX",
  "Houston, TX",
  "Austin, TX",
  "Seattle, WA",
  "Portland, OR",
  "Chicago, IL",
  "Detroit, MI",
  "Columbus, OH",
  "Boston, MA",
  "New York City, NY",
  "Philadelphia, PA",
  "Atlanta, GA",
  "Miami, FL",
];

// derive the distinct state codes from the metros list (last token after comma)
const STATES = Array.from(
  new Set(METROS.map(m => (m.split(",").pop() || "").trim()).filter(Boolean))
);

const CIP_DESCRIPTIONS = {
  "4805":
    "Hands-on metal fabrication: cutting, forming, and welding. Learn shop safety, print reading, and setup for multi-process welds & machining.",
  "4803":
    "CNC setup & operation: read prints, CAM/G-code basics, tool selection, work offsets, and quality checks for precision parts.",
  "1504":
    "Robotics/automation fundamentals: PLCs, sensors, motion systems, safety, and troubleshooting automated cells.",
  "1506":
    "Keep factories running: mechanical, electrical, hydraulics, pneumatics, and PLC troubleshooting with preventive maintenance.",
  "1507":
    "Inspect & verify quality: GD&T, metrology, SPC/QA methods, and tools",
};

const payload = {
  wipe: true,                        // start clean
  onlyWithLinks: true,               // only keep rows that have a real program URL
  deliveryModes: ["in-person", "online", "hybrid"],
  cips: Object.keys(CIP_DESCRIPTIONS),
  cipDescriptions: CIP_DESCRIPTIONS,
  metros: METROS,
  states: STATES,                    // helpful for non-metro matches
  limitPerMetro: 80,                 // safety cap
};

(async () => {
  const url = `${BASE}/api/admin/reset-programs`;
  console.log(`POST ${url}`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-admin-secret": ADMIN_SECRET,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error("Seed failed:", res.status, res.statusText);
    console.error(text);
    process.exit(1);
  }

  // try to parse JSON; if not JSON, just print text
  try {
    const json = JSON.parse(text);
    console.log("Seed complete ✅");
    console.dir(json, { depth: null });
  } catch {
    console.log("Seed complete (non-JSON response):");
    console.log(text);
  }
})();
