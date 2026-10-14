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

// lotties: scroll-driven, speed-capped, one swipe = one step
const LOTTIE_DONE = 0.65;        // animation finished playing (step 1)
const LOTTIE_FADE_END = 0.82;    // quote fully faded; columns return from here to 1
const L_RESTS = [0, LOTTIE_DONE, 1];
const L_TRAVEL_PX = 800;         // wheel travel for the full range (lower = more sensitive)
const L_TAU_MS = 220;            // glide softness (higher = softer)
const L_SPEED_IN = 0.4;          // max progress per second while the animation plays
const L_SPEED_OUT = 0.6;         // max progress per second while fading out / collapsing
const L_MIN_MOVE = 0.03;         // a swipe must move this much to count (ignores jitter)
const L_GESTURE_GAP = 140;       // ms without wheel events = swipe finished
const L_GRACE_MS = 300;          // right after a scene starts, don't let jitter close it
const L_ABSORB_MS = 700;         // entering from below: ignore leftover momentum for up to this long

// page jump (title clicks)
const JUMP_MS = 6000;

// ---------- state ----------
let active = null, progress = 0;
let holdUntil = 0;
let sceneStart = 0;
let autoRaf = null, autoing = false;
let jumping = false, jumpRaf = null;

// lottie state
let lTarget = 0, lRaf = null, lLast = 0;
let lLastWheel = 0, lGestureTimer = null;
let lGestureStart = 0, lGestureSum = 0, lGestureLo = 0, lGestureHi = 1;
let lLeaving = false, lNeedGap = false;

// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = x => x * x * (3 - 2 * x);
const easeInOutPow = (x, p = 12) =>
  x < 0.5
    ? Math.pow(2, p - 1) * Math.pow(x, p)
    : 1 - Math.pow(-2 * x + 2, p) / 2;
const seg = (a, b) => clamp((progress - a) / (b - a));   // 0→1 between a and b

function lineY() {
  return src.getBoundingClientRect().top + src.clientHeight * 0.3;
}

// ---------- load lotties ----------
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

// ---------- timed animation (images) ----------
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

// ---------- lottie motion ----------
// progress glides toward lTarget, with a speed cap so it is never sudden
function lottieGlide(now) {
  lRaf = null;
  if (!active || active.dataset.type !== 'lottie') return;

  const dt = Math.min(50, now - lLast);
  lLast = now;

  let step = (lTarget - progress) * (1 - Math.exp(-dt / L_TAU_MS));
  const cap = (progress < LOTTIE_DONE ? L_SPEED_IN : L_SPEED_OUT) * dt / 1000;
  progress += clamp(step, -cap, cap);
  if (Math.abs(lTarget - progress) < 0.0008) progress = lTarget;
  render();

  if (progress >= 1 && lTarget >= 1) { end(true); return; }
  if (progress <= 0 && lLeaving)     { end(false); return; }
  if (progress !== lTarget) lRaf = requestAnimationFrame(lottieGlide);
}

function nudgeLottie() {
  if (lRaf) return;
  lLast = performance.now();
  lRaf = requestAnimationFrame(lottieGlide);
}

// a swipe can only travel to the neighbouring step(s) of where it began
function beginGesture() {
  const t = lTarget, eps = 0.001;
  lGestureStart = t;
  lGestureSum = 0;
  lGestureLo = Math.max(0, ...L_RESTS.filter(r => r < t - eps));
  lGestureHi = Math.min(1, ...L_RESTS.filter(r => r > t + eps));
}

// swipe finished: glide to the step it was heading for
function endGesture() {
  if (!active || active.dataset.type !== 'lottie') return;

  const moved = lTarget - lGestureStart;
  if (moved > L_MIN_MOVE)       lTarget = lGestureHi;
  else if (moved < -L_MIN_MOVE) lTarget = lGestureLo;
  else                          lTarget = lGestureStart;

  const wentBack = moved < -L_MIN_MOVE || (lGestureStart <= 0 && lGestureSum < -L_MIN_MOVE);
  if (wentBack && lTarget <= 0 && performance.now() - sceneStart > L_GRACE_MS) lLeaving = true;

  nudgeLottie();
}

function lottieWheel(e, now) {
  const gap = now - lLastWheel;
  lLastWheel = now;

  // entering from below: swallow leftover momentum, but never for long
  if (lNeedGap) {
    if (gap > L_GESTURE_GAP || now - sceneStart > L_ABSORB_MS) lNeedGap = false;
    else return;
  }

  if (gap > L_GESTURE_GAP) beginGesture();

  const unit = e.deltaMode === 1 ? 16 : 1;
  const d = (e.deltaY * unit) / L_TRAVEL_PX;
  lGestureSum += d;
  lTarget = clamp(lTarget + d, lGestureLo, lGestureHi);
  nudgeLottie();

  clearTimeout(lGestureTimer);
  lGestureTimer = setTimeout(endGesture, L_GESTURE_GAP);
}

// ---------- scene lifecycle ----------
function start(t, from) {
  const entry = lotties.get(t);
  const isLottie = t.dataset.type === 'lottie';
  if (isLottie && !entry) return;   // lottie failed to load

  sceneStart = performance.now();
  active = t;
  progress = from;
  src.scrollTop += t.getBoundingClientRect().top - lineY();
  src.style.overflow = 'hidden';
  center.classList.add('active');

  if (isLottie) {
    entry.holder.style.display = 'block';
    lLeaving = false;
    lLastWheel = sceneStart;
    clearTimeout(lGestureTimer);
    if (from >= 1) {
      // entering from below: reopen the columns and fade the finished quote back in
      lTarget = LOTTIE_DONE;
      lNeedGap = true;
      render();
      nudgeLottie();
      return;
    }
    lTarget = 0;
    lNeedGap = false;
    beginGesture();
  } else {
    img.src = t.dataset.src;
  }
  render();
}

function end(forward) {
  if (!active) return;
  cancelAnimationFrame(autoRaf);
  cancelAnimationFrame(lRaf);
  clearTimeout(lGestureTimer);
  lRaf = null;
  autoing = false;
  lLeaving = false;
  lNeedGap = false;

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

  // 0 → 0.15 columns open | 0.15 → DONE animation plays | DONE → FADE_END quote fades | FADE_END → 1 columns return
  const col = ease(seg(0, 0.15)) * (1 - ease(seg(LOTTIE_FADE_END, 1)));
  center.style.flex = `0 0 ${col * 20}%`;
  center.style.marginLeft = `${-(1 - col) * 20}px`;

  anim.goToAndStop(seg(0.15, LOTTIE_DONE) * lastFrame, true);
  lottieBox.style.opacity = ease(seg(0.1, 0.2)) * (1 - ease(seg(LOTTIE_DONE, LOTTIE_FADE_END)));
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

  if (active.dataset.type === 'lottie') {
    lottieWheel(e, now);
    return;
  }

  if (autoing || now < holdUntil) return;

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