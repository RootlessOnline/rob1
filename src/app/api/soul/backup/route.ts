import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const SOUL_FILE = path.join(DATA_DIR, 'anubis_soul.json')
const BACKUP_DIR = path.join(DATA_DIR, 'anubis_backups')

// Ensure directories exist
function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

// GET - Load soul from backup
export async function GET() {
  try {
    ensureDirs()

    if (fs.existsSync(SOUL_FILE)) {
      const data = fs.readFileSync(SOUL_FILE, 'utf-8')
      const soul = JSON.parse(data)

      // Convert date strings back to Date objects
      if (soul.soul) {
        if (soul.soul.personalityCore?.created) {
          soul.soul.personalityCore.created = new Date(soul.soul.personalityCore.created)
        }
        if (soul.soul.shortTermMemory) {
          soul.soul.shortTermMemory = soul.soul.shortTermMemory.map((t: { timestamp: string }) => ({
            ...t,
            timestamp: new Date(t.timestamp)
          }))
        }
        if (soul.soul.goldenMemories) {
          soul.soul.goldenMemories = soul.soul.goldenMemories.map((m: { timestamp: string }) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }
        if (soul.soul.selfRealizations) {
          soul.soul.selfRealizations = soul.soul.selfRealizations.map((r: { discoveredAt: string }) => ({
            ...r,
            discoveredAt: new Date(r.discoveredAt)
          }))
        }
      }

      console.log('[Soul Backup] Loaded soul from file')
      return NextResponse.json({ success: true, soul: soul.soul, stats: soul.stats })
    }

    // No backup exists yet
    return NextResponse.json({ success: false, message: 'No backup found' })

  } catch (error) {
    console.error('[Soul Backup] Error loading:', error)
    return NextResponse.json({ success: false, error: String(error) })
  }
}

// POST - Save soul to backup
export async function POST(request: NextRequest) {
  try {
    ensureDirs()

    const { soul, action } = await request.json()

    if (action === 'export') {
      // Just return the soul data for download
      return NextResponse.json({
        success: true,
        soul,
        exportedAt: new Date().toISOString()
      })
    }

    // Create backup object with metadata
    const backup = {
      version: '2.0',
      lastUpdated: new Date().toISOString(),
      soul: {
        ...soul,
        // Ensure dates are serialized properly
        personalityCore: {
          ...soul.personalityCore,
          created: soul.personalityCore?.created || new Date().toISOString()
        },
        shortTermMemory: soul.shortTermMemory || [],
        goldenMemories: soul.goldenMemories || [],
        selfRealizations: soul.selfRealizations || []
      },
      stats: {
        totalConversations: soul.personalityCore?.conversationsHad || 0,
        level: soul.level || 1,
        xp: soul.xp || 0,
        favoriteMood: soul.currentMood || 'mysterious',
        firstCreated: soul.personalityCore?.created || new Date().toISOString(),
        daysActive: calculateDaysActive(soul.personalityCore?.created)
      }
    }

    // Save main backup
    fs.writeFileSync(SOUL_FILE, JSON.stringify(backup, null, 2))

    // Save timestamped backup (keep last 10)
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const timestampedFile = path.join(BACKUP_DIR, `soul_${timestamp}.json`)
    fs.writeFileSync(timestampedFile, JSON.stringify(backup, null, 2))

    // Clean up old backups (keep last 10)
    const backups = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('soul_') && f.endsWith('.json'))
      .sort()
      .reverse()

    if (backups.length > 10) {
      backups.slice(10).forEach(f => {
        fs.unlinkSync(path.join(BACKUP_DIR, f))
      })
    }

    console.log('[Soul Backup] Saved soul to file:', timestamp)

    return NextResponse.json({
      success: true,
      message: 'Soul backed up successfully',
      timestamp,
      stats: backup.stats
    })

  } catch (error) {
    console.error('[Soul Backup] Error saving:', error)
    return NextResponse.json({ success: false, error: String(error) })
  }
}

// DELETE - Clear soul backup (dangerous!)
export async function DELETE() {
  try {
    if (fs.existsSync(SOUL_FILE)) {
      // Move to trash instead of deleting
      const trashFile = path.join(BACKUP_DIR, `deleted_${Date.now()}.json`)
      fs.renameSync(SOUL_FILE, trashFile)
    }

    return NextResponse.json({ success: true, message: 'Soul backup cleared' })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) })
  }
}

function calculateDaysActive(created: string | Date | undefined): number {
  if (!created) return 0
  const start = new Date(created)
  const now = new Date()
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}
