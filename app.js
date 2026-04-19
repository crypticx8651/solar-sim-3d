
"use strict";

const J2000 = 2451545.0;
const AU_IN_KM = 149597870.7;
const BASE_DISTANCE_SCALE = 28;
const MOON_DISTANCE_BOOST = 5.8;
const PLANET_SIZE_SCALE = 4.8;
const STAR_RADIUS = 18;
const BASE_PROJECTION_SCALE = 5.6;
const TEXTURE_SIZE = 768;
const USE_REAL_TEXTURES = false;
const TWO_PI = Math.PI * 2;

const dom = {
  sceneContainer: document.getElementById("sceneContainer"),
  simClock: document.getElementById("simClock"),
  timeScale: document.getElementById("timeScale"),
  timeScaleValue: document.getElementById("timeScaleValue"),
  pauseBtn: document.getElementById("pauseBtn"),
  resetViewBtn: document.getElementById("resetViewBtn"),
  jumpNowBtn: document.getElementById("jumpNowBtn"),
  jumpDateInput: document.getElementById("jumpDateInput"),
  jumpDateBtn: document.getElementById("jumpDateBtn"),
  focusSelect: document.getElementById("focusSelect"),
  showOrbits: document.getElementById("showOrbits"),
  showLabels: document.getElementById("showLabels"),
  showMoons: document.getElementById("showMoons"),
  showDwarf: document.getElementById("showDwarf"),
  distanceExponent: document.getElementById("distanceExponent"),
  distanceExponentValue: document.getElementById("distanceExponentValue"),
  infoTitle: document.getElementById("infoTitle"),
  infoSubtitle: document.getElementById("infoSubtitle"),
  infoList: document.getElementById("infoList")
};

const canvas = document.createElement("canvas");
canvas.className = "solar-canvas";
dom.sceneContainer.appendChild(canvas);
const ctx = canvas.getContext("2d");

const state = {
  jd: dateToJulian(new Date()),
  paused: false,
  timeScaleDaysPerSecond: Number.parseFloat(dom.timeScale.value),
  distanceExponent: Number.parseFloat(dom.distanceExponent.value),
  showOrbits: dom.showOrbits.checked,
  showLabels: dom.showLabels.checked,
  showMoons: dom.showMoons.checked,
  showDwarf: dom.showDwarf.checked,
  focusedId: "sun",
  selectedId: "sun"
};

const cameraState = {
  zoom: 1,
  targetZoom: 1,
  panX: 0,
  panY: 0,
  yaw: 0.5,
  pitch: -0.45
};

