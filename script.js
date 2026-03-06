'use strict';

// ─────────────────────────────────────────────
//  SPLINE LOADER
// ─────────────────────────────────────────────
const splineViewer = document.querySelector('spline-viewer');
let contentRevealed = false;

function revealPageContent() {
  if (contentRevealed) return;
  contentRevealed = true;
  document.body.classList.remove('loading');
  document.body.classList.add('loaded');
  // Start music automatically after loading finishes
  if (typeof autoPlayAfterLoad === 'function') {
    setTimeout(autoPlayAfterLoad, 600);
  }
}

if (splineViewer) {
  splineViewer.addEventListener('load', revealPageContent, { once: true });
}

window.addEventListener('load', () => {
  setTimeout(revealPageContent, 1200);
}, { once: true });

setTimeout(revealPageContent, 9000);

// ─────────────────────────────────────────────
//  CANVAS SETUP
// ─────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const ctx    = canvas.getContext('2d', { alpha: true });
const heroEl = document.getElementById('hero');
let W, H;

function resize() {
  W = canvas.width  = heroEl.offsetWidth;
  H = canvas.height = heroEl.offsetHeight;
}
resize();
window.addEventListener('resize', resize);

// ─────────────────────────────────────────────
//  EASING UTILS
// ─────────────────────────────────────────────
const easeOutCubic  = t => 1 - (1 - t) * (1 - t) * (1 - t);
const easeInCubic   = t => t * t * t;
const easeInOutSine = t => -(Math.cos(Math.PI * t) - 1) / 2;

// ─────────────────────────────────────────────
//  SPEED BOOST STATE
// ─────────────────────────────────────────────
let speedBoost  = 0;
let boostFactor = 1;

// ─────────────────────────────────────────────
//  BLOBS  (CSS animated — fewer, lighter)
// ─────────────────────────────────────────────
(function buildBlobs() {
  const container = document.getElementById('blobs');
  const defs = [
    { w: 560, h: 460, top: '8%',  left: '3%',  c: '#ff3d8a', dur: 24 },
    { w: 460, h: 560, top: '48%', left: '58%', c: '#ff85c0', dur: 30 },
    { w: 620, h: 380, top: '68%', left: '18%', c: '#c0005f', dur: 22 },
    { w: 380, h: 460, top: '4%',  left: '68%', c: '#ff6aaa', dur: 26 },
  ];
  const rnd = () => (Math.random() * 80 - 40) + 'px';
  defs.forEach((d, i) => {
    const el = document.createElement('div');
    el.className = 'blob';
    Object.assign(el.style, {
      width: d.w + 'px', height: d.h + 'px',
      top: d.top, left: d.left,
      background: d.c,
      '--dx1': rnd(), '--dy1': rnd(),
      '--dx2': rnd(), '--dy2': rnd(),
      '--dx3': rnd(), '--dy3': rnd(),
      '--dx4': rnd(), '--dy4': rnd(),
      animationDuration: d.dur + 's',
      animationDelay: -(i * d.dur / defs.length) + 's',
    });
    container.appendChild(el);
  });
})();

// ─────────────────────────────────────────────
//  HEART PATH  (reusable canvas path)
// ─────────────────────────────────────────────
function heartPath(x, y, size, rot) {
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  ctx.scale(size, size);
  ctx.beginPath();
  ctx.moveTo(0, -0.25);
  ctx.bezierCurveTo(-0.48, -0.88, -1.18, -0.08, 0,  0.82);
  ctx.bezierCurveTo( 1.18, -0.08,  0.48, -0.88, 0, -0.25);
  ctx.closePath();
  ctx.restore();
}

// ─────────────────────────────────────────────
//  FLOATING HEARTS  (reduced count, no per-heart blur)
// ─────────────────────────────────────────────
class Heart {
  constructor(scatter) {
    this.x         = Math.random() * W;
    this.y         = scatter ? Math.random() * H : H + 20 + Math.random() * 80;
    this.size      = Math.random() * 13 + 5;
    this.baseSpeed = Math.random() * 0.028 + 0.010;
    this.driftAmp  = (Math.random() - 0.5) * 0.016;
    this.driftFreq = 0.0005 + Math.random() * 0.0006;
    this.phase     = Math.random() * Math.PI * 2;
    this.opacity   = scatter ? Math.random() * 0.4 : 0;
    this.maxOp     = Math.random() * 0.52 + 0.18;
    this.hueOff    = Math.random() * 30 - 15;
    this.rot       = (Math.random() - 0.5) * 0.4;
    this.rotSpeed  = (Math.random() - 0.5) * 0.00015;
    this.alive     = true;
    this.fadeInZ   = H * 0.14;
    this.fadeOutZ  = 80 + Math.random() * 60;
  }

