// lib/buildPublicHtml.ts
// Minimal server-safe HTML builder used by:
// - app/api/sites/[id]/export/route.ts
// - app/site/[subdomain]/route.ts

export type SiteData = {
  team: {
    name: string
    number?: string
    school?: string
    city?: string
    state?: string
    founding?: number
    contactEmail?: string
    logo?: string // optional data URL or https URL
    hero?: string // optional data URL or https URL
    favicon?: string // optional data URL or https URL
  }
  links: Array<{ label: string; href: string; external?: boolean }>
  theme: {
    background: string
    card: string
    text: string
    headline: string
    footerText: string
    accent: string
    headerBg: string
    headerText: string
    buttonText: string
    underlineLinks: boolean
  }
  sponsors: {
    platinum: Array<{ name: string; logo?: string }>
    gold: Array<{ name: string; logo?: string }>
    silver: Array<{ name: string; logo?: string }>
    bronze: Array<{ name: string; logo?: string }>
  }
  // Optional extra blocks you may add later:
  members?: Array<{ name: string; role?: string; img?: string }>
  outreach?: Array<{ title: string; text?: string; img?: string }>
  resources?: Array<{ title: string; text?: string; img?: string }>
  bullets?: string[]
  showTierHeadings?: boolean
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

function sponsorRow(
  title: string,
  list: Array<{ name: string; logo?: string }>,
  card: string
) {
  if (!list?.length) return ''
  const cards = list
    .map((s) => {
      return `
        <div class="spCard" style="display:grid;place-items:center;background:${card};border:1px solid #e6efe9;border-radius:14px;height:72px;padding:6px;min-width:160px">
          ${s.logo ? `<img src="${esc(s.logo)}" style="max-width:90%;max-height:54px">` : esc(s.name)}
        </div>
      `
    })
    .join('')
  return `
    <div class="tierRow" style="margin-bottom:1rem">
      <div class="tierWrap" style="display:flex;flex-wrap:wrap;justify-content:center;gap:1rem">
        ${cards}
      </div>
    </div>
  `
}

export function buildPublicHtml(data: SiteData): string {
  const t = data.team ?? {
    name: 'FTC Team',
    number: '',
    school: '',
    city: '',
    state: '',
  }

  const theme = data.theme ?? {
    background: '#f5f7f6',
    card: '#ffffff',
    text: '#18241d',
    headline: '#0b1f16',
    footerText: '#c9e6da',
    accent: '#0f8a5f',
    headerBg: '#ffffff',
    headerText: '#0b1f16',
    buttonText: '#ffffff',
    underlineLinks: true,
  }

  const links = data.links ?? []
  const members = data.members ?? []
  const bullets = data.bullets ?? []
  const showTierHeadings = data.showTierHeadings ?? true

  // Build sections
  const LINKS_LIST = links
    .map(
      (l) =>
        `<li><a href="${esc(l.href)}"${
          l.external ? ' target="_blank" rel="noopener"' : ''
        }>${esc(l.label)}</a></li>`
    )
    .join('')

  const memberCards = members
    .map(
      (m) => `
      <article class="person">
        ${m.img ? `<img src="${esc(m.img)}">` : ''}
        <div class="info"><h3>${esc(m.name)}</h3><div class="role">${esc(m.role ?? '')}</div></div>
      </article>`
    )
    .join('')

  const sponsorRows = [
    ['Platinum', data.sponsors?.platinum ?? []],
    ['Gold', data.sponsors?.gold ?? []],
    ['Silver', data.sponsors?.silver ?? []],
    ['Bronze', data.sponsors?.bronze ?? []],
  ]
    .map(([tier, list]) =>
      (showTierHeadings ? `<h3 style="text-align:center;margin:.4rem 0 .6rem;font-weight:800;color:#37574a">${tier}</h3>` : '') +
      sponsorRow(String(tier), list as any, theme.card)
    )
    .join('')

  const location = [t.city, t.state].filter(Boolean).join(', ')
  const teamTitle =
    t.number && String(t.number).trim()
      ? `${t.name} • ${t.number}`
      : t.name

  const favicon = t.favicon ? `<link rel="icon" href="${esc(t.favicon)}">` : ''

  const logoHTML = t.logo
    ? `<img src="${esc(t.logo)}" alt="Team Logo" style="height:38px;border-radius:8px">`
    : `<svg viewBox="0 0 64 64" style="height:36px"><path fill="var(--green)" d="M8 38c0-9 8-16 22-16 9 0 12-5 15-10 2 0 3 1 4 3l3 8 6 3v10l-8 2v4c0 6-5 9-11 9H21C13 51 8 46 8 38Z"/></svg>`

  const heroRight = t.hero
    ? `<img src="${esc(t.hero)}" alt="Hero" style="width:100%;height:260px;object-fit:cover;border-radius:12px">`
    : `<div class="card"><p>Hero image placeholder</p></div>`

  // Final HTML (no client-side bundling; safe for Edge/Node)
  return `<!doctype html>
<meta charset="utf-8">
<title>${esc(teamTitle)}</title>
${favicon}
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
<style>
:root{
  --green:${theme.accent};
  --dark:${theme.headline};
  --light:${theme.background};
  --line:#e6efe9;
  --radius:18px;
  --shadow:0 10px 30px rgba(0,0,0,.08);
  --text:${theme.text};
  --card:${theme.card};
  --foot:${theme.footerText};
  --btnText:${theme.buttonText};
  --headerBg:${theme.headerBg};
  --headerText:${theme.headerText};
}
*{box-sizing:border-box}
html,body{margin:0;background:var(--light);color:var(--text);font-family:"Outfit",system-ui,Segoe UI,Roboto,sans-serif}
a{color:var(--green);text-decoration:${theme.underlineLinks ? 'underline' : 'none'}}
a:hover{text-decoration:underline}
.container{width:min(1100px,92vw);margin-inline:auto}
header{position:sticky;top:0;background:var(--headerBg);box-shadow:0 1px 0 rgba(0,0,0,.06);z-index:30;color:var(--headerText)}
.nav{display:flex;align-items:center;justify-content:space-between;padding:12px 0;color:var(--headerText)}
.brand{display:flex;align-items:center;gap:.7rem;font-weight:800}
.brand img,.brand svg{height:36px}
.brand span{color:var(--headerText)}
.btn{display:inline-flex;align-items:center;gap:.5rem;background:var(--green);color:var(--btnText);padding:.65rem .95rem;border-radius:12px;box-shadow:var(--shadow);font-weight:700;border:none}
.hero{background:linear-gradient(180deg,#ffffff,#f3faf6)}
.hero .container{display:grid;grid-template-columns:1.15fr .85fr;gap:2rem;align-items:center;padding:3.6rem 0}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:1rem}
.grid{display:grid;gap:1rem}
.cols-2{grid-template-columns:1fr 1fr}
.cols-3{grid-template-columns:repeat(3,1fr)}
.people{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem}
.person{background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;box-shadow:var(--shadow)}
.person img{width:100%;height:180px;object-fit:cover}
.person .info{padding:.8rem}
footer{background:${theme.headline};color:var(--foot);padding:2rem 0;margin-top:2rem}
@media (max-width:940px){
  .hero .container{grid-template-columns:1fr}
  .people{grid-template-columns:repeat(2,1fr)}
  .cols-2,.cols-3{grid-template-columns:1fr}
}
</style>

<header>
  <nav class="container nav">
    <div class="brand">
      ${logoHTML}
      <span>${esc(teamTitle)}</span>
    </div>
    <a class="btn" href="#contact">Contact</a>
  </nav>
</header>

<main id="main">
  <section class="hero">
    <div class="container">
      <div>
        <span class="muted">${esc(t.school ?? '')} ${location ? '• ' + esc(location) : ''} • FTC</span>
        <h1>${esc(t.name)}${t.number ? ' ' + esc(t.number) : ''}</h1>
        <div class="grid cols-3" style="margin-top:1rem">
          <div class="card"><div style="font-size:1.6rem;font-weight:800;color:var(--green)" id="years">1</div><div>Years Competing</div></div>
          <div class="card"><div style="font-size:1.6rem;font-weight:800;color:var(--green)}">${members.length}</div><div>Active Members</div></div>
          <div class="card"><div style="font-size:1.6rem;font-weight:800;color:var(--green)">∞</div><div>Iterations</div></div>
        </div>
      </div>
      ${heroRight}
    </div>
  </section>

  <section id="about">
    <div class="container grid cols-2">
      <div class="card"><h2>About</h2><ul>${LINKS_LIST}</ul></div>
      <div class="card"><h2>Season</h2><ul>${
        bullets.map((b) => `<li>${esc(b)}</li>`).join('') || '<li>Updates coming soon…</li>'
      }</ul></div>
    </div>
  </section>

  ${
    memberCards
      ? `<section id="team"><div class="container"><h2>Team</h2><div class="people">${memberCards}</div></div></section>`
      : ''
  }

  <section id="sponsors">
    <div class="container">
      <h2>Sponsors</h2>
      ${sponsorRows || '<p>Thanks to all our supporters!</p>'}
    </div>
  </section>
</main>

<footer>
  <div class="container">© <span id="y"></span> ${esc(t.name)}</div>
</footer>

<script>
  document.getElementById("y").textContent = new Date().getFullYear();
  (function(){
    var founding = ${Number.isFinite(data.team?.founding) ? Number(data.team!.founding) : 'null'};
    if (founding) {
      var years = Math.max(1, new Date().getFullYear() - founding + 1);
      var el = document.getElementById("years");
      if (el) el.textContent = years;
    }
  })();
</script>
`
}