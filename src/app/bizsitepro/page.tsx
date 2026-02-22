'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Business {
  id: string
  name: string
  address: string
  phone?: string
  category: string
  status: 'found' | 'contacted' | 'interested' | 'paid' | 'deployed' | 'rejected'
  websiteId?: string
  createdAt: string
  notes?: string
}

interface Website {
  id: string
  businessId: string
  businessName: string
  tagline: string
  description: string
  services: string[]
  colors: { primary: string; secondary: string; accent: string }
  threejsScene: string
  html: string
  deployed: boolean
  deploymentUrl?: string
}

interface Stats {
  businesses: { total: number; found: number; contacted: number; paid: number; deployed: number }
  websites: { total: number; deployed: number }
  wallet: { balance: number; pending: number; totalEarned: number }
  recentTransactions: Transaction[]
}

interface Transaction {
  id: string
  type: 'income' | 'withdrawal'
  amount: number
  description: string
  timestamp: string
  status: string
}

const PRICING = {
  basic: { price: 299, name: 'Basic Website', features: ['3 Pages', 'Mobile Responsive', 'Contact Form'] },
  pro: { price: 499, name: 'Pro Website', features: ['5 Pages', 'Three.js Hero', 'SEO', 'Analytics'] },
  enterprise: { price: 999, name: 'Enterprise', features: ['Unlimited Pages', 'Custom Three.js', 'E-commerce', 'Support'] }
}

