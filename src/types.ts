/** A single scanned element */
export interface ScannedElement {
  selector: string
  tag: string
  rect: { x: number; y: number; width: number; height: number }
  depth: number
  component: string | null
  role: string
}

/** Extracted design system data */
export interface DesignDNA {
  /** All unique font families used */
  fonts: Array<{ family: string; count: number; sizes: string[] }>
  /** All unique font sizes (type scale) */
  typeScale: Array<{ size: string; px: number; count: number; sample: string }>
  /** All unique colors extracted */
  colors: Array<{ value: string; property: 'color' | 'background' | 'border'; count: number }>
  /** Spacing values used (padding + margin) */
  spacingScale: Array<{ px: number; count: number }>
  /** Border radius values */
  radii: Array<{ value: string; count: number }>
  /** All elements with bounding boxes for grid overlay */
  elements: ScannedElement[]
  /** Detected grid columns (common x positions) */
  gridColumns: number[]
  /** Detected baseline rhythm (common y spacing) */
  baselineRhythm: number | null
  /** Accessibility issues found */
  a11yIssues: Array<{ selector: string; issue: string; severity: 'error' | 'warning' }>
  /** Page metadata */
  meta: { url: string; title: string; viewport: { w: number; h: number }; elementCount: number; timestamp: number }
}

export type LayerType = 'grid' | 'typography' | 'colors' | 'spacing' | 'components' | 'a11y'

export interface OutlineProps {
  enabled?: boolean
  layers?: LayerType[]
  root?: string
  ignore?: string[]
  color?: string
  toolbar?: boolean
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  onScan?: (dna: DesignDNA) => void
  onCopy?: (markdown: string) => void
  shortcut?: string
  className?: string
}

export type OutlineState = 'idle' | 'scanning' | 'showing'
