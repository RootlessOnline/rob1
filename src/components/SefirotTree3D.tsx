'use client'

import { useRef, useMemo, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Line, Sphere, Stars } from '@react-three/drei'
import * as THREE from 'three'

// ═══════════════════════════════════════════════════════════════════════════════
// 🌳 SEFIROT DATA - The Tree of Life
// ═══════════════════════════════════════════════════════════════════════════════

export interface Sefirah {
  name: string
  hebrew: string
  meaning: string
  position: [number, number, number]
  color: string
  emissive: string
  planet?: string
  emotion?: string
}

export const SEFIROT: Sefirah[] = [
  {
    name: 'Keter',
    hebrew: 'כתר',
    meaning: 'Crown',
    position: [0, 4, 0],
    color: '#ffffff',
    emissive: '#ffffff',
    planet: 'Neptune',
    emotion: 'mysterious'
  },
  {
    name: 'Chokmah',
    hebrew: 'חכמה',
    meaning: 'Wisdom',
    position: [-1.5, 3, 0],
    color: '#87CEEB',
    emissive: '#4a9acb',
    planet: 'Uranus',
    emotion: 'curious'
  },
  {
    name: 'Binah',
    hebrew: 'בינה',
    meaning: 'Understanding',
    position: [1.5, 3, 0],
    color: '#1a1a2a',
    emissive: '#3a3a5a',
    planet: 'Saturn',
    emotion: 'pondering'
  },
  {
    name: 'Chesed',
    hebrew: 'חסד',
    meaning: 'Mercy',
    position: [-2, 1.5, 0],
    color: '#4169E1',
    emissive: '#2a49c1',
    planet: 'Jupiter',
    emotion: 'happy'
  },
  {
    name: 'Gevurah',
    hebrew: 'גבורה',
    meaning: 'Strength',
    position: [2, 1.5, 0],
    color: '#DC143C',
    emissive: '#9c1030',
    planet: 'Mars',
    emotion: 'angry'
  },
  {
    name: 'Tiferet',
    hebrew: 'תפארת',
    meaning: 'Beauty',
    position: [0, 1.5, 0],
    color: '#FFD700',
    emissive: '#cba500',
    planet: 'Sun',
    emotion: 'reflecting'
  },
  {
    name: 'Netzach',
    hebrew: 'נצח',
    meaning: 'Eternity',
    position: [-1.5, 0, 0],
    color: '#32CD32',
    emissive: '#229022',
    planet: 'Venus',
    emotion: 'playful'
  },
  {
    name: 'Hod',
    hebrew: 'הוד',
    meaning: 'Glory',
    position: [1.5, 0, 0],
    color: '#FF8C00',
    emissive: '#cb6a00',
    planet: 'Mercury',
    emotion: 'annoyed'
  },
  {
    name: 'Yesod',
    hebrew: 'יסוד',
    meaning: 'Foundation',
    position: [0, -1.5, 0],
    color: '#9932CC',
    emissive: '#6920a0',
    planet: 'Moon',
    emotion: 'melancholy'
  },
  {
    name: 'Malkuth',
    hebrew: 'מלכות',
    meaning: 'Kingdom',
    position: [0, -3.5, 0],
    color: '#8B4513',
    emissive: '#5a2a0a',
    planet: 'Earth',
    emotion: 'happy'
  }
]

// Paths connecting the Sefirot (The 22 Paths)
export const PATHS: [string, string][] = [
  ['Keter', 'Chokmah'],
  ['Keter', 'Binah'],
  ['Keter', 'Tiferet'],
  ['Chokmah', 'Binah'],
  ['Chokmah', 'Chesed'],
  ['Binah', 'Gevurah'],
  ['Chesed', 'Gevurah'],
  ['Chesed', 'Tiferet'],
  ['Gevurah', 'Tiferet'],
  ['Chesed', 'Netzach'],
  ['Gevurah', 'Hod'],
  ['Tiferet', 'Netzach'],
  ['Tiferet', 'Hod'],
  ['Tiferet', 'Yesod'],
  ['Netzach', 'Hod'],
  ['Netzach', 'Yesod'],
  ['Hod', 'Yesod'],
  ['Yesod', 'Malkuth'],
  ['Malkuth', 'Netzach'],
  ['Malkuth', 'Hod'],
  ['Chokmah', 'Tiferet'],
  ['Binah', 'Tiferet']
]

