// // const lottieBox = document.getElementById('lottie-box');
// // const lotties = new Map();   // trigger → { anim, holder }

// // triggers.filter(t => t.dataset.type === 'lottie').forEach(t => {
// //   const holder = document.createElement('div');
// //   holder.className = 'lottie-holder';
// //   lottieBox.appendChild(holder);
// //   const anim = lottie.loadAnimation({
// //     container: holder, renderer: 'svg',
// //     loop: false, autoplay: false, path: t.dataset.src
// //   });
// //   lotties.set(t, { anim, holder });
// // });

// // const src = document.getElementById('no-exit');
// // const center = document.getElementById('center');
// // const img = document.getElementById('rust1');
// // const triggers = [...document.querySelectorAll('.trigger')];

// // let active = null, progress = 0;


// const src = document.getElementById('no-exit');
// const center = document.getElementById('center');
// const img = document.getElementById('rust1');
// const triggers = [...document.querySelectorAll('.trigger')];

// let active = null, progress = 0;

// const HOLD_AT = 0.55;   // image fully revealed
// const HOLD_MS = 2000;   // how long to linger
// let holdUntil = 0; 
// let sceneStart = 0;
// const ENTRY_RAMP_MS = 800;   // longer = gentler entry
// const ENTRY_SENS_IMG    = 3400;   // higher = slower entry (was 2600)
// const ENTRY_SENS_LOTTIE = 2800;   // higher = slower entry (was 2000)
// const RAMP_FLOOR = 0.4;           // starting speed as a fraction (0.15 felt choppy)

// const lottieBox = document.getElementById('lottie-box');
// const lotties = new Map();   // trigger → { anim, holder }

// if (typeof lottie !== 'undefined') {
//   triggers.filter(t => t.dataset.type === 'lottie').forEach(t => {
//     const holder = document.createElement('div');
//     holder.className = 'lottie-holder';
//     lottieBox.appendChild(holder);
//     const anim = lottie.loadAnimation({
//       container: holder, renderer: 'svg',
//       loop: false, autoplay: false, path: t.dataset.src
//     });
//     anim.addEventListener('data_failed', () => console.error('Lottie failed to load:', t.dataset.src));
//     lotties.set(t, { anim, holder });
//   });
// } else {
//   console.error('lottie library not loaded');
// }



// // true = the marker is still below the trigger line (not reached yet)
// const wasBelow = new Map(triggers.map(t => [t, true]));

// const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
// const ease = x => x * x * (3 - 2 * x);
// // p controls how slow the ends are: 3 = gentle, 5 = strong, 7 = very slow ends
// const easeInOutPow = (x, p = 12) =>
//   x < 0.5
//     ? Math.pow(2, p - 1) * Math.pow(x, p)
//     : 1 - Math.pow(-2 * x + 2, p) / 2;

// const maxProgress = t => t.dataset.type === 'lottie' ? 1 : 1;

// const LOTTIE_DONE = 0.6;   // progress where the animation has finished playing
// const EXIT_MS = 1200;       // fade + collapse duration once triggered
// const LOTTIE_EXIT_MS = 2200;  // lottie exit only (EXIT_MS stays for entering from below)
// const IMG_EXIT_MS = 700;   // image + background fade out together

// let autoRaf = null;
// let autoing = false;

// function autoTo(target, ms, done, easing = ease) {
//   cancelAnimationFrame(autoRaf);
//   const from = progress;
//   const t0 = performance.now();
//   autoing = true;

//   function step(now) {
//     const k = clamp((now - t0) / ms);
//     progress = from + (target - from) * easing(k);
//     render();
//     if (k < 1) {
//       autoRaf = requestAnimationFrame(step);
//     } else {
//       autoing = false;
//       if (done) done();
//     }
//   }
//   autoRaf = requestAnimationFrame(step);
// }

// const LINGER_MS = 300;   // pause on the finished quote before it fades; 0 = immediate