  update(dt) {
    this.y     -= this.baseSpeed * boostFactor * dt;
    this.x     += this.driftAmp * Math.sin(this.phase) * dt;
    this.phase += this.driftFreq * dt;
    this.rot   += this.rotSpeed * dt;

    const fromBottom = H - this.y;
    const fromTop    = this.y;

    if (fromBottom < this.fadeInZ) {
      this.opacity = easeOutCubic(Math.min(fromBottom / this.fadeInZ, 1)) * this.maxOp;
    } else if (fromTop < this.fadeOutZ) {
      this.opacity = easeInCubic(Math.min(fromTop / this.fadeOutZ, 1)) * this.maxOp;
      if (fromTop < 1) this.alive = false;
    } else {
      this.opacity += (this.maxOp - this.opacity) * 0.04;
    }

    if (this.x < -40 || this.x > W + 40) this.alive = false;
  }

  draw() {
    if (this.opacity < 0.005) return;
    ctx.globalAlpha = this.opacity;
    heartPath(this.x, this.y, this.size, this.rot);
    ctx.fillStyle = `hsl(${335 + this.hueOff + Math.sin(this.phase * 0.4) * 8}, 100%, 76%)`;
    ctx.fill();
  }
}

// ─────────────────────────────────────────────
//  SPARKLES  (no shadowBlur — major perf win)
// ─────────────────────────────────────────────
class Sparkle {
  constructor(x, y, isBurst) {
    this.x       = x ?? Math.random() * W;
    this.y       = y ?? Math.random() * H;
    this.r       = Math.random() * 2.2 + 0.4;
    this.vx      = (Math.random() - 0.5) * (isBurst ? 2.8 : 0.018);
    this.vy      = -(Math.random() * (isBurst ? 3.5 : 0.05) + 0.01);
    this.life    = 0;
    this.maxLife = (Math.random() * 100 + 60) * (isBurst ? 1 : 1.6);
    this.isBurst = isBurst || false;
    this.hue     = 318 + Math.random() * 44;
    this.alive   = true;
  }

  update(dt) {
    const step = dt / 16.67;
    this.life += step;
    this.x    += this.vx * step;
    this.y    += this.vy * step;
    if (this.isBurst) this.vy += 0.04 * step;
    if (this.life >= this.maxLife) this.alive = false;
  }

