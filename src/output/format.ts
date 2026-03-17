import type { DesignDNA } from '../types'

export function formatDesignDNA(dna: DesignDNA): string {
  const lines: string[] = []

  lines.push(`# OutlineKit Design DNA Report`)
  lines.push('')
  lines.push(`**${dna.meta.elementCount} elements** scanned on ${dna.meta.url}`)
  lines.push(`Viewport: ${dna.meta.viewport.w}×${dna.meta.viewport.h}`)
  lines.push('')

  // Fonts
  lines.push(`## Fonts`)
  for (const f of dna.fonts.slice(0, 6)) {
    lines.push(`- **${f.family}** (${f.count} elements) — sizes: ${f.sizes.join(', ')}`)
  }
  lines.push('')

  // Type Scale
  lines.push(`## Type Scale`)
  for (const t of dna.typeScale.slice(0, 10)) {
    lines.push(`- \`${t.size}\` — ${t.count} uses — "${t.sample}"`)
  }
  lines.push('')

  // Colors
  lines.push(`## Colors`)
  const textColors = dna.colors.filter(c => c.property === 'color').slice(0, 6)
  const bgColors = dna.colors.filter(c => c.property === 'background').slice(0, 6)
  if (textColors.length) {
    lines.push(`Text: ${textColors.map(c => `\`${c.value}\` (×${c.count})`).join(', ')}`)
  }
  if (bgColors.length) {
    lines.push(`Background: ${bgColors.map(c => `\`${c.value}\` (×${c.count})`).join(', ')}`)
  }
  lines.push('')

  // Spacing Scale
  lines.push(`## Spacing Scale`)
  const topSpacing = dna.spacingScale.filter(s => s.count >= 2).slice(0, 12)
  lines.push(topSpacing.map(s => `${s.px}px (×${s.count})`).join(' · '))
  if (dna.baselineRhythm) lines.push(`Baseline rhythm: ${dna.baselineRhythm}px`)
  lines.push('')

  // Radii
  if (dna.radii.length) {
    lines.push(`## Border Radii`)
    lines.push(dna.radii.slice(0, 6).map(r => `\`${r.value}\` (×${r.count})`).join(', '))
    lines.push('')
  }

  // Grid
  if (dna.gridColumns.length > 2) {
    lines.push(`## Grid`)
    lines.push(`Detected columns at: ${dna.gridColumns.slice(0, 10).join('px, ')}px`)
    lines.push('')
  }

  // A11y
  if (dna.a11yIssues.length) {
    lines.push(`## Accessibility Issues (${dna.a11yIssues.length})`)
    for (const issue of dna.a11yIssues.slice(0, 15)) {
      const icon = issue.severity === 'error' ? '🔴' : '🟡'
      lines.push(`${icon} **${issue.issue}** — \`${issue.selector}\``)
    }
    lines.push('')
  }

  return lines.join('\n')
}
