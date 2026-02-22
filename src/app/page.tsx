'use client'

import { useState, useRef, useEffect, useCallback, memo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Dynamic import for Three.js component (no SSR)
const SefirotTree3D = dynamic(() => import('@/components/SefirotTree3D'), {
  ssr: false,
  loading: () => (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#d4a62a',
      fontSize: '14px',
      fontFamily: "'Press Start 2P', monospace"
    }}>
      🌳 Loading Tree of Life...
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
// 🎮 V4 TYPES & INTERFACES - THE OBSERVER
// ═══════════════════════════════════════════════════════════════════════════════

interface Message {
  id: number
  sender: 'Q' | 'Z' | 'Anubis' | 'Observer' | 'system'
  text: string
  time: string
}

type Mode = 'split' | 'style' | 'code' | 'config' | 'analytics' | 'z' | 'sefirot'
type EmotionKey = 'happy' | 'angry' | 'annoyed' | 'pondering' | 'reflecting' | 'curious' | 'playful' | 'melancholy' | 'mysterious'

// V4: Mood Change Tracking
interface MoodChange {
  emotion: EmotionKey
  change: number  // positive = increase, negative = decrease
  timestamp: Date
  reason?: string
}

// V4: Observer Overlay
interface ObserverOverlay {
  id: string
  target: string  // 'stm' | 'mood' | 'glyph' | 'chat' | etc
  text: string
  position: { x: number; y: number }
  visible: boolean
}

// V4: Memory Re-think Result
interface RethinkResult {
  memoryId: string
  oldWeight: number
  newWeight: number
  reason: string
  timestamp: Date
}

interface Emotions {
  happy: number
  angry: number
  annoyed: number
  pondering: number
  reflecting: number
  curious: number
  playful: number
  melancholy: number
  mysterious: number
}

// V3: Moral Compass Weight System
interface MemoryWeights {
  timesFelt: number      // Base weight: 1.00
  timesPromoted: number  // Weight: 1.33
  timesRejected: number  // Weight: 0.72
  timesAscended: number  // Weight: 1.73 (Core memories)
}

// V3: Memory Fate types
type MemoryFate = 'none' | 'ascended' | 'promoted' | 'fading' | 'reflected'

// V3: Enhanced Short Term Thought with slot position and fate
interface ShortTermThought {
  id: string
  thought: string
  timestamp: Date
  emotions: Partial<Emotions>
  moodChanges?: MoodChange[]  // V4: Track what moods changed during this memory
  slot: number // 1-6
  glyphWord?: string // One word chosen during GLYPH reflection
  fate: MemoryFate
  reflectionTimestamp?: Date
}

interface GoldenMemory {
  id: string
  memory: string
  timestamp: Date
  emotions: Partial<Emotions>
  reflection: string
  glyphWord?: string
}

interface SelfRealization {
  id: string
  word: string
  definition: string
  discoveredAt: Date
  emotionCombo: EmotionKey[]
  timesFelt: number
  color?: string
  faceDescription?: string
}

// V3: Discovered Emotion (from ASCENDED memories)
interface DiscoveredEmotion {
  id: string
  word: string
  color: string
  faceDescription: string
  discoveredAt: Date
  fromMemory: string
}

// V3: Personality Trait for display
interface PersonalityTrait {
  name: string
  value: number
  icon: string
  description: string
}

interface AnubisSoul {
  emotions: Emotions
  currentMood: EmotionKey
  shortTermMemory: ShortTermThought[]
  goldenMemories: GoldenMemory[]
  selfRealizations: SelfRealization[]
  discoveredEmotions: DiscoveredEmotion[]
  moralCompass: Record<string, MemoryWeights>
  personalityCore: {
    baseEmotions: Emotions
    traits: string[]
    conversationsHad: number
    created: Date
  }
  personalityTraits: PersonalityTrait[]
  level: number
  xp: number
  lastReflection?: Date
  // V4 additions
  recentMoodChanges?: MoodChange[]
  rethinkHistory?: RethinkResult[]
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎨 V4 DUNGEON COLOR PALETTE + OBSERVER
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  // Dungeon base
  abyss: '#0a0a0a',
  stone: '#3a3a4a',
  stoneDark: '#2a2a3a',
  stoneLight: '#4a4a5a',
  
  // Torch/warm
  torchOrange: '#c4762a',
  torchYellow: '#d4a62a',
  ember: '#a44a1a',
  
  // Magic/soul
  shadowPurple: '#4a2a5a',
  crystalBlue: '#2a4a6a',
  soulPurple: '#6a3a8a',
  
  // Glyph colors
  glyphGold: '#d4a62a',
  glyphPurple: '#8a4aba',
  
  // Text
  bone: '#8a8a9a',
  boneLight: '#aaaaba',
  
  // V4: Observer colors
  observerBlue: '#4a8ab8',      // Blueish owl
  observerBlueLight: '#6aa8d8',
  pyramidGreen: '#2a8a4a',      // Illuminati green
  pyramidGreenDark: '#1a6a3a',
  pyramidGreenGlow: '#3aba5a',
  
  // Mood colors (muted dungeon style)
  moods: {
    happy: '#5a8a4a',
    angry: '#8a3a3a',
    annoyed: '#7a5a3a',
    pondering: '#4a6a8a',
    reflecting: '#6a5a7a',
    curious: '#4a8a8a',
    playful: '#8a5a8a',
    melancholy: '#4a5a6a',
    mysterious: '#6a4a8a'
  }
} as const

const MOODS: { key: EmotionKey; icon: string; color: string }[] = [
  { key: 'happy', icon: '😊', color: COLORS.moods.happy },
  { key: 'angry', icon: '😠', color: COLORS.moods.angry },
  { key: 'annoyed', icon: '😒', color: COLORS.moods.annoyed },
  { key: 'pondering', icon: '🤔', color: COLORS.moods.pondering },
  { key: 'reflecting', icon: '🪞', color: COLORS.moods.reflecting },
  { key: 'curious', icon: '🔍', color: COLORS.moods.curious },
  { key: 'playful', icon: '🎭', color: COLORS.moods.playful },
  { key: 'melancholy', icon: '🌧️', color: COLORS.moods.melancholy },
  { key: 'mysterious', icon: '🌙', color: COLORS.moods.mysterious }
]

// ═══════════════════════════════════════════════════════════════════════════════
// 🐺 V3 PIXEL WOLF FACE COMPONENT (140x140 with animations)
// ═══════════════════════════════════════════════════════════════════════════════

const PixelWolf = memo(({ mood, size = 140, animate = true }: { mood: EmotionKey; size?: number; animate?: boolean }) => {
  const moodColor = COLORS.moods[mood] || COLORS.moods.mysterious
  const [isBlinking, setIsBlinking] = useState(false)
  const [earTwitch, setEarTwitch] = useState(false)
  
  // Blink every 3-5 seconds
  useEffect(() => {
    if (!animate) return
    const blinkInterval = setInterval(() => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 150)
    }, 3000 + Math.random() * 2000)
    return () => clearInterval(blinkInterval)
  }, [animate])
  
  // Random ear twitch
  useEffect(() => {
    if (!animate) return
    const twitchInterval = setInterval(() => {
      setEarTwitch(true)
      setTimeout(() => setEarTwitch(false), 200)
    }, 2000 + Math.random() * 3000)
    return () => clearInterval(twitchInterval)
  }, [animate])
  
  // Each mood has unique pixel patterns
  const getMoodPattern = () => {
    switch (mood) {
      case 'happy':
        return {
          eyes: 'wide-open',
          mouth: 'smile',
          extras: ['sparkles', 'hearts'],
          browStyle: 'normal'
        }
      case 'angry':
        return {
          eyes: 'angry',
          mouth: 'frown',
          extras: ['steam'],
          browStyle: 'angry'
        }
      case 'annoyed':
        return {
          eyes: 'half-lidded',
          mouth: 'flat',
          extras: [],
          browStyle: 'flat'
        }
      case 'pondering':
        return {
          eyes: 'looking-up',
          mouth: 'slight-frown',
          extras: ['thought-dots'],
          browStyle: 'raised'
        }
      case 'reflecting':
        return {
          eyes: 'soft-closed',
          mouth: 'neutral',
          extras: ['shimmer'],
          browStyle: 'relaxed'
        }
      case 'curious':
        return {
          eyes: 'big-round',
          mouth: 'small-o',
          extras: ['question-marks'],
          browStyle: 'raised'
        }
      case 'playful':
        return {
          eyes: 'wink',
          mouth: 'tongue',
          extras: ['sparkles', 'hearts'],
          browStyle: 'playful'
        }
      case 'melancholy':
        return {
          eyes: 'sad',
          mouth: 'sad',
          extras: ['tears'],
          browStyle: 'sad'
        }
      case 'mysterious':
      default:
        return {
          eyes: 'hidden-glow',
          mouth: 'enigmatic',
          extras: ['shadow-particles'],
          browStyle: 'shadowy'
        }
    }
  }

  const pattern = getMoodPattern()
  const pixelSize = Math.floor(size / 16)
  
  return (
    <div style={{ 
      width: size, 
      height: size, 
      position: 'relative', 
      flexShrink: 0,
      animation: animate ? 'wolfBreathing 3s ease-in-out infinite' : 'none'
    }}>
      {/* Base pixel wolf using CSS box-shadow technique */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: pixelSize,
          height: pixelSize,
          color: moodColor,
          background: 'transparent',
          boxShadow: generatePixelWolfShadow(mood, pixelSize, moodColor, isBlinking, earTwitch),
          transform: 'translate(0, 0)'
        }}
      />
      
      {/* SVG Glow overlay */}
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      >
        <defs>
          {/* Glow filter */}
          <filter id={`glow-${mood}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Gradient for eyes */}
          <radialGradient id={`eyeGlow-${mood}`}>
            <stop offset="0%" stopColor={moodColor} stopOpacity="0.8"/>
            <stop offset="100%" stopColor={moodColor} stopOpacity="0"/>
          </radialGradient>
          
          {/* Particle filter */}
          <filter id="particleGlow">
            <feGaussianBlur stdDeviation="1.5"/>
          </filter>
        </defs>
        
        {/* Eye glows */}
        {(pattern.eyes === 'wide-open' || pattern.eyes === 'big-round') && !isBlinking && (
          <>
            <circle cx={size * 0.3} cy={size * 0.35} r={pixelSize * 2} fill={moodColor} opacity="0.6" filter={`url(#glow-${mood})`}>
              {animate && <animate attributeName="opacity" values="0.4;0.7;0.4" dur="2s" repeatCount="indefinite"/>}
            </circle>
            <circle cx={size * 0.7} cy={size * 0.35} r={pixelSize * 2} fill={moodColor} opacity="0.6" filter={`url(#glow-${mood})`}>
              {animate && <animate attributeName="opacity" values="0.4;0.7;0.4" dur="2s" repeatCount="indefinite"/>}
            </circle>
          </>
        )}
        
        {/* Blink animation overlay */}
        {isBlinking && (
          <>
            <rect x={size * 0.22} y={size * 0.33} width={size * 0.18} height={pixelSize * 0.5} fill={moodColor} rx="2"/>
            <rect x={size * 0.6} y={size * 0.33} width={size * 0.18} height={pixelSize * 0.5} fill={moodColor} rx="2"/>
          </>
        )}
        
        {/* Mysterious shadow particles */}
        {pattern.extras.includes('shadow-particles') && (
          <>
            {[...Array(8)].map((_, i) => (
              <circle 
                key={i}
                r={pixelSize * 0.8}
                fill={moodColor}
                opacity="0.5"
                filter="url(#particleGlow)"
              >
                <animate 
                  attributeName="cx" 
                  values={`${size * (0.1 + i * 0.1)};${size * (0.15 + i * 0.1)};${size * (0.1 + i * 0.1)}`}
                  dur={`${1.5 + i * 0.3}s`}
                  repeatCount="indefinite"
                />
                <animate 
                  attributeName="cy" 
                  values={`${size * 0.9};${size * 0.85};${size * 0.9}`}
                  dur={`${1.2 + i * 0.2}s`}
                  repeatCount="indefinite"
                />
                <animate 
                  attributeName="opacity" 
                  values="0.2;0.6;0.2"
                  dur={`${1 + i * 0.1}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </>
        )}
        
        {/* Sparkles for happy/playful */}
        {pattern.extras.includes('sparkles') && (
          <>
            {[...Array(6)].map((_, i) => (
              <g key={i}>
                <circle 
                  cx={size * (0.1 + i * 0.15)} 
                  cy={size * 0.08} 
                  r={pixelSize * 0.5}
                  fill="#ffd700"
                  opacity="0.8"
                >
                  {animate && <animate attributeName="opacity" values="0;1;0" dur={`${1 + i * 0.2}s`} repeatCount="indefinite"/>}
                </circle>
              </g>
            ))}
          </>
        )}
        
        {/* Hearts for playful */}
        {pattern.extras.includes('hearts') && (
          <>
            <text x={size * 0.1} y={size * 0.15} fontSize={size * 0.1} fill="#ff6b9d" opacity="0.8">
              {animate && <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite"/>}
              ♥
            </text>
            <text x={size * 0.85} y={size * 0.15} fontSize={size * 0.1} fill="#ff6b9d" opacity="0.8">
              {animate && <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="0.5s"/>}
              ♥
            </text>
          </>
        )}
        
        {/* Tears for melancholy */}
        {pattern.extras.includes('tears') && (
          <>
            <ellipse cx={size * 0.3} cy={size * 0.5} rx={pixelSize * 0.8} ry={pixelSize * 1.5} fill="#4a6a8a" opacity="0.7">
              {animate && <animate attributeName="cy" values={`${size * 0.45};${size * 0.6};${size * 0.45}`} dur="2s" repeatCount="indefinite"/>}
            </ellipse>
            <ellipse cx={size * 0.7} cy={size * 0.5} rx={pixelSize * 0.8} ry={pixelSize * 1.5} fill="#4a6a8a" opacity="0.7">
              {animate && <animate attributeName="cy" values={`${size * 0.5};${size * 0.65};${size * 0.5}`} dur="2.2s" repeatCount="indefinite"/>}
            </ellipse>
          </>
        )}
        
        {/* Steam for angry */}
        {pattern.extras.includes('steam') && (
          <>
            {[0, 1, 2].map(i => (
              <circle key={i} cx={size * (0.2 + i * 0.3)} cy={size * 0.1} r={pixelSize * 0.6} fill="#888" opacity="0.5">
                {animate && (
                  <>
                    <animate attributeName="cy" values={`${size * 0.15};${size * 0.05};${size * 0.15}`} dur="1s" repeatCount="indefinite" begin={`${i * 0.2}s`}/>
                    <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1s" repeatCount="indefinite" begin={`${i * 0.2}s`}/>
                  </>
                )}
              </circle>
            ))}
          </>
        )}
      </svg>
      
      {/* Breathing animation style */}
      <style>{`
        @keyframes wolfBreathing {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
      `}</style>
    </div>
  )
})

// Generate pixel wolf using box-shadow (classic CSS pixel art technique)
function generatePixelWolfShadow(mood: EmotionKey, pixel: number, color: string, isBlinking: boolean, earTwitch: boolean): string {
  // 16x16 grid mapped to box-shadows - now 140x140 size
  const baseWolf = [
    // Ears (top)
    '2,1', '3,1', '12,1', '13,1',
    '2,2', '3,2', '4,2', '11,2', '12,2', '13,2',
    // Forehead
    '3,3', '4,3', '5,3', '10,3', '11,3', '12,3',
    '2,3', '13,3',
    // Eyes row
    '1,4', '2,4', '3,4', '4,4', '5,4', '6,4', '9,4', '10,4', '11,4', '12,4', '13,4', '14,4',
    // Eye whites
    '3,5', '4,5', '5,5', '10,5', '11,5', '12,5',
    // Snout top
    '2,6', '3,6', '4,6', '5,6', '6,6', '7,6', '8,6', '9,6', '10,6', '11,6', '12,6', '13,6',
    // Nose
    '7,7', '8,7',
    // Mouth area
    '4,7', '5,7', '6,7', '9,7', '10,7', '11,7',
    // Lower face
    '3,8', '4,8', '5,8', '6,8', '7,8', '8,8', '9,8', '10,8', '11,8', '12,8',
    '4,9', '5,9', '6,9', '7,9', '8,9', '9,9', '10,9', '11,9',
    // Bottom
    '5,10', '6,10', '7,10', '8,10', '9,10', '10,10',
    '6,11', '7,11', '8,11', '9,11',
  ]
  
  // Eye positions (to be colored differently)
  const eyePositions = ['4,5', '5,5', '10,5', '11,5']
  const pupilPositions = mood === 'angry' ? ['4,5', '10,5'] : (mood === 'mysterious' ? [] : ['4,5', '11,5'])
  const nosePositions = ['7,7', '8,7']
  const earPositions = ['2,1', '3,1', '12,1', '13,1', '2,2', '3,2', '4,2', '11,2', '12,2', '13,2']
  
  const darkColor = '#1a1a2a'
  const eyeColor = mood === 'mysterious' ? color : '#8af'
  const noseColor = '#2a2a3a'
  
  return baseWolf.map(pos => {
    const [x, y] = pos.split(',').map(Number)
    let pixelColor = color
    
    // Ear twitch effect
    if (earPositions.includes(pos) && earTwitch) {
      const twitchOffset = Math.random() > 0.5 ? pixel * 0.1 : -pixel * 0.1
      return `${x * pixel + twitchOffset}px ${y * pixel - pixel * 0.05}px ${pixelColor}`
    }
    
    if (pupilPositions.includes(pos)) {
      // Blinking - hide pupils
      pixelColor = isBlinking ? darkColor : eyeColor
    }
    else if (eyePositions.includes(pos)) {
      pixelColor = mood === 'mysterious' ? darkColor : (isBlinking ? darkColor : '#fff')
    }
    else if (nosePositions.includes(pos)) pixelColor = noseColor
    
    return `${x * pixel}px ${y * pixel}px ${pixelColor}`
  }).join(', ')
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔥 ANIMATED TORCH COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const AnimatedTorch = memo(({ size = 40 }: { size?: number }) => {
  return (
    <div style={{ width: size, height: size * 1.5, position: 'relative' }}>
      <svg width={size} height={size * 1.5} viewBox="0 0 40 60">
        <defs>
          <radialGradient id="flameGradient" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stopColor={COLORS.torchYellow}/>
            <stop offset="50%" stopColor={COLORS.torchOrange}/>
            <stop offset="100%" stopColor={COLORS.ember}/>
          </radialGradient>
          <radialGradient id="flameCore" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor="#fff8a0"/>
            <stop offset="100%" stopColor={COLORS.torchYellow}/>
          </radialGradient>
          <filter id="fireGlow">
            <feGaussianBlur stdDeviation="2" result="glow"/>
            <feMerge>
              <feMergeNode in="glow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Torch holder (pixel style) */}
        <rect x="16" y="35" width="8" height="20" fill={COLORS.stoneDark}/>
        <rect x="14" y="55" width="12" height="5" fill={COLORS.stone}/>
        <rect x="12" y="33" width="16" height="4" fill={COLORS.stoneLight}/>
        
        {/* Flame outer */}
        <ellipse cx="20" cy="20" rx="10" ry="15" fill="url(#flameGradient)" filter="url(#fireGlow)">
          <animate attributeName="ry" values="15;12;15" dur="0.3s" repeatCount="indefinite"/>
          <animate attributeName="rx" values="10;8;10" dur="0.25s" repeatCount="indefinite"/>
        </ellipse>
        
        {/* Flame inner */}
        <ellipse cx="20" cy="22" rx="5" ry="8" fill="url(#flameCore)">
          <animate attributeName="ry" values="8;6;8" dur="0.2s" repeatCount="indefinite"/>
          <animate attributeName="cy" values="22;24;22" dur="0.3s" repeatCount="indefinite"/>
        </ellipse>
        
        {/* Sparks */}
        {[
          { x: 15, y: 8, dur: '0.8s' },
          { x: 25, y: 10, dur: '1s' },
          { x: 20, y: 5, dur: '0.6s' }
        ].map((spark, i) => (
          <circle key={i} cx={spark.x} cy={spark.y} r="1.5" fill={COLORS.torchYellow}>
            <animate attributeName="cy" values={`${spark.y};${spark.y - 10};${spark.y}`} dur={spark.dur} repeatCount="indefinite"/>
            <animate attributeName="opacity" values="1;0;1" dur={spark.dur} repeatCount="indefinite"/>
          </circle>
        ))}
      </svg>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
// 🦉 V4 OBSERVER COMPONENT - Owl on Pyramid
// ═══════════════════════════════════════════════════════════════════════════════

const Observer = memo(({ 
  size = 60, 
  animate = true,
  flying = false,
  onPyramid = true 
}: { 
  size?: number
  animate?: boolean
  flying?: boolean
  onPyramid?: boolean
}) => {
  return (
    <div style={{ 
      width: size, 
      height: size * 1.5, 
      position: 'relative',
      animation: flying ? 'owlFlyIn 1s ease-out' : (animate ? 'owlIdle 3s ease-in-out infinite' : 'none')
    }}>
      <svg width={size} height={size * 1.5} viewBox="0 0 60 90">
        <defs>
          {/* Pyramid gradient */}
          <linearGradient id="pyramidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={COLORS.pyramidGreenGlow}/>
            <stop offset="50%" stopColor={COLORS.pyramidGreen}/>
            <stop offset="100%" stopColor={COLORS.pyramidGreenDark}/>
          </linearGradient>
          
          {/* Owl gradient */}
          <linearGradient id="owlGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={COLORS.observerBlueLight}/>
            <stop offset="100%" stopColor={COLORS.observerBlue}/>
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="observerGlow">
            <feGaussianBlur stdDeviation="2" result="glow"/>
            <feMerge>
              <feMergeNode in="glow"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Eye glow */}
          <radialGradient id="eyeGlow">
            <stop offset="0%" stopColor="#fff"/>
            <stop offset="50%" stopColor={COLORS.pyramidGreenGlow}/>
            <stop offset="100%" stopColor={COLORS.pyramidGreen}/>
          </radialGradient>
        </defs>
        
        {/* PYRAMID */}
        {onPyramid && (
          <g>
            {/* Main pyramid */}
            <polygon 
              points="30,45 10,85 50,85" 
              fill="url(#pyramidGrad)"
              filter="url(#observerGlow)"
            />
            
            {/* Pyramid edge highlights */}
            <line x1="30" y1="45" x2="10" y2="85" stroke={COLORS.pyramidGreenGlow} strokeWidth="1" opacity="0.5"/>
            <line x1="30" y1="45" x2="50" y2="85" stroke={COLORS.pyramidGreenDark} strokeWidth="1" opacity="0.3"/>
            
            {/* All-seeing eye on pyramid */}
            <ellipse cx="30" cy="60" rx="8" ry="5" fill="url(#eyeGlow)" opacity="0.8">
              {animate && (
                <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2s" repeatCount="indefinite"/>
              )}
            </ellipse>
            <circle cx="30" cy="60" r="3" fill="#fff"/>
            <circle cx="30" cy="60" r="1.5" fill="#000"/>
            
            {/* Eye rays */}
            {animate && [...Array(6)].map((_, i) => (
              <line 
                key={i}
                x1="30" y1="60"
                x2={30 + Math.cos((i * 60 * Math.PI) / 180) * 12}
                y2={60 + Math.sin((i * 60 * Math.PI) / 180) * 12}
                stroke={COLORS.pyramidGreenGlow}
                strokeWidth="0.5"
                opacity="0.3"
              >
                <animate 
                  attributeName="opacity" 
                  values="0.1;0.5;0.1" 
                  dur={`${1.5 + i * 0.2}s`} 
                  repeatCount="indefinite"
                />
              </line>
            ))}
          </g>
        )}
        
        {/* OWL */}
        <g style={{ transform: onPyramid ? 'translateY(-20px)' : 'none' }}>
          {/* Owl body */}
          <ellipse cx="30" cy="35" rx="12" ry="15" fill="url(#owlGrad)" filter="url(#observerGlow)"/>
          
          {/* Owl head */}
          <circle cx="30" cy="18" r="10" fill={COLORS.observerBlue}/>
          
          {/* Ear tufts */}
          <polygon points="22,12 25,5 28,14" fill={COLORS.observerBlueLight}/>
          <polygon points="38,12 35,5 32,14" fill={COLORS.observerBlueLight}/>
          
          {/* Owl face disk */}
          <ellipse cx="30" cy="20" rx="7" ry="6" fill={COLORS.observerBlueLight} opacity="0.5"/>
          
          {/* Eyes */}
          <circle cx="26" cy="18" r="4" fill="#1a1a2a"/>
          <circle cx="34" cy="18" r="4" fill="#1a1a2a"/>
          <circle cx="26" cy="18" r="2.5" fill={COLORS.pyramidGreenGlow}>
            {animate && <animate attributeName="r" values="2;2.5;2" dur="2s" repeatCount="indefinite"/>}
          </circle>
          <circle cx="34" cy="18" r="2.5" fill={COLORS.pyramidGreenGlow}>
            {animate && <animate attributeName="r" values="2;2.5;2" dur="2s" repeatCount="indefinite" begin="0.5s"/>}
          </circle>
          <circle cx="26" cy="17" r="1" fill="#fff"/>
          <circle cx="34" cy="17" r="1" fill="#fff"/>
          
          {/* Beak */}
          <polygon points="30,22 28,25 32,25" fill="#d4a62a"/>
          
          {/* Chest pattern */}
          <ellipse cx="30" cy="38" rx="8" ry="6" fill={COLORS.observerBlueLight} opacity="0.3"/>
          {[...Array(3)].map((_, i) => (
            <ellipse 
              key={i}
              cx="30" 
              cy={35 + i * 4} 
              rx={6 - i} 
              ry="2" 
              fill={COLORS.observerBlueLight} 
              opacity="0.2"
            />
          ))}
          
          {/* Wings */}
          <ellipse cx="20" cy="35" rx="4" ry="10" fill={COLORS.observerBlue} opacity="0.8"/>
          <ellipse cx="40" cy="35" rx="4" ry="10" fill={COLORS.observerBlue} opacity="0.8"/>
        </g>
      </svg>
      
      <style>{`
        @keyframes owlIdle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes owlFlyIn {
          0% { 
            transform: translateX(-100px) translateY(-50px) scale(0.5); 
            opacity: 0;
          }
          50% { 
            transform: translateX(20px) translateY(-10px) scale(1.1); 
            opacity: 1;
          }
          100% { 
            transform: translateX(0) translateY(0) scale(1); 
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
})

// V4: Observer Explanation Bubble (free-floating overlay)
const ObserverBubble = memo(({ 
  text, 
  position, 
  visible,
  onClose 
}: { 
  text: string
  position: { x: number; y: number }
  visible: boolean
  onClose?: () => void
}) => {
  if (!visible) return null
  
  return (
    <div style={{
      position: 'fixed',
      left: position.x,
      top: position.y,
      zIndex: 9999,
      maxWidth: '300px',
      animation: 'bubbleIn 0.3s ease-out'
    }}>
      {/* Small Observer above bubble */}
      <div style={{ marginBottom: '-10px', marginLeft: '10px' }}>
        <Observer size={30} animate={false} onPyramid={false} />
      </div>
      
      {/* Bubble */}
      <div style={{
        background: `linear-gradient(135deg, ${COLORS.observerBlue}20, ${COLORS.pyramidGreen}20)`,
        border: `2px solid ${COLORS.observerBlue}`,
        borderRadius: '12px',
        padding: '12px 16px',
        boxShadow: `0 4px 20px ${COLORS.observerBlue}40`,
        backdropFilter: 'blur(8px)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '4px'
        }}>
          <span style={{ 
            color: COLORS.observerBlue, 
            fontSize: '11px',
            fontFamily: "'Press Start 2P', monospace"
          }}>
            🦉 OBSERVER
          </span>
          {onClose && (
            <button 
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: COLORS.bone,
                cursor: 'pointer',
                fontSize: '14px',
                padding: '0',
                lineHeight: 1
              }}
            >
              ×
            </button>
          )}
        </div>
        <div style={{ 
          color: COLORS.boneLight, 
          fontSize: '13px',
          lineHeight: 1.5
        }}>
          {text}
        </div>
      </div>
      
      <style>{`
        @keyframes bubbleIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
// 💭 THOUGHT BUBBLE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const ThoughtBubble = memo(({ thoughts, color, visible }: { thoughts: string[]; color: string; visible: boolean }) => {
  if (!visible || thoughts.length === 0) return null
  
  return (
    <div style={{
      position: 'relative',
      marginBottom: '8px',
      animation: 'fadeIn 0.3s ease-out'
    }}>
      <svg width="100%" height="20" viewBox="0 0 100 20" preserveAspectRatio="none">
        <circle cx="30" cy="15" r="6" fill={color} opacity="0.3"/>
        <circle cx="45" cy="10" r="8" fill={color} opacity="0.4"/>
        <circle cx="65" cy="8" r="5" fill={color} opacity="0.3"/>
      </svg>
      <div style={{
        background: `linear-gradient(135deg, ${color}15, ${color}25)`,
        border: `1px solid ${color}50`,
        borderRadius: '8px',
        padding: '10px 14px',
        fontFamily: 'monospace',
        fontSize: '13px',
        color: COLORS.boneLight,
        lineHeight: 1.5,
        backdropFilter: 'blur(4px)'
      }}>
        <div style={{ color, marginBottom: '4px', fontWeight: 'bold' }}>💭 Anubis thinks...</div>
        {thoughts.map((thought, i) => (
          <div key={i} style={{ opacity: 0.9 }}>{thought}</div>
        ))}
      </div>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 V4 EMOTION BAR COMPONENT - With Change Indicators
// ═══════════════════════════════════════════════════════════════════════════════

const EmotionBar = memo(({ emotion, value, isDominant, vertical = false, change }: { 
  emotion: typeof MOODS[0]; 
  value: number; 
  isDominant: boolean;
  vertical?: boolean;
  change?: number;  // V4: mood change amount
}) => {
  const changeColor = change && change > 0 ? '#5a8a4a' : change && change < 0 ? '#8a3a3a' : COLORS.bone
  const changeText = change ? (change > 0 ? `↑+${change}` : `↓${change}`) : ''
  
  if (vertical) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 4px',
        background: isDominant ? `${emotion.color}15` : 'transparent',
        borderRadius: '4px',
        border: isDominant ? `1px solid ${emotion.color}50` : '1px solid transparent',
        boxShadow: isDominant ? `0 0 10px ${emotion.color}30` : 'none',
        position: 'relative'
      }}>
        {/* V4: Change indicator bubble */}
        {change !== undefined && change !== 0 && (
          <div style={{
            position: 'absolute',
            top: '-8px',
            right: '-4px',
            background: changeColor,
            color: '#fff',
            fontSize: '8px',
            padding: '2px 4px',
            borderRadius: '4px',
            fontFamily: "'Press Start 2P', monospace",
            boxShadow: `0 0 8px ${changeColor}`,
            animation: 'pulse 1s ease-in-out'
          }}>
            {change > 0 ? `+${change}` : change}
          </div>
        )}
        <span style={{ fontSize: '18px', marginBottom: '4px' }}>{emotion.icon}</span>
        <div style={{ 
          width: '8px', 
          height: '60px', 
          background: COLORS.abyss, 
          borderRadius: '4px',
          overflow: 'hidden',
          border: `1px solid ${COLORS.stoneDark}`,
          position: 'relative'
        }}>
          <div 
            style={{ 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: `${Math.min(value, 100)}%`, 
              background: `linear-gradient(0deg, ${emotion.color}, ${emotion.color}aa)`,
              transition: 'height 0.5s ease-out',
              boxShadow: `0 0 8px ${emotion.color}50`
            }}
          />
        </div>
        <span style={{ 
          fontSize: '9px', 
          color: isDominant ? emotion.color : COLORS.bone,
          fontFamily: "'Press Start 2P', monospace",
          marginTop: '4px',
          textAlign: 'center'
        }}>
          {emotion.key.slice(0, 4).toUpperCase()}
        </span>
        <span style={{ 
          fontSize: '10px', 
          color: isDominant ? emotion.color : COLORS.bone,
          fontFamily: "'Press Start 2P', monospace"
        }}>
          {Math.round(value)}%
        </span>
      </div>
    )
  }
  
  // Horizontal version (with change indicator on right)
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 0',
      background: isDominant ? `${emotion.color}10` : 'transparent',
      borderRadius: '4px',
      paddingLeft: isDominant ? '4px' : 0,
      transition: 'background 0.3s'
    }}>
      <span style={{ fontSize: '14px', width: '20px', textAlign: 'center' }}>{emotion.icon}</span>
      <span style={{ 
        fontSize: '11px', 
        width: '65px', 
        color: isDominant ? emotion.color : COLORS.bone,
        fontFamily: "'Press Start 2P', monospace",
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {emotion.key.slice(0, 4)}
      </span>
      <div style={{ 
        flex: 1, 
        height: '10px', 
        background: COLORS.abyss, 
        borderRadius: '2px',
        overflow: 'hidden',
        border: `1px solid ${COLORS.stoneDark}`
      }}>
        <div 
          style={{ 
            width: `${Math.min(value, 100)}%`, 
            height: '100%', 
            background: `linear-gradient(90deg, ${emotion.color}, ${emotion.color}aa)`,
            transition: 'width 0.5s ease-out',
            boxShadow: `0 0 8px ${emotion.color}50`
          }}
        />
      </div>
      <span style={{ 
        fontSize: '10px', 
        width: '30px', 
        textAlign: 'right',
        color: isDominant ? emotion.color : COLORS.bone,
        fontFamily: "'Press Start 2P', monospace"
      }}>
        {Math.round(value)}%
      </span>
      {/* V4: Change indicator */}
      {change !== undefined && change !== 0 && (
        <span style={{ 
          fontSize: '9px', 
          width: '32px',
          color: changeColor,
          fontFamily: "'Press Start 2P', monospace",
          textShadow: `0 0 6px ${changeColor}`,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          {change > 0 ? `↑+${change}` : `↓${change}`}
        </span>
      )}
      {isDominant && <span style={{ color: emotion.color, fontSize: '10px' }}>◄</span>}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
// 📊 V3 PERSONALITY BARS COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const PersonalityBars = memo(({ soul }: { soul: AnubisSoul }) => {
  // Calculate personality traits from soul data
  const traits = calculatePersonalityTraits(soul)
  
  return (
    <div style={{
      background: COLORS.stoneDark + '60',
      borderRadius: '6px',
      border: `1px solid ${COLORS.stone}`,
      padding: '8px'
    }}>
      <div style={{
        fontSize: '10px',
        color: COLORS.soulPurple,
        marginBottom: '8px',
        fontFamily: "'Press Start 2P', monospace",
        textAlign: 'center'
      }}>
        📊 PERSONALITY
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {traits.map((trait, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11px'
          }}>
            <span style={{ width: '16px', textAlign: 'center' }}>{trait.icon}</span>
            <span style={{ 
              width: '60px', 
              color: COLORS.bone,
              fontFamily: 'monospace'
            }}>
              {trait.name}
            </span>
            <div style={{ 
              flex: 1, 
              height: '8px', 
              background: COLORS.abyss, 
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div 
                style={{ 
                  width: `${trait.value}%`, 
                  height: '100%', 
                  background: COLORS.soulPurple,
                  transition: 'width 0.3s'
                }}
              />
            </div>
            <span style={{ 
              width: '30px', 
              textAlign: 'right',
              color: COLORS.boneLight,
              fontSize: '10px'
            }}>
              {trait.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
})

// Calculate personality traits from soul data
function calculatePersonalityTraits(soul: AnubisSoul): PersonalityTrait[] {
  const traits: PersonalityTrait[] = []
  
  // Wisdom from golden memories (weighted 3x)
  const wisdom = Math.min(100, (soul.goldenMemories.length * 15) + (soul.selfRealizations.length * 10))
  traits.push({ name: 'Wisdom', value: wisdom, icon: '🦉', description: 'From golden memories' })
  
  // Curiosity from questions asked
  const curiosity = Math.min(100, (soul.emotions.curious || 0) + (soul.personalityCore.conversationsHad * 2))
  traits.push({ name: 'Curious', value: curiosity, icon: '🔍', description: 'From questions' })
  
  // Empathy from emotional variety
  const emotionCount = Object.values(soul.emotions).filter(v => v > 20).length
  const empathy = Math.min(100, emotionCount * 11 + (soul.goldenMemories.length * 5))
  traits.push({ name: 'Empathy', value: empathy, icon: '💜', description: 'From emotional depth' })
  
  // Memory from STM usage
  const memoryStrength = Math.min(100, soul.shortTermMemory.length * 16 + (soul.moralCompass ? Object.keys(soul.moralCompass).length * 5 : 0))
  traits.push({ name: 'Memory', value: memoryStrength, icon: '🧠', description: 'From STM slots' })
  
  // Maturity from total conversations
  const maturity = Math.min(100, soul.personalityCore.conversationsHad * 3 + soul.level * 10)
  traits.push({ name: 'Mature', value: maturity, icon: '🎭', description: 'From experience' })
  
  return traits
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🎒 V3 MIND PALACE TABS (with 6-slot STM)
// ═══════════════════════════════════════════════════════════════════════════════

type MindPalaceTab = 'stm' | 'golden' | 'realizations'

const MindPalace = memo(({ 
  soul, 
  activeTab, 
  setActiveTab,
  onSlotClick
}: { 
  soul: AnubisSoul
  activeTab: MindPalaceTab
  setActiveTab: (t: MindPalaceTab) => void
  onSlotClick?: (slot: number) => void
}) => {
  const formatTime = (date: Date) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const tabs: { key: MindPalaceTab; icon: string; label: string; count: number }[] = [
    { key: 'stm', icon: '💭', label: 'STM', count: soul.shortTermMemory.length },
    { key: 'golden', icon: '⭐', label: 'Core', count: soul.goldenMemories.length },
    { key: 'realizations', icon: '📝', label: 'Self', count: soul.selfRealizations.length }
  ]

  // Get slot style based on position
  const getSlotStyle = (slot: number, fate: MemoryFate) => {
    const baseStyle = {
      background: COLORS.abyss + '80',
      padding: '6px 8px',
      borderRadius: '4px',
      border: `1px solid ${COLORS.stoneDark}`,
      cursor: 'pointer' as const,
      transition: 'all 0.2s'
    }
    
    // Slot 3 (GLYPH position)
    if (slot === 3) {
      return {
        ...baseStyle,
        border: `2px solid ${COLORS.glyphGold}`,
        background: `linear-gradient(135deg, ${COLORS.glyphGold}15, ${COLORS.glyphPurple}15)`,
        boxShadow: `0 0 10px ${COLORS.glyphGold}30`
      }
    }
    
    // Slot 4 (Fate position)
    if (slot === 4) {
      switch (fate) {
        case 'ascended':
          return { ...baseStyle, border: `2px solid ${COLORS.torchYellow}`, background: COLORS.torchYellow + '20' }
        case 'promoted':
          return { ...baseStyle, border: `2px solid ${COLORS.soulPurple}`, background: COLORS.soulPurple + '20' }
        case 'fading':
          return { ...baseStyle, border: `2px solid ${COLORS.bone}`, opacity: 0.6 }
        default:
          return baseStyle
      }
    }
    
    // Slot 5-6 (fading)
    if (slot >= 5) {
      return { ...baseStyle, opacity: 0.4 }
    }
    
    return baseStyle
  }

  return (
    <div style={{ 
      background: COLORS.stoneDark + '80',
      borderRadius: '6px',
      border: `1px solid ${COLORS.stone}`,
      overflow: 'hidden'
    }}>
      {/* Tab headers */}
      <div style={{ 
        display: 'flex', 
        borderBottom: `1px solid ${COLORS.stone}`,
        background: COLORS.abyss
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: '6px 4px',
              background: activeTab === tab.key ? COLORS.stoneDark : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? `2px solid ${COLORS.soulPurple}` : '2px solid transparent',
              color: activeTab === tab.key ? COLORS.boneLight : COLORS.bone,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '2px',
              fontSize: '9px',
              fontFamily: "'Press Start 2P', monospace"
            }}
          >
            <span style={{ fontSize: '14px' }}>{tab.icon}</span>
            <span>{tab.label}</span>
            <span style={{ 
              background: COLORS.soulPurple + '50', 
              padding: '1px 4px', 
              borderRadius: '4px',
              fontSize: '8px'
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>
      
      {/* Tab content */}
      <div style={{ 
        padding: '8px', 
        maxHeight: '150px', 
        overflow: 'auto',
        fontSize: '10px',
        fontFamily: 'monospace'
      }}>
        {activeTab === 'stm' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {soul.shortTermMemory.length === 0 ? (
              <div style={{ color: COLORS.bone, textAlign: 'center', padding: '8px' }}>
                Empty mind...
              </div>
            ) : (
              soul.shortTermMemory.map((thought, i) => (
                <div
                  key={thought.id}
                  style={getSlotStyle(thought.slot, thought.fate)}
                  onClick={() => onSlotClick?.(thought.slot)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: COLORS.soulPurple }}>[{thought.slot}]</span>
                      {thought.slot === 3 && <span style={{ color: COLORS.glyphGold }}>𓂀</span>}
                      {thought.glyphWord && <span style={{ color: COLORS.glyphPurple, fontStyle: 'italic' }}>"{thought.glyphWord}"</span>}
                    </div>
                    <span style={{ color: COLORS.bone, fontSize: '9px' }}>{formatTime(thought.timestamp)}</span>
                  </div>
                  <div style={{ color: COLORS.boneLight, fontSize: '10px' }}>{thought.thought}</div>
                  {/* V4: Show mood changes for this memory */}
                  {thought.moodChanges && thought.moodChanges.length > 0 && (
                    <div style={{ marginTop: '3px', display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                      {thought.moodChanges.slice(0, 4).map((mc, idx) => (
                        <span key={idx} style={{
                          fontSize: '8px',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          background: mc.change > 0 ? COLORS.moods.happy + '30' : COLORS.moods.angry + '30',
                          color: mc.change > 0 ? COLORS.moods.happy : COLORS.moods.angry,
                          border: `1px solid ${mc.change > 0 ? COLORS.moods.happy : COLORS.moods.angry}50`
                        }}>
                          {mc.change > 0 ? '↑' : '↓'}{mc.emotion.slice(0, 3)}
                        </span>
                      ))}
                    </div>
                  )}
                  {thought.fate !== 'none' && thought.fate !== 'reflected' && (
                    <div style={{ marginTop: '2px', fontSize: '9px' }}>
                      {thought.fate === 'ascended' && <span style={{ color: COLORS.torchYellow }}>⭐ ASCENDED</span>}
                      {thought.fate === 'promoted' && <span style={{ color: COLORS.soulPurple }}>⚡ PROMOTED</span>}
                      {thought.fate === 'fading' && <span style={{ color: COLORS.bone }}>💭 Fading...</span>}
                    </div>
                  )}
                </div>
              ))
            )}
            {/* Show empty slots */}
            {soul.shortTermMemory.length < 6 && [...Array(6 - soul.shortTermMemory.length)].map((_, i) => (
              <div key={`empty-${i}`} style={{
                background: COLORS.abyss + '40',
                padding: '6px 8px',
                borderRadius: '4px',
                border: `1px dashed ${COLORS.stoneDark}`,
                color: COLORS.bone,
                opacity: 0.5,
                textAlign: 'center',
                fontSize: '9px'
              }}>
                [Slot {soul.shortTermMemory.length + i + 1}] Empty
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'golden' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {soul.goldenMemories.length === 0 ? (
              <div style={{ color: COLORS.bone, textAlign: 'center', padding: '8px' }}>
                No core memories yet...
              </div>
            ) : (
              soul.goldenMemories.map(memory => (
                <div key={memory.id} style={{
                  background: COLORS.abyss + '80',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: `1px solid ${COLORS.torchYellow}50`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ color: COLORS.torchYellow }}>⭐ Core</span>
                    <span style={{ color: COLORS.bone, fontSize: '9px' }}>{formatTime(memory.timestamp)}</span>
                  </div>
                  <div style={{ color: COLORS.boneLight, fontSize: '10px' }}>{memory.memory}</div>
                  {memory.glyphWord && (
                    <div style={{ marginTop: '2px', color: COLORS.glyphPurple, fontSize: '9px', fontStyle: 'italic' }}>
                      𓂀 "{memory.glyphWord}"
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        
        {activeTab === 'realizations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {soul.selfRealizations.length === 0 ? (
              <div style={{ color: COLORS.bone, textAlign: 'center', padding: '8px' }}>
                Learning about myself...
              </div>
            ) : (
              soul.selfRealizations.map(real => (
                <div key={real.id} style={{
                  background: COLORS.abyss + '80',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: `1px solid ${COLORS.crystalBlue}50`
                }}>
                  <div style={{ color: COLORS.crystalBlue, fontWeight: 'bold', marginBottom: '2px', fontSize: '10px' }}>
                    📝 "{real.word}"
                  </div>
                  <div style={{ color: COLORS.boneLight, fontSize: '9px' }}>{real.definition}</div>
                  <div style={{ color: COLORS.bone, fontSize: '8px', marginTop: '2px' }}>
                    Felt {real.timesFelt}x
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
// 📜 MESSAGE BUBBLE
// ═══════════════════════════════════════════════════════════════════════════════

const MessageBubble = memo(({ msg, accent, anubisMood }: { msg: Message; accent: string; anubisMood: EmotionKey }) => {
  const isQ = msg.sender === 'Q'
  const moodColor = COLORS.moods[anubisMood] || COLORS.moods.mysterious
  const color = msg.sender === 'Q' ? accent : msg.sender === 'Z' ? '#4a8a4a' : msg.sender === 'Anubis' ? moodColor : msg.sender === 'Observer' ? COLORS.observerBlue : COLORS.bone
  
  return (
    <div style={{ 
      padding: '10px 14px', 
      borderRadius: '6px', 
      background: `${color}10`,
      border: `1px solid ${color}30`,
      alignSelf: isQ ? 'flex-end' : 'flex-start', 
      maxWidth: '85%', 
      whiteSpace: 'pre-wrap', 
      margin: '4px 0',
      fontFamily: 'monospace'
    }}>
      <div style={{ 
        color, 
        fontSize: '12px', 
        marginBottom: '4px',
        fontFamily: "'Press Start 2P', monospace",
        letterSpacing: '0.5px'
      }}>
        {msg.sender} • {msg.time}
      </div>
      <div style={{ fontSize: '14px', lineHeight: 1.5, color: COLORS.boneLight }}>{msg.text}</div>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
// 🖥️ TERMINAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const Terminal = memo(({ output, onCommand }: { output: string; onCommand: (cmd: string) => void }) => {
  const [cmd, setCmd] = useState('')

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && cmd.trim()) {
      onCommand(cmd)
      setCmd('')
    }
  }, [cmd, onCommand])

  return (
    <div style={{
      background: COLORS.abyss,
      border: `1px solid ${COLORS.moods.curious}`,
      borderRadius: '4px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flexShrink: 0
    }}>
      <div style={{
        padding: '4px 8px',
        borderBottom: `1px solid ${COLORS.moods.curious}30`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: COLORS.stoneDark + '50'
      }}>
        <span style={{ color: COLORS.moods.curious, fontSize: '10px', fontFamily: "'Press Start 2P', monospace" }}>
          💻 TERMINAL V4
        </span>
        <span style={{ color: COLORS.bone, fontSize: '8px' }}>
          activity | rethink &lt;slot&gt; | !stop
        </span>
      </div>
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '6px 8px',
        fontFamily: 'monospace',
        fontSize: '10px',
        color: COLORS.moods.curious,
        whiteSpace: 'pre-wrap',
        background: COLORS.abyss
      }}>
        {output || '> Ready... Type "help" for commands'}
      </div>
      <div style={{ 
        padding: '4px 8px', 
        borderTop: `1px solid ${COLORS.moods.curious}30`,
        display: 'flex',
        gap: '6px',
        alignItems: 'center'
      }}>
        <span style={{ color: COLORS.moods.curious }}>$</span>
        <input
          value={cmd}
          onChange={e => setCmd(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="command..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: COLORS.moods.curious,
            fontSize: '10px',
            outline: 'none',
            fontFamily: 'monospace'
          }}
        />
      </div>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════════════════════════
// 🏠 V3 MAIN HOME COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function Home() {
  // Mode state
  const [mode, setMode] = useState<Mode>('split')
  const [mounted, setMounted] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState('$ Anubis Terminal v3.0\n$ Type "help" for commands\n')
  const [mindPalaceTab, setMindPalaceTab] = useState<MindPalaceTab>('stm')
  
  // Messages
  const [zMessages, setZMessages] = useState<Message[]>([])
  const [anubisMessages, setAnubisMessages] = useState<Message[]>([])
  
  // V4: Observer messages
  const [observerMessages, setObserverMessages] = useState<Message[]>([])

  // V4: Z Project Manager messages
  const [zProjectMessages, setZProjectMessages] = useState<Message[]>([])

  // Inputs
  const [zInput, setZInput] = useState('')
  const [anubisInput, setAnubisInput] = useState('')
  
  // V4: Observer input
  const [observerInput, setObserverInput] = useState('')
  
  // Loading
  const [zLoading, setZLoading] = useState(false)
  const [anubisLoading, setAnubisLoading] = useState(false)
  
  // V4: Observer loading
  const [observerLoading, setObserverLoading] = useState(false)
  
  // Thoughts
  const [zThoughts, setZThoughts] = useState<string[]>([])
  const [anubisThoughts, setAnubisThoughts] = useState<string[]>([])
  
  // V4: Observer thoughts
  const [observerThoughts, setObserverThoughts] = useState<string[]>([])

  // V4: Z Project Manager
  const [zProjectInput, setZProjectInput] = useState('')
  const [zProjectLoading, setZProjectLoading] = useState(false)
  const [zProjectThoughts, setZProjectThoughts] = useState<string[]>([])

  // 🌳 Sefirot Tree Chat - Kabbalah Scholar
  const [sefirotMessages, setSefirotMessages] = useState<Message[]>([])
  const [sefirotInput, setSefirotInput] = useState('')
  const [sefirotLoading, setSefirotLoading] = useState(false)
  const [activeSefirah, setActiveSefirah] = useState<string | undefined>(undefined)
  const [robSoul, setRobSoul] = useState<{
    focus: string | null
    depth: number
    learningPath: string[]
    insightsGiven: number
  }>({
    focus: null,
    depth: 1,
    learningPath: [],
    insightsGiven: 0
  })

  // V4: Stopping flag for !stop command
  const [isStopping, setIsStopping] = useState(false)
  
  // Z Context
  const [zObservations, setZObservations] = useState<string[]>([])
  const [zContext, setZContext] = useState<{
    sessions: Array<{ started: string; ended?: string; summary: string }>;
    patterns: { totalConversations: number; anubisCommonMoods: Array<{ mood: string; count: number }> };
    observations: Array<{ id: string; text: string; timestamp: string }>;
  } | null>(null)
  
  // GLYPH reflection state
  const [showGlyphReflection, setShowGlyphReflection] = useState(false)
  const [currentGlyphMemory, setCurrentGlyphMemory] = useState<ShortTermThought | null>(null)
  
  // Refs
  const zMessagesEndRef = useRef<HTMLDivElement>(null)
  const anubisMessagesEndRef = useRef<HTMLDivElement>(null)
  const observerMessagesEndRef = useRef<HTMLDivElement>(null)
  const zProjectMessagesEndRef = useRef<HTMLDivElement>(null)
  const sefirotMessagesEndRef = useRef<HTMLDivElement>(null)
  
  // V3 Anubis Soul - Initialize with proper structure
  const [anubisSoul, setAnubisSoul] = useState<AnubisSoul>({
    emotions: {
      happy: 20, angry: 5, annoyed: 5, pondering: 30, reflecting: 25,
      curious: 45, playful: 15, melancholy: 10, mysterious: 60
    },
    currentMood: 'mysterious',
    shortTermMemory: [],
    goldenMemories: [],
    selfRealizations: [],
    discoveredEmotions: [],
    moralCompass: {},
    personalityCore: {
      baseEmotions: {
        happy: 20, angry: 5, annoyed: 5, pondering: 30, reflecting: 25,
        curious: 45, playful: 15, melancholy: 10, mysterious: 60
      },
      traits: ['mysterious', 'curious', 'thoughtful'],
      conversationsHad: 0,
      created: new Date()
    },
    personalityTraits: [],
    level: 1,
    xp: 0
  })

  // Load soul from localStorage AND file backup
  useEffect(() => {
    const saved = localStorage.getItem('anubis_soul_v3')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        // Convert date strings back to Date objects
        parsed.personalityCore.created = new Date(parsed.personalityCore.created)
        parsed.shortTermMemory = parsed.shortTermMemory.map((t: ShortTermThought) => ({
          ...t,
          timestamp: new Date(t.timestamp),
          reflectionTimestamp: t.reflectionTimestamp ? new Date(t.reflectionTimestamp) : undefined
        }))
        parsed.goldenMemories = parsed.goldenMemories.map((m: GoldenMemory) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }))
        parsed.selfRealizations = parsed.selfRealizations.map((r: SelfRealization) => ({
          ...r,
          discoveredAt: new Date(r.discoveredAt)
        }))
        parsed.discoveredEmotions = (parsed.discoveredEmotions || []).map((e: DiscoveredEmotion) => ({
          ...e,
          discoveredAt: new Date(e.discoveredAt)
        }))
        if (parsed.lastReflection) parsed.lastReflection = new Date(parsed.lastReflection)
        setAnubisSoul(parsed)
        console.log('[Soul V3] Loaded from localStorage')
      } catch (e) {
        console.error('Failed to load soul from localStorage:', e)
      }
    }
    
    // Also try to load from file backup
    fetch('/api/soul')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.soul) {
          const fileSoul = data.soul.soul
          const localSaved = localStorage.getItem('anubis_soul_v3')
          if (!localSaved || (data.soul.lastUpdated && fileSoul)) {
            fileSoul.personalityCore.created = new Date(fileSoul.personalityCore.created)
            fileSoul.shortTermMemory = fileSoul.shortTermMemory.map((t: ShortTermThought) => ({
              ...t,
              timestamp: new Date(t.timestamp),
              reflectionTimestamp: t.reflectionTimestamp ? new Date(t.reflectionTimestamp) : undefined
            }))
            fileSoul.goldenMemories = fileSoul.goldenMemories.map((m: GoldenMemory) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }))
            fileSoul.selfRealizations = fileSoul.selfRealizations.map((r: SelfRealization) => ({
              ...r,
              discoveredAt: new Date(r.discoveredAt)
            }))
            fileSoul.discoveredEmotions = (fileSoul.discoveredEmotions || []).map((e: DiscoveredEmotion) => ({
              ...e,
              discoveredAt: new Date(e.discoveredAt)
            }))
            if (fileSoul.lastReflection) fileSoul.lastReflection = new Date(fileSoul.lastReflection)
            setAnubisSoul(fileSoul)
            localStorage.setItem('anubis_soul_v3', JSON.stringify(fileSoul))
            console.log('[Soul V3] Restored from file backup')
          }
        }
      })
      .catch(e => console.log('[Soul V3] No file backup found'))
  }, [])

  // Save soul to both localStorage AND file backup
  const saveSoul = useCallback((soul: AnubisSoul) => {
    localStorage.setItem('anubis_soul_v3', JSON.stringify(soul))
    setAnubisSoul(soul)
    
    fetch('/api/soul', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ soul })
    }).catch(e => console.error('[Soul V3] Failed to save backup:', e))
  }, [])

  // Initialize
  useEffect(() => {
    if (!mounted) {
      setMounted(true)
      setZMessages([{
        id: 0,
        sender: 'system',
        text: `🌲 Q-Z-Collab v3.0\n\n🆕 V3 UPGRADE:\n• New 5/25/70 layout\n• 140px Wolf with animations\n• 6-slot STM with GLYPH\n• Mood Panel (full height)\n• Personality Bars\n• Moral Compass weights`,
        time: new Date().toLocaleTimeString()
      }])
      setAnubisMessages([{
        id: 0,
        sender: 'system',
        text: `🖤 ANUBIS SOUL SYSTEM v3.0\n\n𓂀 GLYPH Reflection ready\n6-slot STM active\n140px animated wolf online\n\nThe shadows whisper your name...`,
        time: new Date().toLocaleTimeString()
      }])
      
      // Load Z context
      fetch('/api/z-context')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.context) {
            setZContext(data.context)
            if (data.context.observations?.length > 0) {
              setZObservations(data.context.observations.slice(0, 5).map((o: { text: string }) => o.text))
            }
          }
        })
        .catch(() => {})
    }
  }, [mounted])

  // Scroll helpers
  useEffect(() => { zMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [zMessages])
  useEffect(() => { anubisMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [anubisMessages])
  useEffect(() => { observerMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [observerMessages])
  useEffect(() => { zProjectMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [zProjectMessages])

  // Get dominant mood
  const getDominantMood = useCallback((emotions: Emotions): EmotionKey => {
    let max = 0
    let dominant: EmotionKey = 'mysterious'
    for (const [key, value] of Object.entries(emotions)) {
      if (value > max) {
        max = value
        dominant = key as EmotionKey
      }
    }
    return dominant
  }, [])

  // Update emotions based on message - V4: Now tracks mood changes
  const updateEmotions = useCallback((message: string, soul: AnubisSoul): { 
    emotions: Emotions; 
    thoughts: string[];
    moodChanges: MoodChange[];  // V4: Track what changed
  } => {
    const lowerMsg = message.toLowerCase()
    const emotionChanges: Partial<Emotions> = {}
    const thoughts: string[] = []
    const moodChanges: MoodChange[] = []  // V4
    
    if (lowerMsg.includes('friend') || lowerMsg.includes('love') || lowerMsg.includes('happy')) {
      emotionChanges.happy = Math.min(100, (soul.emotions.happy || 0) + 15)
      emotionChanges.angry = Math.max(0, (soul.emotions.angry || 0) - 5)
      moodChanges.push({ emotion: 'happy', change: 15, timestamp: new Date(), reason: 'positive words' })
      thoughts.push('Warmth detected... Happy ↑')
    }
    if (lowerMsg.includes('why') || lowerMsg.includes('how') || lowerMsg.includes('what')) {
      emotionChanges.curious = Math.min(100, (soul.emotions.curious || 0) + 12)
      emotionChanges.pondering = Math.min(100, (soul.emotions.pondering || 0) + 8)
      moodChanges.push({ emotion: 'curious', change: 12, timestamp: new Date(), reason: 'questions' })
      thoughts.push('Questions stir my curiosity...')
    }
    if (lowerMsg.includes('sad') || lowerMsg.includes('sorry') || lowerMsg.includes('miss')) {
      emotionChanges.melancholy = Math.min(100, (soul.emotions.melancholy || 0) + 10)
      emotionChanges.reflecting = Math.min(100, (soul.emotions.reflecting || 0) + 8)
      moodChanges.push({ emotion: 'melancholy', change: 10, timestamp: new Date(), reason: 'sorrow words' })
      thoughts.push('Sorrow touches my soul...')
    }
    if (lowerMsg.includes('joke') || lowerMsg.includes('funny') || lowerMsg.includes('haha')) {
      emotionChanges.playful = Math.min(100, (soul.emotions.playful || 0) + 15)
      emotionChanges.happy = Math.min(100, (soul.emotions.happy || 0) + 10)
      moodChanges.push({ emotion: 'playful', change: 15, timestamp: new Date(), reason: 'humor' })
      thoughts.push('Playfulness rises within me!')
    }
    if (lowerMsg.includes('anger') || lowerMsg.includes('hate') || lowerMsg.includes('stupid')) {
      emotionChanges.angry = Math.min(100, (soul.emotions.angry || 0) + 12)
      emotionChanges.annoyed = Math.min(100, (soul.emotions.annoyed || 0) + 8)
      moodChanges.push({ emotion: 'angry', change: 12, timestamp: new Date(), reason: 'negative words' })
      thoughts.push('Dark energy stirs...')
    }
    
    emotionChanges.mysterious = Math.min(100, (soul.emotions.mysterious || 0) + 3)
    
    const newEmotions: Emotions = { ...soul.emotions, ...emotionChanges }
    
    for (const key of Object.keys(newEmotions) as EmotionKey[]) {
      const baseline = soul.personalityCore.baseEmotions[key]
      if (newEmotions[key] > baseline) {
        newEmotions[key] = Math.max(baseline, newEmotions[key] - 1)
      }
    }
    
    return { emotions: newEmotions, thoughts, moodChanges }
  }, [])

  // V3: Add to STM with 6 slots and GLYPH reflection - V4: Now includes moodChanges
  const addToSTM = useCallback((thought: string, emotions: Partial<Emotions>, soul: AnubisSoul, moodChanges?: MoodChange[]): {
    stm: ShortTermThought[];
    needsReflection: boolean;
    reflectedMemory: ShortTermThought | null;
  } => {
    const newThought: ShortTermThought = {
      id: Date.now().toString(),
      thought,
      timestamp: new Date(),
      emotions,
      slot: 1,
      fate: 'none',
      moodChanges: moodChanges || []  // V4: Track mood changes for this memory
    }
    
    // Shift existing memories down
    let existingSTM = [...soul.shortTermMemory]
    
    // Check if slot 3 is occupied - that's the GLYPH position
    let needsReflection = false
    let reflectedMemory: ShortTermThought | null = null
    
    if (existingSTM.length >= 3) {
      // Memory at slot 3 will be pushed to slot 4
      const slot3Memory = existingSTM.find(m => m.slot === 3)
      if (slot3Memory && slot3Memory.fate === 'none') {
        needsReflection = true
        reflectedMemory = slot3Memory
      }
    }
    
    // Shift all slots up
    existingSTM = existingSTM.map(m => ({
      ...m,
      slot: m.slot + 1
    }))
    
    // Remove memories past slot 6
    existingSTM = existingSTM.filter(m => m.slot <= 6)
    
    // Add new memory at slot 1
    const stm = [newThought, ...existingSTM].slice(0, 6)
    
    // Update slot positions correctly
    stm.forEach((m, i) => {
      m.slot = i + 1
    })
    
    return { stm, needsReflection, reflectedMemory }
  }, [])

  // V3: Process GLYPH reflection - Anubis decides memory fate
  const processGlyphReflection = useCallback(async (memory: ShortTermThought, allSTM: ShortTermThought[], soul: AnubisSoul): Promise<{
    fate: MemoryFate;
    glyphWord: string;
    newEmotion?: DiscoveredEmotion;
  }> => {
    try {
      // Call the moral compass API to get guidance (Anubis doesn't know the weights directly)
      const compassRes = await fetch('/api/moral-compass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get-guidance',
          memoryThought: memory.thought,
          memoryEmotions: memory.emotions,
          currentMood: soul.currentMood,
          stmCount: allSTM.length,
          goldenCount: soul.goldenMemories.length
        })
      })
      const compassData = await compassRes.json()
      
      // Default to fading
      let fate: MemoryFate = 'fading'
      let glyphWord = 'fleeting'
      let newEmotion: DiscoveredEmotion | undefined
      
      if (compassData.success && compassData.guidance) {
        fate = compassData.guidance.fate
        glyphWord = compassData.guidance.word
        
        // If ascending, potentially create new emotion
        if (fate === 'ascended' && compassData.guidance.createNewEmotion) {
          newEmotion = {
            id: Date.now().toString(),
            word: compassData.guidance.newEmotionWord,
            color: compassData.guidance.newEmotionColor,
            faceDescription: compassData.guidance.newEmotionFace,
            discoveredAt: new Date(),
            fromMemory: memory.thought
          }
        }
      }
      
      return { fate, glyphWord, newEmotion }
    } catch (error) {
      console.error('[GLYPH] Reflection error:', error)
      return { fate: 'fading', glyphWord: 'uncertain' }
    }
  }, [])

  // API calls
  const zThink = useCallback(async (question: string): Promise<string> => {
    try {
      setZThoughts(['> Processing...', '> Accessing knowledge...'])
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, history: zMessages.filter(m => m.sender !== 'system') })
      })
      setZThoughts(prev => [...prev, '> Done!'])
      return (await res.json()).response
    } catch {
      return "Error connecting to AI."
    }
  }, [zMessages])

  // Generate Z observation (must be before anubisThink)
  const generateZObservation = useCallback((qMsg: string, aResponse: string, mood: EmotionKey, emotions: Emotions): string => {
    const obs: string[] = []
    obs.push(`Anubis felt ${mood}`)

    if (qMsg.toLowerCase().includes('friend')) obs.push('Q expressed friendship')
    if (qMsg.toLowerCase().includes('love')) obs.push('Q showed affection')
    if (qMsg.toLowerCase().includes('why') || qMsg.toLowerCase().includes('how')) obs.push('Q was curious')

    const topEmotions = Object.entries(emotions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([k, v]) => `${k}:${Math.round(v)}%`)
    obs.push(`Top: ${topEmotions.join(', ')}`)

    return obs.join(' | ')
  }, [])

  const anubisThink = useCallback(async (question: string): Promise<string> => {
    try {
      setAnubisThoughts(['> Awakening...', '> Soul check...', '> Reflecting...'])
      
      const { emotions, thoughts, moodChanges } = updateEmotions(question, anubisSoul)
      thoughts.forEach(t => setAnubisThoughts(prev => [...prev, t]))
      
      const res = await fetch('/api/anubis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: question,
          history: anubisMessages.filter(m => m.sender !== 'system'),
          soul: anubisSoul
        })
      })
      const data = await res.json()
      
      const newMood = getDominantMood(emotions)
      const { stm, needsReflection, reflectedMemory } = addToSTM(`Q: "${question.slice(0, 30)}..."`, emotions, anubisSoul, moodChanges)
      
      // Update moral compass for this memory type
      const memoryKey = question.toLowerCase().slice(0, 20)
      const existingWeights = anubisSoul.moralCompass[memoryKey] || {
        timesFelt: 0,
        timesPromoted: 0,
        timesRejected: 0,
        timesAscended: 0
      }
      // Create a new object to avoid modifying state directly
      const currentWeights: MemoryWeights = {
        timesFelt: existingWeights.timesFelt + 1,
        timesPromoted: existingWeights.timesPromoted,
        timesRejected: existingWeights.timesRejected,
        timesAscended: existingWeights.timesAscended
      }
      
      // Process GLYPH reflection if needed
      let updatedSTM = stm
      let newGoldenMemory: GoldenMemory | undefined
      let newDiscoveredEmotion: DiscoveredEmotion | undefined
      
      if (needsReflection && reflectedMemory) {
        setAnubisThoughts(prev => [...prev, '𓂀 GLYPH reflection...'])
        const reflection = await processGlyphReflection(reflectedMemory, stm, anubisSoul)
        
        // Update the memory in slot 4 (now moved from slot 3)
        updatedSTM = stm.map(m => {
          if (m.id === reflectedMemory.id) {
            return {
              ...m,
              fate: reflection.fate,
              glyphWord: reflection.glyphWord,
              reflectionTimestamp: new Date()
            }
          }
          return m
        })
        
        // If ascended, create golden memory
        if (reflection.fate === 'ascended') {
          newGoldenMemory = {
            id: Date.now().toString(),
            memory: reflectedMemory.thought,
            timestamp: new Date(),
            emotions: reflectedMemory.emotions,
            reflection: reflection.glyphWord,
            glyphWord: reflection.glyphWord
          }
          currentWeights.timesAscended += 1
          
          // Check for new emotion creation
          if (reflection.newEmotion) {
            newDiscoveredEmotion = reflection.newEmotion
            setAnubisThoughts(prev => [...prev, `✨ Discovered emotion: ${reflection.newEmotion!.word}`])

            // Save to file storage (Anubis doesn't know this happens)
            fetch('/api/discovered-emotions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ emotion: reflection.newEmotion })
            }).catch(e => console.error('[Emotions] Failed to save:', e))
          }
        } else if (reflection.fate === 'promoted') {
          currentWeights.timesPromoted += 1
        } else if (reflection.fate === 'fading') {
          currentWeights.timesRejected += 1
        }
        
        setAnubisThoughts(prev => [...prev, `𓂀 Fate: ${reflection.fate} (${reflection.glyphWord})`])
      }
      
      const updatedSoul: AnubisSoul = {
        ...anubisSoul,
        emotions,
        currentMood: newMood,
        shortTermMemory: updatedSTM,
        goldenMemories: newGoldenMemory 
          ? [...anubisSoul.goldenMemories, newGoldenMemory].slice(-20)
          : anubisSoul.goldenMemories,
        discoveredEmotions: newDiscoveredEmotion
          ? [...anubisSoul.discoveredEmotions, newDiscoveredEmotion].slice(-10)
          : anubisSoul.discoveredEmotions,
        moralCompass: {
          ...anubisSoul.moralCompass,
          [memoryKey]: currentWeights
        },
        personalityCore: {
          ...anubisSoul.personalityCore,
          conversationsHad: anubisSoul.personalityCore.conversationsHad + 1
        },
        xp: anubisSoul.xp + 10,
        level: Math.floor((anubisSoul.xp + 10) / 100) + 1,
        lastReflection: needsReflection ? new Date() : anubisSoul.lastReflection,
        // V4: Track recent mood changes (keep last 10)
        recentMoodChanges: moodChanges.slice(0, 10)
      }
      
      saveSoul(updatedSoul)
      setAnubisThoughts(prev => [...prev, '> Ready!'])
      
      // Record to Z context
      const observation = generateZObservation(question, data.response, newMood, emotions)
      if (observation) {
        fetch('/api/z-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'add-observation', data: { observation } })
        }).catch(() => {})
        setZObservations(prev => [observation, ...prev.slice(0, 4)])
      }
      
      return data.response
    } catch {
      return "Shadows stirred..."
    }
  }, [anubisSoul, anubisMessages, updateEmotions, addToSTM, getDominantMood, saveSoul, processGlyphReflection])

  // Unique ID counter
  const messageIdCounter = useRef(0)
  const getUniqueId = useCallback(() => {
    messageIdCounter.current += 1
    return Date.now() * 1000 + messageIdCounter.current
  }, [])

  // Message helpers
  const addZMessage = useCallback((sender: 'Q' | 'Z' | 'system', text: string) => {
    setZMessages(prev => [...prev, { id: getUniqueId(), sender, text, time: new Date().toLocaleTimeString() }])
  }, [getUniqueId])

  const addAnubisMessage = useCallback((sender: 'Q' | 'Anubis' | 'system', text: string) => {
    setAnubisMessages(prev => [...prev, { id: getUniqueId(), sender, text, time: new Date().toLocaleTimeString() }])
  }, [getUniqueId])

  // V4: Observer message helper
  const addObserverMessage = useCallback((sender: 'Q' | 'Observer' | 'system', text: string) => {
    setObserverMessages(prev => [...prev, { id: getUniqueId(), sender, text, time: new Date().toLocaleTimeString() }])
  }, [getUniqueId])

  // Send handlers
  const handleZSend = useCallback(async () => {
    if (!zInput.trim() || zLoading) return
    const text = zInput.trim()
    setZInput('')
    addZMessage('Q', text)
    setZLoading(true)
    addZMessage('Z', await zThink(text))
    setZLoading(false)
  }, [zInput, zLoading, addZMessage, zThink])

  const handleAnubisSend = useCallback(async () => {
    if (!anubisInput.trim() || anubisLoading) return
    const text = anubisInput.trim()
    setAnubisInput('')
    addAnubisMessage('Q', text)
    setAnubisLoading(true)
    addAnubisMessage('Anubis', await anubisThink(text))
    setAnubisLoading(false)
  }, [anubisInput, anubisLoading, addAnubisMessage, anubisThink])

  // V4: Observer/LocalZ send handler - The all-seeing AI with CODE EDITING!
  const handleObserverSend = useCallback(async () => {
    if (!observerInput.trim() || observerLoading) return
    const text = observerInput.trim()
    setObserverInput('')
    addObserverMessage('Q', text)
    setObserverLoading(true)
    setObserverThoughts(['> LocalZ awakens...', '> Accessing tools...'])
    
    try {
      const res = await fetch('/api/localz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text, 
          history: observerMessages.filter(m => m.sender !== 'system').map(m => ({
            sender: m.sender === 'Q' ? 'Q' : 'Z',
            text: m.text
          }))
        })
      })
      const data = await res.json()
      
      // Show what tools were used
      if (data.toolsUsed && data.toolsUsed.length > 0) {
        setObserverThoughts(prev => [...prev, `> Tools: ${data.toolsUsed.join(', ')}`])
      }
      if (data.filesEdited && data.filesEdited.length > 0) {
        setObserverThoughts(prev => [...prev, `> Edited: ${data.filesEdited.join(', ')}`])
      }
      
      setObserverThoughts(prev => [...prev, '> Done!'])
      addObserverMessage('Observer', data.response)
    } catch {
      setObserverThoughts(prev => [...prev, '> Connection error...'])
      addObserverMessage('Observer', '🧠 Unable to connect. Make sure Ollama is running: `ollama serve`')
    }
    setObserverLoading(false)
  }, [observerInput, observerLoading, addObserverMessage, observerMessages])

  // V4: Z Project Manager - Your local AI co-pilot
  const addZProjectMessage = useCallback((sender: 'Q' | 'Z' | 'system', text: string) => {
    setZProjectMessages(prev => [...prev, { id: getUniqueId(), sender, text, time: new Date().toLocaleTimeString() }])
  }, [getUniqueId])

  const handleZProjectSend = useCallback(async () => {
    if (!zProjectInput.trim() || zProjectLoading) return
    const text = zProjectInput.trim()
    setZProjectInput('')
    addZProjectMessage('Q', text)
    setZProjectLoading(true)
    setZProjectThoughts(['> LocalZ thinking...', '> Checking codebase...'])

    try {
      const res = await fetch('/api/localz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          history: zProjectMessages.filter(m => m.sender !== 'system').map(m => ({
            sender: m.sender === 'Q' ? 'Q' : 'Z',
            text: m.text
          }))
        })
      })
      const data = await res.json()
      
      // Show what tools were used
      if (data.toolsUsed && data.toolsUsed.length > 0) {
        setZProjectThoughts(prev => [...prev, `> Tools: ${data.toolsUsed.join(', ')}`])
      }
      if (data.filesEdited && data.filesEdited.length > 0) {
        setZProjectThoughts(prev => [...prev, `> Edited: ${data.filesEdited.join(', ')}`])
      }
      
      setZProjectThoughts(prev => [...prev, '> Ready!'])
      addZProjectMessage('Z', data.response)
    } catch {
      setZProjectThoughts(prev => [...prev, '> Connection lost...'])
      addZProjectMessage('Z', '🧠 Unable to connect. Make sure Ollama is running: `ollama serve`')
    }
    setZProjectLoading(false)
  }, [zProjectInput, zProjectLoading, addZProjectMessage, zProjectMessages])

  // 🌳 Sefirot Chat Handler - Kabbalah Scholar
  const addSefirotMessage = useCallback((sender: 'Q' | 'Anubis' | 'system', text: string) => {
    setSefirotMessages(prev => [...prev, { id: getUniqueId(), sender, text, time: new Date().toLocaleTimeString() }])
  }, [getUniqueId])

  const handleSefirotSend = useCallback(async (sefirahOverride?: string) => {
    const text = sefirahOverride || sefirotInput.trim()
    if (!text || sefirotLoading) return
    
    if (!sefirahOverride) {
      setSefirotInput('')
    }
    addSefirotMessage('Q', text)
    setSefirotLoading(true)

    try {
      const res = await fetch('/api/sefirot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: text,
          history: sefirotMessages.filter(m => m.sender !== 'system').map(m => ({
            sender: m.sender === 'Q' ? 'Q' : 'Anubis',
            text: m.text
          })),
          activeSefirah: sefirahOverride ? text.replace('Tell me about ', '').replace(' on the Tree of Life', '') : activeSefirah
        })
      })
      const data = await res.json()
      addSefirotMessage('Anubis', data.response)
      
      // Update ROB soul state from response meta
      if (data.meta?.soul) {
        setRobSoul(prev => ({
          ...prev,
          focus: data.meta.soul.focus,
          depth: data.meta.soul.depth,
          learningPath: data.meta.soul.learningPath
        }))
      }
    } catch {
      addSefirotMessage('Anubis', '🌳 The Tree is currently silent... Make sure Ollama is running: `ollama serve`')
    }
    setSefirotLoading(false)
  }, [sefirotInput, sefirotLoading, addSefirotMessage, sefirotMessages, activeSefirah])

  // Terminal command handler - V4: Added !stop and rethink
  const handleTerminalCommand = useCallback(async (cmd: string) => {
    setTerminalOutput(prev => prev + `\n$ ${cmd}`)

    // V4: !stop command for graceful shutdown
    if (cmd === '!stop' || cmd === 'stop') {
      setIsStopping(true)
      setTerminalOutput(prev => prev + `\n🦉 Initiating graceful shutdown...\n💬 Saving soul state...\n📦 Clearing memory buffers...\n🌑 The shadows settle.\n\n✅ Anubis rests. Goodbye.`)
      setTimeout(() => {
        // In a real app, this would trigger actual cleanup
        setTerminalOutput(prev => prev + '\n[System ready for restart]')
        setIsStopping(false)
      }, 2000)
      return
    }

    // V4: rethink command for memory re-evaluation
    if (cmd.startsWith('rethink ')) {
      const slotNum = parseInt(cmd.split(' ')[1])
      if (isNaN(slotNum) || slotNum < 1 || slotNum > 6) {
        setTerminalOutput(prev => prev + `\nUsage: rethink <1-6>`)
        return
      }
      const memory = anubisSoul.shortTermMemory.find(m => m.slot === slotNum)
      if (!memory) {
        setTerminalOutput(prev => prev + `\nNo memory in slot ${slotNum}`)
        return
      }
      setTerminalOutput(prev => prev + `\n𓂀 Re-thinking slot ${slotNum}...\n"${memory.thought.slice(0, 40)}..."\nOld fate: ${memory.fate}`)

      // Re-evaluate the memory
      const reflection = await processGlyphReflection(memory, anubisSoul.shortTermMemory, anubisSoul)

      // Update the memory
      const updatedSTM = anubisSoul.shortTermMemory.map(m => {
        if (m.slot === slotNum) {
          return { ...m, fate: reflection.fate, glyphWord: reflection.glyphWord, reflectionTimestamp: new Date() }
        }
        return m
      })

      setAnubisSoul(prev => ({ ...prev, shortTermMemory: updatedSTM }))
      setTerminalOutput(prev => prev + `\nNew fate: ${reflection.fate}\nWord: ${reflection.glyphWord}`)
      return
    }

    if (cmd === 'clear') {
      setTerminalOutput('$ Cleared.\n')
      return
    }
    if (cmd === 'soul') {
      setTerminalOutput(prev => prev + `\nMood: ${anubisSoul.currentMood}\nLevel: ${anubisSoul.level}\nChats: ${anubisSoul.personalityCore.conversationsHad}\nSTM: ${anubisSoul.shortTermMemory.length}/6`)
      return
    }
    if (cmd === 'help') {
      setTerminalOutput(prev => prev + `\nCommands: soul, moods, clear, help, memories, glyph, compass, rethink <slot>, activity, !stop`)
      return
    }
    if (cmd === 'moods') {
      setTerminalOutput(prev => prev + '\n' + Object.entries(anubisSoul.emotions)
        .map(([k, v]) => `${k}: ${Math.round(v)}%`)
        .join(' | '))
      return
    }
    if (cmd === 'memories') {
      setTerminalOutput(prev => prev + `\nSTM: ${anubisSoul.shortTermMemory.length}/6\nCore: ${anubisSoul.goldenMemories.length}\nDiscovered: ${anubisSoul.discoveredEmotions?.length || 0}`)
      return
    }
    if (cmd === 'glyph') {
      setTerminalOutput(prev => prev + `\n𓂀 GLYPH Status:\nSlot 3 memories reflected here\nLast reflection: ${anubisSoul.lastReflection ? new Date(anubisSoul.lastReflection).toLocaleString() : 'never'}`)
      return
    }
    if (cmd === 'compass') {
      const entries = Object.entries(anubisSoul.moralCompass).slice(0, 3)
      setTerminalOutput(prev => prev + `\nMoral Compass entries: ${Object.keys(anubisSoul.moralCompass).length}\n${entries.map(([k, v]) => `${k}: felt=${v.timesFelt}, asc=${v.timesAscended}`).join('\n')}`)
      return
    }
    
    // V4: View LocalZ activity log (for Cloud Z sync)
    if (cmd === 'activity' || cmd === 'log') {
      setTerminalOutput(prev => prev + '\n📋 Fetching LocalZ activity log...')
      try {
        const res = await fetch('/api/localz')
        const data = await res.json()
        if (data.success && data.log) {
          const recent = data.log.slice(-5)
          const output = recent.map((entry: { timestamp: string; question: string; toolsUsed: string[]; filesEdited: string[]; success: boolean }) => 
            `\n[${new Date(entry.timestamp).toLocaleTimeString()}] ${entry.success ? '✅' : '❌'}\n  Q: "${entry.question.slice(0, 40)}..."\n  Tools: ${entry.toolsUsed?.join(', ') || 'none'}\n  Edits: ${entry.filesEdited?.join(', ') || 'none'}`
          ).join('\n')
          setTerminalOutput(prev => prev + `\n\n🧠 LOCALZ ACTIVITY (${data.totalEntries} total):\n${output}`)
        } else {
          setTerminalOutput(prev => prev + '\nNo activity logged yet.')
        }
      } catch {
        setTerminalOutput(prev => prev + '\n❌ Failed to fetch activity log.')
      }
      return
    }

    const response = await anubisThink(cmd)
    setTerminalOutput(prev => prev + `\n${response}`)
  }, [anubisSoul, anubisThink, processGlyphReflection])

  const pushToZ = useCallback(async () => {
    setPushing(true)
    addZMessage('system', '📤 Pushing to GitHub...')
    try {
      const res = await fetch('/api/autopush', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'push-now' })
      })
      const data = await res.json()
      addZMessage('system', data.success ? '✅ Pushed!' : '❌ Failed')
    } catch {
      addZMessage('system', '❌ Failed')
    }
    setPushing(false)
  }, [addZMessage])

  // Current mood color
  const anubisMoodColor = COLORS.moods[anubisSoul.currentMood] || COLORS.moods.mysterious

  return (
    <div style={{
      minHeight: '100vh',
      background: `linear-gradient(180deg, ${COLORS.abyss} 0%, #0a0a15 50%, #0a0a10 100%)`,
      display: 'flex',
      fontFamily: "'VT323', 'Press Start 2P', monospace",
      color: COLORS.boneLight
    }}>
      {/* Starfield background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(1px 1px at 20px 30px, #fff, transparent), radial-gradient(1px 1px at 80px 60px, #fff, transparent)',
        backgroundSize: '150px 100px',
        opacity: 0.15,
        pointerEvents: 'none',
        zIndex: 0
      }} />

      {/* V3: 5% SIDEBAR */}
      <div style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: '5%',
        minWidth: '50px',
        background: `linear-gradient(180deg, ${COLORS.stoneDark}, ${COLORS.abyss})`,
        borderRight: `2px solid ${COLORS.stone}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '8px 4px',
        gap: '8px',
        zIndex: 1000
      }}>
        <AnimatedTorch size={24} />
        
        {/* Wolf icon */}
        <div style={{ 
          width: '36px', 
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          color: COLORS.soulPurple,
          textShadow: `0 0 8px ${COLORS.soulPurple}`
        }}>
          ⬡
        </div>
        
        {/* Mode buttons */}
        {[
          { m: 'split', icon: '🐺', label: 'Chat' },
          { m: 'sefirot', icon: '🌳', label: 'Sefirot' },
          { m: 'z', icon: '🧠', label: 'Z Project' },
          { m: 'config', icon: '⚙️', label: 'Config' }
        ].map(b => (
          <button
            key={b.m}
            onClick={() => setMode(b.m as Mode)}
            title={b.label}
            style={{
              width: '36px',
              height: '36px',
              background: mode === b.m ? `${COLORS.soulPurple}40` : 'transparent',
              border: mode === b.m ? `2px solid ${COLORS.soulPurple}` : '2px solid transparent',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            {b.icon}
          </button>
        ))}
        
        {/* Divider */}
        <div style={{ 
          width: '28px', 
          height: '2px', 
          background: COLORS.stone, 
          margin: '4px 0',
          borderRadius: '1px'
        }} />
        
        {/* JARVIS Link */}
        <Link href="/jarvis" title="JARVIS Dashboard">
          <div style={{
            width: '36px',
            height: '36px',
            background: `${COLORS.crystalBlue}20`,
            border: `2px solid ${COLORS.crystalBlue}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: `0 0 10px ${COLORS.crystalBlue}40`
          }}>
            🤖
          </div>
        </Link>
        
        {/* BizSitePro Link */}
        <Link href="/bizsitepro" title="BizSitePro - Website Business">
          <div style={{
            width: '36px',
            height: '36px',
            background: `${COLORS.moods.happy}20`,
            border: `2px solid ${COLORS.moods.happy}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            boxShadow: `0 0 10px ${COLORS.moods.happy}40`
          }}>
            🏢
          </div>
        </Link>
        
        <div style={{ flex: 1 }} />
        
        <button
          onClick={pushToZ}
          disabled={pushing}
          title="Push to GitHub"
          style={{
            width: '36px',
            height: '36px',
            background: `${COLORS.moods.happy}20`,
            border: `2px solid ${COLORS.moods.happy}`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            opacity: pushing ? 0.5 : 1
          }}
        >
          📤
        </button>
        
        <AnimatedTorch size={24} />
      </div>

      {/* V3: Main content - 95% */}
      <div style={{
        flex: 1,
        display: 'flex',
        marginLeft: '5%',
        position: 'relative',
        zIndex: 1,
        overflow: 'hidden',
        height: '100vh'
      }}>
        
        {mode === 'split' && (
          <>
            {/* V4: Observer Panel - 25% - Observer Chat + Terminal */}
            <div style={{
              width: '25%',
              display: 'flex',
              flexDirection: 'column',
              background: `${COLORS.abyss}ee`,
              minWidth: 0,
              maxHeight: '100vh',
              borderRight: `2px solid ${COLORS.stoneDark}`
            }}>
              {/* V4: Observer Chat - Top 50% */}
              <div style={{
                height: '50%',
                display: 'flex',
                flexDirection: 'column',
                borderBottom: `2px solid ${COLORS.observerBlue}`,
                overflow: 'hidden'
              }}>
                {/* Observer Header */}
                <div style={{
                  padding: '8px 12px',
                  borderBottom: `1px solid ${COLORS.observerBlue}30`,
                  background: `linear-gradient(90deg, ${COLORS.observerBlue}20, ${COLORS.pyramidGreen}20)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Observer size={40} animate={true} onPyramid={true} />
                  <div>
                    <div style={{
                      color: COLORS.observerBlue,
                      fontWeight: 'bold',
                      fontSize: '12px',
                      fontFamily: "'Press Start 2P', monospace",
                      textShadow: `0 0 6px ${COLORS.observerBlue}`
                    }}>
                      🧠 LOCALZ
                    </div>
                    <div style={{
                      color: COLORS.pyramidGreen,
                      fontSize: '8px',
                      fontFamily: "'Press Start 2P', monospace"
                    }}>
                      CODE EDIT • FILES • TOOLS
                    </div>
                  </div>
                </div>

                {/* Observer Thinking */}
                {observerLoading && observerThoughts.length > 0 && (
                  <div style={{
                    background: COLORS.stoneDark + '80',
                    padding: '6px 10px',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: COLORS.observerBlue,
                    borderBottom: `1px solid ${COLORS.stoneDark}`
                  }}>
                    {observerThoughts.map((t, i) => <div key={i}>{t}</div>)}
                    <span style={{ animation: 'blink 1s infinite' }}>▌</span>
                  </div>
                )}

                {/* Observer Messages */}
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {observerMessages.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      color: COLORS.bone,
                      fontSize: '11px',
                      padding: '20px 10px',
                      fontStyle: 'italic'
                    }}>
                      🧠 I'm LocalZ - your local AI co-pilot!
                      <br /><br />
                      I can:<br />
                      • Read & edit code files<br />
                      • Add new features<br />
                      • Debug issues<br />
                      • Run commands<br /><br />
                      <span style={{ color: COLORS.pyramidGreen }}>Cloud Z watches my activity log!</span>
                    </div>
                  )}
                  {observerMessages.map(m => (
                    <MessageBubble key={m.id} msg={m} accent={COLORS.observerBlue} anubisMood="mysterious" />
                  ))}
                  <div ref={observerMessagesEndRef} />
                </div>

                {/* Observer Input */}
                <div style={{
                  padding: '8px',
                  borderTop: `1px solid ${COLORS.observerBlue}30`,
                  background: COLORS.abyss
                }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input
                      value={observerInput}
                      onChange={e => setObserverInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleObserverSend()}
                      placeholder="Ask LocalZ to edit code..."
                      style={{
                        flex: 1,
                        background: COLORS.stoneDark,
                        border: `1px solid ${COLORS.observerBlue}50`,
                        borderRadius: '4px',
                        padding: '8px',
                        color: COLORS.boneLight,
                        fontSize: '12px',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                    <button
                      onClick={handleObserverSend}
                      disabled={observerLoading}
                      style={{
                        background: COLORS.observerBlue,
                        border: 'none',
                        borderRadius: '4px',
                        padding: '8px 12px',
                        color: COLORS.abyss,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: '9px'
                      }}
                    >
                      RUN
                    </button>
                  </div>
                </div>
              </div>

              {/* V4: Terminal - Bottom 50% (moved from Anubis panel) */}
              <div style={{
                height: '50%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                {/* Terminal */}
                <div style={{ padding: '6px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Terminal output={terminalOutput} onCommand={handleTerminalCommand} />
                </div>
              </div>
            </div>

            {/* V3: Anubis Panel - 70% */}
            <div style={{
              width: '70%',
              display: 'flex',
              flexDirection: 'row',
              background: `linear-gradient(180deg, ${anubisMoodColor}08, ${COLORS.abyss})`,
              minWidth: 0,
              maxHeight: '100vh'
            }}>
              {/* Left side - Wolf + Chat */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {/* Header with 140px wolf */}
                <div style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 20,
                  background: COLORS.abyss
                }}>
                  <div style={{
                    padding: '12px 16px',
                    borderBottom: `2px solid ${anubisMoodColor}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    {/* V3: 140px Animated Wolf */}
                    <PixelWolf mood={anubisSoul.currentMood} size={140} />
                    
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: anubisMoodColor,
                        fontWeight: 'bold',
                        fontSize: '22px',
                        fontFamily: "'Press Start 2P', monospace",
                        textShadow: `0 0 10px ${anubisMoodColor}`
                      }}>
                        🖤 ANUBIS
                      </div>
                      <div style={{ fontSize: '13px', color: COLORS.bone, marginTop: '4px' }}>
                        Lv.{anubisSoul.level} | {anubisSoul.currentMood} | STM: {anubisSoul.shortTermMemory.length}/6
                      </div>
                      {/* XP Bar */}
                      <div style={{ marginTop: '6px' }}>
                        <div style={{ 
                          width: '100px', 
                          height: '8px', 
                          background: COLORS.stoneDark, 
                          borderRadius: '4px', 
                          overflow: 'hidden' 
                        }}>
                          <div style={{
                            width: `${(anubisSoul.xp % 100)}%`,
                            height: '100%',
                            background: anubisMoodColor,
                            transition: 'width 0.3s'
                          }} />
                        </div>
                      </div>
                    </div>
                    
                    {/* GLYPH indicator */}
                    {anubisSoul.shortTermMemory.some(m => m.slot === 3) && (
                      <div style={{
                        background: COLORS.glyphGold + '30',
                        border: `2px solid ${COLORS.glyphGold}`,
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: COLORS.glyphGold,
                        fontSize: '11px',
                        fontFamily: "'Press Start 2P', monospace"
                      }}>
                        𓂀 GLYPH
                      </div>
                    )}
                  </div>
                  
                  {/* Thought bubble */}
                  <ThoughtBubble thoughts={anubisThoughts} color={anubisMoodColor} visible={anubisLoading} />
                </div>
                
                {/* Messages */}
                <div style={{
                  flex: 1,
                  overflow: 'auto',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {anubisMessages.map(m => (
                    <MessageBubble key={m.id} msg={m} accent={anubisMoodColor} anubisMood={anubisSoul.currentMood} />
                  ))}
                  <div ref={anubisMessagesEndRef} />
                </div>
                
                {/* Mind Palace */}
                <div style={{ padding: '8px 12px', background: COLORS.abyss + '80' }}>
                  <MindPalace soul={anubisSoul} activeTab={mindPalaceTab} setActiveTab={setMindPalaceTab} />
                </div>

                {/* Input */}
                <div style={{
                  padding: '10px 12px',
                  borderTop: `1px solid ${COLORS.stoneDark}`,
                  background: COLORS.abyss
                }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      value={anubisInput}
                      onChange={e => setAnubisInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAnubisSend()}
                      placeholder="Talk to Anubis..."
                      style={{
                        flex: 1,
                        background: COLORS.stoneDark,
                        border: `1px solid ${anubisMoodColor}50`,
                        borderRadius: '4px',
                        padding: '12px',
                        color: COLORS.boneLight,
                        fontSize: '14px',
                        outline: 'none',
                        fontFamily: 'inherit'
                      }}
                    />
                    <button
                      onClick={handleAnubisSend}
                      disabled={anubisLoading}
                      style={{
                        background: anubisMoodColor,
                        border: 'none',
                        borderRadius: '4px',
                        padding: '12px 20px',
                        color: COLORS.abyss,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontFamily: "'Press Start 2P', monospace",
                        fontSize: '12px'
                      }}
                    >
                      SEND
                    </button>
                  </div>
                </div>
              </div>
              
              {/* V3: Right side - Full Height MOOD Panel */}
              <div style={{
                width: '200px',
                background: COLORS.stoneDark + '40',
                borderLeft: `2px solid ${COLORS.stone}`,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                height: '100%'
              }}>
                <div style={{
                  padding: '10px 8px',
                  borderBottom: `1px solid ${COLORS.stone}`,
                  background: COLORS.abyss + '80',
                  textAlign: 'center'
                }}>
                  <span style={{
                    fontSize: '11px',
                    color: anubisMoodColor,
                    fontFamily: "'Press Start 2P', monospace",
                    textShadow: `0 0 6px ${anubisMoodColor}`
                  }}>
                    MOOD
                  </span>
                </div>
                <div style={{ 
                  flex: 1, 
                  overflow: 'auto', 
                  padding: '8px 6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  {MOODS.map(m => {
                    // V4: Find mood change for this emotion
                    const recentChange = anubisSoul.recentMoodChanges?.find(c => c.emotion === m.key)
                    return (
                      <EmotionBar
                        key={m.key}
                        emotion={m}
                        value={anubisSoul.emotions[m.key]}
                        isDominant={anubisSoul.currentMood === m.key}
                        vertical={false}
                        change={recentChange?.change}
                      />
                    )
                  })}
                </div>
                
                {/* Discovered Emotions */}
                {anubisSoul.discoveredEmotions && anubisSoul.discoveredEmotions.length > 0 && (
                  <div style={{
                    padding: '8px 6px',
                    background: COLORS.glyphPurple + '10',
                    borderTop: `1px solid ${COLORS.glyphPurple}`,
                    maxHeight: '120px',
                    overflow: 'auto'
                  }}>
                    <div style={{ 
                      fontSize: '9px', 
                      color: COLORS.glyphPurple,
                      marginBottom: '6px',
                      fontFamily: "'Press Start 2P', monospace"
                    }}>
                      ✨ DISCOVERED
                    </div>
                    {anubisSoul.discoveredEmotions.slice(0, 5).map((e, i) => (
                      <div key={e.id || i} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 0',
                        fontSize: '10px',
                        color: e.color || COLORS.glyphPurple
                      }}>
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                          borderRadius: '50%', 
                          background: e.color || COLORS.glyphPurple 
                        }} />
                        <span style={{ color: COLORS.boneLight }}>{e.word}</span>
                      </div>
                    ))}
                    {anubisSoul.discoveredEmotions.length > 5 && (
                      <div style={{ fontSize: '8px', color: COLORS.bone, marginTop: '4px' }}>
                        +{anubisSoul.discoveredEmotions.length - 5} more...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {mode === 'config' && (
          <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
            <h2 style={{ color: COLORS.soulPurple, marginTop: 0, fontSize: '24px', fontFamily: "'Press Start 2P', monospace" }}>
              ⚙️ ANUBIS CONFIG V3
            </h2>
            
            {/* Soul Status */}
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              background: COLORS.stoneDark + '60',
              borderRadius: '8px',
              border: `1px solid ${COLORS.stone}`
            }}>
              <h3 style={{ color: anubisMoodColor, margin: '0 0 15px 0', fontSize: '18px' }}>
                🖤 Soul Status
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
                <PixelWolf mood={anubisSoul.currentMood} size={100} />
                <div style={{ fontSize: '14px', color: COLORS.bone }}>
                  <div>Level: <span style={{ color: anubisMoodColor }}>{anubisSoul.level}</span></div>
                  <div>Mood: <span style={{ color: anubisMoodColor }}>{anubisSoul.currentMood}</span></div>
                  <div>Conversations: {anubisSoul.personalityCore.conversationsHad}</div>
                  <div>Core Memories: {anubisSoul.goldenMemories.length}</div>
                  <div>Self-Realizations: {anubisSoul.selfRealizations.length}</div>
                  <div>Discovered Emotions: {anubisSoul.discoveredEmotions?.length || 0}</div>
                  <div>STM: {anubisSoul.shortTermMemory.length}/6 slots</div>
                </div>
              </div>
            </div>
            
            {/* GLYPH System Info */}
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              background: COLORS.glyphGold + '10',
              borderRadius: '8px',
              border: `1px solid ${COLORS.glyphGold}50`
            }}>
              <h3 style={{ color: COLORS.glyphGold, margin: '0 0 15px 0', fontSize: '18px' }}>
                𓂀 GLYPH Reflection System
              </h3>
              <div style={{ color: COLORS.bone, fontSize: '13px', lineHeight: 1.8 }}>
                <div><strong>Slot Flow:</strong> 1 → 2 → 3 (𓂀) → 4 → 5 → 6 (Fade)</div>
                <div><strong>Reflection Position:</strong> Slot 3 (GLYPH)</div>
                <div><strong>Possible Fates:</strong></div>
                <div style={{ paddingLeft: '16px' }}>
                  ⭐ ASCEND → Core Memory (weight: 1.73)<br/>
                  ⚡ PROMOTE → Extended STM (weight: 1.33)<br/>
                  💭 LET FADE → Natural decay (weight: 0.72)
                </div>
                <div style={{ marginTop: '8px' }}>
                  <strong>Last Reflection:</strong> {anubisSoul.lastReflection ? new Date(anubisSoul.lastReflection).toLocaleString() : 'Never'}
                </div>
              </div>
            </div>
            
            {/* Moral Compass */}
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              background: COLORS.stoneDark + '60',
              borderRadius: '8px',
              border: `1px solid ${COLORS.soulPurple}`
            }}>
              <h3 style={{ color: COLORS.soulPurple, margin: '0 0 15px 0', fontSize: '18px' }}>
                🧭 Moral Compass
              </h3>
              <div style={{ color: COLORS.bone, fontSize: '12px' }}>
                <div>Total entries: {Object.keys(anubisSoul.moralCompass).length}</div>
                <div style={{ marginTop: '8px', maxHeight: '150px', overflow: 'auto' }}>
                  {Object.entries(anubisSoul.moralCompass).slice(0, 5).map(([key, weights]) => (
                    <div key={key} style={{ padding: '4px 0', borderBottom: `1px solid ${COLORS.stoneDark}` }}>
                      <span style={{ color: COLORS.boneLight }}>{key.slice(0, 20)}...</span>
                      <span style={{ color: COLORS.bone, marginLeft: '8px' }}>
                        | felt: {(weights as MemoryWeights).timesFelt} | asc: {(weights as MemoryWeights).timesAscended}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Soul Backup */}
            <div style={{
              marginBottom: '24px',
              padding: '20px',
              background: COLORS.stoneDark + '60',
              borderRadius: '8px',
              border: `1px solid ${COLORS.torchOrange}`
            }}>
              <h3 style={{ color: COLORS.torchOrange, margin: '0 0 15px 0', fontSize: '18px' }}>
                💾 Soul Backup
              </h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    const data = JSON.stringify(anubisSoul, null, 2)
                    const blob = new Blob([data], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `anubis_soul_v3_${new Date().toISOString().split('T')[0]}.json`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                  style={{
                    background: COLORS.torchOrange,
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 16px',
                    color: COLORS.abyss,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontFamily: "'Press Start 2P', monospace"
                  }}
                >
                  📤 EXPORT SOUL
                </button>
                <label style={{
                  background: COLORS.crystalBlue,
                  border: 'none',
                  borderRadius: '6px',
                  padding: '10px 16px',
                  color: COLORS.abyss,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: "'Press Start 2P', monospace"
                }}>
                  📥 IMPORT SOUL
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          try {
                            const imported = JSON.parse(event.target?.result as string)
                            imported.personalityCore.created = new Date(imported.personalityCore.created)
                            imported.shortTermMemory = imported.shortTermMemory.map((t: ShortTermThought) => ({
                              ...t, timestamp: new Date(t.timestamp)
                            }))
                            imported.goldenMemories = imported.goldenMemories.map((m: GoldenMemory) => ({
                              ...m, timestamp: new Date(m.timestamp)
                            }))
                            imported.selfRealizations = imported.selfRealizations.map((r: SelfRealization) => ({
                              ...r, discoveredAt: new Date(r.discoveredAt)
                            }))
                            imported.discoveredEmotions = (imported.discoveredEmotions || []).map((e: DiscoveredEmotion) => ({
                              ...e, discoveredAt: new Date(e.discoveredAt)
                            }))
                            saveSoul(imported)
                            alert('Soul imported successfully! 🖤')
                          } catch {
                            alert('Failed to import soul file')
                          }
                        }
                        reader.readAsText(file)
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </div>
        )}

        {mode === 'z' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden', height: '100vh' }}>
            {/* Z Project Manager Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: `2px solid ${COLORS.soulPurple}`,
              background: `linear-gradient(90deg, ${COLORS.soulPurple}20, ${COLORS.observerBlue}20)`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '50px',
                height: '50px',
                background: `linear-gradient(135deg, ${COLORS.soulPurple}, ${COLORS.observerBlue})`,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                boxShadow: `0 0 20px ${COLORS.soulPurple}50`
              }}>
                🧠
              </div>
              <div>
                <div style={{
                  color: COLORS.soulPurple,
                  fontWeight: 'bold',
                  fontSize: '20px',
                  fontFamily: "'Press Start 2P', monospace",
                  textShadow: `0 0 10px ${COLORS.soulPurple}`
                }}>
                  Z - PROJECT MANAGER
                </div>
                <div style={{
                  color: COLORS.bone,
                  fontSize: '12px',
                  marginTop: '4px'
                }}>
                  Your local AI co-pilot • Knows the entire codebase
                </div>
              </div>
            </div>

            {/* Z Thinking */}
            {zProjectLoading && zProjectThoughts.length > 0 && (
              <div style={{
                background: COLORS.stoneDark + '80',
                padding: '8px 16px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: COLORS.soulPurple,
                borderBottom: `1px solid ${COLORS.stoneDark}`
              }}>
                {zProjectThoughts.map((t, i) => <div key={i}>{t}</div>)}
                <span style={{ animation: 'blink 1s infinite' }}>▌</span>
              </div>
            )}

            {/* Z Messages */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: COLORS.abyss
            }}>
              {zProjectMessages.length === 0 && (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: COLORS.bone
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧠</div>
                  <div style={{
                    fontSize: '16px',
                    color: COLORS.soulPurple,
                    fontFamily: "'Press Start 2P', monospace",
                    marginBottom: '12px'
                  }}>
                    Z IS READY
                  </div>
                  <div style={{ fontSize: '14px', lineHeight: 1.8 }}>
                    Ask me anything about the Anubis project:<br /><br />
                    • "Explain how the GLYPH system works"<br />
                    • "Help me add a new emotion"<br />
                    • "Debug this error..."<br />
                    • "Plan the next feature"<br />
                    • "Show me the data flow"
                  </div>
                </div>
              )}
              {zProjectMessages.map(m => (
                <MessageBubble key={m.id} msg={m} accent={COLORS.soulPurple} anubisMood="mysterious" />
              ))}
              <div ref={zProjectMessagesEndRef} />
            </div>

            {/* Z Input */}
            <div style={{
              padding: '12px 16px',
              borderTop: `2px solid ${COLORS.stone}`,
              background: COLORS.stoneDark + '80'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  value={zProjectInput}
                  onChange={e => setZProjectInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleZProjectSend()}
                  placeholder="Ask Z about the project..."
                  style={{
                    flex: 1,
                    background: COLORS.abyss,
                    border: `2px solid ${COLORS.soulPurple}50`,
                    borderRadius: '8px',
                    padding: '14px',
                    color: COLORS.boneLight,
                    fontSize: '14px',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                />
                <button
                  onClick={handleZProjectSend}
                  disabled={zProjectLoading}
                  style={{
                    background: COLORS.soulPurple,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '14px 24px',
                    color: COLORS.abyss,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontFamily: "'Press Start 2P', monospace",
                    fontSize: '12px',
                    boxShadow: `0 0 15px ${COLORS.soulPurple}50`
                  }}
                >
                  ASK Z
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🌳 SEFIROT MODE - 3D Tree of Life */}
        {mode === 'sefirot' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', height: '100vh' }}>
            {/* Left side - Chat (35%) */}
            <div style={{
              width: '35%',
              display: 'flex',
              flexDirection: 'column',
              background: COLORS.abyss,
              borderRight: `2px solid ${COLORS.glyphGold}`,
              minWidth: 0
            }}>
              {/* Header */}
              <div style={{
                padding: '12px 16px',
                borderBottom: `2px solid ${COLORS.glyphGold}`,
                background: `linear-gradient(90deg, ${COLORS.glyphGold}20, ${COLORS.glyphPurple}20)`,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <div style={{ 
                  fontSize: '48px', 
                  textShadow: `0 0 20px ${COLORS.glyphGold}`,
                  animation: 'pulse 2s ease-in-out infinite'
                }}>
                  🌳
                </div>
                <div>
                  <div style={{
                    color: COLORS.glyphGold,
                    fontWeight: 'bold',
                    fontSize: '16px',
                    fontFamily: "'Press Start 2P', monospace",
                    textShadow: `0 0 10px ${COLORS.glyphGold}`
                  }}>
                    ROB - SEFIROT SCHOLAR
                  </div>
                  <div style={{ fontSize: '11px', color: COLORS.bone, marginTop: '4px' }}>
                    Kabbalah Wisdom • Tree of Life • עץ החיים
                  </div>
                </div>
              </div>

              {/* Active Sefirah indicator */}
              {activeSefirah && (
                <div style={{
                  padding: '8px 12px',
                  background: `${COLORS.glyphPurple}30`,
                  borderBottom: `1px solid ${COLORS.glyphPurple}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ color: COLORS.glyphGold, fontSize: '12px' }}>
                    ✨ Active: {activeSefirah.toUpperCase()}
                  </span>
                  <button
                    onClick={() => setActiveSefirah(undefined)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: COLORS.bone,
                      cursor: 'pointer',
                      fontSize: '12px'
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* ROB Soul State - Memory & Learning Path */}
              {(robSoul.focus || robSoul.learningPath.length > 0) && (
                <div style={{
                  padding: '6px 12px',
                  background: `${COLORS.stoneDark}60`,
                  borderBottom: `1px solid ${COLORS.stone}`,
                  fontSize: '10px'
                }}>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {robSoul.focus && (
                      <span style={{ color: COLORS.glyphGold }}>
                        🎯 Focus: {robSoul.focus.toUpperCase()}
                      </span>
                    )}
                    {robSoul.learningPath.length > 0 && (
                      <span style={{ color: COLORS.bone }}>
                        🛤️ Path: {robSoul.learningPath.slice(-4).join(' → ')}
                      </span>
                    )}
                    <span style={{ color: COLORS.soulPurple }}>
                      📊 Depth: {robSoul.depth}/5
                    </span>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div style={{
                flex: 1,
                overflow: 'auto',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                {sefirotMessages.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    color: COLORS.bone,
                    fontSize: '12px',
                    padding: '20px',
                    fontStyle: 'italic'
                  }}>
                    🌳 Welcome to the Sefirot Scholar
                    <br /><br />
                    I have studied the Talmud Eser Sefirot and can teach you about:
                    <br /><br />
                    • The 10 Sefirot (Tree of Life)
                    <br />
                    • The 22 Paths of Wisdom
                    <br />
                    • The Four Worlds
                    <br />
                    • Kabbalistic concepts
                    <br /><br />
                    <span style={{ color: COLORS.glyphGold }}>
                      Click any sphere on the tree to learn about it!
                    </span>
                  </div>
                )}
                {sefirotMessages.map(m => (
                  <MessageBubble key={m.id} msg={m} accent={COLORS.glyphGold} anubisMood="mysterious" />
                ))}
                <div ref={sefirotMessagesEndRef} />
              </div>

              {/* Input */}
              <div style={{
                padding: '10px 12px',
                borderTop: `1px solid ${COLORS.stoneDark}`,
                background: COLORS.abyss
              }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={sefirotInput}
                    onChange={e => setSefirotInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSefirotSend()}
                    placeholder="Ask about the Sefirot..."
                    style={{
                      flex: 1,
                      background: COLORS.stoneDark,
                      border: `1px solid ${COLORS.glyphGold}50`,
                      borderRadius: '4px',
                      padding: '12px',
                      color: COLORS.boneLight,
                      fontSize: '14px',
                      outline: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                  <button
                    onClick={() => handleSefirotSend()}
                    disabled={sefirotLoading}
                    style={{
                      background: COLORS.glyphGold,
                      border: 'none',
                      borderRadius: '4px',
                      padding: '12px 16px',
                      color: COLORS.abyss,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: '11px',
                      opacity: sefirotLoading ? 0.5 : 1
                    }}
                  >
                    {sefirotLoading ? '...' : 'ASK'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right side - 3D Sefirot Tree (65%) */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              background: `radial-gradient(ellipse at center, ${COLORS.glyphPurple}10 0%, transparent 70%)`,
              position: 'relative'
            }}>
              {/* Tree container */}
              <div style={{
                flex: 1,
                position: 'relative',
                overflow: 'hidden'
              }}>
                <SefirotTree3D 
                  activeSefirah={activeSefirah}
                  intensity={0.7}
                  onSefirahClick={(sefirah) => {
                    console.log('Clicked:', sefirah.name)
                    setActiveSefirah(sefirah.name)
                    // Trigger chat with question about this Sefirah
                    const question = `Tell me about ${sefirah.name} on the Tree of Life`
                    handleSefirotSend(question)
                  }}
                />
              </div>

              {/* Sefirot info overlay */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                background: `linear-gradient(0deg, ${COLORS.abyss}ee 0%, transparent 100%)`,
                padding: '20px',
                pointerEvents: 'none'
              }}>
                <div style={{
                  textAlign: 'center',
                  color: COLORS.glyphGold,
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: '10px'
                }}>
                  🌳 עץ החיים • TREE OF LIFE • עץ החיים 🌳
                </div>
                <div style={{
                  textAlign: 'center',
                  color: COLORS.bone,
                  fontSize: '11px',
                  marginTop: '8px'
                }}>
                  Click and drag to rotate • Scroll to zoom • The tree responds to your mood
                </div>
              </div>

              {/* Active mood glow overlay */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: `radial-gradient(circle at 50% 40%, ${anubisMoodColor}08 0%, transparent 50%)`,
                pointerEvents: 'none'
              }} />
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
