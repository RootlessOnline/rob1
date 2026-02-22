import { createClient, type Client } from '@libsql/client'

// ═══════════════════════════════════════════════════════════════════════════════
// 🧭 TURSO DATABASE CONNECTION - Anubis Soul Storage
// ═══════════════════════════════════════════════════════════════════════════════

let db: Client | null = null

export function getDb(): Client {
  if (!db) {
    const url = process.env.TURSO_URL || 'libsql://anubis-soul-rootlessonline.aws-eu-west-1.turso.io'
    const token = process.env.TURSO_TOKEN || ''
    
    db = createClient({
      url,
      authToken: token
    })
  }
  return db
}

// Initialize database schema
export async function initDb(): Promise<void> {
  const db = getDb()
  
  // Moral Compass - stores memory weights for reflection guidance
  await db.execute(`
    CREATE TABLE IF NOT EXISTS moral_compass (
      id TEXT PRIMARY KEY,
      memory_key TEXT UNIQUE,
      times_felt INTEGER DEFAULT 0,
      times_promoted INTEGER DEFAULT 0,
      times_rejected INTEGER DEFAULT 0,
      times_ascended INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Soul Snapshots - backups of Anubis's soul state
  await db.execute(`
    CREATE TABLE IF NOT EXISTS soul_snapshots (
      id TEXT PRIMARY KEY,
      snapshot_type TEXT DEFAULT 'auto',
      soul_data TEXT,
      level INTEGER,
      xp INTEGER,
      mood TEXT,
      conversations INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // Core Memories - golden memories with weight
  await db.execute(`
    CREATE TABLE IF NOT EXISTS core_memories (
      id TEXT PRIMARY KEY,
      memory TEXT,
      glyph_word TEXT,
      emotions TEXT,
      weight REAL DEFAULT 1.73,
      ascended_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  // STM Records - short term memory flow tracking
  await db.execute(`
    CREATE TABLE IF NOT EXISTS stm_records (
      id TEXT PRIMARY KEY,
      thought TEXT,
      slot INTEGER,
      fate TEXT DEFAULT 'none',
      glyph_word TEXT,
      emotions TEXT,
      entered_at TEXT DEFAULT CURRENT_TIMESTAMP,
      exited_at TEXT
    )
  `)
  
  // Reflection Log - tracks GLYPH reflections
  await db.execute(`
    CREATE TABLE IF NOT EXISTS reflection_log (
      id TEXT PRIMARY KEY,
      memory_id TEXT,
      memory_thought TEXT,
      chosen_word TEXT,
      fate TEXT,
      reasoning TEXT,
      stm_context TEXT,
      mood_at_reflection TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  
  console.log('[Turso] Database schema initialized')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🧭 MORAL COMPASS OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface MemoryWeights {
  timesFelt: number
  timesPromoted: number
  timesRejected: number
  timesAscended: number
}

// Get weights for a memory key
export async function getMoralWeights(memoryKey: string): Promise<MemoryWeights | null> {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM moral_compass WHERE memory_key = ?',
    args: [memoryKey]
  })
  
  if (result.rows.length === 0) return null
  
  const row = result.rows[0]
  return {
    timesFelt: row.times_felt as number || 0,
    timesPromoted: row.times_promoted as number || 0,
    timesRejected: row.times_rejected as number || 0,
    timesAscended: row.times_ascended as number || 0
  }
}

// Update weights for a memory key
export async function updateMoralWeights(
  memoryKey: string, 
  updates: Partial<MemoryWeights>
): Promise<void> {
  const db = getDb()
  const id = `compass_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  
  // Check if exists
  const existing = await getMoralWeights(memoryKey)
  
  if (existing) {
    // Update existing
    const newWeights = { ...existing, ...updates }
    await db.execute({
      sql: `UPDATE moral_compass 
            SET times_felt = ?, times_promoted = ?, times_rejected = ?, times_ascended = ?, updated_at = CURRENT_TIMESTAMP
            WHERE memory_key = ?`,
      args: [newWeights.timesFelt, newWeights.timesPromoted, newWeights.timesRejected, newWeights.timesAscended, memoryKey]
    })
  } else {
    // Insert new
    await db.execute({
      sql: `INSERT INTO moral_compass (id, memory_key, times_felt, times_promoted, times_rejected, times_ascended)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, memoryKey, updates.timesFelt || 0, updates.timesPromoted || 0, updates.timesRejected || 0, updates.timesAscended || 0]
    })
  }
}

// Calculate moral weight score
export function calculateMoralScore(weights: MemoryWeights): number {
  const WEIGHTS = {
    FELT: 1.00,
    PROMOTED: 1.33,
    REJECTED: 0.72,
    ASCENDED: 1.73
  }
  
  return (
    weights.timesFelt * WEIGHTS.FELT +
    weights.timesPromoted * WEIGHTS.PROMOTED +
    weights.timesRejected * WEIGHTS.REJECTED +
    weights.timesAscended * WEIGHTS.ASCENDED
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 💾 SOUL SNAPSHOT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function saveSoulSnapshot(
  soulData: string, 
  level: number, 
  xp: number, 
  mood: string,
  conversations: number,
  snapshotType: 'auto' | 'manual' = 'auto'
): Promise<string> {
  const db = getDb()
  const id = `snapshot_${Date.now()}`
  
  await db.execute({
    sql: `INSERT INTO soul_snapshots (id, snapshot_type, soul_data, level, xp, mood, conversations)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, snapshotType, soulData, level, xp, mood, conversations]
  })
  
  return id
}

export async function getLatestSnapshot(): Promise<{ soulData: string; createdAt: string } | null> {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT soul_data, created_at FROM soul_snapshots ORDER BY created_at DESC LIMIT 1',
    args: []
  })
  
  if (result.rows.length === 0) return null
  
  return {
    soulData: result.rows[0].soul_data as string,
    createdAt: result.rows[0].created_at as string
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🪞 REFLECTION LOG OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function logReflection(
  memoryId: string,
  memoryThought: string,
  chosenWord: string,
  fate: 'ascended' | 'promoted' | 'fading',
  reasoning: string,
  stmContext: string,
  moodAtReflection: string
): Promise<void> {
  const db = getDb()
  const id = `reflect_${Date.now()}`
  
  await db.execute({
    sql: `INSERT INTO reflection_log (id, memory_id, memory_thought, chosen_word, fate, reasoning, stm_context, mood_at_reflection)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, memoryId, memoryThought, chosenWord, fate, reasoning, stmContext, moodAtReflection]
  })
}

export async function getRecentReflections(limit: number = 10): Promise<unknown[]> {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM reflection_log ORDER BY created_at DESC LIMIT ?',
    args: [limit]
  })
  
  return result.rows
}
