import { useEffect, useRef } from 'react'

const PARTICLE_COLORS = ['rgba(201, 165, 61, 0.35)', 'rgba(201, 162, 39, 0.28)', 'rgba(228, 198, 90, 0.22)']

export function LoginParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId = 0
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
      const dpr = window.devicePixelRatio || 1
      canvas!.style.width = `${window.innerWidth}px`
      canvas!.style.height = `${window.innerHeight}px`
      canvas!.width = Math.floor(window.innerWidth * dpr)
      canvas!.height = Math.floor(window.innerHeight * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function initParticles() {
      particles = Array.from({ length: 14 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 1.4 + 0.4,
        speedX: (Math.random() - 0.5) * 0.12,
        speedY: (Math.random() - 0.5) * 0.12,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        opacity: Math.random() * 0.12 + 0.06,
      }))
    }

    function animate() {
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
      animationId = requestAnimationFrame(animate)
    }

    resize()
    initParticles()
    animate()

    const onResize = () => {
      resize()
      initParticles()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="login-particles" aria-hidden="true" />
}
