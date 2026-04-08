import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { ActiveAtmosphereEffect, AtmosphereEffectType } from '../types/danmu'

interface AtmosphereEffectsProps {
  effects: ActiveAtmosphereEffect[]
}

type ParticleShape = 'confetti' | 'spark' | 'star' | 'heart' | 'ember'

interface AtmosphereParticle {
  id: string
  effect: AtmosphereEffectType
  shape: ParticleShape
  x: number
  y: number
  tx: number
  ty: number
  delay: number
  duration: number
  size: number
  rotate: number
  fromScale: number
  toScale: number
  color: string
  accent?: string
  blur?: number
  opacity?: number
  animation: 'burst' | 'drift' | 'rise'
}

interface AtmosphereRing {
  id: string
  x: number
  y: number
  size: number
  delay: number
  duration: number
  color: string
}

interface AtmosphereFlash {
  id: string
  x: number
  y: number
  size: number
  delay: number
  duration: number
  color: string
  opacity: number
}

const DEFAULT_DURATION = 5200

const COLOR_SETS: Record<AtmosphereEffectType, string[]> = {
  cheer: ['#22c55e', '#38bdf8', '#f59e0b', '#ef4444', '#a855f7'],
  fireworks: ['#fb7185', '#38bdf8', '#fbbf24', '#c084fc', '#34d399'],
  stars: ['#fde68a', '#f8fafc', '#93c5fd', '#c4b5fd', '#67e8f9'],
  hearts: ['#fb7185', '#f472b6', '#f9a8d4', '#fecdd3', '#fda4af'],
  flame: ['#fb7185', '#f97316', '#fbbf24', '#fde047', '#f59e0b'],
}

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function viewportSize() {
  if (typeof window === 'undefined') {
    return { width: 1440, height: 900 }
  }
  return {
    width: window.innerWidth || 1440,
    height: window.innerHeight || 900,
  }
}

function buildCheerParticles(effect: ActiveAtmosphereEffect): AtmosphereParticle[] {
  const { width, height } = viewportSize()
  return Array.from({ length: 64 }, (_, index) => {
    const colors = COLOR_SETS.cheer
    return {
      id: `${effect.id}-cheer-${index}`,
      effect: 'cheer',
      shape: index % 5 === 0 ? 'star' : 'confetti',
      x: randomBetween(width * 0.05, width * 0.95),
      y: randomBetween(-80, -12),
      tx: randomBetween(-180, 180),
      ty: randomBetween(height * 0.7, height * 1.05),
      delay: randomBetween(0, 260),
      duration: randomBetween(4200, 5200),
      size: randomBetween(12, 24),
      rotate: randomBetween(220, 920),
      fromScale: 0.65,
      toScale: randomBetween(0.8, 1.2),
      color: colors[index % colors.length],
      accent: colors[(index + 2) % colors.length],
      opacity: 1,
      animation: 'drift',
    }
  })
}

function buildFireworkParticles(effect: ActiveAtmosphereEffect): { particles: AtmosphereParticle[]; rings: AtmosphereRing[]; flashes: AtmosphereFlash[] } {
  const { width, height } = viewportSize()
  const particles: AtmosphereParticle[] = []
  const rings: AtmosphereRing[] = []
  const flashes: AtmosphereFlash[] = []

  for (let burstIndex = 0; burstIndex < 3; burstIndex += 1) {
    const centerX = randomBetween(width * 0.2, width * 0.8)
    const centerY = randomBetween(height * 0.16, height * 0.52)
    const burstDelay = burstIndex * 220
    const colors = COLOR_SETS.fireworks

    rings.push({
      id: `${effect.id}-ring-${burstIndex}`,
      x: centerX,
      y: centerY,
      size: randomBetween(160, 260),
      delay: burstDelay,
      duration: 1500,
      color: colors[burstIndex % colors.length],
    })

    flashes.push({
      id: `${effect.id}-flash-${burstIndex}`,
      x: centerX,
      y: centerY,
      size: randomBetween(180, 300),
      delay: burstDelay,
      duration: 900,
      color: colors[(burstIndex + 1) % colors.length],
      opacity: 0.22,
    })

    for (let i = 0; i < 24; i += 1) {
      const angle = (Math.PI * 2 * i) / 24
      const radius = randomBetween(90, 260)
      const color = colors[(i + burstIndex) % colors.length]
      particles.push({
        id: `${effect.id}-firework-${burstIndex}-${i}`,
        effect: 'fireworks',
        shape: i % 4 === 0 ? 'star' : 'spark',
        x: centerX,
        y: centerY,
        tx: Math.cos(angle) * radius,
        ty: Math.sin(angle) * radius,
        delay: burstDelay + randomBetween(0, 80),
        duration: randomBetween(2200, 3200),
        size: randomBetween(8, 20),
        rotate: randomBetween(0, 360),
        fromScale: 0.2,
        toScale: randomBetween(0.9, 1.25),
        color,
        accent: '#ffffff',
        blur: i % 5 === 0 ? 2 : 0,
        animation: 'burst',
      })
    }
  }

  return { particles, rings, flashes }
}