// function exitLottie() {
//   if (!active) return;
//   const t = active;
//   autoing = true;      // swallows further wheel events
//   setTimeout(() => {
//     if (active !== t) return;   // scene ended meanwhile (e.g. title jump)
//     autoTo(1, LOTTIE_EXIT_MS, () => end(true));
//   }, LINGER_MS);
// }

// function lineY() {
//   return src.getBoundingClientRect().top + src.clientHeight * 0.3;
// }

// function start(t, from) {
//   sceneStart = performance.now();
//   active = t;
//   progress = from;
//   src.scrollTop += t.getBoundingClientRect().top - lineY();
//   src.style.overflow = 'hidden';
//   center.classList.add('active');

//   if (t.dataset.type === 'lottie') {
//     lotties.get(t).holder.style.display = 'block';
//   } else {
//     img.src = t.dataset.src;
//   }

//   if (t.dataset.type === 'lottie') {
//     const entry = lotties.get(t);
//     if (!entry) { active = null; src.style.overflow = ''; center.classList.remove('active'); return; }
//     entry.holder.style.display = 'block';
//   }
//   render();
// }

// const seg = (a, b) => clamp((progress - a) / (b - a));   // 0→1 between a and b
// // function setInvert(v) {
// //   const b = document.body;
// //   if (v <= 0.001) {
// //     b.classList.remove('scene', 'inverted');
// //     b.style.removeProperty('background-color');
// //     b.style.removeProperty('color');
// //     b.style.removeProperty('--inv');
// //     return;
// //   }
// //   const c = Math.round(255 * (1 - v));
// //   b.classList.add('scene');
// //   b.style.backgroundColor = `rgb(${c},${c},${c})`;
// //   b.style.color = `rgb(${255 - c},${255 - c},${255 - c})`;
// //   b.style.setProperty('--inv', v);
// //   b.classList.toggle('inverted', v > 0.5);   // only used to block pointer events
// // }

// function render() {
//   if (active.dataset.type === 'lottie') {
//     img.style.opacity = 0;
//     renderLottie();
//     return;
//   }
//   const push    = ease(seg(0, 0.12));      // column pushes the others aside
//   const grow    = ease(seg(0.12, 0.32));   // image fades in + grows to column height
//   const unmask  = ease(seg(0.32, 0.55));   // window widens to full width
//   const fadeOut = ease(seg(0.55, 0.75));      // final fade

//   // center column: grows first, then shrinks back as the unmasking starts
//   const colScale = push * (1 - unmask);
//   center.style.flex = `0 0 ${colScale * 20}%`;
//   center.style.marginLeft = `${-(1 - colScale) * 20}px`;

//   // geometry
//   const box  = src.getBoundingClientRect();       // column top + height
//   const W    = innerWidth - 20;                   // full width minus 10px margins
//   const colW = W * 0.2;                           // normal column width
//   const winW = colW + (W - colW) * unmask;        // current visible window width
//   const inset = (W - winW) / 2;                   // masked amount on each side

//   // the image box never changes size; the clip-path is the "container"
//   img.style.left   = '10px';
//   img.style.top    = box.top + 'px';
//   img.style.width  = W + 'px';
//   img.style.height = box.height + 'px';
//   img.style.clipPath  = `inset(0 ${inset}px 0 ${inset}px)`;
// //   img.style.transform = `scale(${0.3 + 0.7 * grow})`;   // grows to full column height
//   img.style.opacity   = grow * (1 - fadeOut);

//   const b = document.body;
// if (progress > HOLD_AT) {
//   // exit: background follows the exact same value as the image fade
//   const c = Math.round(255 * fadeOut);
//   b.style.transition = 'none';
//   b.style.backgroundColor = `rgb(${c},${c},${c})`;
//   b.style.color = `rgb(${255 - c},${255 - c},${255 - c})`;
//   b.classList.toggle('inverted', fadeOut < 0.5);   // columns start returning halfway
// } else {
//   // entry: unchanged, timed CSS transition
//   b.style.transition = '';
//   b.style.removeProperty('background-color');
//   b.style.removeProperty('color');
//   b.classList.toggle('inverted', progress >= 0.27 && progress <= 0.55);
// }
// }

