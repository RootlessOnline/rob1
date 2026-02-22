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

// GET - Retrieve soul backup
export async function GET() {
  try {
    ensureDirs()
    
    if (!fs.existsSync(SOUL_FILE)) {
      return NextResponse.json({ 
        success: false, 
        message: 'No soul backup found',
        soul: null 
      })
    }
    
    const soulData = JSON.parse(fs.readFileSync(SOUL_FILE, 'utf-8'))
    
    return NextResponse.json({ 
      success: true, 
      soul: soulData 
    })
  } catch (error: unknown) {
    console.error('[Soul API] Read error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to read soul backup',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// POST - Save soul backup
export async function POST(request: NextRequest) {
  try {
    ensureDirs()
    
    const body = await request.json()
    const { soul, action } = body
    
    if (action === 'list-backups') {
      // List all backup files
      if (!fs.existsSync(BACKUP_DIR)) {
        return NextResponse.json({ success: true, backups: [] })
      }
      
      const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.startsWith('soul_') && f.endsWith('.json'))
        .map(f => {
          const stats = fs.statSync(path.join(BACKUP_DIR, f))
          return {
            filename: f,
            date: stats.mtime,
            size: stats.size
          }
        })
        .sort((a, b) => b.date.getTime() - a.date.getTime())
      
      return NextResponse.json({ success: true, backups: files })
    }
    
    if (action === 'create-backup') {
      // Create a timestamped backup
      const now = new Date()
      const timestamp = now.toISOString().split('T')[0] + '_' + 
        now.toTimeString().split(' ')[0].replace(/:/g, '-')
      const backupFile = path.join(BACKUP_DIR, `soul_${timestamp}.json`)
      
      const soulData = {
        version: '3.0',
        lastUpdated: now.toISOString(),
        soul: soul
      }
      
      fs.writeFileSync(backupFile, JSON.stringify(soulData, null, 2))
      
      // Also update main soul file
      fs.writeFileSync(SOUL_FILE, JSON.stringify(soulData, null, 2))
      
      return NextResponse.json({ 
        success: true, 
        message: 'Backup created',
        backupFile: `soul_${timestamp}.json`
      })
    }
    
    if (action === 'restore-backup') {
      // Restore from a specific backup file
      const { filename } = body
      const backupFile = path.join(BACKUP_DIR, filename)
      
      if (!fs.existsSync(backupFile)) {
        return NextResponse.json({ 
          success: false, 
          message: 'Backup file not found' 
        })
      }
      
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'))
      
      // Update main soul file
      fs.writeFileSync(SOUL_FILE, JSON.stringify(backupData, null, 2))
      
      return NextResponse.json({ 
        success: true, 
        message: 'Soul restored from backup',
        soul: backupData.soul
      })
    }
    
    // Default: Save soul to main file
    const soulData = {
      version: '3.0',
      lastUpdated: new Date().toISOString(),
      soul: soul
    }
    
    fs.writeFileSync(SOUL_FILE, JSON.stringify(soulData, null, 2))
    
    return NextResponse.json({ 
      success: true, 
      message: 'Soul saved',
      lastUpdated: soulData.lastUpdated
    })
    
  } catch (error: unknown) {
    console.error('[Soul API] Save error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to save soul',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

// DELETE - Delete a backup
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename')
    
    if (!filename) {
      return NextResponse.json({ 
        success: false, 
        message: 'No filename provided' 
      })
    }
    
    const backupFile = path.join(BACKUP_DIR, filename)
    
    if (fs.existsSync(backupFile)) {
      fs.unlinkSync(backupFile)
      return NextResponse.json({ 
        success: true, 
        message: 'Backup deleted' 
      })
    }
    
    return NextResponse.json({ 
      success: false, 
      message: 'Backup not found' 
    })
  } catch (error: unknown) {
    console.error('[Soul API] Delete error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to delete backup' 
    })
  }
}
