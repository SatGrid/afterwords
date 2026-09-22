const sky = document.querySelector('#sky');
const svg = document.querySelector('#connections');
const count = document.querySelector('#word-count');
const pageLabel = document.querySelector('#page-label');
const prev = document.querySelector('#prev-page');
const next = document.querySelector('#next-page');
const dialog = document.querySelector('#word-dialog');
let words = [];
let page = 0;
const PAGE_SIZE = 24;

function repository() {
  const { hostname, pathname } = location;
  if (!hostname.endsWith('.github.io')) return null;
  const owner = hostname.slice(0, -'.github.io'.length);
  const segment = pathname.split('/').filter(Boolean)[0];
  return `${owner}/${segment || `${owner}.github.io`}`;
}

function seeded(index) {
  let n = (index * 2654435761 + 1013904223) >>> 0;
  n ^= n >>> 16; n = Math.imul(n, 2246822507); n ^= n >>> 13;
  return (n >>> 0) / 4294967296;
}

function layout(items) {
  const width = sky.clientWidth;
  const height = sky.clientHeight;
  const mobile = width < 650;
  const occupied = [];
  return items.map((item, index) => {
    const featured = index === 0;
    const estimatedWidth = Math.min(width * .55, item.word.length * (featured ? (mobile ? 19 : 27) : (mobile ? 10 : 13)) + 38);
    const estimatedHeight = featured ? 52 : 39;
    let x = width / 2, y = height / 2, found = false;
    for (let attempt = 0; attempt < 260; attempt++) {
      const seed = (index + 1) * 300 + attempt * 2;
      const marginX = estimatedWidth / 2 + 12;
      x = marginX + seeded(seed) * Math.max(1, width - marginX * 2);
      y = 30 + seeded(seed + 1) * (height - 60);
      const candidate = {x, y, w: estimatedWidth, h: estimatedHeight};
      if (occupied.every(other => Math.abs(x - other.x) > (candidate.w + other.w) / 2 + 7 || Math.abs(y - other.y) > (candidate.h + other.h) / 2 + 9)) {
        occupied.push(candidate); found = true; break;
      }
    }
    return found ? {item, x, y, featured} : null;
  }).filter(Boolean);
}

function draw() {
  const totalPages = Math.max(1, Math.ceil(words.length / PAGE_SIZE));
  const visible = words.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  sky.querySelectorAll('.star-word,.loading').forEach(el => el.remove());
  svg.replaceChildren();
  const points = layout(visible);
  for (let i = 1; i < points.length; i++) {
    const a = points[i];
    const nearest = points.slice(0, i).reduce((best, point) => {
      const d = Math.hypot(a.x - point.x, a.y - point.y);
      return !best || d < best.d ? {point, d} : best;
    }, null);
    if (nearest && nearest.d < sky.clientWidth * .5) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
      line.setAttribute('x2', nearest.point.x); line.setAttribute('y2', nearest.point.y);
      svg.append(line);
    }
  }
  for (const {item, x, y, featured} of points) {
    const button = document.createElement('button');
    button.className = `star-word${featured ? ' featured' : ''}`;
    button.type = 'button';
    button.textContent = item.word;
    button.style.left = `${x}px`; button.style.top = `${y}px`;
    button.addEventListener('click', () => {
      document.querySelector('#dialog-word').textContent = item.word;
      document.querySelector('#dialog-date').textContent = item.date ? `Arrived ${new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {year:'numeric', month:'long', day:'numeric'})}` : 'An opening word';
      dialog.showModal();
    });
    sky.append(button);
  }
  pageLabel.textContent = totalPages === 1 ? 'Every word has a place.' : `Constellation ${page + 1} of ${totalPages}`;
  prev.disabled = page === 0;
  next.disabled = page >= totalPages - 1;
}

fetch('words.json', {cache:'no-store'})
  .then(response => { if (!response.ok) throw new Error('Could not load words'); return response.json(); })
  .then(data => { words = [...data].reverse(); count.textContent = `${words.length} words left here`; draw(); })
  .catch(() => { sky.querySelector('.loading').textContent = 'The words could not be loaded. Please try again later.'; count.textContent = 'Unavailable'; });

prev.addEventListener('click', () => { page--; draw(); });
next.addEventListener('click', () => { page++; draw(); });
window.addEventListener('resize', () => { if (words.length) draw(); });

const repo = repository();
const sourceLink = document.querySelector('#source-link');
if (repo) sourceLink.href = `https://github.com/${repo}`;
else sourceLink.hidden = true;

document.querySelector('#word-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = document.querySelector('#word-input');
  const word = input.value.trim();
  const note = document.querySelector('#word-note');
  if (!/^\p{L}{2,18}$/u.test(word)) { note.textContent = 'Please enter one word of 2–18 letters.'; input.focus(); return; }
  if (!repo) { note.textContent = 'Word submissions open once this site is published on GitHub Pages.'; return; }
  const title = `Word: ${word}`;
  const body = `I'd like to leave this word in the constellation: **${word}**\n\nPlease review and add the \`approved-word\` label if it fits.`;
  window.open(`https://github.com/${repo}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`, '_blank', 'noopener,noreferrer');
});
