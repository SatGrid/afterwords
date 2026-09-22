const sky = document.querySelector('#sky');
const svg = document.querySelector('#connections');
const count = document.querySelector('#word-count');
const pageLabel = document.querySelector('#page-label');
const prev = document.querySelector('#prev-page');
const next = document.querySelector('#next-page');
const dialog = document.querySelector('#word-dialog');
const relationInput = document.querySelector('#relation-input');
const traceButton = document.querySelector('#trace-path');
const clearTrace = document.querySelector('#clear-trace');
const pager = document.querySelector('.pager');
const findInput = document.querySelector('#find-input');
const findNote = document.querySelector('#find-note');
let words = [];
let page = 0;
let traceWord = null;
let selectedWord = null;
const PAGE_SIZE = 24;
const STORAGE_KEY = 'afterwords-local-words-v1';

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

function localWords() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveLocalWords(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

function refreshRelationOptions() {
  relationInput.replaceChildren(new Option('Choose a word from the map', ''));
  const suggestions = document.querySelector('#word-suggestions');
  suggestions.replaceChildren();
  [...words].sort((a, b) => a.word.localeCompare(b.word)).forEach(item => {
    relationInput.add(new Option(item.word, item.word));
    suggestions.append(new Option(item.word, item.word));
  });
  relationInput.disabled = false;
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

function trailFor(item) {
  const byWord = new Map(words.map(entry => [entry.word.toLocaleLowerCase(), entry]));
  const trail = [];
  const seen = new Set();
  let current = item;
  while (current && !seen.has(current.word.toLocaleLowerCase())) {
    trail.push(current);
    seen.add(current.word.toLocaleLowerCase());
    current = current.parent && byWord.get(current.parent.toLocaleLowerCase());
  }
  return trail;
}

function draw() {
  const totalPages = Math.max(1, Math.ceil(words.length / PAGE_SIZE));
  const traced = traceWord && words.find(item => item.word === traceWord);
  const visible = traced ? trailFor(traced) : words.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  sky.querySelectorAll('.star-word,.loading').forEach(el => el.remove());
  svg.replaceChildren();
  const points = layout(visible);
  const pointByWord = new Map(points.map(point => [point.item.word.toLocaleLowerCase(), point]));
  for (const point of points) {
    const parent = point.item.parent && pointByWord.get(point.item.parent.toLocaleLowerCase());
    if (parent) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.classList.add('chosen-link');
      line.setAttribute('x1', point.x); line.setAttribute('y1', point.y);
      line.setAttribute('x2', parent.x); line.setAttribute('y2', parent.y);
      svg.append(line);
    }
  }
  for (const {item, x, y, featured} of points) {
    const button = document.createElement('button');
    button.className = `star-word${featured ? ' featured' : ''}`;
    button.type = 'button';
    button.dataset.word = item.word.toLocaleLowerCase();
    button.textContent = item.word;
    button.style.left = `${x}px`; button.style.top = `${y}px`;
    button.addEventListener('click', () => {
      selectedWord = item;
      const trail = trailFor(item);
      document.querySelector('#dialog-word').textContent = item.word;
      document.querySelector('#dialog-relation').textContent = item.parent ? `Placed beside ${item.parent}` : 'The first point on the map';
      document.querySelector('#dialog-date').textContent = item.date ? `Arrived ${new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, {year:'numeric', month:'long', day:'numeric'})}` : 'An opening word';
      document.querySelector('#dialog-trail').textContent = trail.map(entry => entry.word).join(' → ');
      traceButton.hidden = trail.length < 2;
      dialog.showModal();
    });
    sky.append(button);
  }
  pageLabel.textContent = traced ? `PATH OF ${traced.word.toLocaleUpperCase()} / ${visible.length} WORDS` : totalPages === 1 ? 'Every word has a place.' : `Constellation ${page + 1} of ${totalPages}`;
  pager.hidden = Boolean(traced);
  clearTrace.hidden = !traced;
  prev.disabled = page === 0;
  next.disabled = page >= totalPages - 1;
}

fetch('words.json', {cache:'no-store'})
  .then(response => { if (!response.ok) throw new Error('Could not load words'); return response.json(); })
  .then(data => {
    const drafts = localWords();
    const seen = new Set(drafts.map(item => item.word.toLocaleLowerCase()));
    words = [...drafts, ...[...data].reverse().filter(item => !seen.has(item.word.toLocaleLowerCase()))];
    refreshRelationOptions();
    count.textContent = `${words.length} words left here`;
    draw();
  })
  .catch(() => { sky.querySelector('.loading').textContent = 'The words could not be loaded. Please try again later.'; count.textContent = 'Unavailable'; });

prev.addEventListener('click', () => { page--; draw(); });
next.addEventListener('click', () => { page++; draw(); });
document.querySelector('#find-form').addEventListener('submit', event => {
  event.preventDefault();
  const query = findInput.value.trim().toLocaleLowerCase();
  if (!query) { findNote.textContent = 'Write a word to find.'; findInput.focus(); return; }
  const match = words.find(item => item.word.toLocaleLowerCase() === query)
    || words.find(item => item.word.toLocaleLowerCase().startsWith(query))
    || words.find(item => item.word.toLocaleLowerCase().includes(query));
  if (!match) { findNote.textContent = 'No word found yet.'; return; }
  traceWord = null;
  page = Math.floor(words.indexOf(match) / PAGE_SIZE);
  draw();
  let target = [...sky.querySelectorAll('.star-word')].find(button => button.dataset.word === match.word.toLocaleLowerCase());
  if (!target) {
    traceWord = match.word;
    draw();
    target = [...sky.querySelectorAll('.star-word')].find(button => button.dataset.word === match.word.toLocaleLowerCase());
  }
  findNote.textContent = `Found “${match.word}”.`;
  document.querySelector('.universe').scrollIntoView({behavior: 'smooth', block: 'start'});
  target?.click();
});
traceButton.addEventListener('click', () => {
  if (!selectedWord) return;
  traceWord = selectedWord.word;
  dialog.close();
  draw();
  document.querySelector('.universe').scrollIntoView({behavior: 'smooth', block: 'start'});
});
clearTrace.addEventListener('click', () => { traceWord = null; draw(); });
window.addEventListener('resize', () => { if (words.length) draw(); });

const repo = repository();
const sourceLink = document.querySelector('#source-link');
if (repo) sourceLink.href = `https://github.com/${repo}`;
else sourceLink.hidden = true;

document.querySelector('#word-form').addEventListener('submit', event => {
  event.preventDefault();
  const input = document.querySelector('#word-input');
  const word = input.value.trim();
  const parent = relationInput.value;
  const note = document.querySelector('#word-note');
  if (!/^\p{L}{2,18}$/u.test(word)) { note.textContent = 'Please enter one word of 2–18 letters.'; input.focus(); return; }
  if (!parent) { note.textContent = 'Choose an existing word to place yours beside.'; relationInput.focus(); return; }
  if (word.toLocaleLowerCase() === parent.toLocaleLowerCase()) { note.textContent = 'Choose a different word to place yours beside.'; relationInput.focus(); return; }
  if (words.some(item => item.word.toLocaleLowerCase() === word.toLocaleLowerCase())) {
    note.textContent = 'That word is already on the map.';
    input.focus();
    return;
  }
  const item = {word: word.toLocaleLowerCase(), parent, date: new Date().toISOString().slice(0, 10), issue: null, local: true};
  const drafts = [item, ...localWords()];
  if (!saveLocalWords(drafts)) {
    note.textContent = 'Your browser blocked local saving. Please allow site storage and try again.';
    return;
  }
  words.unshift(item);
  page = 0;
  traceWord = null;
  refreshRelationOptions();
  count.textContent = `${words.length} words left here`;
  draw();
  input.value = '';
  relationInput.value = '';
  note.textContent = `“${item.word}” was added beside “${parent}”. It will stay on this device.`;
  document.querySelector('.universe').scrollIntoView({behavior: 'smooth', block: 'start'});
});
