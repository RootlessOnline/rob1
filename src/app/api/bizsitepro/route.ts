import { NextRequest, NextResponse } from 'next/server'

// ═══════════════════════════════════════════════════════════════════════════════
// 🏢 BIZSITEPRO API - Automated Website Business System
// ═══════════════════════════════════════════════════════════════════════════════

// In-memory storage (replace with database in production)
let businesses: Business[] = []
let websites: Website[] = []
let wallet: Wallet = { balance: 0, pending: 0, totalEarned: 0 }
let transactions: Transaction[] = []

interface Business {
  id: string
  name: string
  address: string
  phone?: string
  category: string
  hasWebsite: boolean
  status: 'found' | 'contacted' | 'interested' | 'paid' | 'deployed' | 'rejected'
  websiteId?: string
  createdAt: Date
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
  threejsScene: 'particles' | 'waves' | 'geometry' | 'gradient'
  html: string
  previewUrl: string
  createdAt: Date
  deployed: boolean
  deploymentUrl?: string
}

interface Wallet {
  balance: number
  pending: number
  totalEarned: number
}

interface Transaction {
  id: string
  type: 'income' | 'withdrawal'
  amount: number
  description: string
  businessId?: string
  timestamp: Date
  status: 'pending' | 'completed' | 'failed'
}

