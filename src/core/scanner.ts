import type { DesignDNA, ScannedElement } from '../types'

const IGNORE_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META', 'HEAD', 'HTML', 'BR', 'HR'])

function buildSelector(el: Element): string {
  if (el.id) return `#${el.id}`
  const parts: string[] = []
  let cur: Element | null = el
  while (cur && cur !== document.body) {
    let s = cur.tagName.toLowerCase()
    if (cur.id) { parts.unshift(`#${cur.id}`); break }
    if (cur.className && typeof cur.className === 'string') {
      const cls = cur.className.trim().split(/\s+/).filter(c => !c.startsWith('outline-') && c.length < 40).slice(0, 2)
      if (cls.length) s += '.' + cls.join('.')
    }
    parts.unshift(s)
    cur = cur.parentElement
  }
  return parts.join(' > ')
}

function getDepth(el: Element): number {
  let d = 0; let cur = el.parentElement
  while (cur && cur !== document.body) { d++; cur = cur.parentElement }
  return d
}

function getComponent(el: Element): string | null {
  const keys = Object.keys(el)
  const fk = keys.find(k => k.startsWith('__reactFiber$'))
  if (fk) {
    const f = (el as any)[fk]
    if (f?.type?.name) return f.type.name
    if (f?.type?.displayName) return f.type.displayName
  }
  return el.getAttribute('data-component') || el.getAttribute('data-testid') || null
}

function parseColor(c: string): string | null {
  if (!c || c === 'transparent' || c === 'rgba(0, 0, 0, 0)' || c === 'inherit') return null
  return c
}

function parsePx(v: string): number {
  return Math.round(parseFloat(v) || 0)
}