// function renderLottie() {
//   const { anim } = lotties.get(active);
//   const lastFrame = Number(active.dataset.end) || (anim.totalFrames - 1);

//   // fade first (0.6 → 0.75), then the column collapses (0.75 → 1) with the quote already gone
//   const col = ease(seg(0, 0.1)) * (1 - easeInOutPow(seg(0.75, 1), 3));
//   center.style.flex = `0 0 ${col * 20}%`;
//   center.style.marginLeft = `${-(1 - col) * 20}px`;

//   anim.goToAndStop(seg(0.1, 0.6) * lastFrame, true);
//   lottieBox.style.opacity = ease(seg(0.05, 0.15)) * (1 - ease(seg(0.6, 0.75)));
// }

// function end(forward) {
//   cancelAnimationFrame(autoRaf);
//   autoing = false;
//   if (active.dataset.type === 'lottie') {
//     lotties.get(active).holder.style.display = 'none';
//     lottieBox.style.opacity = 0;
//   }
//   center.classList.remove('active');
//   center.style.flex = '';
//   center.style.marginLeft = '';
//   img.style.opacity = 0;
//   src.style.overflow = '';                 // unlock scrolling
//   wasBelow.set(active, !forward);
//   active = null;
//   const b = document.body;
//   b.style.transition = '';
//   b.style.removeProperty('background-color');
//   b.style.removeProperty('color');
//   b.classList.remove('inverted');
// }

// // detect crossing the marker in either direction
// src.addEventListener('scroll', () => {
//   if (active || jumping) return;
//   const line = lineY();
//   triggers.forEach(t => {
//     const below = t.getBoundingClientRect().top > line;
//     if (below === wasBelow.get(t)) return;
//     wasBelow.set(t, below);
//     start(t, below ? maxProgress(t) : 0);
//     if (below && t.dataset.type === 'lottie') autoTo(LOTTIE_DONE, EXIT_MS);
//   });
// });

// // the wheel drives the scene both ways
// window.addEventListener('wheel', e => {
//   const now = performance.now();
//   if (e.target.closest('#caring-index')) return;
//   e.preventDefault();

//   if (jumping) return;

//   if (!active) {
//     const unit = e.deltaMode === 1 ? 16 : 1;
//     src.scrollTop += e.deltaY * unit;
//     return;
//   }

//   if (autoing) return;
//   if (performance.now() < holdUntil) return;   // image hold (unchanged)

//   const isLottie = active.dataset.type === 'lottie';

//   // already at the finished frame (e.g. entered from below) + scroll down: exit
//   if (isLottie && e.deltaY > 0 && progress >= LOTTIE_DONE) {
//     exitLottie();
//     return;
//   }

//   // image fully revealed + scroll down: fade image and background out together
// // lottie entry: one scroll down starts a slow, smooth, timed play
// if (isLottie && e.deltaY > 0 && progress < LOTTIE_DONE) {
//   autoTo(LOTTIE_DONE, LOTTIE_ENTRY_MS, exitLottie, x => easeInOutPow(x, 2));
//   return;
// }
//   const prev = progress;
//  // entry = scrolling down toward the scene's resting point
// const isEntry = e.deltaY > 0 && progress < (isLottie ? LOTTIE_DONE : HOLD_AT);
// const sens = isEntry
//   ? (isLottie ? ENTRY_SENS_LOTTIE : ENTRY_SENS_IMG)
//   : (isLottie ? 2000 : 2600);
// const ramp = isEntry
//   ? RAMP_FLOOR + (1 - RAMP_FLOOR) * ease(clamp((now - sceneStart) / ENTRY_RAMP_MS))
//   : 1; 
//   progress = clamp(progress + (e.deltaY / sens) * ramp, 0, maxProgress(active));

//   // lottie reached its last frame: start the exit right away
//   if (isLottie && prev < LOTTIE_DONE && progress >= LOTTIE_DONE) {
//     progress = LOTTIE_DONE;
//     render();
//     exitLottie();
//     return;
//   }

