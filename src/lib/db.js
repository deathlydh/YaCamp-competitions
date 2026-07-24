import fs from 'fs';
import path from 'path';

// Initial state containing the 3 Alliances and 6 Teams per Alliance from Yandex Camp 2026.
const INITIAL_STATE = {
  alliances: {
    A: {
      id: "A",
      name: "Мега-Альянс А",
      color: "#FF3B30",
      teams: [
        { id: "a1", name: "AnyMan", rover: "17", gfsx: "156", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "a2", name: "Рифмы и Код", rover: "82", gfsx: "156", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "a3", name: "Груз 67", rover: "17", gfsx: "158", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "a4", name: "Счастливый басист", rover: "17", gfsx: "158", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "a5", name: "0xb00bs", rover: "82", gfsx: "160", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "a6", name: "Пухосос", rover: "92", gfsx: "160", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } }
      ]
    },
    B: {
      id: "B",
      name: "Мега-Альянс B",
      color: "#007AFF",
      teams: [
        { id: "b1", name: "Logos", rover: "48", gfsx: "155", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "b2", name: "Честь Урала", rover: "48", gfsx: "154", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "b3", name: "Ramson", rover: "39", gfsx: "154", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "b4", name: "Введите имя", rover: "39", gfsx: "155", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "b5", name: "Свердловская клавиатура", rover: "44", gfsx: "152", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "b6", name: "The Boys", rover: "44", gfsx: "152", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } }
      ]
    },
    C: {
      id: "C",
      name: "Мега-Альянс C",
      color: "#FFCC00",
      teams: [
        { id: "c1", name: "Аргентина Ямайка 5:0", rover: "83", gfsx: "157", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "c2", name: "Генеральские котлы", rover: "1", gfsx: "153", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "c3", name: "киберболоид", rover: "83", gfsx: "151", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "c4", name: "Преобразование Фурей", rover: "36", gfsx: "151", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "c5", name: "Optimus Prime", rover: "36", gfsx: "157", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } },
        { id: "c6", name: "Гусеничные", rover: "37", gfsx: "153", score: 0, timeSeconds: 0, stage1: { findBall: "failed", activation: "manual" }, stage2: { autonomous: false, enteredZone: false, collisions1: 0, catch: false, returnToStart: false, collisions2: 0, returnWithBall: false }, penalties: { resets: 0 } }
      ]
    }
  },
  activeRuns: {
    A: { teamId: null, startTime: null, isRunning: false, elapsedSeconds: 0 },
    B: { teamId: null, startTime: null, isRunning: false, elapsedSeconds: 0 },
    C: { teamId: null, startTime: null, isRunning: false, elapsedSeconds: 0 }
  }
};

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

// Local JSON file path. On Vercel, /tmp is writable but ephemeral.
// Locally, we write directly to the project root directory.
const isVercel = process.env.VERCEL === '1';
const localDbPath = isVercel
  ? path.join('/tmp', 'dashboard_db.json')
  : path.join(process.cwd(), 'dashboard_db.json');

export async function getDbData() {
  let dbData = null;
  if (KV_URL && KV_TOKEN) {
    try {
      const res = await fetch(`${KV_URL}/get/yacamp_scores`, {
        headers: { Authorization: `Bearer ${KV_TOKEN}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const json = await res.json();
        if (json.result) {
          dbData = JSON.parse(json.result);
        }
      }
    } catch (err) {
      console.error("Failed to read from Vercel KV, falling back to local file:", err);
    }
  }

  // Fallback to local JSON file
  if (!dbData && fs.existsSync(localDbPath)) {
    try {
      const content = fs.readFileSync(localDbPath, 'utf8');
      dbData = JSON.parse(content);
    } catch (err) {
      console.error("Failed to parse local DB:", err);
    }
  }

  if (!dbData) {
    dbData = INITIAL_STATE;
    await saveDbData(dbData);
  }

  // Schema Migration to avoid crashes on old db schemas
  let needsSave = false;
  if (!dbData.activeRuns) {
    dbData.activeRuns = {
      A: { teamId: null, startTime: null, isRunning: false, elapsedSeconds: 0 },
      B: { teamId: null, startTime: null, isRunning: false, elapsedSeconds: 0 },
      C: { teamId: null, startTime: null, isRunning: false, elapsedSeconds: 0 }
    };
    if (dbData.activeRun) {
      const aid = dbData.activeRun.allianceId;
      if (aid && dbData.activeRuns[aid]) {
        dbData.activeRuns[aid] = {
          teamId: dbData.activeRun.teamId,
          startTime: dbData.activeRun.startTime,
          isRunning: dbData.activeRun.isRunning,
          elapsedSeconds: dbData.activeRun.elapsedSeconds
        };
      }
      delete dbData.activeRun;
    }
    needsSave = true;
  }
  
  if (needsSave) {
    await saveDbData(dbData);
  }

  return dbData;
}

export async function saveDbData(data) {
  if (KV_URL && KV_TOKEN) {
    try {
      const res = await fetch(`${KV_URL}/set/yacamp_scores`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${KV_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ value: JSON.stringify(data) })
      });
      if (res.ok) {
        return true;
      }
    } catch (err) {
      console.error("Failed to write to Vercel KV:", err);
    }
  }

  // Save to local file
  try {
    fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Failed to write to local DB file:", err);
    return false;
  }
}

// Helper to calculate score based on rules
export function calculateTeamScore(team) {
  if (team.disqualified) {
    return 0;
  }

  let stage1Score = 0;
  if (!team.stage1?.skipped) {
    if (team.stage1.findBall === "autonomous") stage1Score += 10;
    else if (team.stage1.findBall === "foxglove") stage1Score += 5;
    if (team.stage1.activation === "success") stage1Score += 10;
  }

  let stage2Score = 0;
  if (!team.stage2?.skipped) {
    if (team.stage2.autonomous) stage2Score += 20;

    const zoneScore = Math.max(0, 15 - (team.stage2.collisions1 || 0) * 3);
    if (team.stage2.enteredZone) stage2Score += zoneScore;

    if (team.stage2.catch) stage2Score += 20;

    const returnScore = Math.max(0, 15 - (team.stage2.collisions2 || 0) * 3);
    if (team.stage2.returnToStart) stage2Score += returnScore;

    if (team.stage2.returnWithBall) stage2Score += 15;
  }

  const totalRaw = stage1Score + stage2Score - (team.penalties.resets || 0) * 15;
  return Math.max(0, totalRaw);
}
