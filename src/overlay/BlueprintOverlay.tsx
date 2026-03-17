import { useRef, useEffect } from 'react'
import type { DesignDNA, LayerType } from '../types'

interface OverlayProps {
  dna: DesignDNA | null
  layers: LayerType[]
  color: string
  visible: boolean
}

export function BlueprintOverlay({ dna, layers, color, visible }: OverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!visible || !dna) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const w = window.innerWidth
    const h = document.documentElement.scrollHeight
    canvas.width = w * dpr
    canvas.height = window.innerHeight * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = window.innerHeight + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, window.innerHeight)

    const scrollY = window.scrollY

    if (layers.includes('grid')) drawGrid(ctx, dna, w, scrollY, color)
    if (layers.includes('components')) drawComponents(ctx, dna, scrollY, color)
    if (layers.includes('spacing')) drawSpacing(ctx, dna, scrollY, color)
    if (layers.includes('typography')) drawTypography(ctx, dna, scrollY, color)
    if (layers.includes('colors')) drawColors(ctx, dna, w, color)
    if (layers.includes('a11y')) drawA11y(ctx, dna, scrollY)
  }, [dna, layers, color, visible])

  if (!visible || !dna) return null

  return (
    <canvas
      ref={canvasRef}
      data-outline
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none', zIndex: 99998,
        mixBlendMode: 'multiply',
      }}
    />
  )
}

function drawGrid(ctx: CanvasRenderingContext2D, dna: DesignDNA, w: number, scrollY: number, color: string) {
  const h = window.innerHeight
  // Detected grid columns
  ctx.strokeStyle = color + '18'
  ctx.lineWidth = 1
  ctx.setLineDash([])
  for (const x of dna.gridColumns) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }

  // Baseline rhythm
  if (dna.baselineRhythm && dna.baselineRhythm > 4) {
    ctx.strokeStyle = color + '0a'
    ctx.lineWidth = 0.5
    for (let y = 0; y < h; y += dna.baselineRhythm) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }
  }
}

function drawComponents(ctx: CanvasRenderingContext2D, dna: DesignDNA, scrollY: number, color: string) {
  for (const el of dna.elements) {
    const r = el.rect
    const y = r.y - scrollY
    if (y + r.height < -50 || y > window.innerHeight + 50) continue

    // Depth-based opacity
    const alpha = Math.max(0.04, 0.2 - el.depth * 0.02)

    ctx.strokeStyle = color
    ctx.globalAlpha = alpha
    ctx.lineWidth = 1
    ctx.setLineDash([])
    ctx.strokeRect(r.x, y, r.width, r.height)

    // Corner marks for top-level elements
    if (el.depth < 3) {
      const cLen = 6
      ctx.globalAlpha = alpha * 2
      ctx.lineWidth = 1.5
      // Top-left
      ctx.beginPath(); ctx.moveTo(r.x, y + cLen); ctx.lineTo(r.x, y); ctx.lineTo(r.x + cLen, y); ctx.stroke()
      // Top-right
      ctx.beginPath(); ctx.moveTo(r.x + r.width - cLen, y); ctx.lineTo(r.x + r.width, y); ctx.lineTo(r.x + r.width, y + cLen); ctx.stroke()
      // Bottom-left
      ctx.beginPath(); ctx.moveTo(r.x, y + r.height - cLen); ctx.lineTo(r.x, y + r.height); ctx.lineTo(r.x + cLen, y + r.height); ctx.stroke()
      // Bottom-right
      ctx.beginPath(); ctx.moveTo(r.x + r.width - cLen, y + r.height); ctx.lineTo(r.x + r.width, y + r.height); ctx.lineTo(r.x + r.width, y + r.height - cLen); ctx.stroke()
    }

    // Component name label
    if (el.component && el.depth < 4) {
      ctx.globalAlpha = 0.6
      ctx.font = '9px "SF Mono",monospace'
      const label = `<${el.component}>`
      const tw = ctx.measureText(label).width
      ctx.fillStyle = color
      ctx.fillRect(r.x, y - 13, tw + 8, 13)
      ctx.fillStyle = '#fff'
      ctx.fillText(label, r.x + 4, y - 3)
    }

    ctx.globalAlpha = 1
  }
}

