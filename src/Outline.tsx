import { useState, useCallback, useEffect } from 'react'
import type { OutlineProps, OutlineState, DesignDNA, LayerType } from './types'
import { scanDesignDNA } from './core/scanner'
import { formatDesignDNA } from './output/format'
import { BlueprintOverlay } from './overlay/BlueprintOverlay'

const POS = {
  'bottom-right': { bottom: 16, right: 16 },
  'bottom-left': { bottom: 16, left: 16 },
  'top-right': { top: 72, right: 16 },
  'top-left': { top: 72, left: 16 },
} as const

const ALL_LAYERS: LayerType[] = ['grid', 'typography', 'colors', 'spacing', 'components', 'a11y']

const LAYER_ICONS: Record<LayerType, string> = {
  grid: '▦', typography: 'Aa', colors: '●', spacing: '↔', components: '◻', a11y: '♿',
}

/**
 * OutlineKit — X-ray vision for your website's design DNA.
 *
 * Drop one component. It scans your page and renders grid lines,
 * spacing rhythm, type scale, color palette, component boundaries,
 * and accessibility markers as a gorgeous blueprint overlay.
 */
export function Outline({
  enabled = true,
  layers: initLayers = ALL_LAYERS,
  root = 'body',
  ignore = [],
  color = '#2563eb',
  toolbar = true,
  position = 'bottom-right',
  onScan,
  onCopy,
  shortcut = 'ctrl+shift+o',
  className,
}: OutlineProps) {
  const [state, setState] = useState<OutlineState>('idle')
  const [dna, setDna] = useState<DesignDNA | null>(null)
  const [layers, setLayers] = useState<Set<LayerType>>(new Set(initLayers))
  const [copied, setCopied] = useState(false)

  const scan = useCallback(() => {
    setState('scanning')
    // Small timeout to allow UI to update
    requestAnimationFrame(() => {
      const result = scanDesignDNA(root, ignore)
      setDna(result)
      setState('showing')
      onScan?.(result)
    })
  }, [root, ignore, onScan])

  const toggle = useCallback(() => {
    if (state === 'idle') { scan() }
    else { setState('idle'); setDna(null) }
  }, [state, scan])

  const toggleLayer = useCallback((layer: LayerType) => {
    setLayers(prev => {
      const next = new Set(prev)
      if (next.has(layer)) next.delete(layer)
      else next.add(layer)
      return next
    })
  }, [])

  const handleCopy = useCallback(() => {
    if (!dna) return
    const md = formatDesignDNA(dna)
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true)
      onCopy?.(md)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [dna, onCopy])

  // Rescan on scroll (redraw overlay)
  useEffect(() => {
    if (state !== 'showing' || !dna) return
    const handler = () => {
      // Force re-render by updating dna reference
      setDna(d => d ? { ...d } : null)
    }
    window.addEventListener('scroll', handler, { passive: true })
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler)
      window.removeEventListener('resize', handler)
    }
  }, [state, dna])

  // Keyboard shortcut
  useEffect(() => {
    if (!enabled) return
    const parts = shortcut.toLowerCase().split('+')
    const handler = (e: KeyboardEvent) => {
      const ctrl = parts.includes('ctrl') ? (e.ctrlKey || e.metaKey) : true
      const shift = parts.includes('shift') ? e.shiftKey : true
      const key = parts.find(p => !['ctrl', 'shift', 'alt', 'meta'].includes(p))
      if (ctrl && shift && key && e.key.toLowerCase() === key) {
        e.preventDefault()
        toggle()
      }
      if (e.key === 'Escape' && state === 'showing') {
        setState('idle'); setDna(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, shortcut, toggle, state])

  if (!enabled) return null

  const posStyle = POS[position]

  return (
    <>
      <BlueprintOverlay
        dna={dna}
        layers={Array.from(layers)}
        color={color}
        visible={state === 'showing'}
      />

      {toolbar && (
        <div data-outline className={className} style={{
          position: 'fixed', ...posStyle, zIndex: 99999,
          fontFamily: "'SF Mono','Fira Code',monospace", fontSize: 11, userSelect: 'none',
        }}>
          {/* Layer toggles + stats panel */}
          {state === 'showing' && dna && (
            <div style={{
              background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)',
              border: '1px solid #e5e7eb', borderRadius: 12,
              padding: 14, marginBottom: 8, minWidth: 220,
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              color: '#111827',
            }}>
              {/* Stats */}
              <div style={{ fontSize: 10, color: '#6b7280', marginBottom: 10, letterSpacing: 1, textTransform: 'uppercase' }}>
                {dna.meta.elementCount} elements · {dna.fonts.length} fonts · {dna.colors.length} colors
              </div>

              {/* Layer toggles */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                {ALL_LAYERS.map(layer => (
                  <button
                    key={layer}
                    onClick={() => toggleLayer(layer)}
                    style={{
                      padding: '4px 10px', borderRadius: 6, fontSize: 10,
                      border: `1px solid ${layers.has(layer) ? color : '#e5e7eb'}`,
                      background: layers.has(layer) ? color + '10' : 'transparent',
                      color: layers.has(layer) ? color : '#9ca3af',
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >
                    <span>{LAYER_ICONS[layer]}</span> {layer}
                  </button>
                ))}
              </div>

              {/* Copy button */}
              <button onClick={handleCopy} style={{
                width: '100%',
                background: copied ? '#dcfce7' : '#f3f4f6',
                border: `1px solid ${copied ? '#86efac' : '#e5e7eb'}`,
                color: copied ? '#166534' : '#374151',
                padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
                fontSize: 11, fontWeight: 600, fontFamily: 'inherit',
              }}>
                {copied ? '✓ Copied Design DNA' : '⎘ Copy for Agent'}
              </button>
            </div>
          )}

          {/* Main toggle button */}
          <button
            onClick={toggle}
            aria-label={state === 'idle' ? 'Scan page design' : 'Close outline'}
            style={{
              width: 48, height: 48, borderRadius: 14,
              background: state === 'showing' ? color : '#fff',
              border: `1px solid ${state === 'showing' ? color : '#e5e7eb'}`,
              color: state === 'showing' ? '#fff' : '#374151',
              cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)', transition: 'all 0.2s',
            }}
          >
            {state === 'idle' ? '◎' : state === 'scanning' ? '...' : '✕'}
          </button>
          <div style={{
            textAlign: 'center', marginTop: 4, fontSize: 9, letterSpacing: 1,
            color: state === 'showing' ? color : '#9ca3af', textTransform: 'uppercase',
          }}>
            {state === 'idle' ? 'Outline' : state === 'scanning' ? 'Scanning' : 'Active'}
          </div>
        </div>
      )}
    </>
  )
}
