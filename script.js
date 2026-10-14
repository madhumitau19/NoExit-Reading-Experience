// const lottieBox = document.getElementById('lottie-box');
// const lotties = new Map();   // trigger → { anim, holder }

// triggers.filter(t => t.dataset.type === 'lottie').forEach(t => {
//   const holder = document.createElement('div');
//   holder.className = 'lottie-holder';
//   lottieBox.appendChild(holder);
//   const anim = lottie.loadAnimation({
//     container: holder, renderer: 'svg',
//     loop: false, autoplay: false, path: t.dataset.src
//   });
//   lotties.set(t, { anim, holder });
// });

// const src = document.getElementById('no-exit');
// const center = document.getElementById('center');
// const img = document.getElementById('rust1');
// const triggers = [...document.querySelectorAll('.trigger')];

// let active = null, progress = 0;


const src = document.getElementById('no-exit');
const center = document.getElementById('center');
const img = document.getElementById('rust1');
const triggers = [...document.querySelectorAll('.trigger')];

let active = null, progress = 0;

const HOLD_AT = 0.55;   // image fully revealed
const HOLD_MS = 2000;   // how long to linger
let holdUntil = 0; 

const lottieBox = document.getElementById('lottie-box');
const lotties = new Map();   // trigger → { anim, holder }

if (typeof lottie !== 'undefined') {
  triggers.filter(t => t.dataset.type === 'lottie').forEach(t => {
    const holder = document.createElement('div');
    holder.className = 'lottie-holder';
    lottieBox.appendChild(holder);
    const anim = lottie.loadAnimation({
      container: holder, renderer: 'svg',
      loop: false, autoplay: false, path: t.dataset.src
    });
    anim.addEventListener('data_failed', () => console.error('Lottie failed to load:', t.dataset.src));
    lotties.set(t, { anim, holder });
  });
} else {
  console.error('lottie library not loaded');
}



// true = the marker is still below the trigger line (not reached yet)
const wasBelow = new Map(triggers.map(t => [t, true]));

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = x => x * x * (3 - 2 * x);
// p controls how slow the ends are: 3 = gentle, 5 = strong, 7 = very slow ends
const easeInOutPow = (x, p = 12) =>
  x < 0.5
    ? Math.pow(2, p - 1) * Math.pow(x, p)
    : 1 - Math.pow(-2 * x + 2, p) / 2;

const maxProgress = t => t.dataset.type === 'lottie' ? 0.9 : 1;

const LOTTIE_DONE = 0.6;   // progress where the animation has finished playing
const EXIT_MS = 700;       // fade + collapse duration once triggered

let autoRaf = null;
let autoing = false;

function autoTo(target, ms, done) {
  cancelAnimationFrame(autoRaf);
  const from = progress;
  const t0 = performance.now();
  autoing = true;

  function step(now) {
    const k = clamp((now - t0) / ms);
    progress = from + (target - from) * ease(k);
    render();
    if (k < 1) {
      autoRaf = requestAnimationFrame(step);
    } else {
      autoing = false;
      if (done) done();
    }
  }
  autoRaf = requestAnimationFrame(step);
}

const LINGER_MS = 0;   // pause on the finished quote before it fades; 0 = immediate

function exitLottie() {
  const t = active;
  autoing = true;      // swallows further wheel events
  setTimeout(() => {
    if (active !== t) return;   // scene was ended meanwhile (e.g. title jump)
    autoTo(maxProgress(t), EXIT_MS, () => end(true));
  }, LINGER_MS);
}

function lineY() {
  return src.getBoundingClientRect().top + src.clientHeight * 0.3;
}

function start(t, from) {
  active = t;
  progress = from;
  src.scrollTop += t.getBoundingClientRect().top - lineY();
  src.style.overflow = 'hidden';
  center.classList.add('active');

  if (t.dataset.type === 'lottie') {
    lotties.get(t).holder.style.display = 'block';
  } else {
    img.src = t.dataset.src;
  }

  if (t.dataset.type === 'lottie') {
    const entry = lotties.get(t);
    if (!entry) { active = null; src.style.overflow = ''; center.classList.remove('active'); return; }
    entry.holder.style.display = 'block';
  }
  render();
}

const seg = (a, b) => clamp((progress - a) / (b - a));   // 0→1 between a and b

function render() {
  if (active.dataset.type === 'lottie') {
    img.style.opacity = 0;
    renderLottie();
    return;
  }
  const push    = ease(seg(0, 0.12));      // column pushes the others aside
  const grow    = ease(seg(0.12, 0.32));   // image fades in + grows to column height
  const unmask  = ease(seg(0.32, 0.55));   // window widens to full width
  const fadeOut = ease(seg(0.55, 0.75));      // final fade

  // center column: grows first, then shrinks back as the unmasking starts
  const colScale = push * (1 - unmask);
  center.style.flex = `0 0 ${colScale * 20}%`;
  center.style.marginLeft = `${-(1 - colScale) * 20}px`;

  // geometry
  const box  = src.getBoundingClientRect();       // column top + height
  const W    = innerWidth - 20;                   // full width minus 10px margins
  const colW = W * 0.2;                           // normal column width
  const winW = colW + (W - colW) * unmask;        // current visible window width
  const inset = (W - winW) / 2;                   // masked amount on each side

  // the image box never changes size; the clip-path is the "container"
  img.style.left   = '10px';
  img.style.top    = box.top + 'px';
  img.style.width  = W + 'px';
  img.style.height = box.height + 'px';
  img.style.clipPath  = `inset(0 ${inset}px 0 ${inset}px)`;
//   img.style.transform = `scale(${0.3 + 0.7 * grow})`;   // grows to full column height
  img.style.opacity   = grow * (1 - fadeOut);

  document.body.classList.toggle('inverted', progress >= 0.27 && progress <= 0.55);
}