function buildStarParticles(effect: ActiveAtmosphereEffect): AtmosphereParticle[] {
  const { width, height } = viewportSize()
  return Array.from({ length: 36 }, (_, index) => {
    const colors = COLOR_SETS.stars
    return {
      id: `${effect.id}-star-${index}`,
      effect: 'stars',
      shape: index % 3 === 0 ? 'spark' : 'star',
      x: randomBetween(width * 0.08, width * 0.92),
      y: randomBetween(height * 0.55, height * 0.92),
      tx: randomBetween(-90, 90),
      ty: randomBetween(-height * 0.55, -height * 0.85),
      delay: randomBetween(0, 220),
      duration: randomBetween(3800, 4800),
      size: randomBetween(10, 26),
      rotate: randomBetween(90, 540),
      fromScale: 0.35,
      toScale: randomBetween(0.7, 1.05),
      color: colors[index % colors.length],
      accent: '#ffffff',
      blur: index % 4 === 0 ? 2 : 0,
      animation: 'rise',
    }
  })
}

function buildHeartParticles(effect: ActiveAtmosphereEffect): AtmosphereParticle[] {
  const { width, height } = viewportSize()
  const center = width / 2
  return Array.from({ length: 28 }, (_, index) => {
    const colors = COLOR_SETS.hearts
    return {
      id: `${effect.id}-heart-${index}`,
      effect: 'hearts',
      shape: 'heart',
      x: randomBetween(center - width * 0.18, center + width * 0.18),
      y: randomBetween(height * 0.78, height * 0.98),
      tx: randomBetween(-220, 220),
      ty: randomBetween(-height * 0.55, -height * 0.9),
      delay: randomBetween(0, 260),
      duration: randomBetween(4200, 5200),
      size: randomBetween(18, 34),
      rotate: randomBetween(-30, 30),
      fromScale: 0.3,
      toScale: randomBetween(0.75, 1.15),
      color: colors[index % colors.length],
      accent: '#ffffff',
      blur: 0,
      animation: 'rise',
    }
  })
}

function buildFlameParticles(effect: ActiveAtmosphereEffect): { particles: AtmosphereParticle[]; flashes: AtmosphereFlash[] } {
  const { width, height } = viewportSize()
  const particles: AtmosphereParticle[] = []
  const flashes: AtmosphereFlash[] = []
  const colors = COLOR_SETS.flame
  const center = width / 2

  flashes.push({
    id: `${effect.id}-flame-flash`,
    x: center,
    y: height * 0.82,
    size: Math.min(width * 0.48, 560),
    delay: 0,
    duration: 1600,
    color: 'rgba(251, 113, 133, 0.55)',
    opacity: 0.28,
  })

  for (let i = 0; i < 42; i += 1) {
    particles.push({
      id: `${effect.id}-flame-${i}`,
      effect: 'flame',
      shape: i % 4 === 0 ? 'spark' : 'ember',
      x: randomBetween(center - width * 0.12, center + width * 0.12),
      y: randomBetween(height * 0.82, height * 0.98),
      tx: randomBetween(-140, 140),
      ty: randomBetween(-height * 0.38, -height * 0.72),
      delay: randomBetween(0, 200),
      duration: randomBetween(3400, 4400),
      size: randomBetween(10, 26),
      rotate: randomBetween(-24, 24),
      fromScale: 0.35,
      toScale: randomBetween(0.25, 0.8),
      color: colors[i % colors.length],
      accent: '#fff7ed',
      blur: i % 5 === 0 ? 4 : 1,
      opacity: 0.95,
      animation: 'rise',
    })
  }

  return { particles, flashes }
}