const bodies = [
  {
    id: "sun",
    name: "Sun",
    kind: "star",
    subtype: "G2V Main-Sequence Star",
    color: "#ffd36b",
    radiusKm: 696340,
    massKg: 1.9885e30,
    gravityMs2: 274,
    escapeVelocityKms: 617.7,
    dayHours: 609.12,
    meanTemp: "~5500 C photosphere",
    atmosphere: "Hydrogen and helium plasma",
    knownMoons: 0,
    description: "Central star containing 99.86% of Solar System mass."
  },
  {
    id: "mercury",
    name: "Mercury",
    kind: "planet",
    subtype: "Terrestrial Planet",
    color: "#b8aea3",
    radiusKm: 2439.7,
    massKg: 3.3011e23,
    gravityMs2: 3.7,
    escapeVelocityKms: 4.25,
    dayHours: 1407.6,
    meanTemp: "~167 C mean",
    atmosphere: "Extremely thin exosphere",
    knownMoons: 0,
    description: "Smallest and innermost major planet.",
    orbit: { aAU: 0.387098, e: 0.20563, inclinationDeg: 7.005, longAscNodeDeg: 48.331, argPeriapsisDeg: 29.124, periodDays: 87.9691, M0Deg: 174.796 }
  },
  {
    id: "venus",
    name: "Venus",
    kind: "planet",
    subtype: "Terrestrial Planet",
    color: "#d4b279",
    radiusKm: 6051.8,
    massKg: 4.8675e24,
    gravityMs2: 8.87,
    escapeVelocityKms: 10.36,
    dayHours: -5832.5,
    meanTemp: "~464 C mean",
    atmosphere: "Dense CO2 and sulfuric acid clouds",
    knownMoons: 0,
    description: "Runaway greenhouse world with retrograde rotation.",
    orbit: { aAU: 0.723332, e: 0.006772, inclinationDeg: 3.3947, longAscNodeDeg: 76.68, argPeriapsisDeg: 54.884, periodDays: 224.701, M0Deg: 50.115 }
  },
  {
    id: "earth",
    name: "Earth",
    kind: "planet",
    subtype: "Terrestrial Planet",
    color: "#62a8ff",
    radiusKm: 6371,
    massKg: 5.97237e24,
    gravityMs2: 9.81,
    escapeVelocityKms: 11.19,
    dayHours: 23.934,
    meanTemp: "~15 C global mean",
    atmosphere: "Nitrogen/oxygen atmosphere",
    knownMoons: 1,
    description: "Only confirmed life-bearing world.",
    orbit: { aAU: 1, e: 0.0167086, inclinationDeg: 0.00005, longAscNodeDeg: -11.26064, argPeriapsisDeg: 114.20783, periodDays: 365.256, M0Deg: 357.51716 }
  },
  {
    id: "moon",
    name: "Moon",
    kind: "moon",
    parent: "earth",
    subtype: "Natural Satellite of Earth",
    color: "#d7d7d7",
    radiusKm: 1737.4,
    massKg: 7.342e22,
    gravityMs2: 1.62,
    escapeVelocityKms: 2.38,
    dayHours: 655.7,
    meanTemp: "-20 C to +120 C surface range",
    atmosphere: "Very tenuous exosphere",
    knownMoons: 0,
    description: "Tidally locked moon driving tides.",
    orbit: { aAU: 0.00257, e: 0.0549, inclinationDeg: 5.145, longAscNodeDeg: 125.08, argPeriapsisDeg: 318.15, periodDays: 27.32166, M0Deg: 115.0 }
  },
  {
    id: "mars",
    name: "Mars",
    kind: "planet",
    subtype: "Terrestrial Planet",
    color: "#cf7f54",
    radiusKm: 3389.5,
    massKg: 6.4171e23,
    gravityMs2: 3.71,
    escapeVelocityKms: 5.03,
    dayHours: 24.623,
    meanTemp: "~ -63 C mean",
    atmosphere: "Thin CO2 atmosphere",
    knownMoons: 2,
    description: "Cold desert world with giant volcanoes.",
    orbit: { aAU: 1.523679, e: 0.0934, inclinationDeg: 1.85, longAscNodeDeg: 49.558, argPeriapsisDeg: 286.502, periodDays: 686.98, M0Deg: 19.373 }
  },
  {
    id: "jupiter",
    name: "Jupiter",
    kind: "planet",
    subtype: "Gas Giant",
    color: "#d4b088",
    radiusKm: 69911,
    massKg: 1.8982e27,
    gravityMs2: 24.79,
    escapeVelocityKms: 59.5,
    dayHours: 9.925,
    meanTemp: "~ -110 C cloud tops",
    atmosphere: "Hydrogen-helium atmosphere",
    knownMoons: 95,
    description: "Largest planet with massive storms.",
    orbit: { aAU: 5.2026, e: 0.04849, inclinationDeg: 1.303, longAscNodeDeg: 100.464, argPeriapsisDeg: 273.867, periodDays: 4332.59, M0Deg: 20.02 }
  },
  {
    id: "io",
    name: "Io",
    kind: "moon",
    parent: "jupiter",
    subtype: "Galilean Moon of Jupiter",
    color: "#f4d35e",
    radiusKm: 1821.6,
    massKg: 8.9319e22,
    gravityMs2: 1.8,
    escapeVelocityKms: 2.56,
    dayHours: 42.46,
    meanTemp: "~ -130 C",
    atmosphere: "SO2 exosphere",
    knownMoons: 0,
    description: "Most volcanically active known body.",
    orbit: { aAU: 0.002819, e: 0.0041, inclinationDeg: 0.04, longAscNodeDeg: 43.977, argPeriapsisDeg: 84.129, periodDays: 1.769, M0Deg: 171.0 }
  },
  {
    id: "europa",
    name: "Europa",
    kind: "moon",
    parent: "jupiter",
    subtype: "Galilean Moon of Jupiter",
    color: "#d5dbe3",
    radiusKm: 1560.8,
    massKg: 4.7998e22,
    gravityMs2: 1.31,
    escapeVelocityKms: 2.03,
    dayHours: 85.22,
    meanTemp: "~ -160 C",
    atmosphere: "Thin oxygen exosphere",
    knownMoons: 0,
    description: "Likely global subsurface ocean.",
    orbit: { aAU: 0.004486, e: 0.0094, inclinationDeg: 0.47, longAscNodeDeg: 219.106, argPeriapsisDeg: 88.97, periodDays: 3.551, M0Deg: 52.0 }
  },
  {
    id: "ganymede",
    name: "Ganymede",
    kind: "moon",
    parent: "jupiter",
    subtype: "Galilean Moon of Jupiter",
    color: "#bdc5cf",
    radiusKm: 2634.1,
    massKg: 1.4819e23,
    gravityMs2: 1.43,
    escapeVelocityKms: 2.74,
    dayHours: 171.7,
    meanTemp: "~ -163 C",
    atmosphere: "Very thin oxygen exosphere",
    knownMoons: 0,
    description: "Largest moon in the Solar System.",
    orbit: { aAU: 0.007155, e: 0.0013, inclinationDeg: 0.2, longAscNodeDeg: 63.552, argPeriapsisDeg: 192.417, periodDays: 7.155, M0Deg: 317.0 }
  },
  {
    id: "saturn",
    name: "Saturn",
    kind: "planet",
    subtype: "Gas Giant",
    color: "#e4c086",
    radiusKm: 58232,
    massKg: 5.6834e26,
    gravityMs2: 10.44,
    escapeVelocityKms: 35.5,
    dayHours: 10.656,
    meanTemp: "~ -140 C cloud tops",
    atmosphere: "Hydrogen-helium atmosphere",
    knownMoons: 146,
    description: "Gas giant with broad ring system.",
    orbit: { aAU: 9.5549, e: 0.0555, inclinationDeg: 2.485, longAscNodeDeg: 113.665, argPeriapsisDeg: 339.392, periodDays: 10759.22, M0Deg: 317.02 }
  },
  {
    id: "titan",
    name: "Titan",
    kind: "moon",
    parent: "saturn",
    subtype: "Major Moon of Saturn",
    color: "#d2a972",
    radiusKm: 2574.7,
    massKg: 1.3452e23,
    gravityMs2: 1.35,
    escapeVelocityKms: 2.64,
    dayHours: 382.68,
    meanTemp: "~ -179 C",
    atmosphere: "Dense nitrogen and methane atmosphere",
    knownMoons: 0,
    description: "Moon with stable surface methane lakes.",
    orbit: { aAU: 0.008168, e: 0.0288, inclinationDeg: 0.33, longAscNodeDeg: 168.7, argPeriapsisDeg: 186.6, periodDays: 15.945, M0Deg: 80.0 }
  },
  {
    id: "uranus",
    name: "Uranus",
    kind: "planet",
    subtype: "Ice Giant",
    color: "#8fdce9",
    radiusKm: 25362,
    massKg: 8.681e25,
    gravityMs2: 8.69,
    escapeVelocityKms: 21.3,
    dayHours: -17.24,
    meanTemp: "~ -195 C cloud tops",
    atmosphere: "Hydrogen-helium-methane atmosphere",
    knownMoons: 28,
    description: "Ice giant rotating almost on its side.",
    orbit: { aAU: 19.2184, e: 0.0463, inclinationDeg: 0.773, longAscNodeDeg: 74.006, argPeriapsisDeg: 96.998, periodDays: 30688.5, M0Deg: 142.2386 }
  },
  {
    id: "neptune",
    name: "Neptune",
    kind: "planet",
    subtype: "Ice Giant",
    color: "#6088ff",
    radiusKm: 24622,
    massKg: 1.02413e26,
    gravityMs2: 11.15,
    escapeVelocityKms: 23.5,
    dayHours: 16.11,
    meanTemp: "~ -200 C cloud tops",
    atmosphere: "Hydrogen-helium-methane atmosphere",
    knownMoons: 16,
    description: "Deep-blue ice giant with extreme winds.",
    orbit: { aAU: 30.1104, e: 0.009456, inclinationDeg: 1.77, longAscNodeDeg: 131.784, argPeriapsisDeg: 273.187, periodDays: 60182, M0Deg: 256.228 }
  },
  {
    id: "triton",
    name: "Triton",
    kind: "moon",
    parent: "neptune",
    subtype: "Largest Moon of Neptune",
    color: "#c1cddd",
    radiusKm: 1353.4,
    massKg: 2.14e22,
    gravityMs2: 0.78,
    escapeVelocityKms: 1.45,
    dayHours: -141.05,
    meanTemp: "~ -235 C",
    atmosphere: "Thin nitrogen atmosphere",
    knownMoons: 0,
    description: "Captured retrograde moon with active geysers.",
    orbit: { aAU: 0.002371, e: 0.000016, inclinationDeg: 156.9, longAscNodeDeg: 177.6, argPeriapsisDeg: 296.0, periodDays: 5.877, M0Deg: 25.0 }
  },
  {
    id: "ceres",
    name: "Ceres",
    kind: "dwarf",
    subtype: "Dwarf Planet (Asteroid Belt)",
    color: "#a2acb7",
    radiusKm: 473,
    massKg: 9.3835e20,
    gravityMs2: 0.28,
    escapeVelocityKms: 0.51,
    dayHours: 9.07,
    meanTemp: "~ -105 C",
    atmosphere: "Transient water vapor traces",
    knownMoons: 0,
    description: "Largest body in the asteroid belt.",
    orbit: { aAU: 2.7675, e: 0.0758, inclinationDeg: 10.59, longAscNodeDeg: 80.3, argPeriapsisDeg: 73.6, periodDays: 1680.0, M0Deg: 95.0 }
  },
  {
    id: "pluto",
    name: "Pluto",
    kind: "dwarf",
    subtype: "Dwarf Planet (Kuiper Belt)",
    color: "#ceb8a2",
    radiusKm: 1188.3,
    massKg: 1.303e22,
    gravityMs2: 0.62,
    escapeVelocityKms: 1.21,
    dayHours: -153.29,
    meanTemp: "~ -229 C",
    atmosphere: "Seasonal nitrogen and methane atmosphere",
    knownMoons: 5,
    description: "Icy dwarf planet with nitrogen glaciers.",
    orbit: { aAU: 39.482, e: 0.2488, inclinationDeg: 17.16, longAscNodeDeg: 110.299, argPeriapsisDeg: 113.834, periodDays: 90560, M0Deg: 14.53 }
  },
  {
    id: "eris",
    name: "Eris",
    kind: "dwarf",
    subtype: "Dwarf Planet (Scattered Disc)",
    color: "#d9dde2",
    radiusKm: 1163,
    massKg: 1.6466e22,
    gravityMs2: 0.82,
    escapeVelocityKms: 1.38,
    dayHours: 25.9,
    meanTemp: "~ -231 C",
    atmosphere: "Likely transient atmosphere near perihelion",
    knownMoons: 1,
    description: "Massive distant dwarf planet.",
    orbit: { aAU: 67.78, e: 0.44, inclinationDeg: 44.04, longAscNodeDeg: 35.95, argPeriapsisDeg: 151.64, periodDays: 203830, M0Deg: 205.0 }
  }
];

