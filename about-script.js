const cols = [...document.querySelectorAll('.image-column')];
let pos = 0;   // shared scroll position in px

const maxScroll = col => col.scrollHeight - col.clientHeight;

function updateTheme() {
  const circles = [...document.querySelectorAll('.rust-circle')];
  const visible = circles.some(c => {
    const r = c.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;   // any part of a circle is on screen
  });
  document.body.classList.toggle('dark', visible);
  document.getElementById("description-container").classList.toggle('gone', visible);
  document.getElementById("colophon-container").classList.add('pre-show', visible);
}

function apply() {
  const max = Math.max(...cols.map(maxScroll));
  pos = Math.min(max, Math.max(0, pos));          // clamp

  const atEnd = pos >= max - 1;   // -1 tolerates sub-pixel rounding
  const atMiddle = pos >= max * 0.5;
document.getElementById('description-container').classList.toggle('hide', atMiddle);
document.getElementById('colophon-container').classList.toggle('show', atEnd);

  cols.forEach((col, i) => {
    const m = maxScroll(col);
    const p = Math.min(pos, m);
    // index 0, 2, 4 (columns 1, 3, 5) scroll down; 1, 3 (columns 2, 4) scroll up
    col.scrollTop = i % 2 === 0 ? p : m - p;
  });

  updateTheme();
}

let animId = null;

function animateTo(target, duration = 2000) {
  cancelAnimationFrame(animId);
  const start = pos;
  const change = target - start;
  const t0 = performance.now();
  const ease = x => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);  // ease in/out

  function step(now) {
    const t = Math.min(1, (now - t0) / duration);
    pos = start + change * ease(t);
    apply();
    if (t < 1) animId = requestAnimationFrame(step);
  }
  animId = requestAnimationFrame(step);
}

document.getElementById('colophon-btn').addEventListener('click', e => {
  e.preventDefault();                                   // stop the link reloading the page
  animateTo(Math.max(...cols.map(maxScroll)));          // scroll to the very end
});

document.getElementById('about-reset').addEventListener('click', e => {
  e.preventDefault();      // stop the link reloading the page
  animateTo(0);            // scroll back to the start
});

window.addEventListener('wheel', e => {
  cancelAnimationFrame(animId);   // <- add this
  e.preventDefault();
  const unit = e.deltaMode === 1 ? 16 : 1;        // Firefox mouse wheels report lines
  pos += e.deltaY * unit;
  apply();
}, { passive: false });

window.addEventListener('load', apply);            // set the start positions
window.addEventListener('resize', apply);