import { NextResponse } from 'next/server'
import { initDb, getDb } from '@/lib/turso'

// ═══════════════════════════════════════════════════════════════════════════════
// 🧭 TURSO DATABASE API - Initialize and Test Connection
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    // Initialize database schema
    await initDb()
    
    // Test connection
    const db = getDb()
    const result = await db.execute('SELECT name FROM sqlite_master WHERE type="table"')
    
    const tables = result.rows.map(row => row.name)
    
    return NextResponse.json({
      success: true,
      message: '🧭 Turso database connected!',
      tables,
      timestamp: new Date().toISOString()
    })
  } catch (error: unknown) {
    console.error('[Turso API] Connection error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body
    
    if (action === 'init') {
      await initDb()
      return NextResponse.json({ success: true, message: 'Database initialized' })
    }
    
    return NextResponse.json({ success: false, message: 'Unknown action' })
  } catch (error: unknown) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