//   // image hold (unchanged)
//   if (!isLottie &&
//       ((prev < HOLD_AT && progress >= HOLD_AT) || (prev > HOLD_AT && progress <= HOLD_AT))) {
//     progress = HOLD_AT;
//     holdUntil = performance.now() + HOLD_MS;
//   }

//   render();
//   if (progress >= maxProgress(active)) end(true);
//   else if (progress <= 0) end(false);
// }, { passive: false });

// document.getElementById("fig-button").addEventListener("click", ()=>{
//     document.getElementById("caring-index").classList.toggle("show");
// });

// document.addEventListener("click", (e) => {
//     if (!document.getElementById("fig-button").contains(e.target) && !document.getElementById("caring-index").contains(e.target)) {
//         document.getElementById("caring-index").classList.remove("show");
//     }
// });


// let jumping = false;
// let jumpRaf = null;
// const JUMP_MS = 6000;   // total travel time, lower = faster
// const LOTTIE_ENTRY_MS = 3500;   // higher = slower, smoother entry

// function jumpTo(toEnd) {
//   if (active) end(toEnd);          // clean up any running scene first
//   holdUntil = 0;
//   cancelAnimationFrame(jumpRaf);

//   const from = src.scrollTop;
//   const to = toEnd ? src.scrollHeight - src.clientHeight : 0;
//   if (Math.abs(to - from) < 1) return;

//   jumping = true;
//   const t0 = performance.now();

//   function step(now) {
//     const k = clamp((now - t0) / JUMP_MS);
//     src.scrollTop = from + (to - from) * easeInOutPow(k, 5);
//     if (k < 1) {
//       jumpRaf = requestAnimationFrame(step);
//     } else {
//       // re-sync so no trigger thinks it was just crossed
//       triggers.forEach(t => wasBelow.set(t, t.getBoundingClientRect().top > lineY()));
//       jumping = false;
//     }
//   }
//   jumpRaf = requestAnimationFrame(step);
// }

// document.getElementById('no-exit-title').addEventListener('click', () => jumpTo(false));
// document.getElementById('caring-title').addEventListener('click', () => jumpTo(true));


// //Close button
// document.getElementById("close-btn").addEventListener("click", ()=>{
//   document.getElementById("caring-index").classList.remove("show");
// })

// ---------- elements ----------
const src = document.getElementById('no-exit');
const center = document.getElementById('center');
const img = document.getElementById('rust1');
const lottieBox = document.getElementById('lottie-box');
const triggers = [...document.querySelectorAll('.trigger')];

// ---------- settings ----------
// images
const HOLD_AT = 0.55;            // image fully revealed
const HOLD_MS = 2000;            // how long to linger there
const IMG_EXIT_MS = 700;         // image + background fade out together
const ENTRY_RAMP_MS = 800;
const ENTRY_SENS_IMG = 3400;     // higher = slower entry
const RAMP_FLOOR = 0.4;

// lotties (all timed, one scroll starts the whole sequence)
const LOTTIE_DONE = 0.6;         // progress where the animation has finished playing
const LOTTIE_GROW_MS = 900;      // column opens
const LOTTIE_PLAY_MS = 4500;     // the animation itself (higher = slower)
const LINGER_MS = 600;           // pause on the finished quote
const LOTTIE_FADE_MS = 1100;     // quote fades out
const LOTTIE_COLLAPSE_MS = 1400; // columns return to normal width
const LOTTIE_REVERSE_MS = 1200;  // entering a lottie from below

// page jump (title clicks)
const JUMP_MS = 6000;

// ---------- state ----------
let active = null, progress = 0;
let holdUntil = 0;
let sceneStart = 0;
let autoRaf = null, autoing = false;
let runId = 0;
let jumping = false, jumpRaf = null;

// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = x => x * x * (3 - 2 * x);
const linear = x => x;
const easeInOutPow = (x, p = 12) =>
  x < 0.5
    ? Math.pow(2, p - 1) * Math.pow(x, p)
    : 1 - Math.pow(-2 * x + 2, p) / 2;
const seg = (a, b) => clamp((progress - a) / (b - a));   // 0→1 between a and b

