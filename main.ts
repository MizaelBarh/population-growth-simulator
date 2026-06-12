// ── Types ─────────────────────────────────────────────────────────────────
interface SimParams {
  N0: number;
  K: number;
  r: number;
  tMax: number;
  speciesName: string;
  showPhase: boolean;
  showCompare: boolean;
  showCrash: boolean;
}

interface SimResult {
  t: number[];
  N: number[];
  dNdt: number[];
}

interface PhaseInfo {
  label: string;
  color: string;
}

// ── ODE solver (RK4) ──────────────────────────────────────────────────────
function logistic(N: number, r: number, K: number): number {
  return r * N * (1 - N / K);
}

function logisticCrash(N: number, r: number, K: number, alpha = 0.8): number {
  const effectiveK = Math.max(K - alpha * Math.max(0, N - K), 1);
  return r * N * (1 - N / effectiveK);
}

function rk4Step(
  N: number,
  t: number,
  dt: number,
  fn: (N: number, t: number) => number
): number {
  const k1 = fn(N, t);
  const k2 = fn(N + (dt / 2) * k1, t + dt / 2);
  const k3 = fn(N + (dt / 2) * k2, t + dt / 2);
  const k4 = fn(N + dt * k3, t + dt);
  return N + (dt / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
}

function solve(
  N0: number,
  r: number,
  K: number,
  tMax: number,
  steps = 600,
  crash = false
): SimResult {
  const dt = tMax / steps;
  const t: number[] = [];
  const N: number[] = [];
  const dNdt: number[] = [];

  let Ncur = N0;
  for (let i = 0; i <= steps; i++) {
    const ti = i * dt;
    t.push(ti);
    N.push(Ncur);
    dNdt.push(crash ? logisticCrash(Ncur, r, K) : logistic(Ncur, r, K));
    Ncur = rk4Step(Ncur, ti, dt, (n) =>
      crash ? logisticCrash(n, r, K) : logistic(n, r, K)
    );
  }
  return { t, N, dNdt };
}

// ── Phase helpers ─────────────────────────────────────────────────────────
function getPhase(N: number, K: number): PhaseInfo {
  const frac = N / K;
  if (frac < 0.05) return { label: "Lag", color: "#e6c87a" };
  if (frac < 0.5) return { label: "Exponential", color: "#7ae6c8" };
  if (frac < 0.9) return { label: "Deceleration", color: "#a8e6a3" };
  return { label: "Plateau", color: "#c8a8e6" };
}

function phaseColor(N: number, K: number): string {
  return getPhase(N, K).color;
}

// ── Chart.js helpers ───────────────────────────────────────────────────────
const CHART_DEFAULTS = {
  bgVoid: "#080d14",
  bgCard: "#0d1320",
  gridColor: "rgba(26,42,26,0.8)",
  tickColor: "#3a5a3a",
  labelColor: "#6baa6b",
};

function baseScales(xLabel: string, yLabel: string) {
  return {
    x: {
      grid: { color: CHART_DEFAULTS.gridColor, lineWidth: 0.8 },
      ticks: { color: CHART_DEFAULTS.tickColor, font: { family: "'Space Mono'" } },
      title: {
        display: true,
        text: xLabel,
        color: CHART_DEFAULTS.labelColor,
        font: { family: "'Space Mono'", size: 11 },
      },
    },
    y: {
      grid: { color: CHART_DEFAULTS.gridColor, lineWidth: 0.8 },
      ticks: { color: CHART_DEFAULTS.tickColor, font: { family: "'Space Mono'" } },
      title: {
        display: true,
        text: yLabel,
        color: CHART_DEFAULTS.labelColor,
        font: { family: "'Space Mono'", size: 11 },
      },
    },
  };
}

// ── Chart instances ────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let chartMain: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let chartPhase: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let chartCompare: any = null;

function destroyAll(): void {
  chartMain?.destroy();
  chartPhase?.destroy();
  chartCompare?.destroy();
}

// ── Render main growth chart ───────────────────────────────────────────────
function renderMain(params: SimParams, result: SimResult, crashResult?: SimResult): void {
  const ctx = (document.getElementById("chart-main") as HTMLCanvasElement).getContext("2d")!;
  chartMain?.destroy();

  const { t, N, dNdt } = result;
  const K = params.K;

  // Segment colours by phase
  const pointColors = N.map((n) => phaseColor(n, K));

  // Find inflection index (max dNdt)
  const inflIdx = dNdt.indexOf(Math.max(...dNdt));

  // Find t50
  const t50Idx = N.findIndex((n) => n >= K / 2);

  const datasets: object[] = [
    {
      label: params.speciesName,
      data: N.map((n, i) => ({ x: t[i], y: n })),
      borderColor: "#a8e6a3",
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.4,
      fill: false,
      segment: {
        borderColor: (ctx2: { p0: { parsed: { x: number; y: number } } }) =>
          phaseColor(ctx2.p0.parsed.y, K),
      },
    },
    {
      label: `Carrying capacity K = ${K.toLocaleString()}`,
      data: t.map((ti) => ({ x: ti, y: K })),
      borderColor: "#c8a8e6",
      borderWidth: 1.2,
      borderDash: [5, 4],
      pointRadius: 0,
      fill: false,
    },
    {
      label: "Inflection point",
      data: [{ x: t[inflIdx], y: N[inflIdx] }],
      borderColor: "#e6c87a",
      backgroundColor: "#e6c87a",
      pointRadius: 7,
      pointHoverRadius: 9,
      showLine: false,
    },
  ];

  if (t50Idx !== -1) {
    datasets.push({
      label: `K/2 reached at t = ${t[t50Idx].toFixed(1)} yr`,
      data: [{ x: t[t50Idx], y: N[t50Idx] }],
      borderColor: "#7ae6c8",
      backgroundColor: "#7ae6c8",
      pointRadius: 6,
      pointHoverRadius: 8,
      showLine: false,
    });
  }

  if (crashResult) {
    datasets.push({
      label: "Overshoot & crash",
      data: crashResult.N.map((n, i) => ({ x: crashResult.t[i], y: n })),
      borderColor: "#e67a7a",
      borderWidth: 1.8,
      borderDash: [6, 3],
      pointRadius: 0,
      tension: 0.4,
      fill: false,
    });
  }

  chartMain = new (window as unknown as { Chart: typeof Chart }).Chart(ctx, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      parsing: false,
      interaction: { mode: "nearest", intersect: false },
      plugins: {
        legend: {
          labels: {
            color: "#6baa6b",
            font: { family: "'Space Mono'", size: 10 },
            boxWidth: 12,
          },
        },
        tooltip: {
          backgroundColor: "#0d1320",
          borderColor: "#1a2a1a",
          borderWidth: 1,
          titleColor: "#a8e6a3",
          bodyColor: "#6baa6b",
          titleFont: { family: "'Space Mono'" },
          bodyFont: { family: "'Space Mono'" },
          callbacks: {
            label: (ctx2: { dataset: { label: string }; parsed: { x: number; y: number } }) =>
              `${ctx2.dataset.label}: ${Math.round(ctx2.parsed.y).toLocaleString()}`,
          },
        },
      },
      scales: {
        ...baseScales("Time (years)", "Population size (N)"),
        x: { ...baseScales("Time (years)", "Population size (N)").x, type: "linear", min: 0, max: params.tMax },
        y: { ...baseScales("Time (years)", "Population size (N)").y, min: 0, max: K * 1.15 },
      },
    },
  });
}