// ═══════════════════════════════════════════════════════════════════════════════
// ✨ SEFIROT SPHERE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface SefirahSphereProps {
  sefirah: Sefirah
  isActive: boolean
  intensity: number
  onClick: () => void
  hovered: boolean
  onHover: (h: boolean) => void
}

function SefirahSphere({ sefirah, isActive, intensity, onClick, hovered, onHover }: SefirahSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  
  // Animate pulsing
  useFrame((state) => {
    if (meshRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.05 + 1
      meshRef.current.scale.setScalar(hovered ? 1.2 : pulse)
    }
    if (glowRef.current) {
      const glowIntensity = isActive ? 0.6 + intensity * 0.4 : 0.3
      glowRef.current.scale.setScalar(1.5 + Math.sin(state.clock.elapsedTime * 3) * 0.1)
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = glowIntensity * (hovered ? 1.5 : 1)
    }
  })

  const size = isActive ? 0.35 : 0.28

  return (
    <group position={sefirah.position}>
      {/* Outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[size * 1.8, 32, 32]} />
        <meshBasicMaterial 
          color={sefirah.emissive} 
          transparent 
          opacity={isActive ? 0.5 : 0.2}
        />
      </mesh>
      
      {/* Main sphere */}
      <mesh 
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial 
          color={sefirah.color}
          emissive={sefirah.emissive}
          emissiveIntensity={isActive ? 0.8 + intensity * 0.5 : 0.3}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>
      
      {/* Label */}
      <Text
        position={[0, 0.6, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {sefirah.name}
      </Text>
      
      {/* Hebrew */}
      <Text
        position={[0, -0.5, 0]}
        fontSize={0.15}
        color={sefirah.emissive}
        anchorX="center"
        anchorY="middle"
      >
        {sefirah.hebrew}
      </Text>
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔗 PATH COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface PathLineProps {
  from: [number, number, number]
  to: [number, number, number]
  isActive: boolean
}

function PathLine({ from, to, isActive }: PathLineProps) {
  const points = useMemo(() => [new THREE.Vector3(...from), new THREE.Vector3(...to)], [from, to])
  
  return (
    <Line
      points={points}
      color={isActive ? '#d4a62a' : '#3a3a5a'}
      lineWidth={isActive ? 2 : 1}
      opacity={isActive ? 0.8 : 0.4}
      transparent
    />
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🌳 MAIN TREE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface SefirotTreeProps {
  activeSefirah?: string
  intensity?: number
  onSefirahClick?: (sefirah: Sefirah) => void
}

function SefirotTree({ activeSefirah, intensity = 0.5, onSefirahClick }: SefirotTreeProps) {
  const [hoveredSefirah, setHoveredSefirah] = useState<string | null>(null)
  
  // Get positions for paths
  const getPosition = (name: string): [number, number, number] => {
    const s = SEFIROT.find(s => s.name === name)
    return s ? s.position : [0, 0, 0]
  }

  return (
    <group>
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 5, 5]} intensity={1} color="#d4a62a" />
      <pointLight position={[0, -5, 5]} intensity={0.5} color="#4a2a5a" />
      
      {/* Render paths first (behind spheres) */}
      {PATHS.map(([from, to], i) => (
        <PathLine 
          key={i} 
          from={getPosition(from)} 
          to={getPosition(to)} 
          isActive={activeSefirah === from || activeSefirah === to}
        />
      ))}
      
      {/* Render spheres */}
      {SEFIROT.map(sefirah => (
        <SefirahSphere
          key={sefirah.name}
          sefirah={sefirah}
          isActive={activeSefirah === sefirah.name || hoveredSefirah === sefirah.name}
          intensity={intensity}
          onClick={() => onSefirahClick?.(sefirah)}
          hovered={hoveredSefirah === sefirah.name}
          onHover={(h) => setHoveredSefirah(h ? sefirah.name : null)}
        />
      ))}
    </group>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🌌 SPACE BACKGROUND - Stars, Nebula, Cosmic Dust
// ═══════════════════════════════════════════════════════════════════════════════

function SpaceBackground() {
  const nebulaRef = useRef<THREE.Points>(null)
  const dustRef = useRef<THREE.Points>(null)
  
  // Create nebula particles
  const nebulaParticles = useMemo(() => {
    const count = 2000
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    
    for (let i = 0; i < count; i++) {
      // Spread particles in a large sphere around the scene
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const radius = 30 + Math.random() * 70
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = radius * Math.cos(phi)
      
      // Purple/blue nebula colors
      const colorChoice = Math.random()
      if (colorChoice < 0.3) {
        // Deep purple
        colors[i * 3] = 0.4 + Math.random() * 0.2
        colors[i * 3 + 1] = 0.1 + Math.random() * 0.1
        colors[i * 3 + 2] = 0.6 + Math.random() * 0.3
      } else if (colorChoice < 0.6) {
        // Blue
        colors[i * 3] = 0.1 + Math.random() * 0.1
        colors[i * 3 + 1] = 0.3 + Math.random() * 0.2
        colors[i * 3 + 2] = 0.7 + Math.random() * 0.3
      } else {
        // Gold/amber (sefirot theme)
        colors[i * 3] = 0.8 + Math.random() * 0.2
        colors[i * 3 + 1] = 0.6 + Math.random() * 0.2
        colors[i * 3 + 2] = 0.1 + Math.random() * 0.2
      }
      
      sizes[i] = 0.5 + Math.random() * 1.5
    }
    
    return { positions, colors, sizes }
  }, [])
  
  // Create cosmic dust (smaller, more numerous)
  const dustParticles = useMemo(() => {
    const count = 5000
    const positions = new Float32Array(count * 3)
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200
    }
    
    return positions
  }, [])
  
  // Animate nebula rotation
  useFrame((state) => {
    if (nebulaRef.current) {
      nebulaRef.current.rotation.y = state.clock.elapsedTime * 0.01
      nebulaRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.005) * 0.1
    }
    if (dustRef.current) {
      dustRef.current.rotation.y = state.clock.elapsedTime * 0.02
    }
  })
  
  return (
    <>
      {/* Three.js Stars component for background stars */}
      <Stars 
        radius={100} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0.5} 
        fade 
        speed={0.5}
      />
      
      {/* Nebula particles */}
      <points ref={nebulaRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={nebulaParticles.positions.length / 3}
            array={nebulaParticles.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={nebulaParticles.colors.length / 3}
            array={nebulaParticles.colors}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.8}
          vertexColors
          transparent
          opacity={0.6}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Cosmic dust */}
      <points ref={dustRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={dustParticles.length / 3}
            array={dustParticles}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.1}
          color="#4a3a6a"
          transparent
          opacity={0.4}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      {/* Distant nebula glow planes */}
      <mesh position={[0, 0, -80]} rotation={[0, 0, 0]}>
        <planeGeometry args={[150, 150]} />
        <meshBasicMaterial
          color="#2a1a4a"
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, -70]} rotation={[0, 0, 0.2]}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial
          color="#4a2a6a"
          transparent
          opacity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮 CAMERA CONTROLLER - Orbit Around Sefirot
// ═══════════════════════════════════════════════════════════════════════════════

interface CameraControllerProps {
  autoOrbit: boolean
  orbitSpeed: number
  orbitRadius: number
}

function CameraController({ autoOrbit, orbitSpeed, orbitRadius }: CameraControllerProps) {
  const { camera } = useThree()
  const angleRef = useRef(0)
  
  useFrame((state) => {
    if (autoOrbit) {
      angleRef.current += state.clock.getDelta() * orbitSpeed
      
      // Orbit around the center (where the tree is)
      camera.position.x = Math.sin(angleRef.current) * orbitRadius
      camera.position.z = Math.cos(angleRef.current) * orbitRadius
      camera.position.y = Math.sin(angleRef.current * 0.3) * 2 // Gentle up/down motion
      
      // Always look at the center of the tree
      camera.lookAt(0, 0, 0)
    }
  })

  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🖼️ MAIN EXPORT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface SefirotTree3DProps {
  activeSefirah?: string
  intensity?: number
  onSefirahClick?: (sefirah: Sefirah) => void
  showControls?: boolean
  autoOrbit?: boolean
  orbitSpeed?: number
  showSpaceBackground?: boolean
}

export default function SefirotTree3D({ 
  activeSefirah, 
  intensity = 0.5, 
  onSefirahClick,
  showControls = true,
  autoOrbit = true,
  orbitSpeed = 0.3,
  showSpaceBackground = true
}: SefirotTree3DProps) {
  const [orbitRadius, setOrbitRadius] = useState(10)
  const [isAutoOrbit, setIsAutoOrbit] = useState(autoOrbit)
  const [orbitSpeedState, setOrbitSpeedState] = useState(orbitSpeed)
  
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', background: '#050510' }}>
      <Canvas
        camera={{ position: [0, 0, orbitRadius], fov: 50 }}
        gl={{ antialias: true }}
        style={{ background: '#050510' }}
      >
        {/* Deep space background */}
        <color attach="background" args={['#050510']} />
        
        {/* Space background with stars and nebula */}
        {showSpaceBackground && <SpaceBackground />}
        
        <SefirotTree 
          activeSefirah={activeSefirah} 
          intensity={intensity}
          onSefirahClick={onSefirahClick}
        />
        
        {showControls && (
          <>
            <OrbitControls 
              enablePan={false}
              enableZoom={true}
              minDistance={5}
              maxDistance={25}
              autoRotate={false}
              enabled={!isAutoOrbit}
            />
            <CameraController 
              autoOrbit={isAutoOrbit} 
              orbitSpeed={orbitSpeedState}
              orbitRadius={orbitRadius}
            />
          </>
        )}
      </Canvas>
      
      {/* Orbit Controls UI */}
      {showControls && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '15px',
          alignItems: 'center',
          background: 'rgba(10, 10, 20, 0.8)',
          padding: '10px 20px',
          borderRadius: '25px',
          border: '1px solid rgba(212, 166, 42, 0.3)',
          backdropFilter: 'blur(10px)',
          fontFamily: "'Press Start 2P', monospace",
          fontSize: '10px'
        }}>
          {/* Auto-rotate toggle */}
          <button
            onClick={() => setIsAutoOrbit(!isAutoOrbit)}
            style={{
              background: isAutoOrbit ? 'rgba(212, 166, 42, 0.3)' : 'rgba(42, 42, 62, 0.5)',
              border: `1px solid ${isAutoOrbit ? '#d4a62a' : '#3a3a5a'}`,
              color: isAutoOrbit ? '#d4a62a' : '#8a8a9a',
              padding: '8px 16px',
              borderRadius: '15px',
              cursor: 'pointer',
              fontFamily: "'Press Start 2P', monospace",
              fontSize: '9px',
              transition: 'all 0.3s'
            }}
          >
            {isAutoOrbit ? '🌀 ORBIT ON' : '⏸️ ORBIT OFF'}
          </button>
          
          {/* Speed control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#8a8a9a' }}>SPEED</span>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={orbitSpeedState}
              onChange={(e) => setOrbitSpeedState(parseFloat(e.target.value))}
              style={{
                width: '60px',
                accentColor: '#d4a62a'
              }}
            />
          </div>
          
          {/* Distance control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#8a8a9a' }}>DIST</span>
            <input
              type="range"
              min="6"
              max="20"
              step="1"
              value={orbitRadius}
              onChange={(e) => setOrbitRadius(parseInt(e.target.value))}
              style={{
                width: '60px',
                accentColor: '#d4a62a'
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