function lineY() {
  return src.getBoundingClientRect().top + src.clientHeight * 0.3;
}

// ---------- lotties ----------
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

// ---------- timed animation ----------
function autoTo(target, ms, done, easing = ease) {
  cancelAnimationFrame(autoRaf);
  const from = progress;
  const t0 = performance.now();
  autoing = true;

  function step(now) {
    const k = clamp((now - t0) / ms);
    progress = from + (target - from) * easing(k);
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

// Runs a list of stages in order. If the scene is already partway through
// (e.g. entered from below), finished stages are skipped and the current
// one is shortened in proportion.
function runStages(stages) {
  const id = ++runId;
  const next = () => {
    if (id !== runId || !active) return;
    autoing = true;                                   // swallow wheel events between stages
    const s = stages.shift();
    if (!s) { end(true); return; }
    if (s.wait) { setTimeout(next, s.wait); return; }
    if (progress >= s.to) { next(); return; }
    let ms = s.ms;
    if (progress > s.from) ms *= (s.to - progress) / (s.to - s.from);
    autoTo(s.to, ms, next, linear);                   // all easing lives in renderLottie
  };
  next();
}

function playLottie() {
  runStages([
    { from: 0,           to: 0.1,          ms: LOTTIE_GROW_MS },
    { from: 0.1,         to: LOTTIE_DONE,  ms: LOTTIE_PLAY_MS },
    { wait: LINGER_MS },
    { from: LOTTIE_DONE, to: 0.75,         ms: LOTTIE_FADE_MS },
    { from: 0.75,        to: 1,            ms: LOTTIE_COLLAPSE_MS },
  ]);
}

// ---------- scene lifecycle ----------
function start(t, from) {
  const entry = lotties.get(t);
  if (t.dataset.type === 'lottie' && !entry) return;   // lottie failed to load

  sceneStart = performance.now();
  active = t;
  progress = from;
  src.scrollTop += t.getBoundingClientRect().top - lineY();
  src.style.overflow = 'hidden';
  center.classList.add('active');

  if (t.dataset.type === 'lottie') {
    entry.holder.style.display = 'block';
  } else {
    img.src = t.dataset.src;
  }
  render();
}

function end(forward) {
  if (!active) return;
  runId++;                                  // cancels any running stage sequence
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
  src.style.overflow = '';                  // unlock scrolling
  wasBelow.set(active, !forward);
  active = null;

  const b = document.body;
  b.style.transition = '';
  b.style.removeProperty('background-color');
  b.style.removeProperty('color');
  b.classList.remove('inverted');
}

// ---------- rendering ----------
function render() {
  if (active.dataset.type === 'lottie') {
    img.style.opacity = 0;
    renderLottie();
    return;
  }

  const push    = ease(seg(0, 0.12));      // column pushes the others aside
  const grow    = ease(seg(0.12, 0.32));   // image fades in
  const unmask  = ease(seg(0.32, 0.55));   // window widens to full width
  const fadeOut = ease(seg(0.55, 0.75));   // final fade

  const colScale = push * (1 - unmask);
  center.style.flex = `0 0 ${colScale * 20}%`;
  center.style.marginLeft = `${-(1 - colScale) * 20}px`;

  const box  = src.getBoundingClientRect();
  const W    = innerWidth - 20;
  const colW = W * 0.2;
  const winW = colW + (W - colW) * unmask;
  const inset = (W - winW) / 2;

  img.style.left   = '10px';
  img.style.top    = box.top + 'px';
  img.style.width  = W + 'px';
  img.style.height = box.height + 'px';
  img.style.clipPath = `inset(0 ${inset}px 0 ${inset}px)`;
  img.style.opacity  = grow * (1 - fadeOut);

  const b = document.body;
  if (progress > HOLD_AT) {
    // exit: background follows the exact same value as the image fade
    const c = Math.round(255 * fadeOut);
    b.style.transition = 'none';
    b.style.backgroundColor = `rgb(${c},${c},${c})`;
    b.style.color = `rgb(${255 - c},${255 - c},${255 - c})`;
    b.classList.toggle('inverted', fadeOut < 0.5);
  } else {
    // entry: timed CSS transition
    b.style.transition = '';
    b.style.removeProperty('background-color');
    b.style.removeProperty('color');
    b.classList.toggle('inverted', progress >= 0.27 && progress <= 0.55);
  }
}

function renderLottie() {
  const { anim } = lotties.get(active);
  const lastFrame = Number(active.dataset.end) || (anim.totalFrames - 1);

  // 0 → 0.1 column opens | 0.1 → 0.6 animation plays | 0.6 → 0.75 quote fades | 0.75 → 1 columns return
  const col = ease(seg(0, 0.1)) * (1 - easeInOutPow(seg(0.75, 1), 3));
  center.style.flex = `0 0 ${col * 20}%`;
  center.style.marginLeft = `${-(1 - col) * 20}px`;

  anim.goToAndStop(seg(0.1, LOTTIE_DONE) * lastFrame, true);   // constant speed
  lottieBox.style.opacity = ease(seg(0.05, 0.15)) * (1 - ease(seg(0.6, 0.75)));
}

// ---------- input ----------
// detect crossing the marker in either direction
src.addEventListener('scroll', () => {
  if (active || jumping) return;
  const line = lineY();
  triggers.forEach(t => {
    if (active) return;
    const below = t.getBoundingClientRect().top > line;
    if (below === wasBelow.get(t)) return;
    wasBelow.set(t, below);
    start(t, below ? 1 : 0);
    // entering a lottie from below: play back to the finished frame
    if (active && below && t.dataset.type === 'lottie') {
      autoTo(LOTTIE_DONE, LOTTIE_REVERSE_MS, null, easeInOutPow);
    }
  });
});

window.addEventListener('wheel', e => {
  if (e.target.closest('#caring-index')) return;
  e.preventDefault();
  if (jumping) return;

  const now = performance.now();

  if (!active) {
    const unit = e.deltaMode === 1 ? 16 : 1;   // Firefox mouse wheels report lines
    src.scrollTop += e.deltaY * unit;
    return;
  }

  if (autoing || now < holdUntil) return;

  const isLottie = active.dataset.type === 'lottie';

  // ----- lotties -----
  if (isLottie) {
    if (e.deltaY > 0) {
      playLottie();                              // one scroll = the whole sequence
    } else {
      progress = clamp(progress + e.deltaY / 2000, 0, 1);   // scrolling up: manual reverse
      render();
      if (progress <= 0) end(false);
    }
    return;
  }

  // ----- images -----
  // fully revealed + scroll down: fade image and background out together
  if (e.deltaY > 0 && progress >= HOLD_AT) {
    autoTo(0.75, IMG_EXIT_MS, () => end(true));
    return;
  }

  const prev = progress;
  const isEntry = e.deltaY > 0 && progress < HOLD_AT;
  const sens = isEntry ? ENTRY_SENS_IMG : 2600;
  const ramp = isEntry
    ? RAMP_FLOOR + (1 - RAMP_FLOOR) * ease(clamp((now - sceneStart) / ENTRY_RAMP_MS))
    : 1;
  progress = clamp(progress + (e.deltaY / sens) * ramp, 0, 1);

  // snap to the hold point when crossing it
  if ((prev < HOLD_AT && progress >= HOLD_AT) || (prev > HOLD_AT && progress <= HOLD_AT)) {
    progress = HOLD_AT;
    holdUntil = performance.now() + HOLD_MS;
  }

  render();
  if (progress <= 0) end(false);
}, { passive: false });

// ---------- figures index ----------
const figButton = document.getElementById('fig-button');
const caringIndex = document.getElementById('caring-index');

figButton.addEventListener('click', () => caringIndex.classList.toggle('show'));

document.addEventListener('click', e => {
  if (!figButton.contains(e.target) && !caringIndex.contains(e.target)) {
    caringIndex.classList.remove('show');
  }
});

document.getElementById('close-btn')?.addEventListener('click', () => {
  caringIndex.classList.remove('show');
});

// ---------- title clicks: rush to start / end ----------
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