// Pricing
const PRICING = {
  basic: { price: 299, name: 'Basic Website', features: ['3 Pages', 'Mobile Responsive', 'Contact Form'] },
  pro: { price: 499, name: 'Pro Website', features: ['5 Pages', 'Three.js Hero', 'SEO', 'Analytics'] },
  enterprise: { price: 999, name: 'Enterprise', features: ['Unlimited Pages', 'Custom Three.js', 'E-commerce', 'Support'] }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get('action')

  switch (action) {
    case 'stats':
      return NextResponse.json({
        businesses: {
          total: businesses.length,
          found: businesses.filter(b => b.status === 'found').length,
          contacted: businesses.filter(b => b.status === 'contacted').length,
          paid: businesses.filter(b => b.status === 'paid').length,
          deployed: businesses.filter(b => b.status === 'deployed').length
        },
        websites: {
          total: websites.length,
          deployed: websites.filter(w => w.deployed).length
        },
        wallet,
        recentTransactions: transactions.slice(-10).reverse()
      })

    case 'businesses':
      return NextResponse.json({ businesses, pricing: PRICING })

    case 'websites':
      return NextResponse.json({ websites })

    case 'wallet':
      return NextResponse.json({ wallet, transactions })

    default:
      return NextResponse.json({ status: 'BizSitePro API v1.0' })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, data } = body

  switch (action) {
    case 'addBusiness':
      const newBusiness: Business = {
        id: `biz_${Date.now()}`,
        name: data.name,
        address: data.address,
        phone: data.phone,
        category: data.category || 'Local Business',
        hasWebsite: false,
        status: 'found',
        createdAt: new Date()
      }
      businesses.push(newBusiness)
      return NextResponse.json({ success: true, business: newBusiness })

    case 'generateWebsite':
      const business = businesses.find(b => b.id === data.businessId)
      if (!business) {
        return NextResponse.json({ error: 'Business not found' }, { status: 404 })
      }

      const website: Website = {
        id: `web_${Date.now()}`,
        businessId: business.id,
        businessName: business.name,
        tagline: data.tagline || `Quality ${business.category} Services`,
        description: data.description || `Professional ${business.category} serving the local community with excellence.`,
        services: data.services || ['Service 1', 'Service 2', 'Service 3'],
        colors: data.colors || { primary: '#4a9eff', secondary: '#1a1a2e', accent: '#00ff88' },
        threejsScene: data.scene || 'particles',
        html: generateWebsiteHTML(business, data),
        previewUrl: `/bizsitepro/preview/${business.id}`,
        createdAt: new Date(),
        deployed: false
      }

      websites.push(website)
      business.websiteId = website.id
      business.status = 'interested'

      return NextResponse.json({ success: true, website })

    case 'markContacted':
      const bizToContact = businesses.find(b => b.id === data.businessId)
      if (bizToContact) {
        bizToContact.status = 'contacted'
        bizToContact.notes = data.notes
      }
      return NextResponse.json({ success: true })

    case 'markPaid':
      const paidBiz = businesses.find(b => b.id === data.businessId)
      if (paidBiz) {
        const amount = data.amount || PRICING.pro.price
        paidBiz.status = 'paid'
        
        // Add to wallet
        wallet.pending += amount
        wallet.totalEarned += amount
        
        transactions.push({
          id: `txn_${Date.now()}`,
          type: 'income',
          amount,
          description: `Website payment: ${paidBiz.name}`,
          businessId: paidBiz.id,
          timestamp: new Date(),
          status: 'pending'
        })
      }
      return NextResponse.json({ success: true, wallet })

    case 'deploy':
      const websiteToDeploy = websites.find(w => w.id === data.websiteId)
      if (websiteToDeploy) {
        websiteToDeploy.deployed = true
        websiteToDeploy.deploymentUrl = `https://${websiteToDeploy.businessName.toLowerCase().replace(/\s+/g, '-')}.bizsitepro.online`
        
        const deployBiz = businesses.find(b => b.id === websiteToDeploy.businessId)
        if (deployBiz) {
          deployBiz.status = 'deployed'
        }

        // Move from pending to balance
        const txn = transactions.find(t => t.businessId === websiteToDeploy.businessId && t.status === 'pending')
        if (txn) {
          txn.status = 'completed'
          wallet.pending -= txn.amount
          wallet.balance += txn.amount
        }
      }
      return NextResponse.json({ success: true })

    case 'withdraw':
      if (data.amount > wallet.balance) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
      }
      wallet.balance -= data.amount
      transactions.push({
        id: `txn_${Date.now()}`,
        type: 'withdrawal',
        amount: data.amount,
        description: data.description || 'Withdrawal',
        timestamp: new Date(),
        status: 'completed'
      })
      return NextResponse.json({ success: true, wallet })

    case 'bulkSearch':
      // Simulate finding businesses (in real app, use Google Places API)
      const foundBusinesses: Business[] = data.businesses.map((b: { name: string; address: string; phone?: string; category?: string }) => ({
        id: `biz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: b.name,
        address: b.address,
        phone: b.phone,
        category: b.category || 'Local Business',
        hasWebsite: false,
        status: 'found',
        createdAt: new Date()
      }))
      businesses.push(...foundBusinesses)
      return NextResponse.json({ success: true, added: foundBusinesses.length, businesses: foundBusinesses })

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 WEBSITE HTML GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

function generateWebsiteHTML(business: Business, data: { tagline?: string; description?: string; services?: string[]; colors?: { primary: string; secondary: string; accent: string }; scene?: string }): string {
  const colors = data.colors || { primary: '#4a9eff', secondary: '#1a1a2e', accent: '#00ff88' }
  const tagline = data.tagline || `Quality ${business.category} Services`
  const description = data.description || `Professional services`
  const services = data.services || ['Service 1', 'Service 2']
  const scene = data.scene || 'particles'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${business.name} | ${business.category}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: ${colors.secondary}; color: #fff; }
    
    #threejs-bg { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; }
    
    header { padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); backdrop-filter: blur(10px); position: fixed; width: 100%; z-index: 100; }
    .logo { font-size: 24px; font-weight: bold; color: ${colors.primary}; }
    nav a { color: #fff; text-decoration: none; margin-left: 30px; transition: color 0.3s; }
    nav a:hover { color: ${colors.accent}; }
    
    .hero { height: 100vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px; }
    .hero h1 { font-size: 64px; margin-bottom: 20px; text-shadow: 0 0 30px ${colors.primary}; }
    .hero p { font-size: 24px; opacity: 0.8; max-width: 600px; }
    .cta-btn { display: inline-block; margin-top: 30px; padding: 15px 40px; background: ${colors.primary}; color: #000; text-decoration: none; border-radius: 30px; font-weight: bold; transition: transform 0.3s, box-shadow 0.3s; }
    .cta-btn:hover { transform: scale(1.05); box-shadow: 0 0 30px ${colors.primary}; }
    
    .services { padding: 100px 40px; background: rgba(0,0,0,0.5); }
    .services h2 { text-align: center; font-size: 40px; margin-bottom: 60px; color: ${colors.accent}; }
    .services-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; max-width: 1200px; margin: 0 auto; }
    .service-card { background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; border: 1px solid ${colors.primary}40; transition: transform 0.3s; }
    .service-card:hover { transform: translateY(-10px); border-color: ${colors.primary}; }
    .service-card h3 { color: ${colors.primary}; margin-bottom: 15px; font-size: 24px; }
    
    .about { padding: 100px 40px; max-width: 800px; margin: 0 auto; text-align: center; }
    .about h2 { font-size: 40px; margin-bottom: 30px; color: ${colors.accent}; }
    .about p { font-size: 18px; line-height: 1.8; opacity: 0.9; }
    
    .contact { padding: 100px 40px; background: rgba(0,0,0,0.5); text-align: center; }
    .contact h2 { font-size: 40px; margin-bottom: 40px; color: ${colors.accent}; }
    .contact-info { display: flex; justify-content: center; gap: 60px; flex-wrap: wrap; margin-bottom: 40px; }
    .contact-item { font-size: 18px; }
    .contact-item span { display: block; color: ${colors.primary}; margin-bottom: 5px; }
    
    footer { padding: 30px; text-align: center; background: #000; }
  </style>
</head>
<body>
  <canvas id="threejs-bg"></canvas>
  
  <header>
    <div class="logo">${business.name}</div>
    <nav>
      <a href="#services">Services</a>
      <a href="#about">About</a>
      <a href="#contact">Contact</a>
    </nav>
  </header>
  
  <section class="hero">
    <div>
      <h1>${business.name}</h1>
      <p>${tagline}</p>
      <a href="#contact" class="cta-btn">Get In Touch</a>
    </div>
  </section>
  
  <section class="services" id="services">
    <h2>Our Services</h2>
    <div class="services-grid">
      ${services.map((s: string) => `
      <div class="service-card">
        <h3>${s}</h3>
        <p>Professional ${s.toLowerCase()} delivered with excellence and attention to detail.</p>
      </div>`).join('')}
    </div>
  </section>
  
  <section class="about" id="about">
    <h2>About Us</h2>
    <p>${description}</p>
  </section>
  
  <section class="contact" id="contact">
    <h2>Contact Us</h2>
    <div class="contact-info">
      <div class="contact-item">
        <span>Address</span>
        ${business.address}
      </div>
      ${business.phone ? `
      <div class="contact-item">
        <span>Phone</span>
        ${business.phone}
      </div>` : ''}
    </div>
    <a href="tel:${business.phone}" class="cta-btn">Call Now</a>
  </section>
  
  <footer>
    <p>&copy; ${new Date().getFullYear()} ${business.name}. All rights reserved.</p>
  </footer>

  <script>
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('threejs-bg'), alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    ${getThreeJSScene(scene, colors.primary)}
    
    camera.position.z = 5;
    
    function animate() {
      requestAnimationFrame(animate);
      ${scene === 'particles' ? 'particles.rotation.y += 0.001;' : ''}
      ${scene === 'waves' ? 'mesh.rotation.x += 0.005;' : ''}
      ${scene === 'geometry' ? 'mesh.rotation.x += 0.01; mesh.rotation.y += 0.01;' : ''}
      renderer.render(scene, camera);
    }
    animate();
    
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  </script>
</body>
</html>`
}

function getThreeJSScene(sceneType: string, primaryColor: string): string {
  switch (sceneType) {
    case 'particles':
      return `
      const particlesGeometry = new THREE.BufferGeometry();
      const particlesCount = 3000;
      const posArray = new Float32Array(particlesCount * 3);
      for(let i = 0; i < particlesCount * 3; i++) { posArray[i] = (Math.random() - 0.5) * 10; }
      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
      const particlesMaterial = new THREE.PointsMaterial({ size: 0.02, color: '${primaryColor}' });
      var particles = new THREE.Points(particlesGeometry, particlesMaterial);
      scene.add(particles);`
    
    case 'waves':
      return `
      const geometry = new THREE.PlaneGeometry(10, 10, 50, 50);
      const material = new THREE.MeshBasicMaterial({ color: '${primaryColor}', wireframe: true });
      var mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2.5;
      scene.add(mesh);`
    
    case 'geometry':
      return `
      const geometry = new THREE.IcosahedronGeometry(2, 1);
      const material = new THREE.MeshBasicMaterial({ color: '${primaryColor}', wireframe: true });
      var mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);`
    
    default:
      return `
      const geometry = new THREE.TorusGeometry(2, 0.5, 16, 100);
      const material = new THREE.MeshBasicMaterial({ color: '${primaryColor}', wireframe: true });
      var mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);`
  }
}