/** Scan the page and extract design DNA */
export function scanDesignDNA(root: string = 'body', ignore: string[] = []): DesignDNA {
  const rootEl = document.querySelector(root) || document.body
  const allEls = rootEl.querySelectorAll('*')
  const ignoreSet = new Set(ignore)

  const fontMap = new Map<string, { count: number; sizes: Set<string> }>()
  const sizeMap = new Map<string, { px: number; count: number; sample: string }>()
  const colorMap = new Map<string, { property: 'color' | 'background' | 'border'; count: number }>()
  const spacingMap = new Map<number, number>()
  const radiusMap = new Map<string, number>()
  const elements: ScannedElement[] = []
  const xPositions: number[] = []
  const yGaps: number[] = []
  const a11yIssues: DesignDNA['a11yIssues'] = []

  let prevBottom = 0

  for (const el of Array.from(allEls)) {
    if (IGNORE_TAGS.has(el.tagName)) continue
    if (el.closest('[data-outline]')) continue
    if (ignoreSet.has(el.tagName.toLowerCase())) continue

    const rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue
    if (rect.top > window.innerHeight * 3) continue

    const cs = window.getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue

    // Element data
    elements.push({
      selector: buildSelector(el),
      tag: el.tagName.toLowerCase(),
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      depth: getDepth(el),
      component: getComponent(el),
      role: el.getAttribute('role') || '',
    })

    // Fonts
    const fontFamily = cs.fontFamily.split(',')[0].trim().replace(/['"]/g, '')
    if (fontFamily) {
      const existing = fontMap.get(fontFamily) || { count: 0, sizes: new Set<string>() }
      existing.count++
      existing.sizes.add(cs.fontSize)
      fontMap.set(fontFamily, existing)
    }

    // Type scale
    const fontSize = cs.fontSize
    const hasText = Array.from(el.childNodes).some(n => n.nodeType === 3 && (n.textContent || '').trim().length > 0)
    if (hasText && fontSize) {
      const existing = sizeMap.get(fontSize)
      if (existing) { existing.count++ }
      else { sizeMap.set(fontSize, { px: parsePx(fontSize), count: 1, sample: (el.textContent || '').trim().slice(0, 30) }) }
    }

    // Colors
    const color = parseColor(cs.color)
    const bg = parseColor(cs.backgroundColor)
    const border = parseColor(cs.borderColor)
    if (color) colorMap.set(color, { property: 'color', count: (colorMap.get(color)?.count || 0) + 1 })
    if (bg) colorMap.set(bg, { property: 'background', count: (colorMap.get(bg)?.count || 0) + 1 })
    if (border && cs.borderStyle !== 'none') colorMap.set(border, { property: 'border', count: (colorMap.get(border)?.count || 0) + 1 })

    // Spacing
    const spacings = [
      parsePx(cs.paddingTop), parsePx(cs.paddingRight), parsePx(cs.paddingBottom), parsePx(cs.paddingLeft),
      parsePx(cs.marginTop), parsePx(cs.marginRight), parsePx(cs.marginBottom), parsePx(cs.marginLeft),
    ]
    for (const s of spacings) {
      if (s > 0 && s < 200) spacingMap.set(s, (spacingMap.get(s) || 0) + 1)
    }

    // Radii
    const radius = cs.borderRadius
    if (radius && radius !== '0px') radiusMap.set(radius, (radiusMap.get(radius) || 0) + 1)

    // Grid detection: collect x positions
    xPositions.push(Math.round(rect.x))
    xPositions.push(Math.round(rect.x + rect.width))

    // Baseline rhythm: collect y gaps between siblings
    if (rect.top > prevBottom && prevBottom > 0) {
      const gap = Math.round(rect.top - prevBottom)
      if (gap > 0 && gap < 100) yGaps.push(gap)
    }
    prevBottom = Math.max(prevBottom, rect.bottom)

    // A11y checks
    if (el.tagName === 'IMG' && !el.getAttribute('alt')) {
      a11yIssues.push({ selector: buildSelector(el), issue: 'Image missing alt text', severity: 'error' })
    }
    if (el.tagName === 'BUTTON' && !(el.textContent || '').trim() && !el.getAttribute('aria-label')) {
      a11yIssues.push({ selector: buildSelector(el), issue: 'Button has no accessible name', severity: 'error' })
    }
    if (el.tagName === 'A' && !el.getAttribute('href')) {
      a11yIssues.push({ selector: buildSelector(el), issue: 'Link missing href', severity: 'warning' })
    }
    if (el.tagName === 'INPUT' && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')) {
      const id = el.getAttribute('id')
      if (!id || !document.querySelector(`label[for="${id}"]`)) {
        a11yIssues.push({ selector: buildSelector(el), issue: 'Input missing label', severity: 'error' })
      }
    }
    // Low contrast check
    if (hasText && color && bg) {
      const cr = contrastRatio(color, bg)
      if (cr !== null && cr < 4.5) {
        a11yIssues.push({ selector: buildSelector(el), issue: `Low contrast ${cr.toFixed(1)}:1 (needs 4.5:1)`, severity: 'error' })
      }
    }
  }

  // Process grid columns: find frequently occurring x positions
  const xFreq = new Map<number, number>()
  for (const x of xPositions) {
    const rounded = Math.round(x / 4) * 4 // snap to 4px
    xFreq.set(rounded, (xFreq.get(rounded) || 0) + 1)
  }
  const gridColumns = Array.from(xFreq.entries())
    .filter(([_, count]) => count >= 3)
    .sort((a, b) => a[0] - b[0])
    .map(([x]) => x)

  // Baseline rhythm: most common y gap
  const gapFreq = new Map<number, number>()
  for (const g of yGaps) {
    const rounded = Math.round(g / 4) * 4
    gapFreq.set(rounded, (gapFreq.get(rounded) || 0) + 1)
  }
  let baselineRhythm: number | null = null
  let maxGapCount = 0
  for (const [gap, count] of gapFreq) {
    if (count > maxGapCount) { maxGapCount = count; baselineRhythm = gap }
  }

  return {
    fonts: Array.from(fontMap.entries())
      .map(([family, data]) => ({ family, count: data.count, sizes: Array.from(data.sizes) }))
      .sort((a, b) => b.count - a.count),
    typeScale: Array.from(sizeMap.entries())
      .map(([size, data]) => ({ size, ...data }))
      .sort((a, b) => b.px - a.px),
    colors: Array.from(colorMap.entries())
      .map(([value, data]) => ({ value, ...data }))
      .sort((a, b) => b.count - a.count),
    spacingScale: Array.from(spacingMap.entries())
      .map(([px, count]) => ({ px, count }))
      .sort((a, b) => a.px - b.px),
    radii: Array.from(radiusMap.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count),
    elements,
    gridColumns,
    baselineRhythm,
    a11yIssues,
    meta: {
      url: window.location.href,
      title: document.title,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      elementCount: elements.length,
      timestamp: Date.now(),
    },
  }
}

// Contrast ratio helper
function parseRGB(c: string): [number, number, number] | null {
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  return m ? [+m[1], +m[2], +m[3]] : null
}

function luminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => { c = c / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) })
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
}

function contrastRatio(fg: string, bg: string): number | null {
  const a = parseRGB(fg), b = parseRGB(bg)
  if (!a || !b) return null
  const l1 = luminance(...a), l2 = luminance(...b)
  return Math.round(((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)) * 100) / 100
}