const bodyById = new Map();
const bodyPositions = new Map();
const projectedBodies = [];
const orbitCache = new Map();
const starField = [];
const textureCache = new Map();
const cloudCache = new Map();
const imageCache = new Map();

const REAL_TEXTURES = {
  sun: "sun.jpg",
  mercury: "mercury.jpg",
  venus: "venus.jpg",
  earth: "earth.jpg",
  moon: "moon.jpg",
  mars: "mars.jpg",
  jupiter: "jupiter.jpg",
  saturn: "saturn.jpg",
  uranus: "uranus.jpg",
  neptune: "neptune.jpg",
  pluto: "pluto.jpg"
};

let lastFrame = performance.now();
let downPoint = null;
let dragActive = false;

const selectionBadge = document.createElement("div");
selectionBadge.style.position = "absolute";
selectionBadge.style.pointerEvents = "none";
selectionBadge.style.padding = "0.4rem 0.55rem";
selectionBadge.style.borderRadius = "8px";
selectionBadge.style.background = "rgba(8, 18, 31, 0.86)";
selectionBadge.style.border = "1px solid rgba(142, 189, 250, 0.36)";
selectionBadge.style.color = "#e9f3ff";
selectionBadge.style.font = "600 12px Space Grotesk, sans-serif";
selectionBadge.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.45)";
selectionBadge.style.display = "none";
dom.sceneContainer.appendChild(selectionBadge);

for (const body of bodies) {
  bodyById.set(body.id, body);
}

dom.timeScaleValue.textContent = state.timeScaleDaysPerSecond.toFixed(2);
dom.distanceExponentValue.textContent = state.distanceExponent.toFixed(2);

buildStarField();
rebuildOrbitCache();
refreshFocusOptions();
setSelection("sun");
setFocus("sun");
setDateInputFromState();
updateClockDisplay();
updateInfoPanel(bodyById.get("sun"));
resizeCanvas();
requestAnimationFrame(tick);

window.addEventListener("resize", resizeCanvas);

dom.timeScale.addEventListener("input", () => {
  state.timeScaleDaysPerSecond = Number.parseFloat(dom.timeScale.value);
  dom.timeScaleValue.textContent = state.timeScaleDaysPerSecond.toFixed(2);
});

dom.pauseBtn.addEventListener("click", () => {
  state.paused = !state.paused;
  dom.pauseBtn.textContent = state.paused ? "Resume" : "Pause";
});

dom.resetViewBtn.addEventListener("click", () => {
  cameraState.zoom = 1;
  cameraState.targetZoom = 1;
  cameraState.panX = 0;
  cameraState.panY = 0;
  cameraState.yaw = 0.5;
  cameraState.pitch = -0.45;
  setFocus("sun");
  setSelection("sun");
  dom.focusSelect.value = "sun";
});

dom.jumpNowBtn.addEventListener("click", () => {
  state.jd = dateToJulian(new Date());
  setDateInputFromState();
});

dom.jumpDateBtn.addEventListener("click", () => {
  if (!dom.jumpDateInput.value) {
    return;
  }
  const date = new Date(dom.jumpDateInput.value);
  if (!Number.isNaN(date.getTime())) {
    state.jd = dateToJulian(date);
  }
});

dom.focusSelect.addEventListener("change", () => {
  const id = dom.focusSelect.value;
  setFocus(id);
  if (id !== "free") {
    setSelection(id);
  }
});

dom.showOrbits.addEventListener("change", () => {
  state.showOrbits = dom.showOrbits.checked;
});

dom.showLabels.addEventListener("change", () => {
  state.showLabels = dom.showLabels.checked;
});

dom.showMoons.addEventListener("change", () => {
  state.showMoons = dom.showMoons.checked;
  refreshFocusOptions();
});

dom.showDwarf.addEventListener("change", () => {
  state.showDwarf = dom.showDwarf.checked;
  refreshFocusOptions();
});

dom.distanceExponent.addEventListener("input", () => {
  state.distanceExponent = Number.parseFloat(dom.distanceExponent.value);
  dom.distanceExponentValue.textContent = state.distanceExponent.toFixed(2);
  rebuildOrbitCache();
});

canvas.addEventListener("pointerdown", (event) => {
  downPoint = { x: event.clientX, y: event.clientY };
  dragActive = false;
});

canvas.addEventListener("pointermove", (event) => {
  if (!downPoint) {
    return;
  }
  const dx = event.clientX - downPoint.x;
  const dy = event.clientY - downPoint.y;
  if (Math.abs(dx) + Math.abs(dy) > 2) {
    dragActive = true;
    if (state.focusedId !== "free") {
      setFocus("free");
      dom.focusSelect.value = "free";
    }
    cameraState.panX += dx;
    cameraState.panY += dy;
    downPoint = { x: event.clientX, y: event.clientY };
  }
});

canvas.addEventListener("pointerup", (event) => {
  if (!downPoint) {
    return;
  }
  const wasDrag = dragActive;
  downPoint = null;
  dragActive = false;
  if (!wasDrag) {
    pickBody(event.clientX, event.clientY);
  }
});

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const delta = event.deltaY > 0 ? 0.92 : 1.08;
  cameraState.targetZoom = clamp(cameraState.targetZoom * delta, 0.25, 40);
  cameraState.zoom = clamp(cameraState.zoom * delta, 0.25, 40);
}, { passive: false });
function tick(now) {
  const deltaSeconds = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;

  if (!state.paused) {
    state.jd += deltaSeconds * state.timeScaleDaysPerSecond;
  }

  const zoomDelta = cameraState.targetZoom - cameraState.zoom;
  cameraState.zoom += zoomDelta * 0.16;

  updateBodyPositions();
  drawScene();
  updateClockDisplay();
  requestAnimationFrame(tick);
}

