import fs from 'node:fs'

let body = fs.readFileSync('scripts/_landing_body.html', 'utf8')
// Drop original script (behavior lives in React)
body = body.replace(/<script>[\s\S]*?<\/script>/g, '')

const login = '/login'
const terms = '/termos'
const privacy = '/privacidade'

// Nav: secondary demo stays; primary goes to login; add Entrar
body = body.replace(
  '<div class="lp-na"><button class="lp-btn lp-secondary" data-demo>Ver demonstração</button><a class="lp-btn lp-primary" href="#contato">Falar com a Zen</a></div>',
  `<div class="lp-na"><button class="lp-btn lp-secondary" type="button" data-demo>Ver demonstração</button><a class="lp-btn lp-primary" href="${login}">Entrar no app</a></div>`,
)

// Hero secondary CTA → login as alternate path; keep contact for WhatsApp section
body = body.replace(
  '<a class="lp-btn lp-secondary" href="#contato">Falar com a Zen</a></div><div class="lp-trust">',
  `<a class="lp-btn lp-secondary" href="${login}">Entrar no app</a></div><div class="lp-trust">`,
)

// CTA WhatsApp placeholder → data attribute filled in React
body = body.replace(
  '<a class="lp-btn lp-secondary" href="#">Falar no WhatsApp</a>',
  '<a class="lp-btn lp-secondary" data-whatsapp href="#contato">Falar no WhatsApp</a>',
)

// Footer legal links
body = body.replace(
  '<div class="lp-flinks"><a href="#">Privacidade</a><a href="#">Termos</a><a href="#">Contato</a></div>',
  `<div class="lp-flinks"><a href="${privacy}">Privacidade</a><a href="${terms}">Termos</a><a href="#contato">Contato</a></div>`,
)

// Ensure buttons have type
body = body.replace(/<button class="lp-btn/g, '<button type="button" class="lp-btn')
body = body.replace(/<button class="lp-jtab/g, '<button type="button" class="lp-jtab')
body = body.replace(/<button class="lp-cb"/g, '<button type="button" class="lp-cb"')
body = body.replace(/<button class="lp-close"/g, '<button type="button" class="lp-close"')
body = body.replace(
  /<div class="lp-dnav"><button /g,
  '<div class="lp-dnav"><button type="button" ',
)
body = body.replace(/<\/button><button>/g, '</button><button type="button">')

const ts = `/** Auto-generated from Guia_da_Zen_Reservas_Premium_Prototype — do not edit by hand */
export const LANDING_MARKUP = ${JSON.stringify(body)} as const
`

fs.writeFileSync('src/pages/Landing/landingMarkup.ts', ts)

// Scope bare footer rule in CSS
let css = fs.readFileSync('src/pages/Landing/LandingPage.css', 'utf8')
css = css.replace(/\}footer\{/g, '}.landing-page footer{')
css += `
@media (prefers-reduced-motion: reduce) {
  .lp-orbit { animation: none !important; }
  .lp-reveal { opacity: 1; transform: none; transition: none; }
  .lp-slide { transition: none; }
  .lp-track { transition: none; }
  .lp-btn:hover { transform: none; }
}
.landing-page footer { border-top: 1px solid var(--line); padding: 25px 0 40px; }
`
fs.writeFileSync('src/pages/Landing/LandingPage.css', css)
console.log('markup chars', body.length)
