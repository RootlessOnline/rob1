'use client'

import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Line, Sphere } from '@react-three/drei'
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
// 🎮 CAMERA CONTROLLER
// ═══════════════════════════════════════════════════════════════════════════════

function CameraController() {
  const { camera } = useThree()
  
  useFrame((state) => {
    // Gentle auto-rotation
    const t = state.clock.elapsedTime * 0.1
    camera.position.x = Math.sin(t) * 0.5
    camera.lookAt(0, 0, 0)
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
}

export default function SefirotTree3D({ 
  activeSefirah, 
  intensity = 0.5, 
  onSefirahClick,
  showControls = true 
}: SefirotTree3DProps) {
  return (
    <div style={{ width: '100%', height: '100%', background: 'transparent' }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        style={{ background: 'transparent' }}
      >
        <color attach="background" args={['transparent']} />
        
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
              maxDistance={20}
              autoRotate
              autoRotateSpeed={0.5}
            />
            <CameraController />
          </>
        )}
      </Canvas>
    </div>
  )
}