  draw() {
    const p  = this.life / this.maxLife;
    const raw = p < 0.25
      ? easeOutCubic(p / 0.25)
      : easeInCubic(1 - (p - 0.25) / 0.75);
    const op = raw * (this.isBurst ? 0.88 : 0.65);
    if (op < 0.01) return;
    ctx.globalAlpha = op;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${this.hue}, 100%, 92%)`;
    ctx.fill();
  }
}

// ─────────────────────────────────────────────
//  BURST HEARTS  (click — no shadowBlur)
// ─────────────────────────────────────────────
class BurstHeart {
  constructor(x, y) {
    this.x       = x;
    this.y       = y;
    this.size    = Math.random() * 11 + 4;
    const ang    = Math.random() * Math.PI * 2;
    const spd    = Math.random() * 4.2 + 1.4;
    this.vx      = Math.cos(ang) * spd;
    this.vy      = Math.sin(ang) * spd;
    this.life    = 0;
    this.maxLife = 55 + Math.random() * 35;
    this.hue     = 315 + Math.random() * 45;
    this.rot     = Math.random() * Math.PI;
    this.rotV    = (Math.random() - 0.5) * 0.055;
    this.alive   = true;
  }

  update(dt) {
    const step = dt / 16.67;
    this.life += step;
    this.x    += this.vx * step;
    this.y    += this.vy * step;
    this.vy   += 0.11 * step;
    this.vx   *= Math.pow(0.986, step);
    this.rot  += this.rotV * step;
    if (this.life >= this.maxLife) this.alive = false;
  }

  draw() {
    const t  = this.life / this.maxLife;
    const op = t < 0.15
      ? easeOutCubic(t / 0.15)
      : easeInCubic(1 - (t - 0.15) / 0.85);
    if (op < 0.01) return;
    const s = this.size * (0.85 + easeInOutSine(t) * 0.22);
    ctx.globalAlpha = op;
    heartPath(this.x, this.y, s, this.rot);
    ctx.fillStyle = `hsl(${this.hue}, 100%, 74%)`;
    ctx.fill();
  }
}

// ─────────────────────────────────────────────
//  PARTICLE POOLS  (reduced counts for performance)
// ─────────────────────────────────────────────
const hearts   = [];
const sparkles = [];
const bursts   = [];

const MAX_HEARTS   = 35;
const MAX_SPARKLES = 50;

for (let i = 0; i < MAX_HEARTS;   i++) hearts.push(new Heart(true));
for (let i = 0; i < MAX_SPARKLES; i++) sparkles.push(new Sparkle());

// ─────────────────────────────────────────────
//  CLICK EFFECTS
// ─────────────────────────────────────────────
const bgEl = document.getElementById('bg');

document.addEventListener('click', e => {
  const cx = e.clientX, cy = e.clientY;
  const minD = Math.min(W, H);

  // Ripple
  const ripple = document.createElement('div');
  ripple.className = 'ripple';
  const rs = minD * 0.55;
  Object.assign(ripple.style, {
    left: (cx - rs / 2) + 'px', top: (cy - rs / 2) + 'px',
    width: rs + 'px', height: rs + 'px',
  });
  document.body.appendChild(ripple);
  setTimeout(() => ripple.remove(), 1350);

  // Bloom
  const bloom = document.createElement('div');
  bloom.className = 'bloom';
  const bs = minD * 0.95;
  Object.assign(bloom.style, {
    left: (cx - bs / 2) + 'px', top: (cy - bs / 2) + 'px',
    width: bs + 'px', height: bs + 'px',
  });
  document.body.appendChild(bloom);
  setTimeout(() => bloom.remove(), 2200);

  // Burst particles (reduced from 20+24 → 12+16)
  for (let i = 0; i < 12; i++) bursts.push(new BurstHeart(cx, cy));
  for (let i = 0; i < 16; i++) sparkles.push(new Sparkle(cx, cy, true));

  // Speed boost
  speedBoost = 2200;

  // BG flash
  bgEl.style.transition = 'filter 0.6s cubic-bezier(0.25,1,0.5,1)';
  bgEl.style.filter = 'brightness(1.2) hue-rotate(8deg)';
  setTimeout(() => { bgEl.style.filter = ''; }, 160);
});

// ─────────────────────────────────────────────
//  PARALLAX  (throttled to every 2nd frame)
// ─────────────────────────────────────────────
const parallaxEl = document.getElementById('parallax');
const blobsEl    = document.getElementById('blobs');
let tPX = 0, tPY = 0, cPX = 0, cPY = 0;

document.addEventListener('mousemove', e => {
  tPX = (e.clientX / W - 0.5) * 28;
  tPY = (e.clientY / H - 0.5) * 28;
});

// ─────────────────────────────────────────────
//  RAF LOOP
// ─────────────────────────────────────────────
let last = 0;
let frameCount = 0;

function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(ts - last, 48);
  last = ts;
  frameCount++;

  // Smooth boost factor
  boostFactor += (speedBoost > 0 ? 2.2 : 1 - boostFactor) * (speedBoost > 0 ? 0.07 : 0.035);
  if (speedBoost > 0) speedBoost -= dt;

  // Parallax lerp (every 2nd frame to save layout thrash)
  if (frameCount % 2 === 0) {
    cPX += (tPX - cPX) * 0.06;
    cPY += (tPY - cPY) * 0.06;
    parallaxEl.style.transform = `translate3d(${cPX.toFixed(1)}px,${cPY.toFixed(1)}px,0)`;
    blobsEl.style.transform    = `translate3d(${(cPX * 0.35).toFixed(1)}px,${(cPY * 0.35).toFixed(1)}px,0)`;
  }

  ctx.clearRect(0, 0, W, H);
  ctx.globalAlpha = 1;

  // Hearts
  for (let i = hearts.length - 1; i >= 0; i--) {
    hearts[i].update(dt);
    hearts[i].draw();
    if (!hearts[i].alive) {
      hearts.splice(i, 1);
      hearts.push(new Heart(false));
    }
  }
  while (hearts.length < MAX_HEARTS) hearts.push(new Heart(false));

  // Sparkles
  for (let i = sparkles.length - 1; i >= 0; i--) {
    sparkles[i].update(dt);
    sparkles[i].draw();
    if (!sparkles[i].alive) {
      sparkles.splice(i, 1);
      if (sparkles.length < MAX_SPARKLES) sparkles.push(new Sparkle());
    }
  }

  // Burst hearts
  for (let i = bursts.length - 1; i >= 0; i--) {
    bursts[i].update(dt);
    bursts[i].draw();
    if (!bursts[i].alive) bursts.splice(i, 1);
  }

  ctx.globalAlpha = 1;
}

requestAnimationFrame(loop);


// ═════════════════════════════════════════════
//  NEW FEATURES — SECTIONS & INTERACTIONS
// ═════════════════════════════════════════════

// ─────────────────────────────────────────────
//  SCROLL PROGRESS BAR
// ─────────────────────────────────────────────
const scrollProgressBar = document.getElementById('scroll-progress');

function updateScrollProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
  scrollProgressBar.style.width = progress + '%';
}

window.addEventListener('scroll', updateScrollProgress, { passive: true });

// ─────────────────────────────────────────────
//  SCROLL REVEAL (Intersection Observer — smooth 3D)
// ─────────────────────────────────────────────
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      const delay = entry.target.dataset.delay || 0;
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, delay);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });

document.querySelectorAll('.reveal').forEach((el, i) => {
  el.dataset.delay = (i % 5) * 100;
  revealObserver.observe(el);
});

// ─────────────────────────────────────────────
//  POLAROID RANDOM ROTATION
// ─────────────────────────────────────────────
document.querySelectorAll('.polaroid').forEach(card => {
  const rot = (Math.random() - 0.5) * 8; // ±4 degrees
  card.style.transform = `rotate(${rot}deg)`;
  card.dataset.baseRotation = rot;
});

// ─────────────────────────────────────────────
//  LOVE LETTER — OPEN ANIMATION
// ─────────────────────────────────────────────
const letterEnvelope = document.getElementById('letter-envelope');
const letterPaper = document.getElementById('letter-paper');
const openLetterBtn = document.getElementById('open-letter-btn');

if (openLetterBtn) {
  openLetterBtn.addEventListener('click', () => {
    letterEnvelope.classList.add('opened');

    setTimeout(() => {
      letterPaper.classList.add('visible');

      // Typing animation — reveal paragraphs one by one
      const paragraphs = letterPaper.querySelectorAll('.letter-text p');
      paragraphs.forEach((p, i) => {
        setTimeout(() => {
          p.classList.add('typed');
        }, 400 + i * 600);
      });
    }, 900);
  });
}

// (Countdown timer removed)

// ─────────────────────────────────────────────
//  SMOOTH SCROLL PARALLAX DEPTH
//  Adds subtle 3D depth shift to sections on scroll
// ─────────────────────────────────────────────
const contentSections = document.querySelectorAll('.content-section');
let ticking = false;

function onScrollParallax() {
  contentSections.forEach(section => {
    const rect = section.getBoundingClientRect();
    const viewH = window.innerHeight;
    if (rect.top < viewH && rect.bottom > 0) {
      // How far through the viewport (0 = just entering, 1 = centered)
      const progress = 1 - (rect.top / viewH);
      const clamped = Math.max(0, Math.min(progress, 2));
      // Subtle parallax Y shift on the ::after pseudo
      const yShift = (1 - clamped) * 15;
      section.style.setProperty('--parallax-y', yShift + 'px');
    }
  });
  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(onScrollParallax);
    ticking = true;
  }
}, { passive: true });

// ─────────────────────────────────────────────
//  "WHY I LOVE YOU" RANDOM GENERATOR
//  📝 ADD/REPLACE your own reasons below
// ─────────────────────────────────────────────
const loveReasons = [
  "Because your laugh is my favorite sound in the universe.",
  "Because you make even the most ordinary days feel magical.",
  "Because you believe in me even when I don't believe in myself.",
  "Because your hugs feel like home.",
  "Because you're the first person I want to tell everything to.",
  "Because you love me in all my messy, imperfect glory.",
  "Because your smile can light up my darkest days.",
  "Because you make me want to be a better person every single day.",
  "Because you're my best friend and my greatest love.",
  "Because even after all this time, my heart still skips when I see you.",
  "Because you make me feel safe enough to be completely myself.",
  "Because every moment with you feels like a beautiful dream.",
  "Because you love with your whole heart, and that's the most beautiful thing.",
  "Because distance only made me realize how deeply I need you.",
  "Because you are the answer to every wish I ever made.",
  "Because you turn my tears into smiles like no one else can.",
  "Because you're the reason I look forward to waking up every morning."
];

let lastReasonIndex = -1;
const loveReasonEl  = document.getElementById('love-reason');
const loveReasonBtn = document.getElementById('love-reason-btn');

if (loveReasonBtn) {
  loveReasonBtn.addEventListener('click', () => {
    let idx;
    do {
      idx = Math.floor(Math.random() * loveReasons.length);
    } while (idx === lastReasonIndex && loveReasons.length > 1);
    lastReasonIndex = idx;

    loveReasonEl.classList.add('fading');
    setTimeout(() => {
      loveReasonEl.textContent = `"${loveReasons[idx]}"`;
      loveReasonEl.classList.remove('fading');
    }, 500);
  });
}

// ─────────────────────────────────────────────
//  GALLERY MODAL
// ─────────────────────────────────────────────
const galleryModal   = document.getElementById('gallery-modal');
const modalImg       = document.getElementById('modal-img');
const modalCaption   = document.getElementById('modal-caption');
const modalDate      = document.getElementById('modal-date');
const modalClose     = galleryModal.querySelector('.modal-close');
const modalBackdrop  = galleryModal.querySelector('.modal-backdrop');

document.querySelectorAll('.polaroid').forEach(card => {
  card.addEventListener('click', () => {
    const imgDiv = card.querySelector('.polaroid-img');
    const bgImage = imgDiv.style.backgroundImage;
    // Extract URL from background-image
    const url = bgImage.replace(/url\(['"]?/, '').replace(/['"]?\)/, '');
    modalImg.src = url;
    modalCaption.textContent = card.dataset.caption || '';
    modalDate.textContent = card.dataset.date || '';
    galleryModal.classList.add('active');
    galleryModal.setAttribute('aria-hidden', 'false');
  });
});

function closeModal() {
  galleryModal.classList.remove('active');
  galleryModal.setAttribute('aria-hidden', 'true');
}

modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && galleryModal.classList.contains('active')) closeModal();
});

// ─────────────────────────────────────────────
//  EASTER EGG
// ─────────────────────────────────────────────
const easterStar    = document.getElementById('easter-egg-star');
const easterMessage = document.getElementById('easter-egg-message');
const easterClose   = document.getElementById('easter-egg-close');

if (easterStar) {
  easterStar.addEventListener('click', () => {
    easterMessage.classList.add('visible');
    easterMessage.setAttribute('aria-hidden', 'false');
  });
}

if (easterClose) {
  easterClose.addEventListener('click', () => {
    easterMessage.classList.remove('visible');
    easterMessage.setAttribute('aria-hidden', 'true');
  });
}

// ─────────────────────────────────────────────
//  BACKGROUND MUSIC TOGGLE (pause/resume, no restart)
// ─────────────────────────────────────────────
const musicToggle  = document.getElementById('music-toggle');
const musicRestart = document.getElementById('music-restart');
const bgMusic      = document.getElementById('bg-music');
const iconOn       = document.getElementById('music-icon-on');
const iconOff      = document.getElementById('music-icon-off');
let musicPlaying   = false;
let fadingInterval = null;
let musicBusy      = false; // prevents overlapping toggle actions

function showRestartBtn() {
  if (musicRestart) musicRestart.classList.add('visible');
}

function startMusic() {
  if (musicBusy) return;
  musicBusy = true;
  if (fadingInterval) { clearInterval(fadingInterval); fadingInterval = null; }
  bgMusic.play().then(() => {
    musicPlaying = true;
    musicToggle.classList.add('playing');
    iconOn.style.display  = 'block';
    iconOff.style.display = 'none';
    showRestartBtn();
    let vol = bgMusic.volume;
    fadingInterval = setInterval(() => {
      vol = Math.min(vol + 0.05, 0.4);
      bgMusic.volume = vol;
      if (vol >= 0.4) { clearInterval(fadingInterval); fadingInterval = null; musicBusy = false; }
    }, 80);
  }).catch(() => { musicBusy = false; });
}

function pauseMusic() {
  if (musicBusy) return;
  musicBusy = true;
  if (fadingInterval) { clearInterval(fadingInterval); fadingInterval = null; }
  let vol = bgMusic.volume;
  fadingInterval = setInterval(() => {
    vol = Math.max(vol - 0.05, 0);
    bgMusic.volume = vol;
    if (vol <= 0) {
      clearInterval(fadingInterval);
      fadingInterval = null;
      bgMusic.pause();
      musicPlaying = false;
      musicToggle.classList.remove('playing');
      iconOn.style.display  = 'none';
      iconOff.style.display = 'block';
      musicBusy = false;
    }
  }, 60);
}

if (musicToggle && bgMusic) {
  bgMusic.volume = 0;

  musicToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (musicBusy) return;
    if (!musicPlaying) {
      startMusic();
    } else {
      pauseMusic();
    }
  });
}

// Restart button — rewinds to 0:00 and plays
if (musicRestart && bgMusic) {
  musicRestart.addEventListener('click', (e) => {
    e.stopPropagation();
    if (fadingInterval) { clearInterval(fadingInterval); fadingInterval = null; musicBusy = false; }
    bgMusic.currentTime = 0;
    if (!musicPlaying) {
      startMusic();
    }
  });
}

// Auto-play music after loading screen ends
function autoPlayAfterLoad() {
  if (musicPlaying || !bgMusic) return;
  // Attempt immediate autoplay
  bgMusic.volume = 0;
  const playAttempt = bgMusic.play();
  if (playAttempt) {
    playAttempt.then(() => {
      // Autoplay succeeded
      musicPlaying = true;
      musicToggle.classList.add('playing');
      iconOn.style.display  = 'block';
      iconOff.style.display = 'none';
      showRestartBtn();
      let vol = 0;
      fadingInterval = setInterval(() => {
        vol = Math.min(vol + 0.05, 0.4);
        bgMusic.volume = vol;
        if (vol >= 0.4) { clearInterval(fadingInterval); fadingInterval = null; musicBusy = false; }
      }, 80);
    }).catch(() => {
      // Autoplay blocked by browser — wait for first user gesture
      function gesturePlay() {
        if (!musicPlaying) startMusic();
        document.removeEventListener('click', gesturePlay);
        document.removeEventListener('touchstart', gesturePlay);
        document.removeEventListener('keydown', gesturePlay);
      }
      document.addEventListener('click', gesturePlay, { once: true });
      document.addEventListener('touchstart', gesturePlay, { once: true });
      document.addEventListener('keydown', gesturePlay, { once: true });
    });
  }
}

// ─────────────────────────────────────────────
//  HIDE SCROLL HINT ON SCROLL
// ─────────────────────────────────────────────
const scrollHint = document.getElementById('scroll-hint');
let hintHidden = false;

window.addEventListener('scroll', () => {
  if (!hintHidden && window.scrollY > 80) {
    scrollHint.style.opacity = '0';
    scrollHint.style.transition = 'opacity 0.6s';
    hintHidden = true;
  }
}, { passive: true });

// ─────────────────────────────────────────────
//  CURSOR GLOW FOLLOW
// ─────────────────────────────────────────────
const cursorGlow = document.getElementById('cursor-glow');
if (cursorGlow) {
  let glowX = 0, glowY = 0, targetGX = 0, targetGY = 0;
  document.addEventListener('mousemove', e => {
    targetGX = e.clientX;
    targetGY = e.clientY;
  });
  function updateGlow() {
    glowX += (targetGX - glowX) * 0.12;
    glowY += (targetGY - glowY) * 0.12;
    cursorGlow.style.left = glowX + 'px';
    cursorGlow.style.top  = glowY + 'px';
    requestAnimationFrame(updateGlow);
  }
  requestAnimationFrame(updateGlow);
}
