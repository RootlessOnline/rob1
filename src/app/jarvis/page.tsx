'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Agent {
  id: string
  name: string
  type: string
  status: string
  prompt: string
  createdAt: string
  earnings?: number
  tasks?: number
}

interface BusinessPlan {
  name?: string
  tagline?: string
  type?: string
  startupCost?: string
  revenueModel?: string
  targetMarket?: string
  firstSteps?: string[]
  tools?: string[]
  timeToProfit?: string
  scalePotential?: string
  riskLevel?: string
  estimatedMonthlyRevenue?: string
  raw?: string
}

export default function JARVISPage() {
  const [mode, setMode] = useState<'dashboard' | 'agents' | 'business'>('dashboard')
  const [agents, setAgents] = useState<Agent[]>([])
  const [stats, setStats] = useState({ total: 0, active: 0, totalEarnings: 0, tasksCompleted: 0 })
  const [input, setInput] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [businessPlan, setBusinessPlan] = useState<BusinessPlan | null>(null)
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  
  useEffect(() => {
    fetchAgents()
    checkOllamaStatus()
  }, [])
  
  const checkOllamaStatus = async () => {
    try {
      const res = await fetch('http://localhost:11434/api/tags')
      if (res.ok) {
        const data = await res.json()
        setAvailableModels(data.models?.map((m: {name: string}) => m.name) || [])
        setOllamaStatus('connected')
      } else {
        setOllamaStatus('disconnected')
      }
    } catch {
      setOllamaStatus('disconnected')
    }
  }
  
  const fetchAgents = async () => {
    try {
      const res = await fetch('/api/agents')
      const data = await res.json()
      setAgents(data.agents || [])
      setStats(data.stats || { total: 0, active: 0, totalEarnings: 0, tasksCompleted: 0 })
    } catch (e) {
      console.error('Failed to fetch agents:', e)
    }
  }
  
  const createAgent = async (name: string, type: string, prompt: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', name, type, prompt })
      })
      const data = await res.json()
      if (data.success) {
        setAgents([...agents, data.agent])
      }
    } catch (e) {
      console.error('Failed to create agent:', e)
    }
    setLoading(false)
  }
  
  const runAgent = async (agentId: string) => {
    setLoading(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', agentId })
      })
      const data = await res.json()
      if (data.success) {
        setResponse(data.result)
        fetchAgents()
      }
    } catch (e) {
      console.error('Failed to run agent:', e)
    }
    setLoading(false)
  }
  
  const generateBusiness = async (prompt: string, deep = false) => {
    setLoading(true)
    setBusinessPlan(null)
    try {
      const res = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, deep })
      })
      const data = await res.json()
      if (data.success) {
        setBusinessPlan(data.plan)
        setResponse(data.raw)
      }
    } catch (e) {
      console.error('Failed to generate business:', e)
    }
    setLoading(false)
  }
  
  const chatWithJarvis = async (message: string) => {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          messages: [
            { role: 'system', content: 'You are JARVIS, the AI assistant from Iron Man. Be concise, helpful, slightly witty. Address the user as "Sir" occasionally.' },
            { role: 'user', content: message }
          ],
          stream: false
        })
      })
      const data = await res.json()
      setResponse(data.message?.content || 'No response')
    } catch (e) {
      setResponse('Error: Is Ollama running?')
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      color: '#e0e0e0',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      padding: '20px'
    }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '1px solid #333',
        paddingBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" title="Back to ROB">
            <button style={{
              width: '40px',
              height: '40px',
              background: '#1a1a2e',
              border: '2px solid #333',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}>
              ←
            </button>
          </Link>
          <div>
            <h1 style={{ fontSize: '32px', margin: 0, color: '#4a9eff' }}>🤖 JARVIS</h1>
            <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '14px' }}>AI Automation & Business Engine</p>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '10px' }}>
          {['dashboard', 'agents', 'business'].map(m => (
            <button key={m} onClick={() => setMode(m as typeof mode)} style={{
              padding: '10px 20px',
              background: mode === m ? '#4a9eff' : 'transparent',
              border: '1px solid #4a9eff',
              color: mode === m ? '#000' : '#4a9eff',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>{m}</button>
          ))}
          <Link href="/bizsitepro">
            <button style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #00ff88, #00cc6a)',
              border: 'none',
              color: '#000',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              boxShadow: '0 0 15px #00ff8840'
            }}>🏢 BizSitePro</button>
          </Link>
        </nav>
      </header>

      {/* Connection Status Banner */}
      <div style={{
        marginBottom: '20px',
        padding: '15px 20px',
        borderRadius: '10px',
        background: ollamaStatus === 'connected' ? 'linear-gradient(135deg, #1a2a1a, #0a1a0a)' : 
                    ollamaStatus === 'disconnected' ? 'linear-gradient(135deg, #2a1a1a, #1a0a0a)' : '#1a1a2e',
        border: `1px solid ${ollamaStatus === 'connected' ? '#2a8a4a' : 
                          ollamaStatus === 'disconnected' ? '#8a2a2a' : '#333'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: ollamaStatus === 'connected' ? '#4aff8a' :
                        ollamaStatus === 'disconnected' ? '#ff4a4a' : '#888',
            boxShadow: ollamaStatus === 'connected' ? '0 0 10px #4aff8a' :
                       ollamaStatus === 'disconnected' ? '0 0 10px #ff4a4a' : 'none',
            animation: 'pulse 2s infinite'
          }} />
          <span style={{ color: ollamaStatus === 'connected' ? '#4aff8a' : 
                                 ollamaStatus === 'disconnected' ? '#ff4a4a' : '#888' }}>
            {ollamaStatus === 'checking' && '🔄 Checking Ollama connection...'}
            {ollamaStatus === 'connected' && `🟢 Ollama Connected • ${availableModels.length} models available`}
            {ollamaStatus === 'disconnected' && '🔴 Ollama Disconnected • Run "ollama serve" in terminal'}
          </span>
        </div>
        {ollamaStatus === 'disconnected' && (
          <button onClick={checkOllamaStatus} style={{
            padding: '8px 16px',
            background: '#4a9eff',
            border: 'none',
            borderRadius: '6px',
            color: '#000',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}>
            Retry
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '30px' }}>
        {[
          { label: 'Total Agents', value: stats.total, icon: '🤖' },
          { label: 'Active', value: stats.active, icon: '⚡' },
          { label: 'Tasks Done', value: stats.tasksCompleted, icon: '✅' },
          { label: 'Earnings', value: `$${stats.totalEarnings}`, icon: '💰' }
        ].map((stat, i) => (
          <div key={i} style={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
            <div style={{ fontSize: '24px' }}>{stat.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4a9eff' }}>{stat.value}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ background: '#12121a', border: '1px solid #333', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#4a9eff' }}>
            {mode === 'dashboard' && '💬 Chat with JARVIS'}
            {mode === 'agents' && '🤖 Create New Agent'}
            {mode === 'business' && '💰 Generate Business Idea'}
          </h2>
          
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={
              mode === 'dashboard' ? 'Ask JARVIS anything...' :
              mode === 'agents' ? 'Enter agent prompt...' :
              'Describe a business idea...'
            }
            style={{
              width: '100%', height: '120px', background: '#0a0a0a', border: '1px solid #333',
              borderRadius: '8px', padding: '15px', color: '#e0e0e0', fontSize: '14px', resize: 'none'
            }}
          />
          
          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button
              onClick={() => {
                if (mode === 'dashboard') chatWithJarvis(input)
                else if (mode === 'agents') createAgent(`Agent-${agents.length + 1}`, 'business', input)
                else if (mode === 'business') generateBusiness(input)
              }}
              disabled={loading || !input.trim()}
              style={{
                flex: 1, padding: '12px', background: loading ? '#333' : '#4a9eff',
                border: 'none', borderRadius: '8px', color: loading ? '#666' : '#000',
                fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer', fontSize: '14px'
              }}
            >
              {loading ? '⏳ Processing...' : mode === 'dashboard' ? 'Send' : mode === 'agents' ? 'Create Agent' : 'Generate Business'}
            </button>
            {mode === 'business' && (
              <button onClick={() => generateBusiness(input, true)} disabled={loading || !input.trim()}
                style={{ padding: '12px 20px', background: '#9b59b6', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer' }}>
                🧠 Deep
              </button>
            )}
          </div>
          
          {response && (
            <div style={{ marginTop: '20px', background: '#0a0a0a', border: '1px solid #4a9eff40', borderRadius: '8px', padding: '15px' }}>
              <div style={{ fontSize: '12px', color: '#4a9eff', marginBottom: '10px' }}>🤖 JARVIS:</div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{response}</div>
            </div>
          )}
          
          {businessPlan && businessPlan.name && (
            <div style={{ marginTop: '20px', background: 'linear-gradient(135deg, #1a2a1a, #0a1a0a)', border: '1px solid #2a8a4a', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ margin: '0 0 5px 0', color: '#4aff8a', fontSize: '22px' }}>{businessPlan.name}</h3>
              <p style={{ margin: '0 0 15px 0', color: '#8affaa', fontStyle: 'italic' }}>{businessPlan.tagline}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div><div style={{ color: '#4aff8a', fontSize: '12px' }}>TYPE</div><div>{businessPlan.type}</div></div>
                <div><div style={{ color: '#4aff8a', fontSize: '12px' }}>STARTUP</div><div>{businessPlan.startupCost}</div></div>
                <div><div style={{ color: '#4aff8a', fontSize: '12px' }}>REVENUE</div><div>{businessPlan.revenueModel}</div></div>
                <div><div style={{ color: '#4aff8a', fontSize: '12px' }}>POTENTIAL</div><div style={{ color: '#8affaa', fontWeight: 'bold' }}>{businessPlan.estimatedMonthlyRevenue}</div></div>
              </div>
              {businessPlan.firstSteps && (
                <div style={{ marginTop: '15px' }}>
                  <div style={{ color: '#4aff8a', fontSize: '12px', marginBottom: '10px' }}>FIRST STEPS</div>
                  <ol style={{ margin: 0, paddingLeft: '20px' }}>{businessPlan.firstSteps.map((s, i) => <li key={i} style={{ marginBottom: '5px' }}>{s}</li>)}</ol>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ background: '#12121a', border: '1px solid #333', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#4a9eff' }}>📋 Agents ({agents.length})</h2>
          {agents.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>No agents yet. Create one!</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {agents.map(agent => (
                <div key={agent.id} style={{ background: '#0a0a0a', border: '1px solid #333', borderRadius: '8px', padding: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div><div style={{ fontWeight: 'bold', color: '#4a9eff' }}>{agent.name}</div><div style={{ fontSize: '12px', color: '#888' }}>{agent.type} • {agent.status}</div></div>
                    <div style={{ display: 'flex', gap: '8px' }}><span style={{ fontSize: '12px', color: '#8affaa' }}>💰 ${agent.earnings || 0}</span><span style={{ fontSize: '12px', color: '#888' }}>✅ {agent.tasks || 0}</span></div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>{agent.prompt.slice(0, 50)}...</div>
                  <button onClick={() => runAgent(agent.id)} disabled={loading} style={{ marginTop: '10px', padding: '8px 16px', background: '#333', border: '1px solid #4a9eff', borderRadius: '6px', color: '#4a9eff', cursor: 'pointer', fontSize: '12px' }}>▶ Run</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <footer style={{ marginTop: '30px', textAlign: 'center', color: '#444', fontSize: '12px' }}>
        <div style={{ marginBottom: '10px' }}>
          JARVIS v1.0 • Powered by Ollama • 100% Local & Free
        </div>
        <div style={{ color: '#666', fontSize: '11px' }}>
          To run locally: Install Ollama → Run "ollama serve" → Pull models with "ollama pull llama3.2"
        </div>
      </footer>
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