export default function BizSiteProPage() {
  const [tab, setTab] = useState<'dashboard' | 'find' | 'create' | 'wallet'>('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null)
  const [websiteData, setWebsiteData] = useState({
    tagline: '',
    description: '',
    services: ['', '', ''],
    primaryColor: '#4a9eff',
    secondaryColor: '#1a1a2e',
    accentColor: '#00ff88',
    scene: 'particles'
  })
  const [loading, setLoading] = useState(false)
  const [generatedHtml, setGeneratedHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)

  // Quick add form
  const [quickAdd, setQuickAdd] = useState({ name: '', address: '', phone: '', category: '' })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, bizRes] = await Promise.all([
        fetch('/api/bizsitepro?action=stats'),
        fetch('/api/bizsitepro?action=businesses')
      ])
      const statsData = await statsRes.json()
      const bizData = await bizRes.json()
      setStats(statsData)
      setBusinesses(bizData.businesses || [])
    } catch (e) {
      console.error('Failed to fetch data:', e)
    }
  }

  const addBusiness = async () => {
    if (!quickAdd.name || !quickAdd.address) return
    setLoading(true)
    try {
      await fetch('/api/bizsitepro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'addBusiness', data: quickAdd })
      })
      setQuickAdd({ name: '', address: '', phone: '', category: '' })
      fetchData()
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const generateWebsite = async () => {
    if (!selectedBusiness) return
    setLoading(true)
    try {
      const res = await fetch('/api/bizsitepro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateWebsite',
          data: {
            businessId: selectedBusiness.id,
            tagline: websiteData.tagline,
            description: websiteData.description,
            services: websiteData.services.filter(s => s),
            colors: {
              primary: websiteData.primaryColor,
              secondary: websiteData.secondaryColor,
              accent: websiteData.accentColor
            },
            scene: websiteData.scene
          }
        })
      })
      const data = await res.json()
      if (data.website) {
        setGeneratedHtml(data.website.html)
        setShowPreview(true)
        fetchData()
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const markPaid = async (businessId: string, amount: number) => {
    await fetch('/api/bizsitepro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'markPaid', data: { businessId, amount } })
    })
    fetchData()
  }

  const deployWebsite = async (websiteId: string, businessId: string) => {
    await fetch('/api/bizsitepro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deploy', data: { websiteId, businessId } })
    })
    fetchData()
  }

  const withdraw = async (amount: number) => {
    await fetch('/api/bizsitepro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'withdraw', data: { amount, description: 'Bank Transfer' } })
    })
    fetchData()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'found': return '#4a9eff'
      case 'contacted': return '#f5a623'
      case 'interested': return '#9b59b6'
      case 'paid': return '#2ecc71'
      case 'deployed': return '#00ff88'
      case 'rejected': return '#e74c3c'
      default: return '#888'
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderBottom: '1px solid #333', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/jarvis"><button style={{ padding: '8px 16px', background: '#333', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>← Back</button></Link>
          <div>
            <h1 style={{ fontSize: '28px', margin: 0, color: '#00ff88' }}>🏢 BizSitePro</h1>
            <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: '13px' }}>Find businesses → Build websites → Get paid</p>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: '10px' }}>
          {['dashboard', 'find', 'create', 'wallet'].map(t => (
            <button key={t} onClick={() => setTab(t as typeof tab)} style={{
              padding: '10px 20px',
              background: tab === t ? '#00ff88' : 'transparent',
              border: '1px solid #00ff88',
              color: tab === t ? '#000' : '#00ff88',
              borderRadius: '6px',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}>{t}</button>
          ))}
        </nav>
      </header>

      {/* Stats Bar */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '15px', padding: '20px 30px', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4a9eff' }}>{stats.businesses.total}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>Total Leads</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f5a623' }}>{stats.businesses.contacted}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>Contacted</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2ecc71' }}>{stats.businesses.paid}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>Paid</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#00ff88' }}>{stats.businesses.deployed}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>Deployed</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#00ff88' }}>${stats.wallet.balance}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>Balance</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#888' }}>${stats.wallet.totalEarned}</div>
            <div style={{ fontSize: '12px', color: '#888' }}>Total Earned</div>
          </div>
        </div>
      )}

      <div style={{ padding: '30px' }}>
        {/* Dashboard Tab */}
        {tab === 'dashboard' && (
          <div>
            <h2 style={{ marginTop: 0 }}>📊 Pipeline Overview</h2>
            {businesses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏢</div>
                <p>No businesses yet. Add some leads to get started!</p>
                <button onClick={() => setTab('find')} style={{ marginTop: '20px', padding: '12px 30px', background: '#00ff88', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Leads</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
                {businesses.map(biz => (
                  <div key={biz.id} style={{ background: '#12121a', borderRadius: '12px', padding: '20px', border: `1px solid ${getStatusColor(biz.status)}40` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <h3 style={{ margin: 0, color: '#fff' }}>{biz.name}</h3>
                      <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', background: getStatusColor(biz.status) + '30', color: getStatusColor(biz.status) }}>{biz.status}</span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>{biz.address}</div>
                    <div style={{ fontSize: '13px', color: '#4a9eff' }}>{biz.category}</div>
                    {biz.phone && <div style={{ fontSize: '13px', color: '#888' }}>📞 {biz.phone}</div>}
                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                      {biz.status === 'found' && (
                        <button onClick={() => { setSelectedBusiness(biz); setTab('create') }} style={{ padding: '8px 16px', background: '#4a9eff', border: 'none', borderRadius: '6px', color: '#000', cursor: 'pointer', fontSize: '13px' }}>Create Website</button>
                      )}
                      {biz.status === 'interested' && (
                        <>
                          <button onClick={() => markPaid(biz.id, PRICING.pro.price)} style={{ padding: '8px 16px', background: '#2ecc71', border: 'none', borderRadius: '6px', color: '#000', cursor: 'pointer', fontSize: '13px' }}>Mark Paid (${PRICING.pro.price})</button>
                          <button onClick={() => setSelectedBusiness(biz)} style={{ padding: '8px 16px', background: '#333', border: '1px solid #4a9eff', borderRadius: '6px', color: '#4a9eff', cursor: 'pointer', fontSize: '13px' }}>Preview</button>
                        </>
                      )}
                      {biz.status === 'paid' && (
                        <button onClick={() => deployWebsite(biz.websiteId!, biz.id)} style={{ padding: '8px 16px', background: '#00ff88', border: 'none', borderRadius: '6px', color: '#000', cursor: 'pointer', fontSize: '13px' }}>🚀 Deploy</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Find Tab */}
        {tab === 'find' && (
          <div>
            <h2 style={{ marginTop: 0 }}>🔍 Add Business Leads</h2>
            <p style={{ color: '#888', marginBottom: '20px' }}>Find local businesses without websites and add them to your pipeline.</p>
            
            <div style={{ background: '#12121a', borderRadius: '12px', padding: '25px', marginBottom: '30px' }}>
              <h3 style={{ marginTop: 0, color: '#4a9eff' }}>Quick Add</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <input placeholder="Business Name *" value={quickAdd.name} onChange={e => setQuickAdd({...quickAdd, name: e.target.value})} style={{ padding: '12px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px' }} />
                <input placeholder="Category" value={quickAdd.category} onChange={e => setQuickAdd({...quickAdd, category: e.target.value})} style={{ padding: '12px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                <input placeholder="Address *" value={quickAdd.address} onChange={e => setQuickAdd({...quickAdd, address: e.target.value})} style={{ padding: '12px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px' }} />
                <input placeholder="Phone" value={quickAdd.phone} onChange={e => setQuickAdd({...quickAdd, phone: e.target.value})} style={{ padding: '12px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', color: '#fff', fontSize: '14px' }} />
              </div>
              <button onClick={addBusiness} disabled={loading || !quickAdd.name || !quickAdd.address} style={{ padding: '12px 30px', background: '#00ff88', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>+ Add Lead</button>
            </div>

            <div style={{ background: '#12121a', borderRadius: '12px', padding: '25px' }}>
              <h3 style={{ marginTop: 0, color: '#f5a623' }}>💡 Tips for Finding Leads</h3>
              <ul style={{ color: '#aaa', lineHeight: 2 }}>
                <li>Search Google Maps for "[service] near me" and check for businesses without websites</li>
                <li>Look for "Website: No" or missing website links in Google Business listings</li>
                <li>Check Yelp, Yellow Pages, and local directories</li>
                <li>Drive around industrial areas and note businesses without web presence</li>
                <li>Focus on service businesses (plumbers, electricians, landscapers) - they need sites most</li>
              </ul>
            </div>
          </div>
        )}

        {/* Create Tab */}
        {tab === 'create' && (
          <div>
            <h2 style={{ marginTop: 0 }}>🎨 Create Website</h2>
            
            {!selectedBusiness ? (
              <div style={{ textAlign: 'center', padding: '60px', color: '#666' }}>
                <p>Select a business from the dashboard to create a website</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                <div>
                  <div style={{ background: '#12121a', borderRadius: '12px', padding: '25px', marginBottom: '20px' }}>
                    <h3 style={{ marginTop: 0, color: '#4a9eff' }}>{selectedBusiness.name}</h3>
                    <p style={{ color: '#888', margin: 0 }}>{selectedBusiness.address}</p>
                  </div>

                  <div style={{ background: '#12121a', borderRadius: '12px', padding: '25px' }}>
                    <h4 style={{ marginTop: 0, color: '#00ff88' }}>Website Details</h4>
                    
                    <label style={{ display: 'block', marginBottom: '15px' }}>
                      <span style={{ color: '#888', fontSize: '13px' }}>Tagline</span>
                      <input value={websiteData.tagline} onChange={e => setWebsiteData({...websiteData, tagline: e.target.value})} placeholder={`Quality ${selectedBusiness.category} Services`} style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '5px' }} />
                    </label>

                    <label style={{ display: 'block', marginBottom: '15px' }}>
                      <span style={{ color: '#888', fontSize: '13px' }}>Description</span>
                      <textarea value={websiteData.description} onChange={e => setWebsiteData({...websiteData, description: e.target.value})} placeholder="About the business..." style={{ width: '100%', height: '80px', padding: '10px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '5px', resize: 'none' }} />
                    </label>

                    <div style={{ marginBottom: '15px' }}>
                      <span style={{ color: '#888', fontSize: '13px' }}>Services</span>
                      {websiteData.services.map((s, i) => (
                        <input key={i} value={s} onChange={e => { const newServices = [...websiteData.services]; newServices[i] = e.target.value; setWebsiteData({...websiteData, services: newServices}) }} placeholder={`Service ${i+1}`} style={{ width: '100%', padding: '10px', background: '#0a0a0a', border: '1px solid #333', borderRadius: '6px', color: '#fff', marginTop: '5px' }} />
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', marginBottom: '15px' }}>
                      <label>
                        <span style={{ color: '#888', fontSize: '13px' }}>Primary</span>
                        <input type="color" value={websiteData.primaryColor} onChange={e => setWebsiteData({...websiteData, primaryColor: e.target.value})} style={{ width: '100%', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                      </label>
                      <label>
                        <span style={{ color: '#888', fontSize: '13px' }}>Secondary</span>
                        <input type="color" value={websiteData.secondaryColor} onChange={e => setWebsiteData({...websiteData, secondaryColor: e.target.value})} style={{ width: '100%', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                      </label>
                      <label>
                        <span style={{ color: '#888', fontSize: '13px' }}>Accent</span>
                        <input type="color" value={websiteData.accentColor} onChange={e => setWebsiteData({...websiteData, accentColor: e.target.value})} style={{ width: '100%', height: '40px', border: 'none', borderRadius: '6px', cursor: 'pointer' }} />
                      </label>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <span style={{ color: '#888', fontSize: '13px' }}>Three.js Scene</span>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        {['particles', 'waves', 'geometry'].map(scene => (
                          <button key={scene} onClick={() => setWebsiteData({...websiteData, scene})} style={{ padding: '10px 20px', background: websiteData.scene === scene ? '#4a9eff' : '#333', border: 'none', borderRadius: '6px', color: websiteData.scene === scene ? '#000' : '#fff', cursor: 'pointer' }}>{scene}</button>
                        ))}
                      </div>
                    </div>

                    <button onClick={generateWebsite} disabled={loading} style={{ width: '100%', padding: '15px', background: '#00ff88', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}>
                      {loading ? '⏳ Generating...' : '🎨 Generate Website'}
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ background: '#12121a', borderRadius: '12px', padding: '25px', height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column' }}>
                    <h4 style={{ marginTop: 0, color: '#00ff88' }}>Preview</h4>
                    {generatedHtml ? (
                      <iframe srcDoc={generatedHtml} style={{ flex: 1, border: 'none', borderRadius: '8px', background: '#fff' }} />
                    ) : (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                        Configure and generate to see preview
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Wallet Tab */}
        {tab === 'wallet' && stats && (
          <div>
            <h2 style={{ marginTop: 0 }}>💰 Wallet</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
              <div style={{ background: 'linear-gradient(135deg, #1a2a1a, #0a1a0a)', borderRadius: '12px', padding: '25px', border: '1px solid #2ecc71' }}>
                <div style={{ color: '#888', fontSize: '13px' }}>Available Balance</div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#00ff88' }}>${stats.wallet.balance}</div>
                <button onClick={() => withdraw(stats.wallet.balance)} disabled={stats.wallet.balance === 0} style={{ marginTop: '15px', padding: '10px 20px', background: '#00ff88', border: 'none', borderRadius: '6px', color: '#000', fontWeight: 'bold', cursor: stats.wallet.balance === 0 ? 'not-allowed' : 'pointer', opacity: stats.wallet.balance === 0 ? 0.5 : 1 }}>Withdraw All</button>
              </div>
              <div style={{ background: 'linear-gradient(135deg, #2a2a1a, #1a1a0a)', borderRadius: '12px', padding: '25px', border: '1px solid #f5a623' }}>
                <div style={{ color: '#888', fontSize: '13px' }}>Pending</div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#f5a623' }}>${stats.wallet.pending}</div>
                <div style={{ marginTop: '15px', color: '#888', fontSize: '13px' }}>From active projects</div>
              </div>
              <div style={{ background: '#12121a', borderRadius: '12px', padding: '25px', border: '1px solid #333' }}>
                <div style={{ color: '#888', fontSize: '13px' }}>Total Earned</div>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: '#fff' }}>${stats.wallet.totalEarned}</div>
                <div style={{ marginTop: '15px', color: '#888', fontSize: '13px' }}>All time revenue</div>
              </div>
            </div>

            <div style={{ background: '#12121a', borderRadius: '12px', padding: '25px' }}>
              <h3 style={{ marginTop: 0 }}>📜 Transaction History</h3>
              {stats.recentTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No transactions yet</div>
              ) : (
                <div>
                  {stats.recentTransactions.map(txn => (
                    <div key={txn.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px', borderBottom: '1px solid #333' }}>
                      <div>
                        <div style={{ fontWeight: 'bold' }}>{txn.description}</div>
                        <div style={{ fontSize: '12px', color: '#888' }}>{new Date(txn.timestamp).toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: txn.type === 'income' ? '#00ff88' : '#e74c3c', fontWeight: 'bold' }}>
                          {txn.type === 'income' ? '+' : '-'}${txn.amount}
                        </div>
                        <div style={{ fontSize: '12px', color: txn.status === 'completed' ? '#00ff88' : '#f5a623' }}>{txn.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