function drawSpacing(ctx: CanvasRenderingContext2D, dna: DesignDNA, scrollY: number, color: string) {
  // Show spacing as small measurement labels on elements
  for (const el of dna.elements) {
    if (el.depth > 3) continue
    const r = el.rect
    const y = r.y - scrollY
    if (y + r.height < -50 || y > window.innerHeight + 50) continue

    // Width dimension line below element
    if (r.width > 40) {
      ctx.globalAlpha = 0.3
      ctx.strokeStyle = color
      ctx.lineWidth = 0.5
      ctx.setLineDash([])
      const dy = y + r.height + 4
      ctx.beginPath(); ctx.moveTo(r.x, dy); ctx.lineTo(r.x + r.width, dy); ctx.stroke()
      // Caps
      ctx.beginPath(); ctx.moveTo(r.x, dy - 3); ctx.lineTo(r.x, dy + 3); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(r.x + r.width, dy - 3); ctx.lineTo(r.x + r.width, dy + 3); ctx.stroke()
      // Label
      ctx.font = '8px "SF Mono",monospace'
      ctx.fillStyle = color
      ctx.globalAlpha = 0.4
      ctx.fillText(`${r.width}`, r.x + r.width / 2 - 8, dy + 12)
      ctx.globalAlpha = 1
    }
  }
}

function drawTypography(ctx: CanvasRenderingContext2D, dna: DesignDNA, scrollY: number, color: string) {
  // Draw type scale as a side panel
  const panelX = window.innerWidth - 180
  const panelY = 60

  ctx.globalAlpha = 0.85
  ctx.fillStyle = '#fff'
  ctx.fillRect(panelX - 12, panelY - 12, 190, dna.typeScale.slice(0, 8).length * 28 + 36)
  ctx.strokeStyle = color + '30'
  ctx.lineWidth = 1
  ctx.strokeRect(panelX - 12, panelY - 12, 190, dna.typeScale.slice(0, 8).length * 28 + 36)

  ctx.fillStyle = color
  ctx.globalAlpha = 0.5
  ctx.font = '600 9px "SF Mono",monospace'
  ctx.fillText('TYPE SCALE', panelX, panelY)

  ctx.globalAlpha = 0.8
  let ty = panelY + 20
  for (const t of dna.typeScale.slice(0, 8)) {
    ctx.font = `${Math.min(18, t.px)}px system-ui`
    ctx.fillStyle = '#111'
    ctx.fillText('Aa', panelX, ty + 2)
    ctx.font = '9px "SF Mono",monospace'
    ctx.fillStyle = color
    ctx.fillText(`${t.size} (×${t.count})`, panelX + 36, ty)
    ty += 28
  }
  ctx.globalAlpha = 1
}

function drawColors(ctx: CanvasRenderingContext2D, dna: DesignDNA, w: number, color: string) {
  // Draw color palette as bottom panel
  const uniqueColors = dna.colors.slice(0, 12)
  if (uniqueColors.length === 0) return

  const panelW = Math.min(uniqueColors.length * 36 + 24, w - 40)
  const panelX = 20
  const panelY = window.innerHeight - 64

  ctx.globalAlpha = 0.9
  ctx.fillStyle = '#fff'
  ctx.fillRect(panelX, panelY, panelW, 52)
  ctx.strokeStyle = color + '30'
  ctx.lineWidth = 1
  ctx.strokeRect(panelX, panelY, panelW, 52)

  ctx.fillStyle = color
  ctx.globalAlpha = 0.5
  ctx.font = '600 9px "SF Mono",monospace'
  ctx.fillText('COLOR PALETTE', panelX + 10, panelY + 14)

  ctx.globalAlpha = 0.9
  let cx = panelX + 10
  for (const c of uniqueColors) {
    ctx.fillStyle = c.value
    ctx.beginPath()
    ctx.arc(cx + 10, panelY + 36, 10, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = '#00000015'
    ctx.lineWidth = 1
    ctx.stroke()
    cx += 36
  }
  ctx.globalAlpha = 1
}

function drawA11y(ctx: CanvasRenderingContext2D, dna: DesignDNA, scrollY: number) {
  for (const issue of dna.a11yIssues.slice(0, 20)) {
    // Find the element
    const el = dna.elements.find(e => e.selector === issue.selector)
    if (!el) continue
    const r = el.rect
    const y = r.y - scrollY
    if (y + r.height < -50 || y > window.innerHeight + 50) continue

    const isError = issue.severity === 'error'
    const col = isError ? '#dc2626' : '#d97706'

    ctx.globalAlpha = 0.7
    ctx.strokeStyle = col
    ctx.lineWidth = 2
    ctx.setLineDash([4, 3])
    ctx.strokeRect(r.x, y, r.width, r.height)
    ctx.setLineDash([])

    // Issue label
    ctx.font = '9px "SF Mono",monospace'
    const label = (isError ? '✕ ' : '⚠ ') + issue.issue.slice(0, 30)
    const tw = ctx.measureText(label).width
    ctx.fillStyle = col
    ctx.globalAlpha = 0.85
    ctx.fillRect(r.x, y + r.height + 2, tw + 10, 15)
    ctx.fillStyle = '#fff'
    ctx.fillText(label, r.x + 5, y + r.height + 13)
    ctx.globalAlpha = 1
  }
}
