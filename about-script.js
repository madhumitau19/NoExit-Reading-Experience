const cols = [...document.querySelectorAll('.image-column')];
let pos = 0;   // shared scroll position in px

// stage boundaries (px of scroll)
const COLOPHON_IN  = 300;    // description fades out, colophon fades in
const COLOPHON_OUT = 1100;   // colophon fades out, image columns start scrolling

const maxScroll = col => col.scrollHeight - col.clientHeight;
const imageMax  = () => Math.max(...cols.map(maxScroll));

function updateTheme() {
  const circles = [...document.querySelectorAll('.rust-circle')];
  const visible = circles.some(c => {
    const r = c.getBoundingClientRect();
    return r.bottom > 0 && r.top < innerHeight;   // any part of a circle is on screen
  });
  document.body.classList.toggle('dark', visible);
}

const finalBox = document.getElementById('final-lottie');
const finalSrc = document.querySelector('.trigger').dataset.src;
let finalShown = false;

const finalAnim = (typeof lottie !== 'undefined')
  ? lottie.loadAnimation({
      container: finalBox, renderer: 'svg',
      loop: false, autoplay: false, path: finalSrc
    })
  : null;

let finalTimer = null;

function updateFinal(atEnd) {
  if (!finalAnim || atEnd === finalShown) return;
  finalShown = atEnd;
  clearTimeout(finalTimer);

  if (atEnd) {
    // arriving at the end: fade in and play forward from the start
    finalBox.classList.add('show');
    finalAnim.setDirection(1);
    finalAnim.goToAndPlay(0, true);
  } else {
    // leaving the end: start fading out immediately AND play in reverse underneath
    finalBox.classList.remove('show');
    const from = Math.min(finalAnim.currentFrame, finalAnim.totalFrames - 1);
    finalAnim.setDirection(-1);
    finalAnim.goToAndPlay(from, true);   // explicit frame so it restarts from the paused end state
  }
}

function apply() {
  const total = COLOPHON_OUT + imageMax();
  pos = Math.min(total, Math.max(0, pos));        // clamp

  const inColophon = pos >= COLOPHON_IN && pos < COLOPHON_OUT;

  // description: fades once we pass COLOPHON_IN, fully hidden once the colophon is done
  document.getElementById('description-container').classList.toggle('gone', pos >= COLOPHON_IN);
  document.getElementById('description-container').classList.toggle('hide', pos >= COLOPHON_OUT);

  // colophon: only visible in its own stage
  const colophon = document.getElementById('colophon-container');
  colophon.classList.add('pre-show');
  colophon.classList.toggle('show', inColophon);

  // images only start moving after the colophon stage
  const imgPos = Math.max(0, pos - COLOPHON_OUT);
  cols.forEach((col, i) => {
    const m = maxScroll(col);
    const p = Math.min(imgPos, m);
    // index 0, 2, 4 scroll down; 1, 3 scroll up
    col.scrollTop = i % 2 === 0 ? p : m - p;
  });
  updateFinal(pos >= total - 2);   // -2 tolerates sub-pixel rounding
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
  e.preventDefault();
  animateTo((COLOPHON_IN + COLOPHON_OUT) / 2, 900);
});

document.getElementById('about-reset').addEventListener('click', e => {
  e.preventDefault();
  animateTo(0, 1000);
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