function updateBodyPositions() {
  bodyPositions.clear();

  for (const body of bodies) {
    if (!body.orbit) {
      bodyPositions.set(body.id, { x: 0, y: 0, z: 0 });
      continue;
    }

    const localAU = orbitalPositionAtJD(body.orbit, state.jd);
    const localScene = toSceneDistance(localAU, body.kind === "moon");

    if (body.parent) {
      const parent = bodyPositions.get(body.parent);
      bodyPositions.set(body.id, {
        x: parent.x + localScene.x,
        y: parent.y + localScene.y,
        z: parent.z + localScene.z
      });
    } else {
      bodyPositions.set(body.id, localScene);
    }
  }
}

function drawScene() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#060b14");
  gradient.addColorStop(1, "#04070e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  drawStars(width, height);

  const focusOrigin = getFocusOrigin();
  projectedBodies.length = 0;

  if (state.showOrbits) {
    drawOrbits(focusOrigin, width, height);
  }

  for (const body of bodies) {
    if (!isBodyVisible(body)) {
      continue;
    }

    const world = bodyPositions.get(body.id);
    if (!world) {
      continue;
    }

    const projected = projectPoint(
      world.x - focusOrigin.x,
      world.y - focusOrigin.y,
      world.z - focusOrigin.z,
      width,
      height
    );

    const baseRadius = getBodyBaseRadius(body);
    const radius = clamp(baseRadius * projected.scaleFactor, body.kind === "star" ? 8 : 1.6, 240);

    projectedBodies.push({ body, projected, radius, baseRadius });
  }

  projectedBodies.sort((a, b) => a.projected.depth - b.projected.depth);
  const sunItem = projectedBodies.find((item) => item.body.id === "sun");
  const sunProjection = sunItem ? sunItem.projected : { x: width * 0.5, y: height * 0.5 };

  for (const item of projectedBodies) {
    drawBody(item.body, item.projected, item.radius, sunProjection);
  }

  if (state.showLabels) {
    for (const item of projectedBodies) {
      drawLabel(item.body, item.projected, item.radius);
    }
  }

  updateSelectionBadge(width, height);
}