function useGeneratedEffects(effects: ActiveAtmosphereEffect[]) {
  return useMemo(() => {
    const particles: AtmosphereParticle[] = []
    const rings: AtmosphereRing[] = []
    const flashes: AtmosphereFlash[] = []

    effects.forEach((effect) => {
      if (effect.effect === 'cheer') {
        particles.push(...buildCheerParticles(effect))
      } else if (effect.effect === 'fireworks') {
        const firework = buildFireworkParticles(effect)
        particles.push(...firework.particles)
        rings.push(...firework.rings)
        flashes.push(...firework.flashes)
      } else if (effect.effect === 'stars') {
        particles.push(...buildStarParticles(effect))
      } else if (effect.effect === 'hearts') {
        particles.push(...buildHeartParticles(effect))
      } else if (effect.effect === 'flame') {
        const flame = buildFlameParticles(effect)
        particles.push(...flame.particles)
        flashes.push(...flame.flashes)
      }
    })

    return { particles, rings, flashes }
  }, [effects])
}

export function AtmosphereEffects({ effects }: AtmosphereEffectsProps) {
  const [visibleEffects, setVisibleEffects] = useState<ActiveAtmosphereEffect[]>([])
  const { particles, rings, flashes } = useGeneratedEffects(visibleEffects)

  useEffect(() => {
    if (effects.length === 0) return

    setVisibleEffects(effects)
    const timer = setTimeout(() => {
      setVisibleEffects([])
    }, DEFAULT_DURATION + 600)

    return () => clearTimeout(timer)
  }, [effects])

  if (particles.length === 0 && rings.length === 0 && flashes.length === 0) {
    return null
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-[1600] overflow-hidden">
      {flashes.map((flash) => (
        <div
          key={flash.id}
          className="absolute rounded-full"
          style={{
            left: flash.x,
            top: flash.y,
            width: flash.size,
            height: flash.size,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${flash.color} 0%, rgba(255,255,255,0.18) 32%, rgba(255,255,255,0) 72%)`,
            animation: `atmo-flash ${flash.duration}ms ease-out forwards`,
            animationDelay: `${flash.delay}ms`,
            opacity: flash.opacity,
            filter: 'blur(14px)',
          }}
        />
      ))}

      {rings.map((ring) => (
        <div
          key={ring.id}
          className="absolute rounded-full border-2"
          style={{
            left: ring.x,
            top: ring.y,
            width: ring.size,
            height: ring.size,
            transform: 'translate(-50%, -50%)',
            borderColor: ring.color,
            boxShadow: `0 0 24px ${ring.color}`,
            animation: `atmo-ring ${ring.duration}ms cubic-bezier(0.12, 0.82, 0.35, 1) forwards`,
            animationDelay: `${ring.delay}ms`,
            opacity: 0,
          }}
        />
      ))}

      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute will-change-transform will-change-opacity"
          style={buildParticleStyle(particle)}
        >
          <ParticleGlyph particle={particle} />
        </div>
      ))}

      <style>{`
        @keyframes atmo-burst {
          0% {
            transform: translate3d(0, 0, 0) scale(var(--from-scale)) rotate(0deg);
            opacity: 0;
          }
          12% {
            opacity: var(--particle-opacity);
          }
          100% {
            transform: translate3d(var(--tx), var(--ty), 0) scale(var(--to-scale)) rotate(var(--rotate));
            opacity: 0;
          }
        }

        @keyframes atmo-drift {
          0% {
            transform: translate3d(0, 0, 0) scale(var(--from-scale)) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: var(--particle-opacity);
          }
          55% {
            transform: translate3d(calc(var(--tx) * 0.45), calc(var(--ty) * 0.55), 0) scale(calc((var(--from-scale) + var(--to-scale)) / 2)) rotate(calc(var(--rotate) * 0.45));
            opacity: var(--particle-opacity);
          }
          100% {
            transform: translate3d(var(--tx), var(--ty), 0) scale(var(--to-scale)) rotate(var(--rotate));
            opacity: 0;
          }
        }

        @keyframes atmo-rise {
          0% {
            transform: translate3d(0, 0, 0) scale(var(--from-scale)) rotate(0deg);
            opacity: 0;
          }
          12% {
            opacity: var(--particle-opacity);
          }
          40% {
            opacity: var(--particle-opacity);
          }
          100% {
            transform: translate3d(var(--tx), var(--ty), 0) scale(var(--to-scale)) rotate(var(--rotate));
            opacity: 0;
          }
        }

        @keyframes atmo-ring {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.25);
          }
          18% {
            opacity: 0.95;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.4);
          }
        }

        @keyframes atmo-flash {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.35);
          }
          18% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(1.35);
          }
        }
      `}</style>
    </div>
  )
}

function buildParticleStyle(particle: AtmosphereParticle): CSSProperties {
  return {
    left: particle.x,
    top: particle.y,
    width: particle.size,
    height: particle.size,
    animation: `${particle.animation === 'burst' ? 'atmo-burst' : particle.animation === 'drift' ? 'atmo-drift' : 'atmo-rise'} ${particle.duration}ms cubic-bezier(0.16, 0.84, 0.28, 1) forwards`,
    animationDelay: `${particle.delay}ms`,
    filter: particle.blur ? `drop-shadow(0 0 ${particle.blur * 4}px ${particle.color}) blur(${particle.blur}px)` : `drop-shadow(0 0 10px ${particle.color})`,
    opacity: 0,
    ['--tx' as string]: `${particle.tx}px`,
    ['--ty' as string]: `${particle.ty}px`,
    ['--rotate' as string]: `${particle.rotate}deg`,
    ['--from-scale' as string]: String(particle.fromScale),
    ['--to-scale' as string]: String(particle.toScale),
    ['--particle-opacity' as string]: String(particle.opacity ?? 1),
  } as CSSProperties
}

function ParticleGlyph({ particle }: { particle: AtmosphereParticle }) {
  if (particle.shape === 'confetti') {
    return (
      <div
        className="h-full w-full rounded-[5px]"
        style={{
          background: `linear-gradient(135deg, ${particle.color} 0%, ${particle.accent || '#ffffff'} 100%)`,
          boxShadow: `0 0 12px ${particle.color}`,
        }}
      />
    )
  }

  if (particle.shape === 'spark') {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
        <circle cx="50" cy="50" r="26" fill={particle.color} />
        <circle cx="50" cy="50" r="12" fill={particle.accent || '#ffffff'} opacity="0.75" />
      </svg>
    )
  }

  if (particle.shape === 'star') {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
        <polygon
          points="50,6 61,36 94,38 68,58 77,91 50,73 23,91 32,58 6,38 39,36"
          fill={particle.color}
          stroke={particle.accent || '#ffffff'}
          strokeWidth="4"
        />
      </svg>
    )
  }

  if (particle.shape === 'heart') {
    return (
      <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
        <path
          d="M50 89C18 66 8 46 8 28c0-12 9-21 21-21 8 0 15 4 21 11 6-7 13-11 21-11 12 0 21 9 21 21 0 18-10 38-42 61Z"
          fill={particle.color}
          stroke={particle.accent || '#fff1f2'}
          strokeWidth="4"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 100 100" className="h-full w-full overflow-visible">
      <path
        d="M52 5c16 18 26 33 26 47 0 16-12 28-28 28S22 68 22 52c0-14 10-29 30-47Z"
        fill={particle.color}
        stroke={particle.accent || '#fff7ed'}
        strokeWidth="4"
      />
      <path d="M50 18c7 10 12 20 12 29 0 8-5 14-12 14s-12-6-12-14c0-9 5-19 12-29Z" fill="rgba(255,255,255,0.28)" />
    </svg>
  )
}
