import { useEffect, useRef } from 'react'

interface ConfettiBurstProps {
  active: boolean
  onComplete?: () => void
}

const COLORS = ['#e0472f', '#059669', '#f59e0b', '#fdeae5', '#ffffff']

/** Confetti ringan — nonaktif jika prefers-reduced-motion. */
export function ConfettiBurst({ active, onComplete }: ConfettiBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!active) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete?.()
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = window.innerHeight
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`
    ctx.scale(dpr, dpr)

    type Particle = {
      x: number
      y: number
      vx: number
      vy: number
      color: string
      size: number
      rot: number
      vr: number
      life: number
    }

    const particles: Particle[] = Array.from({ length: 80 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * 120,
      y: h * 0.35,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * -10 - 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)]!,
      size: Math.random() * 6 + 4,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      life: 1,
    }))

    let frame = 0
    const maxFrames = 90
    let raf = 0

    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      let alive = 0

      for (const p of particles) {
        p.vy += 0.18
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        p.life -= 1 / maxFrames
        if (p.life <= 0) continue
        alive += 1

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
        ctx.restore()
      }

      frame += 1
      if (frame < maxFrames && alive > 0) {
        raf = requestAnimationFrame(tick)
      } else {
        ctx.clearRect(0, 0, w, h)
        onComplete?.()
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, onComplete])

  if (!active) return null

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[200]"
      aria-hidden
    />
  )
}