function drawStars(width, height) {
  for (const star of starField) {
    ctx.globalAlpha = star.alpha;
    ctx.fillStyle = star.color;
    ctx.fillRect(star.x * width, star.y * height, star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

function drawOrbits(focusOrigin, width, height) {
  for (const body of bodies) {
    if (!body.orbit || !isBodyVisible(body)) {
      continue;
    }

    const points = orbitCache.get(body.id);
    if (!points || points.length === 0) {
      continue;
    }

    let parentOffset = { x: 0, y: 0, z: 0 };
    if (body.parent) {
      parentOffset = bodyPositions.get(body.parent);
    }

    ctx.beginPath();
    let moved = false;

    for (const p of points) {
      const worldX = p.x + parentOffset.x - focusOrigin.x;
      const worldY = p.y + parentOffset.y - focusOrigin.y;
      const worldZ = p.z + parentOffset.z - focusOrigin.z;
      const projected = projectPoint(worldX, worldY, worldZ, width, height);

      if (!moved) {
        ctx.moveTo(projected.x, projected.y);
        moved = true;
      } else {
        ctx.lineTo(projected.x, projected.y);
      }
    }

    ctx.strokeStyle = body.kind === "moon" ? "rgba(128, 156, 205, 0.24)" : body.kind === "dwarf" ? "rgba(131, 142, 168, 0.34)" : "rgba(141, 174, 230, 0.42)";
    ctx.lineWidth = body.kind === "moon" ? 0.8 : 1.1;
    ctx.stroke();
  }
}

function drawBody(body, projected, radius, sunProjection) {
  const glowRadius = body.kind === "star" ? radius * 3.5 : radius * 1.9;
  const glow = ctx.createRadialGradient(projected.x, projected.y, radius * 0.15, projected.x, projected.y, glowRadius);
  glow.addColorStop(0, body.kind === "star" ? "rgba(255, 216, 120, 0.98)" : hexToRgba(body.color, 0.78));
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(projected.x, projected.y, glowRadius, 0, TWO_PI);
  ctx.fill();

  if (body.id === "saturn" || body.id === "uranus") {
    drawPlanetRing(body, projected, radius);
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(projected.x, projected.y, radius, 0, TWO_PI);
  ctx.clip();

  if (body.kind === "star") {
    const sunGradient = ctx.createRadialGradient(projected.x - radius * 0.28, projected.y - radius * 0.28, radius * 0.3, projected.x, projected.y, radius);
    sunGradient.addColorStop(0, "#fff2bc");
    sunGradient.addColorStop(0.45, "#ffcf75");
    sunGradient.addColorStop(1, "#ff8f38");
    ctx.fillStyle = sunGradient;
    ctx.fillRect(projected.x - radius, projected.y - radius, radius * 2, radius * 2);
  } else {
    const texture = getPlanetTexture(body);
    const spinFactor = clamp(8 / Math.max(state.timeScaleDaysPerSecond, 0.1), 0.15, 1);
    const spin = body.dayHours ? (((state.jd * 24) / Math.abs(body.dayHours)) * spinFactor) % 1 : 0;
    const shift = spin * radius * 2;
    const offset = ((shift % (radius * 2)) + radius * 2) % (radius * 2);
    ctx.drawImage(texture, projected.x - radius - offset, projected.y - radius, radius * 2, radius * 2);
    ctx.drawImage(texture, projected.x - radius - offset + radius * 2, projected.y - radius, radius * 2, radius * 2);
    ctx.drawImage(texture, projected.x - radius - offset - radius * 2, projected.y - radius, radius * 2, radius * 2);

    if (body.id === "earth") {
      const clouds = getCloudTexture(body);
      const cloudShift = ((state.jd * 24) / 30) % 1;
      const cloudOffset = ((cloudShift * radius * 2) % (radius * 2) + radius * 2) % (radius * 2);
      ctx.globalAlpha = 0.55;
      ctx.drawImage(clouds, projected.x - radius - cloudOffset, projected.y - radius, radius * 2, radius * 2);
      ctx.drawImage(clouds, projected.x - radius - cloudOffset + radius * 2, projected.y - radius, radius * 2, radius * 2);
      ctx.drawImage(clouds, projected.x - radius - cloudOffset - radius * 2, projected.y - radius, radius * 2, radius * 2);
      ctx.globalAlpha = 1;
    }
  }

  const lightAngle = Math.atan2(sunProjection.y - projected.y, sunProjection.x - projected.x);
  const lighting = ctx.createLinearGradient(
    projected.x + Math.cos(lightAngle) * radius,
    projected.y + Math.sin(lightAngle) * radius,
    projected.x - Math.cos(lightAngle) * radius,
    projected.y - Math.sin(lightAngle) * radius
  );
  lighting.addColorStop(0, "rgba(255, 255, 255, 0.3)");
  lighting.addColorStop(0.55, "rgba(255, 255, 255, 0.05)");
  lighting.addColorStop(1, "rgba(0, 0, 0, 0.45)");
  ctx.fillStyle = lighting;
  ctx.fillRect(projected.x - radius, projected.y - radius, radius * 2, radius * 2);

  const limb = ctx.createRadialGradient(
    projected.x - radius * 0.2,
    projected.y - radius * 0.2,
    radius * 0.2,
    projected.x,
    projected.y,
    radius * 1.08
  );
  limb.addColorStop(0, "rgba(0, 0, 0, 0)");
  limb.addColorStop(0.7, "rgba(0, 0, 0, 0.15)");
  limb.addColorStop(1, "rgba(0, 0, 0, 0.45)");
  ctx.fillStyle = limb;
  ctx.beginPath();
  ctx.arc(projected.x, projected.y, radius * 1.02, 0, TWO_PI);
  ctx.fill();

  if (body.kind !== "star") {
    const specAngle = lightAngle + Math.PI * 0.15;
    const sx = projected.x + Math.cos(specAngle) * radius * 0.35;
    const sy = projected.y + Math.sin(specAngle) * radius * 0.35;
    const specular = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius * 0.55);
    specular.addColorStop(0, "rgba(255, 255, 255, 0.22)");
    specular.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = specular;
    ctx.beginPath();
    ctx.arc(projected.x, projected.y, radius, 0, TWO_PI);
    ctx.fill();
  }

  ctx.restore();

  if (body.id === "earth") {
    const night = getLoadedImage("earth_night.jpg");
    if (night) {
      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.beginPath();
      ctx.arc(projected.x, projected.y, radius, 0, TWO_PI);
      ctx.clip();

      const nightMask = ctx.createLinearGradient(
        projected.x + Math.cos(lightAngle) * radius,
        projected.y + Math.sin(lightAngle) * radius,
        projected.x - Math.cos(lightAngle) * radius,
        projected.y - Math.sin(lightAngle) * radius
      );
      nightMask.addColorStop(0, "rgba(0,0,0,0)");
      nightMask.addColorStop(0.45, "rgba(0,0,0,0)");
      nightMask.addColorStop(0.7, "rgba(255,255,255,0.55)");
      nightMask.addColorStop(1, "rgba(255,255,255,0.85)");

      const spin = body.dayHours ? ((state.jd * 24) / Math.abs(body.dayHours)) % 1 : 0;
      const shift = ((spin * radius * 2) % (radius * 2) + radius * 2) % (radius * 2);
      ctx.globalCompositeOperation = "screen";
      ctx.drawImage(night, projected.x - radius - shift, projected.y - radius, radius * 2, radius * 2);
      ctx.drawImage(night, projected.x - radius - shift + radius * 2, projected.y - radius, radius * 2, radius * 2);
      ctx.globalCompositeOperation = "destination-in";
      ctx.fillStyle = nightMask;
      ctx.fillRect(projected.x - radius, projected.y - radius, radius * 2, radius * 2);
      ctx.restore();
    }
  }

  if (body.kind !== "star") {
    drawAtmosphere(body, projected, radius, lightAngle);
  }

  if (body.id === state.selectedId) {
    ctx.strokeStyle = "rgba(255, 234, 166, 0.95)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(projected.x, projected.y, radius + 4, 0, TWO_PI);
    ctx.stroke();
  }
}

function drawLabel(body, projected, radius) {
  ctx.font = "600 11px Space Grotesk, sans-serif";
  const text = body.name;
  const textWidth = ctx.measureText(text).width;
  const x = projected.x - textWidth / 2;
  const y = projected.y - radius - 10;

  ctx.fillStyle = "rgba(7, 16, 29, 0.84)";
  ctx.fillRect(x - 5, y - 10, textWidth + 10, 15);
  ctx.strokeStyle = "rgba(149, 188, 245, 0.28)";
  ctx.strokeRect(x - 5, y - 10, textWidth + 10, 15);

  ctx.fillStyle = "#e9f3ff";
  ctx.fillText(text, x, y + 1);
}

function drawPlanetRing(body, projected, radius) {
  const ringColor = body.id === "saturn" ? "rgba(207, 176, 122, 0.55)" : "rgba(166, 213, 223, 0.4)";
  const inner = radius * (body.id === "saturn" ? 1.5 : 1.65);
  const outer = radius * (body.id === "saturn" ? 2.45 : 2.05);

  ctx.save();
  ctx.translate(projected.x, projected.y);
  ctx.rotate(-0.35);
  ctx.scale(1, 0.36);

  const ringTexture = body.id === "saturn" ? getLoadedImage("saturn_ring.png") : null;
  if (ringTexture) {
    ctx.globalAlpha = 0.85;
    ctx.drawImage(ringTexture, -outer, -outer, outer * 2, outer * 2);
    ctx.restore();
    return;
  }

  const ringGradient = ctx.createLinearGradient(-outer, 0, outer, 0);
  ringGradient.addColorStop(0, "rgba(255, 255, 255, 0)");
  ringGradient.addColorStop(0.2, ringColor);
  ringGradient.addColorStop(0.8, ringColor);
  ringGradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.strokeStyle = ringGradient;
  ctx.lineWidth = Math.max(2, (outer - inner) * 0.68);
  ctx.beginPath();
  ctx.arc(0, 0, (inner + outer) * 0.5, 0, TWO_PI);
  ctx.stroke();
  ctx.restore();
}

function drawAtmosphere(body, projected, radius, lightAngle) {
  const hasThickAtmosphere = /dense|hydrogen|helium|nitrogen|methane|atmosphere/i.test(body.atmosphere || "");
  if (!hasThickAtmosphere) {
    return;
  }

  let tint = "rgba(120, 175, 255, 0.34)";
  if (body.id === "venus") {
    tint = "rgba(255, 214, 158, 0.36)";
  } else if (body.id === "mars") {
    tint = "rgba(255, 180, 130, 0.24)";
  } else if (body.id === "saturn" || body.id === "jupiter") {
    tint = "rgba(255, 228, 194, 0.22)";
  } else if (body.id === "uranus" || body.id === "neptune") {
    tint = "rgba(170, 219, 255, 0.3)";
  }

  const rim = ctx.createRadialGradient(projected.x, projected.y, radius * 0.92, projected.x, projected.y, radius * 1.24);
  rim.addColorStop(0, "rgba(0,0,0,0)");
  rim.addColorStop(0.7, tint);
  rim.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rim;
  ctx.beginPath();
  ctx.arc(projected.x, projected.y, radius * 1.24, 0, TWO_PI);
  ctx.fill();

  const highlightX = projected.x + Math.cos(lightAngle) * radius * 0.45;
  const highlightY = projected.y + Math.sin(lightAngle) * radius * 0.45;
  const highlight = ctx.createRadialGradient(highlightX, highlightY, 0, highlightX, highlightY, radius * 0.58);
  highlight.addColorStop(0, "rgba(255,255,255,0.22)");
  highlight.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.arc(projected.x, projected.y, radius, 0, TWO_PI);
  ctx.fill();
}

function updateSelectionBadge(width, height) {
  const selected = projectedBodies.find((item) => item.body.id === state.selectedId);
  if (!selected) {
    selectionBadge.style.display = "none";
    return;
  }

  selectionBadge.style.display = "block";
  selectionBadge.textContent = `${selected.body.name}  |  ${selected.body.subtype}`;

  const estimatedWidth = Math.min(selectionBadge.offsetWidth || 220, width - 16);
  const x = clamp(selected.projected.x + 14, 8, width - estimatedWidth - 8);
  const y = clamp(selected.projected.y - selected.radius - 44, 8, height - 42);
  selectionBadge.style.left = `${x}px`;
  selectionBadge.style.top = `${y}px`;
}

function getPlanetTexture(body) {
  if (USE_REAL_TEXTURES) {
    const realFile = REAL_TEXTURES[body.id];
    const loadedImage = getLoadedImage(realFile);
    if (loadedImage) {
      return loadedImage;
    }
  }

  if (textureCache.has(body.id)) {
    return textureCache.get(body.id);
  }

  const texture = document.createElement("canvas");
  texture.width = TEXTURE_SIZE;
  texture.height = TEXTURE_SIZE;
  const tctx = texture.getContext("2d");
  const size = TEXTURE_SIZE;

  const random = seededRandom(seedFromString(body.id));
  const gradient = tctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, shadeColor(body.color, 18));
  gradient.addColorStop(0.5, body.color);
  gradient.addColorStop(1, shadeColor(body.color, -22));
  tctx.fillStyle = gradient;
  tctx.fillRect(0, 0, size, size);

  if (body.id === "earth") {
    tctx.fillStyle = "#0c2a4d";
    tctx.fillRect(0, 0, size, size);
    paintNoiseLayer(tctx, size, seedFromString(body.id) + 13, 42, [12, 70, 44], [88, 162, 96], 0.9, 0.46);
    paintNoiseLayer(tctx, size, seedFromString(body.id) + 31, 22, [66, 120, 78], [150, 186, 120], 0.55, 0.6);
    paintNoiseLayer(tctx, size, seedFromString(body.id) + 57, 18, [190, 200, 210], [230, 240, 245], 0.35, 0.74);
    for (let i = 0; i < 220; i += 1) {
      tctx.fillStyle = `rgba(255,255,255,${random() * 0.18 + 0.06})`;
      tctx.fillRect(random() * size, random() * size, random() * 64 + 24, random() * 6 + 2);
    }
  } else if (body.id === "venus") {
    tctx.fillStyle = "#cfa86a";
    tctx.fillRect(0, 0, size, size);
    for (let y = 0; y < size; y += 5) {
      const alpha = 0.22 + random() * 0.2;
      const shift = (random() - 0.5) * 30;
      tctx.fillStyle = `rgba(255, 230, 200, ${alpha})`;
      tctx.fillRect(shift, y, size + 70, random() * 3 + 2);
    }
    paintNoiseLayer(tctx, size, seedFromString(body.id) + 12, 26, [220, 190, 150], [255, 235, 205], 0.3, 0.66);
  } else if (body.id === "mars") {
    tctx.fillStyle = "#9a4d2c";
    tctx.fillRect(0, 0, size, size);
    paintNoiseLayer(tctx, size, seedFromString(body.id) + 7, 30, [130, 60, 40], [200, 110, 70], 0.6, 0.44);
    paintNoiseLayer(tctx, size, seedFromString(body.id) + 19, 14, [210, 160, 120], [240, 200, 160], 0.35, 0.62);
    tctx.fillStyle = "rgba(235, 245, 250, 0.55)";
    tctx.beginPath();
    tctx.arc(size * 0.5, size * 0.06, size * 0.12, 0, TWO_PI);
    tctx.fill();
    tctx.beginPath();
    tctx.arc(size * 0.5, size * 0.94, size * 0.12, 0, TWO_PI);
    tctx.fill();
  } else if (body.id === "jupiter" || body.id === "saturn" || body.id === "uranus" || body.id === "neptune") {
    for (let y = 0; y < size; y += 6) {
      const alpha = body.id === "jupiter" ? 0.34 : body.id === "saturn" ? 0.28 : 0.22;
      const shift = (random() - 0.5) * 40;
      tctx.fillStyle = `rgba(255,255,255,${alpha * (0.35 + random())})`;
      tctx.fillRect(shift, y, size + 120, random() * 4 + 1.4);
      tctx.fillStyle = `rgba(0,0,0,${alpha * 0.7})`;
      tctx.fillRect(shift, y + 3, size + 120, random() * 2.6 + 0.8);
    }
    paintNoiseLayer(tctx, size, seedFromString(body.id) + 11, 18, [120, 90, 60], [210, 180, 140], 0.3, 0.6);
    if (body.id === "jupiter") {
      tctx.fillStyle = "rgba(170, 72, 48, 0.7)";
      tctx.beginPath();
      tctx.ellipse(size * 0.58, size * 0.62, size * 0.13, size * 0.055, 0, 0, TWO_PI);
      tctx.fill();
    }
  } else if (body.kind === "moon" || body.id === "mercury") {
    paintNoiseLayer(tctx, size, seedFromString(body.id) + 9, 24, [140, 140, 140], [200, 200, 200], 0.35, 0.55);
    for (let i = 0; i < 420; i += 1) {
      const crater = random() * 12 + 2;
      const cx = random() * size;
      const cy = random() * size;
      tctx.fillStyle = `rgba(255,255,255,${random() * 0.14 + 0.05})`;
      tctx.beginPath();
      tctx.arc(cx - crater * 0.25, cy - crater * 0.25, crater, 0, TWO_PI);
      tctx.fill();
      tctx.fillStyle = `rgba(0,0,0,${random() * 0.22 + 0.08})`;
      tctx.beginPath();
      tctx.arc(cx, cy, crater * 0.84, 0, TWO_PI);
      tctx.fill();
    }
  } else {
    paintNoiseLayer(tctx, size, seedFromString(body.id) + 5, 20, [120, 120, 130], [210, 210, 220], 0.35, 0.5);
    paintNoiseLayer(tctx, size, seedFromString(body.id) + 27, 12, [220, 220, 230], [250, 250, 255], 0.25, 0.62);
  }

  for (let i = 0; i < 1800; i += 1) {
    const x = random() * size;
    const y = random() * size;
    const alpha = random() * 0.06;
    tctx.fillStyle = `rgba(255,255,255,${alpha})`;
    tctx.fillRect(x, y, 1, 1);
  }

  textureCache.set(body.id, texture);
  return texture;
}

function getCloudTexture(body) {
  if (USE_REAL_TEXTURES) {
    const loadedClouds = getLoadedImage("earth_clouds.png") || getLoadedImage("earth_clouds.jpg");
    if (loadedClouds) {
      return loadedClouds;
    }
  }

  if (cloudCache.has(body.id)) {
    return cloudCache.get(body.id);
  }

  const texture = document.createElement("canvas");
  texture.width = TEXTURE_SIZE;
  texture.height = TEXTURE_SIZE;
  const tctx = texture.getContext("2d");
  const size = TEXTURE_SIZE;

  tctx.fillStyle = "rgba(255, 255, 255, 0)";
  tctx.fillRect(0, 0, size, size);

  paintNoiseLayer(tctx, size, seedFromString(body.id) + 101, 20, [230, 238, 255], [255, 255, 255], 0.35, 0.5);
  paintNoiseLayer(tctx, size, seedFromString(body.id) + 157, 10, [255, 255, 255], [255, 255, 255], 0.2, 0.62);

  cloudCache.set(body.id, texture);
  return texture;
}

function getLoadedImage(fileName) {
  if (!USE_REAL_TEXTURES) {
    return null;
  }

  if (!fileName) {
    return null;
  }
  if (!imageCache.has(fileName)) {
    const img = new Image();
    img.src = `assets/textures/${fileName}`;
    imageCache.set(fileName, img);
  }
  const image = imageCache.get(fileName);
  if (image.complete && image.naturalWidth > 0) {
    return image;
  }
  return null;
}

function pickBody(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;

  let nearest = null;
  for (const item of projectedBodies) {
    const dx = x - item.projected.x;
    const dy = y - item.projected.y;
    const distSq = dx * dx + dy * dy;

    if (!nearest || distSq < nearest.distSq) {
      nearest = { body: item.body, distSq, radius: item.radius };
    }
  }

  if (nearest) {
    const hitRadius = Math.max(18, nearest.radius + 10);
    if (nearest.distSq <= hitRadius * hitRadius) {
      setSelection(nearest.body.id);
      setFocus(nearest.body.id);
      if ([...dom.focusSelect.options].some((opt) => opt.value === nearest.body.id)) {
        dom.focusSelect.value = nearest.body.id;
      }
    }
  }
}

function getFocusOrigin() {
  if (!state.focusedId || state.focusedId === "free") {
    return { x: 0, y: 0, z: 0 };
  }
  return bodyPositions.get(state.focusedId) || { x: 0, y: 0, z: 0 };
}

function setSelection(id) {
  if (bodyById.has(id)) {
    state.selectedId = id;
    updateInfoPanel(bodyById.get(id));
  }
}

function setFocus(id) {
  state.focusedId = bodyById.has(id) || id === "free" ? id : "free";
  if (state.focusedId !== "free") {
    cameraState.panX = 0;
    cameraState.panY = 0;

    const body = bodyById.get(state.focusedId);
    const baseRadius = getBodyBaseRadius(body);
    const desiredPixelRadius = body.kind === "star" ? 56 : body.kind === "moon" ? 30 : body.kind === "dwarf" ? 34 : 42;
    cameraState.targetZoom = clamp(desiredPixelRadius / Math.max(baseRadius, 1), 0.35, 32);
  } else {
    cameraState.targetZoom = clamp(cameraState.targetZoom, 0.25, 40);
  }
}

function refreshFocusOptions() {
  const current = state.focusedId || "free";
  dom.focusSelect.innerHTML = "";

  const free = document.createElement("option");
  free.value = "free";
  free.textContent = "Free Camera";
  dom.focusSelect.append(free);

  for (const body of bodies) {
    if (body.kind === "moon" && !state.showMoons) {
      continue;
    }
    if (body.kind === "dwarf" && !state.showDwarf) {
      continue;
    }
    const option = document.createElement("option");
    option.value = body.id;
    option.textContent = body.name;
    dom.focusSelect.append(option);
  }

  if ([...dom.focusSelect.options].some((opt) => opt.value === current)) {
    dom.focusSelect.value = current;
  } else {
    dom.focusSelect.value = "free";
    state.focusedId = "free";
  }
}
function updateInfoPanel(body) {
  dom.infoTitle.textContent = body.name;
  dom.infoSubtitle.textContent = body.description;

  const orbitalPeriod = body.orbit
    ? body.kind === "moon"
      ? `${body.orbit.periodDays.toFixed(3)} Earth days`
      : `${(body.orbit.periodDays / 365.25).toFixed(3)} Earth years`
    : "N/A";

  const semimajorAxis = body.orbit
    ? body.kind === "moon"
      ? `${(body.orbit.aAU * AU_IN_KM).toLocaleString(undefined, { maximumFractionDigits: 0 })} km`
      : `${body.orbit.aAU.toFixed(4)} AU`
    : "0 AU";

  const rows = [
    ["Class", body.subtype],
    ["Radius", `${body.radiusKm.toLocaleString()} km`],
    ["Mass", formatMass(body.massKg)],
    ["Surface Gravity", `${body.gravityMs2} m/s^2`],
    ["Escape Velocity", `${body.escapeVelocityKms} km/s`],
    ["Rotation", formatRotation(body.dayHours)],
    ["Orbital Period", orbitalPeriod],
    ["Semi-major Axis", semimajorAxis],
    ["Eccentricity", body.orbit ? body.orbit.e.toFixed(5) : "N/A"],
    ["Mean Temperature", body.meanTemp],
    ["Atmosphere", body.atmosphere],
    ["Known Moons", String(body.knownMoons)]
  ];

  dom.infoList.innerHTML = "";
  for (const [key, value] of rows) {
    const li = document.createElement("li");
    const left = document.createElement("span");
    left.textContent = key;
    const right = document.createElement("strong");
    right.textContent = value;
    li.append(left, right);
    dom.infoList.append(li);
  }
}

function rebuildOrbitCache() {
  orbitCache.clear();
  for (const body of bodies) {
    if (!body.orbit) {
      continue;
    }
    const points = [];
    const segments = body.kind === "moon" ? 120 : 260;
    for (let i = 0; i <= segments; i += 1) {
      const meanAnomaly = (i / segments) * TWO_PI;
      const localAU = orbitalPositionFromMeanAnomaly(body.orbit, meanAnomaly);
      points.push(toSceneDistance(localAU, body.kind === "moon"));
    }
    orbitCache.set(body.id, points);
  }
}

function isBodyVisible(body) {
  if (body.kind === "moon" && !state.showMoons) {
    return false;
  }
  if (body.kind === "dwarf" && !state.showDwarf) {
    return false;
  }
  return true;
}

function projectPoint(x, y, z, width, height) {
  const cy = Math.cos(cameraState.yaw);
  const sy = Math.sin(cameraState.yaw);
  const cp = Math.cos(cameraState.pitch);
  const sp = Math.sin(cameraState.pitch);

  const x1 = x * cy - z * sy;
  const z1 = x * sy + z * cy;
  const y1 = y;

  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;

  const baseScale = BASE_PROJECTION_SCALE;
  const perspective = 1 / (1 + Math.max(-0.9, z2 * 0.0028));
  const scale = baseScale * cameraState.zoom * perspective;

  return {
    x: width * 0.5 + x1 * scale + cameraState.panX,
    y: height * 0.5 + y2 * scale + cameraState.panY,
    depth: z2,
    scaleFactor: scale / BASE_PROJECTION_SCALE
  };
}

function toSceneDistance(auVector, isMoon) {
  const distance = Math.hypot(auVector.x, auVector.y, auVector.z);
  if (distance === 0) {
    return { x: 0, y: 0, z: 0 };
  }

  const scaled = scaleDistance(distance, isMoon);
  const factor = scaled / distance;
  return {
    x: auVector.x * factor,
    y: auVector.y * factor,
    z: auVector.z * factor
  };
}

function scaleDistance(au, isMoon) {
  const compressed = Math.pow(Math.max(au, 0), state.distanceExponent) * BASE_DISTANCE_SCALE;
  return isMoon ? compressed * MOON_DISTANCE_BOOST : compressed;
}

function orbitalPositionAtJD(orbit, jd) {
  const elapsed = jd - J2000;
  const meanAnomaly = normalizeRadians(degToRad(orbit.M0Deg + (360 * elapsed) / orbit.periodDays));
  return orbitalPositionFromMeanAnomaly(orbit, meanAnomaly);
}

function orbitalPositionFromMeanAnomaly(orbit, meanAnomaly) {
  const eccentricAnomaly = solveKepler(meanAnomaly, orbit.e);
  const xPrime = orbit.aAU * (Math.cos(eccentricAnomaly) - orbit.e);
  const yPrime = orbit.aAU * Math.sqrt(1 - orbit.e * orbit.e) * Math.sin(eccentricAnomaly);

  const trueAnomaly = Math.atan2(yPrime, xPrime);
  const radius = Math.hypot(xPrime, yPrime);

  const i = degToRad(orbit.inclinationDeg);
  const omega = degToRad(orbit.argPeriapsisDeg);
  const Omega = degToRad(orbit.longAscNodeDeg);

  const cosOmega = Math.cos(Omega);
  const sinOmega = Math.sin(Omega);
  const cosI = Math.cos(i);
  const sinI = Math.sin(i);
  const cosArg = Math.cos(omega + trueAnomaly);
  const sinArg = Math.sin(omega + trueAnomaly);

  const x = radius * (cosOmega * cosArg - sinOmega * sinArg * cosI);
  const y = radius * (sinOmega * cosArg + cosOmega * sinArg * cosI);
  const z = radius * (sinArg * sinI);

  return { x, y: z, z: y };
}

function solveKepler(meanAnomaly, eccentricity) {
  let value = meanAnomaly;
  for (let i = 0; i < 9; i += 1) {
    const f = value - eccentricity * Math.sin(value) - meanAnomaly;
    const fp = 1 - eccentricity * Math.cos(value);
    value -= f / fp;
  }
  return value;
}

function updateClockDisplay() {
  const date = julianToDate(state.jd);
  dom.simClock.textContent = date.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

function setDateInputFromState() {
  const d = julianToDate(state.jd);
  const pad = (value) => String(value).padStart(2, "0");
  dom.jumpDateInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function resizeCanvas() {
  const width = dom.sceneContainer.clientWidth;
  const height = dom.sceneContainer.clientHeight;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function buildStarField() {
  starField.length = 0;
  for (let i = 0; i < 850; i += 1) {
    starField.push({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 1.8 + 0.2,
      alpha: Math.random() * 0.6 + 0.2,
      color: Math.random() > 0.7 ? "#d9e9ff" : "#b9d6ff"
    });
  }
}

function hexToRgba(hex, alpha) {
  const value = hex.replace("#", "");
  const bigint = Number.parseInt(value, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getBodyBaseRadius(body) {
  if (body.kind === "star") {
    return STAR_RADIUS;
  }
  const normalized = Math.pow(body.radiusKm / 6371, 0.52) * PLANET_SIZE_SCALE;
  if (body.kind === "moon") {
    return normalized * 0.86;
  }
  return normalized;
}

function shadeColor(hex, amount) {
  const value = hex.replace("#", "");
  const bigint = Number.parseInt(value, 16);
  const r = clamp(((bigint >> 16) & 255) + amount, 0, 255);
  const g = clamp(((bigint >> 8) & 255) + amount, 0, 255);
  const b = clamp((bigint & 255) + amount, 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function seedFromString(text) {
  let seed = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    seed ^= text.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

function seededRandom(seed) {
  let value = seed || 1;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function valueNoise2D(x, y, seed) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const h00 = hash2(ix, iy, seed);
  const h10 = hash2(ix + 1, iy, seed);
  const h01 = hash2(ix, iy + 1, seed);
  const h11 = hash2(ix + 1, iy + 1, seed);

  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);

  const lerpX1 = h00 + (h10 - h00) * u;
  const lerpX2 = h01 + (h11 - h01) * u;
  return lerpX1 + (lerpX2 - lerpX1) * v;
}

function fbmNoise(x, y, octaves, seed, lacunarity = 2, gain = 0.5) {
  let value = 0;
  let amp = 1;
  let freq = 1;
  let max = 0;

  for (let i = 0; i < octaves; i += 1) {
    value += valueNoise2D(x * freq, y * freq, seed + i * 97.13) * amp;
    max += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return value / max;
}

function hash2(x, y, seed) {
  let h = seed ^ (x * 374761393 + y * 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function paintNoiseLayer(tctx, size, seed, scale, colorA, colorB, alpha = 0.6, threshold = 0) {
  const block = 2;
  for (let y = 0; y < size; y += block) {
    for (let x = 0; x < size; x += block) {
      const n = fbmNoise(x / scale, y / scale, 4, seed);
      if (n < threshold) {
        continue;
      }
      const mix = (n - threshold) / (1 - threshold);
      const r = Math.round(colorA[0] + (colorB[0] - colorA[0]) * mix);
      const g = Math.round(colorA[1] + (colorB[1] - colorA[1]) * mix);
      const b = Math.round(colorA[2] + (colorB[2] - colorA[2]) * mix);
      tctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      tctx.fillRect(x, y, block, block);
    }
  }
}

function formatMass(kg) {
  return Number.isFinite(kg) ? kg.toExponential(4).replace("e+", "e") : "N/A";
}

function formatRotation(hours) {
  if (!Number.isFinite(hours)) {
    return "N/A";
  }
  const retrograde = hours < 0 ? " (retrograde)" : "";
  const abs = Math.abs(hours);
  if (abs >= 48) {
    return `${(abs / 24).toFixed(3)} Earth days${retrograde}`;
  }
  return `${abs.toFixed(3)} hours${retrograde}`;
}

function dateToJulian(date) {
  return date.getTime() / 86400000 + 2440587.5;
}

function julianToDate(jd) {
  return new Date((jd - 2440587.5) * 86400000);
}

function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

function normalizeRadians(angle) {
  let value = angle % TWO_PI;
  if (value < 0) {
    value += TWO_PI;
  }
  return value;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}


