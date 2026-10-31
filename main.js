const motionOK = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const sky = document.getElementById("sky");
const skyCtx = sky.getContext("2d");
const stars = Array.from({ length: 110 }, () => ({
  x: Math.random(),
  y: Math.random(),
  depth: 0.3 + Math.random() * 1.4,
  size: 0.6 + Math.random() * 2.4,
  tw: Math.random() * Math.PI * 2,
  speed: 0.004 + Math.random() * 0.012,
}));

let mouseX = 0.5;
let mouseY = 0.4;
let skyFrame = 0;

function sizeCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const key = `${width}x${height}x${dpr}`;
  if (canvas.dataset.size !== key) {
    canvas.dataset.size = key;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
  }
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}

function spark(ctx, x, y, radius, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#e7f3ff";
  ctx.beginPath();
  ctx.moveTo(0, -radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.quadraticCurveTo(0, 0, 0, radius);
  ctx.quadraticCurveTo(0, 0, -radius, 0);
  ctx.quadraticCurveTo(0, 0, 0, -radius);
  ctx.fill();
  ctx.restore();
}

function drawSky(time) {
  const { width, height } = sizeCanvas(sky);
  skyCtx.clearRect(0, 0, width, height);
  const shiftX = (mouseX - 0.5) * 28;
  const shiftY = (mouseY - 0.5) * 18;

  stars.forEach((star) => {
    if (motionOK) {
      star.y -= 0.00022 * star.depth;
      if (star.y < -0.04) star.y = 1.04;
    }
    const x = star.x * width + shiftX * star.depth;
    const y = star.y * height + shiftY * star.depth;
    const twinkle = 0.35 + Math.sin(time * 0.002 + star.tw) * 0.35;
    spark(skyCtx, x, y, star.size * (0.8 + star.depth), twinkle);
  });
}

function crystalMesh() {
  const ring = [];
  const sides = 6;
  for (let i = 0; i < sides; i += 1) {
    const angle = (i / sides) * Math.PI * 2 + Math.PI / 6;
    ring.push([Math.cos(angle), 0, Math.sin(angle)]);
  }
  const top = [0, -1.85, 0];
  const bottom = [0, 1.25, 0];
  const faces = [];
  ring.forEach((point, index) => {
    const next = ring[(index + 1) % sides];
    faces.push([top, point, next]);
    faces.push([bottom, next, point]);
  });
  return faces;
}

const faces = crystalMesh();
const crystal = document.getElementById("crystal");

function rotate(vertex, rotY, rotX) {
  const [x, y, z] = vertex;
  const cosY = Math.cos(rotY);
  const sinY = Math.sin(rotY);
  const x1 = x * cosY + z * sinY;
  const z1 = -x * sinY + z * cosY;
  const cosX = Math.cos(rotX);
  const sinX = Math.sin(rotX);
  return [x1, y * cosX - z1 * sinX, y * sinX + z1 * cosX];
}

function faceNormal(a, b, c) {
  const ux = b[0] - a[0];
  const uy = b[1] - a[1];
  const uz = b[2] - a[2];
  const vx = c[0] - a[0];
  const vy = c[1] - a[1];
  const vz = c[2] - a[2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

function drawCrystal(time) {
  const { ctx, width, height } = sizeCanvas(crystal);
  ctx.clearRect(0, 0, width, height);
  const rotY = motionOK ? time * 0.00045 : 0.7;
  const rotX = 0.35;
  const light = [0.25, -0.85, 0.45];
  const drawn = faces.map((face) => {
    const rotated = face.map((vertex) => rotate(vertex, rotY, rotX));
    const normal = faceNormal(rotated[0], rotated[1], rotated[2]);
    const length = Math.hypot(normal[0], normal[1], normal[2]) || 1;
    const shade = Math.max(0, (normal[0] * light[0] + normal[1] * light[1] + normal[2] * light[2]) / length);
    const depth = (rotated[0][2] + rotated[1][2] + rotated[2][2]) / 3;
    return { rotated, shade, depth, facing: normal[2] };
  }).filter((face) => face.facing > 0).sort((a, b) => a.depth - b.depth);

  const glow = ctx.createRadialGradient(width / 2, height * 0.48, 8, width / 2, height * 0.48, width * 0.46);
  glow.addColorStop(0, "rgba(90, 170, 255, 0.35)");
  glow.addColorStop(1, "rgba(90, 170, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  drawn.forEach((face) => {
    ctx.beginPath();
    face.rotated.forEach((vertex, index) => {
      const scale = (Math.min(width, height) * 0.42) / (3.6 - vertex[2]);
      const x = width / 2 + vertex[0] * scale;
      const y = height * 0.54 + vertex[1] * scale;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    const green = Math.round(80 + face.shade * 140);
    ctx.fillStyle = `rgba(${20 + face.shade * 50}, ${green}, 255, 0.92)`;
    ctx.strokeStyle = `rgba(210, 235, 255, ${0.18 + face.shade * 0.45})`;
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  });
}

let running = true;

function frame(time) {
  if (!running) return;
  drawSky(time || 0);
  drawCrystal(time || 0);
  if (motionOK) skyFrame = requestAnimationFrame(frame);
}

function startMotion() {
  running = true;
  if (motionOK) requestAnimationFrame(frame);
  else {
    drawSky(1200);
    drawCrystal(1200);
  }
}

window.addEventListener("pointermove", (event) => {
  mouseX = event.clientX / window.innerWidth;
  mouseY = event.clientY / window.innerHeight;
});

window.addEventListener("resize", () => {
  if (!motionOK) {
    drawSky(1200);
    drawCrystal(1200);
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    running = false;
    cancelAnimationFrame(skyFrame);
    return;
  }
  startMotion();
});

const night = document.getElementById("night");
const nightWord = document.getElementById("night-word");

function applyNight(value) {
  const amount = Number(value) / 100;
  document.documentElement.style.setProperty("--photo-opacity", String(0.48 - amount * 0.34));
  document.documentElement.style.setProperty("--vignette-alpha", String(0.5 + amount * 0.42));
  if (amount > 0.66) nightWord.textContent = "Deep night";
  else if (amount > 0.33) nightWord.textContent = "Blue hour";
  else nightWord.textContent = "First stars";
}

night.addEventListener("input", () => applyNight(night.value));
applyNight(night.value);

const links = [...document.querySelectorAll("nav a")];
const sections = links
  .map((link) => document.getElementById(link.getAttribute("href").slice(1)))
  .filter(Boolean);

const sectionWatcher = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    links.forEach((link) => {
      const on = link.getAttribute("href") === `#${entry.target.id}`;
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
  });
}, { rootMargin: "-40% 0px -45% 0px", threshold: 0.01 });

sections.forEach((section) => sectionWatcher.observe(section));

const soundButton = document.getElementById("sound");
let audioContext = null;

soundButton.addEventListener("click", async () => {
  if (audioContext && audioContext.state === "running") {
    await audioContext.suspend();
    soundButton.textContent = "Night sound off";
    soundButton.setAttribute("aria-pressed", "false");
    return;
  }

  if (!audioContext) {
    const Context = window.AudioContext || window.webkitAudioContext;
    audioContext = new Context();
    const master = audioContext.createGain();
    master.gain.value = 0.03;
    const filter = audioContext.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    filter.connect(master);
    master.connect(audioContext.destination);
    [110, 130.81, 164.81, 220].forEach((frequency, index) => {
      const osc = audioContext.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      const gain = audioContext.createGain();
      gain.gain.value = 0.22 / (index + 1);
      osc.connect(gain);
      gain.connect(filter);
      osc.start();
    });
  } else {
    await audioContext.resume();
  }

  soundButton.textContent = "Night sound on";
  soundButton.setAttribute("aria-pressed", "true");
});

startMotion();
