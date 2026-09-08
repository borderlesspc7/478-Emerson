import fs from 'node:fs'

const html = fs.readFileSync('_landing_proto/index.html', 'utf8')
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/)
const bodyMatch = html.match(/<body>([\s\S]*)<\/body>/)
if (!styleMatch || !bodyMatch) throw new Error('parse failed')

let css = styleMatch[1]
let body = bodyMatch[1]

// Collect class names from HTML class attributes
const classSet = new Set()
for (const m of body.matchAll(/class="([^"]+)"/g)) {
  for (const c of m[1].split(/\s+/)) {
    if (c && !c.startsWith('lp-')) classSet.add(c)
  }
}
// Also from CSS - common classes that might only appear in CSS
for (const m of css.matchAll(/\.([a-zA-Z_][\w-]*)/g)) {
  classSet.add(m[1])
}

const classes = [...classSet].sort((a, b) => b.length - a.length)

function prefixClass(name) {
  if (name === 'active' || name === 'open' || name === 'in' || name === 's') {
    // state classes kept short but still prefixed to avoid collisions
    return `lp-${name}`
  }
  return `lp-${name}`
}

for (const c of classes) {
  const re = new RegExp(`\\.${c}(?![\\w-])`, 'g')
  css = css.replace(re, `.${prefixClass(c)}`)
}

for (const c of classes) {
  const re = new RegExp(`\\b${c}\\b`, 'g')
  body = body.replace(/(class=")([^"]*)(")/g, (_, a, list, z) => {
    const next = list
      .split(/\s+/)
      .map((token) => (token === c ? prefixClass(c) : token))
      .join(' ')
    return a + next + z
  })
}

css = css
  .replace(/:root\{/g, '.landing-page{')
  .replace(/\*\{box-sizing:border-box\}/, '')
  .replace(/html\{scroll-behavior:smooth\}/, '')
  .replace(/body\{[^}]+\}/, '')
  .replace(/a\{text-decoration:none;color:inherit\}/, '')
  .replace(/button\{font:inherit\}/, '')

const outCss = `/* Landing — from Guia_da_Zen_Reservas_Premium_Prototype (scoped lp-*) */
.landing-page {
  box-sizing: border-box;
  margin: 0;
  font-family: Manrope, system-ui, sans-serif;
  color: var(--ink, #092c27);
  background: var(--bg, #f8fbfa);
  overflow-x: hidden;
  min-height: 100dvh;
}
.landing-page *,
.landing-page *::before,
.landing-page *::after {
  box-sizing: border-box;
}
.landing-page a {
  text-decoration: none;
  color: inherit;
}
.landing-page button {
  font: inherit;
}
${css}
`

fs.writeFileSync('src/pages/Landing/LandingPage.css', outCss)
fs.writeFileSync('scripts/_landing_body.html', body)
console.log('classes', classes.length, 'css', outCss.length, 'body', body.length)
