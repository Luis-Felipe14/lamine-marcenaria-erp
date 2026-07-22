import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { APP_BACKGROUND } from '@/lib/branding'

const PARTICLE_COLORS = [
  'rgba(181, 159, 133, 0.55)',
  'rgba(201, 165, 61, 0.45)',
  'rgba(168, 152, 120, 0.4)',
]

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function AppBackgroundLayers({ photoMode }: { photoMode: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Desktop autenticado: gradiente estático (sem rAF). Partículas só em telas estreitas.
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches
    if (isDesktop || prefersReducedMotion()) {
      canvas.style.display = 'none'
      return
    }

    let animationId = 0
    let lastFrame = 0
    const targetFps = 24
    const frameInterval = 1000 / targetFps
    let particles: {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string
      opacity: number
    }[] = []

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas!.width = Math.floor(window.innerWidth * dpr)
      canvas!.height = Math.floor(window.innerHeight * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function initParticles() {
      particles = Array.from({ length: 4 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.03,
        speedY: (Math.random() - 0.5) * 0.03,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        opacity: Math.random() * 0.05 + 0.025,
      }))
    }

    function drawFrame() {
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight)
      particles.forEach((p) => {
        p.x += p.speedX
        p.y += p.speedY
        if (p.x > window.innerWidth) p.x = 0
        if (p.x < 0) p.x = window.innerWidth
        if (p.y > window.innerHeight) p.y = 0
        if (p.y < 0) p.y = window.innerHeight

        ctx!.save()
        ctx!.fillStyle = p.color
        ctx!.globalAlpha = p.opacity
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.restore()
      })
    }

    function animate(now: number) {
      animationId = requestAnimationFrame(animate)
      if (document.hidden) return
      if (now - lastFrame < frameInterval) return
      lastFrame = now
      drawFrame()
    }

    resize()
    initParticles()
    animationId = requestAnimationFrame(animate)

    const onResize = () => {
      if (window.matchMedia('(min-width: 1024px)').matches || prefersReducedMotion()) {
        cancelAnimationFrame(animationId)
        animationId = 0
        canvas.style.display = 'none'
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
        return
      }
      canvas.style.display = ''
      resize()
      initParticles()
      if (!animationId) animationId = requestAnimationFrame(animate)
    }
    window.addEventListener('resize', onResize)

    const onVisibilityChange = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId)
        animationId = 0
      } else if (!animationId && canvas.style.display !== 'none') {
        animationId = requestAnimationFrame(animate)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return (
    <div
      className={`app-background${photoMode ? ' app-background--photo' : ''}`}
      aria-hidden="true"
    >
      <div className="app-bg-layer app-bg-fallback" />
      {photoMode && (
        <div
          className="app-bg-layer app-bg-photo"
          style={{ backgroundImage: `url('${APP_BACKGROUND.optionalPhoto}')` }}
        />
      )}
      <div className="app-bg-layer app-bg-base" />
      <div className="app-bg-layer app-bg-wood" />
      <div className="app-bg-layer app-bg-arch" />
      <canvas ref={canvasRef} className="app-bg-layer app-bg-particles" />
      <div className="app-bg-layer app-bg-glow" />
      <div className="app-bg-layer app-bg-vignette" />
    </div>
  )
}

export function AppBackground() {
  const [mounted, setMounted] = useState(false)
  const [photoMode, setPhotoMode] = useState(false)

  useEffect(() => {
    setMounted(true)
    const img = new Image()
    img.onload = () => setPhotoMode(true)
    img.onerror = () => setPhotoMode(false)
    img.src = APP_BACKGROUND.optionalPhoto
  }, [])

  if (!mounted) return null

  return createPortal(<AppBackgroundLayers photoMode={photoMode} />, document.body)
}