// ── Render phase plot ──────────────────────────────────────────────────────
function renderPhase(params: SimParams, result: SimResult): void {
  const ctx = (document.getElementById("chart-phase") as HTMLCanvasElement).getContext("2d")!;
  chartPhase?.destroy();

  const { K, r } = params;
  const steps = 300;
  const Nrange = Array.from({ length: steps }, (_, i) => (i / steps) * K * 1.1);
  const dNrange = Nrange.map((n) => r * n * (1 - n / K));

  const NEnd = result.N[result.N.length - 1];
  const dNEnd = r * NEnd * (1 - NEnd / K);

  chartPhase = new (window as unknown as { Chart: typeof Chart }).Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "dN/dt",
          data: Nrange.map((n, i) => ({ x: n, y: dNrange[i] })),
          borderColor: "#a8e6a3",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: {
            target: { value: 0 },
            above: "rgba(168,230,163,0.07)",
            below: "rgba(230,122,122,0.07)",
          },
        },
        {
          label: "Current state",
          data: [{ x: NEnd, y: dNEnd }],
          borderColor: "#e6c87a",
          backgroundColor: "#e6c87a",
          pointRadius: 7,
          showLine: false,
        },
        {
          label: `K = ${K.toLocaleString()}`,
          data: [
            { x: K, y: Math.min(...dNrange) * 1.1 },
            { x: K, y: Math.max(...dNrange) * 1.1 },
          ],
          borderColor: "#c8a8e6",
          borderWidth: 1,
          borderDash: [5, 4],
          pointRadius: 0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      parsing: false,
      plugins: {
        legend: {
          labels: {
            color: "#6baa6b",
            font: { family: "'Space Mono'", size: 10 },
            boxWidth: 12,
          },
        },
        tooltip: {
          backgroundColor: "#0d1320",
          borderColor: "#1a2a1a",
          borderWidth: 1,
          titleColor: "#a8e6a3",
          bodyColor: "#6baa6b",
          titleFont: { family: "'Space Mono'" },
          bodyFont: { family: "'Space Mono'" },
        },
      },
      scales: {
        ...baseScales("Population size (N)", "Growth rate dN/dt"),
        x: { ...baseScales("Population size (N)", "Growth rate dN/dt").x, type: "linear", min: 0, max: K * 1.1 },
      },
    },
  });
}