function renderLottie() {
  const { anim } = lotties.get(active);
  const lastFrame = Number(active.dataset.end) || (anim.totalFrames - 1);

  // column grows at the start, collapses while the quote is fading
  const col = ease(seg(0, 0.1)) * (1 - easeInOutPow(seg(0.62, 0.9), 3));
  center.style.flex = `0 0 ${col * 20}%`;
  center.style.marginLeft = `${-(1 - col) * 20}px`;

  // animation plays 0.1 → 0.6, fade-out starts the instant it finishes
  anim.goToAndStop(seg(0.1, 0.6) * lastFrame, true);
  lottieBox.style.opacity = ease(seg(0.05, 0.15)) * (1 - ease(seg(0.6, 0.68)));
}

function end(forward) {
  cancelAnimationFrame(autoRaf);
  autoing = false;
  if (active.dataset.type === 'lottie') {
    lotties.get(active).holder.style.display = 'none';
    lottieBox.style.opacity = 0;
  }
  center.classList.remove('active');
  center.style.flex = '';
  center.style.marginLeft = '';
  img.style.opacity = 0;
  src.style.overflow = '';                 // unlock scrolling
  wasBelow.set(active, !forward);
  active = null;
  document.body.classList.remove('inverted');
}

// detect crossing the marker in either direction
src.addEventListener('scroll', () => {
  if (active || jumping) return;
  const line = lineY();
  triggers.forEach(t => {
    const below = t.getBoundingClientRect().top > line;
    if (below === wasBelow.get(t)) return;
    wasBelow.set(t, below);
    start(t, below ? maxProgress(t) : 0);
    if (below && t.dataset.type === 'lottie') autoTo(LOTTIE_DONE, EXIT_MS);
  });
});

// the wheel drives the scene both ways
window.addEventListener('wheel', e => {
  if (e.target.closest('#caring-index')) return;
  e.preventDefault();

  if (jumping) return;

  if (!active) {
    const unit = e.deltaMode === 1 ? 16 : 1;
    src.scrollTop += e.deltaY * unit;
    return;
  }

  if (autoing) return;
  if (performance.now() < holdUntil) return;   // image hold (unchanged)

  const isLottie = active.dataset.type === 'lottie';

  // already at the finished frame (e.g. entered from below) + scroll down: exit
  if (isLottie && e.deltaY > 0 && progress >= LOTTIE_DONE) {
    exitLottie();
    return;
  }

  const prev = progress;
  const sens = isLottie ? 1600 : 2600;   // lotties need less wheel travel
  progress = clamp(progress + e.deltaY / sens, 0, maxProgress(active));

  // lottie reached its last frame: start the exit right away
  if (isLottie && prev < LOTTIE_DONE && progress >= LOTTIE_DONE) {
    progress = LOTTIE_DONE;
    render();
    exitLottie();
    return;
  }

  // image hold (unchanged)
  if (!isLottie &&
      ((prev < HOLD_AT && progress >= HOLD_AT) || (prev > HOLD_AT && progress <= HOLD_AT))) {
    progress = HOLD_AT;
    holdUntil = performance.now() + HOLD_MS;
  }

  render();
  if (progress >= maxProgress(active)) end(true);
  else if (progress <= 0) end(false);
}, { passive: false });

document.getElementById("fig-button").addEventListener("click", ()=>{
    document.getElementById("caring-index").classList.toggle("show");
});

document.addEventListener("click", (e) => {
    if (!document.getElementById("fig-button").contains(e.target) && !document.getElementById("caring-index").contains(e.target)) {
        document.getElementById("caring-index").classList.remove("show");
    }
});


let jumping = false;
let jumpRaf = null;
const JUMP_MS = 6000;   // total travel time, lower = faster

function jumpTo(toEnd) {
  if (active) end(toEnd);          // clean up any running scene first
  holdUntil = 0;
  cancelAnimationFrame(jumpRaf);

  const from = src.scrollTop;
  const to = toEnd ? src.scrollHeight - src.clientHeight : 0;
  if (Math.abs(to - from) < 1) return;

  jumping = true;
  const t0 = performance.now();

  function step(now) {
    const k = clamp((now - t0) / JUMP_MS);
    src.scrollTop = from + (to - from) * easeInOutPow(k, 5);
    if (k < 1) {
      jumpRaf = requestAnimationFrame(step);
    } else {
      // re-sync so no trigger thinks it was just crossed
      triggers.forEach(t => wasBelow.set(t, t.getBoundingClientRect().top > lineY()));
      jumping = false;
    }
  }
  jumpRaf = requestAnimationFrame(step);
}

document.getElementById('no-exit-title').addEventListener('click', () => jumpTo(false));
document.getElementById('caring-title').addEventListener('click', () => jumpTo(true));


//Close button
document.getElementById("close-btn").addEventListener("click", ()=>{
  document.getElementById("caring-index").classList.remove("show");
})