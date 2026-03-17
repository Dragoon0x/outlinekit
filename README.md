# useoutlinekit

X-ray vision for your website's design DNA.

**[Landing Page →](https://dragoon0x.github.io/outlinekit)**

[![npm](https://img.shields.io/npm/v/useoutlinekit)](https://npmjs.com/package/useoutlinekit)
[![license](https://img.shields.io/npm/l/useoutlinekit)](./LICENSE)

## Install

```bash
npm i useoutlinekit -D
```

## Quick Start

```tsx
import { Outline } from 'useoutlinekit'

function App() {
  return (
    <>
      <YourApp />
      {process.env.NODE_ENV === "development" && <Outline />}
    </>
  )
}
```

## Features

- **6 scan layers** — grid, typography, colors, spacing, components, accessibility
- **Font extraction** — families, sizes, type scale with sample text
- **Color palette** — text, background, and border colors with counts
- **Spacing scale** — padding/margin values, baseline rhythm detection
- **Grid detection** — column positions from element alignment
- **React components** — fiber tree names and depth
- **Accessibility** — missing alt, labels, low contrast, missing href
- **Blueprint overlay** — visual overlay rendering all layers
- **Markdown output** — copy full Design DNA report for agents

## Programmatic API

```ts
import { scanDesignDNA, formatDesignDNA } from 'useoutlinekit'

const dna = scanDesignDNA('body')
const markdown = formatDesignDNA(dna)
```

## Disclaimer

This is experimental software. See [DISCLAIMER.md](./DISCLAIMER.md) for full details. Use at your own risk. DYOR.

## Security

See [SECURITY.md](./SECURITY.md) for reporting vulnerabilities.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT — see [LICENSE](./LICENSE)

---

Made by [@dragoon0x](https://github.com/dragoon0x)