// ── Render comparison chart ────────────────────────────────────────────────
function renderCompare(params: SimParams): void {
  const ctx = (document.getElementById("chart-compare") as HTMLCanvasElement).getContext("2d")!;
  chartCompare?.destroy();

  const { N0, r, K, tMax, speciesName } = params;

  const scenarios = [
    { r: r * 0.5, K, color: "#7ae6c8", label: "Slow grower (r×0.5)" },
    { r, K, color: "#a8e6a3", label: `${speciesName} (baseline)` },
    { r: r * 1.8, K, color: "#e6c87a", label: "Fast grower (r×1.8)" },
    { r, K: K * 0.5, color: "#e67a7a", label: "Low K (K÷2)" },
    { r, K: K * 2, color: "#c8a8e6", label: "High K (K×2)" },
  ];

  const datasets = scenarios.map((s) => {
    const res = solve(N0, s.r, s.K, tMax);
    return {
      label: s.label,
      data: res.N.map((n, i) => ({ x: res.t[i], y: n })),
      borderColor: s.color,
      borderWidth: 1.8,
      pointRadius: 0,
      tension: 0.4,
      fill: false,
    };
  });

  chartCompare = new (window as unknown as { Chart: typeof Chart }).Chart(ctx, {
    type: "line",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 500 },
      parsing: false,
      plugins: {
        legend: {
          labels: {
            color: "#6baa6b",
            font: { family: "'Space Mono'", size: 10 },
            boxWidth: 12,
          },
        },
        tooltip: {
          backgroundColor: "#0d1320",
          borderColor: "#1a2a1a",
          borderWidth: 1,
          titleColor: "#a8e6a3",
          bodyColor: "#6baa6b",
          titleFont: { family: "'Space Mono'" },
          bodyFont: { family: "'Space Mono'" },
        },
      },
      scales: {
        ...baseScales("Time (years)", "Population size (N)"),
        x: { ...baseScales("Time (years)", "Population size (N)").x, type: "linear", min: 0, max: tMax },
        y: { ...baseScales("Time (years)", "Population size (N)").y, min: 0 },
      },
    },
  });
}

// ── Update metrics strip ───────────────────────────────────────────────────
function updateMetrics(params: SimParams, result: SimResult): void {
  const { N, t, dNdt } = result;
  const { K } = params;

  const finalN = N[N.length - 1];
  const t50Idx = N.findIndex((n) => n >= K / 2);
  const maxGrowth = Math.max(...dNdt);
  const saturation = Math.min((finalN / K) * 100, 100);

  (document.getElementById("val-final") as HTMLElement).textContent =
    Math.round(finalN).toLocaleString();
  (document.getElementById("val-t50") as HTMLElement).textContent =
    t50Idx !== -1 ? t[t50Idx].toFixed(1) : "—";
  (document.getElementById("val-peak") as HTMLElement).textContent =
    maxGrowth.toFixed(1);
  (document.getElementById("val-sat") as HTMLElement).textContent =
    saturation.toFixed(1);

  // Phase badge
  const phase = getPhase(finalN, K);
  const badge = document.getElementById("phase-badge") as HTMLElement;
  badge.textContent = phase.label;
  badge.style.color = phase.color;
  badge.style.borderColor = phase.color + "55";
}

// ── Ambient background particles ───────────────────────────────────────────
function initParticles(): void {
  const canvas = document.getElementById("bg-canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;

  interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    r: number; alpha: number;
  }

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  const particles: Particle[] = Array.from({ length: 55 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    r: Math.random() * 1.8 + 0.4,
    alpha: Math.random() * 0.4 + 0.1,
  }));

  function frame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(168,230,163,${p.alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  frame();
}

// ── Main controller ────────────────────────────────────────────────────────
function getParams(): SimParams {
  return {
    N0: Number((document.getElementById("n0") as HTMLInputElement).value),
    K: Number((document.getElementById("K") as HTMLInputElement).value),
    r: Number((document.getElementById("r") as HTMLInputElement).value),
    tMax: Number((document.getElementById("tmax") as HTMLInputElement).value),
    speciesName: (document.getElementById("species-name") as HTMLInputElement).value || "Species A",
    showPhase: (document.getElementById("show-phase") as HTMLInputElement).checked,
    showCompare: (document.getElementById("show-compare") as HTMLInputElement).checked,
    showCrash: (document.getElementById("show-crash") as HTMLInputElement).checked,
  };
}

function run(): void {
  const p = getParams();

  const result = solve(p.N0, p.r, p.K, p.tMax);
  const crashResult = p.showCrash ? solve(p.N0, p.r, p.K, p.tMax, 600, true) : undefined;

  destroyAll();
  renderMain(p, result, crashResult);
  updateMetrics(p, result);

  // Phase chart
  const cardPhase = document.getElementById("card-phase") as HTMLElement;
  if (p.showPhase) {
    cardPhase.classList.remove("hidden");
    renderPhase(p, result);
  } else {
    cardPhase.classList.add("hidden");
  }

  // Comparison chart
  const cardCompare = document.getElementById("card-compare") as HTMLElement;
  if (p.showCompare) {
    cardCompare.classList.remove("hidden");
    renderCompare(p);
  } else {
    cardCompare.classList.add("hidden");
  }

  // Update chart title
  (document.getElementById("main-chart-title") as HTMLElement).textContent =
    `Logistic Growth — ${p.speciesName}`;
}

// ── Wire up slider labels ──────────────────────────────────────────────────
function bindSlider(id: string, valId: string, fmt?: (v: number) => string): void {
  const el = document.getElementById(id) as HTMLInputElement;
  const val = document.getElementById(valId) as HTMLElement;
  el.addEventListener("input", () => {
    const n = Number(el.value);
    val.textContent = fmt ? fmt(n) : String(n);
    run();
  });
}

// ── Init ───────────────────────────────────────────────────────────────────
window.addEventListener("DOMContentLoaded", () => {
  initParticles();

  bindSlider("n0", "n0-val");
  bindSlider("K", "K-val", (v) => v.toLocaleString());
  bindSlider("r", "r-val", (v) => v.toFixed(2));
  bindSlider("tmax", "tmax-val");

  (["show-phase", "show-compare", "show-crash"] as const).forEach((id) => {
    document.getElementById(id)!.addEventListener("change", run);
  });

  document.getElementById("species-name")!.addEventListener("input", run);

  run();
});
