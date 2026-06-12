"use strict";
function logistic(N, r, K) {
  return r * N * (1 - N / K);
}
function logisticCrash(N, r, K, alpha = 0.8) {
  const effectiveK = Math.max(K - alpha * Math.max(0, N - K), 1);
  return r * N * (1 - N / effectiveK);
}
function rk4Step(N, t, dt, fn) {
  const k1 = fn(N, t);
  const k2 = fn(N + dt / 2 * k1, t + dt / 2);
  const k3 = fn(N + dt / 2 * k2, t + dt / 2);
  const k4 = fn(N + dt * k3, t + dt);
  return N + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
}
function solve(N0, r, K, tMax, steps = 600, crash = false) {
  const dt = tMax / steps;
  const t = [];
  const N = [];
  const dNdt = [];
  let Ncur = N0;
  for (let i = 0; i <= steps; i++) {
    const ti = i * dt;
    t.push(ti);
    N.push(Ncur);
    dNdt.push(crash ? logisticCrash(Ncur, r, K) : logistic(Ncur, r, K));
    Ncur = rk4Step(
      Ncur,
      ti,
      dt,
      (n) => crash ? logisticCrash(n, r, K) : logistic(n, r, K)
    );
  }
  return { t, N, dNdt };
}
function getPhase(N, K) {
  const frac = N / K;
  if (frac < 0.05) return { label: "Lag", color: "#e6b805" };
  if (frac < 0.5)  return { label: "Exponential", color: "#88a500" };
  if (frac < 0.9)  return { label: "Deceleration", color: "#5d7b00" };
  return { label: "Plateau", color: "#6f5b94" };
}
function phaseColor(N, K) {
  return getPhase(N, K).color;
}
const CHART_DEFAULTS = {
  bgVoid: "#f4f7e8",
  bgCard: "#ffffff",
  gridColor: "rgba(193,216,130,0.6)",
  tickColor: "#5d7b00",
  labelColor: "#88a500"
};
function baseScales(xLabel, yLabel) {
  return {
    x: {
      grid: { color: CHART_DEFAULTS.gridColor, lineWidth: 0.8 },
      ticks: { color: CHART_DEFAULTS.tickColor, font: { family: "'Space Mono'" } },
      title: {
        display: true,
        text: xLabel,
        color: CHART_DEFAULTS.labelColor,
        font: { family: "'Space Mono'", size: 11 }
      }
    },
    y: {
      grid: { color: CHART_DEFAULTS.gridColor, lineWidth: 0.8 },
      ticks: { color: CHART_DEFAULTS.tickColor, font: { family: "'Space Mono'" } },
      title: {
        display: true,
        text: yLabel,
        color: CHART_DEFAULTS.labelColor,
        font: { family: "'Space Mono'", size: 11 }
      }
    }
  };
}
let chartMain = null;
let chartPhase = null;
let chartCompare = null;
function destroyAll() {
  chartMain?.destroy();
  chartPhase?.destroy();
  chartCompare?.destroy();
}
function renderMain(params, result, crashResult) {
  const ctx = document.getElementById("chart-main").getContext("2d");
  chartMain?.destroy();
  const { t, N, dNdt } = result;
  const K = params.K;
  const inflIdx = dNdt.indexOf(Math.max(...dNdt));
  const t50Idx = N.findIndex((n) => n >= K / 2);
  const datasets = [
    {
      label: params.speciesName,
      data: N.map((n, i) => ({ x: t[i], y: n })),
      borderColor: "#5d7b00",
      borderWidth: 2.5,
      pointRadius: 0,
      tension: 0.4,
      fill: false,
      segment: {
        borderColor: (ctx2) => phaseColor(ctx2.p0.parsed.y, K)
      }
    },
    {
      label: `Carrying capacity K = ${K.toLocaleString()}`,
      data: t.map((ti) => ({ x: ti, y: K })),
      borderColor: "#6f5b94",
      borderWidth: 1.2,
      borderDash: [5, 4],
      pointRadius: 0,
      fill: false
    },
    {
      label: "Inflection point",
      data: [{ x: t[inflIdx], y: N[inflIdx] }],
      borderColor: "#e6b805",
      backgroundColor: "#e6b805",
      pointRadius: 7,
      pointHoverRadius: 9,
      showLine: false
    }
  ];
  if (t50Idx !== -1) {
    datasets.push({
      label: `K/2 reached at t = ${t[t50Idx].toFixed(1)} yr`,
      data: [{ x: t[t50Idx], y: N[t50Idx] }],
      borderColor: "#88a500",
      backgroundColor: "#88a500",
      pointRadius: 6,
      pointHoverRadius: 8,
      showLine: false
    });
  }
  if (crashResult) {
    datasets.push({
      label: "Overshoot & crash",
      data: crashResult.N.map((n, i) => ({ x: crashResult.t[i], y: n })),
      borderColor: "#c0392b",
      borderWidth: 1.8,
      borderDash: [6, 3],
      pointRadius: 0,
      tension: 0.4,
      fill: false
    });
  }
  chartMain = new window.Chart(ctx, {
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
            color: "#5d7b00",
            font: { family: "'Space Mono'", size: 10 },
            boxWidth: 12
          }
        },
        tooltip: {
          backgroundColor: "#ffffff",
          borderColor: "#d6e4a1",
          borderWidth: 1,
          titleColor: "#5d7b00",
          bodyColor: "#88a500",
          titleFont: { family: "'Space Mono'" },
          bodyFont: { family: "'Space Mono'" },
          callbacks: {
            label: (ctx2) => `${ctx2.dataset.label}: ${Math.round(ctx2.parsed.y).toLocaleString()}`
          }
        }
      },
      scales: {
        ...baseScales("Time (years)", "Population size (N)"),
        x: { ...baseScales("Time (years)", "Population size (N)").x, type: "linear", min: 0, max: params.tMax },
        y: { ...baseScales("Time (years)", "Population size (N)").y, min: 0, max: K * 1.15 }
      }
    }
  });
}
function renderPhase(params, result) {
  const ctx = document.getElementById("chart-phase").getContext("2d");
  chartPhase?.destroy();
  const { K, r } = params;
  const steps = 300;
  const Nrange = Array.from({ length: steps }, (_, i) => i / steps * K * 1.1);
  const dNrange = Nrange.map((n) => r * n * (1 - n / K));
  const NEnd = result.N[result.N.length - 1];
  const dNEnd = r * NEnd * (1 - NEnd / K);
  chartPhase = new window.Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "dN/dt",
          data: Nrange.map((n, i) => ({ x: n, y: dNrange[i] })),
          borderColor: "#5d7b00",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.3,
          fill: {
            target: { value: 0 },
            above: "rgba(93,123,0,0.08)",
            below: "rgba(192,57,43,0.08)"
          }
        },
        {
          label: "Current state",
          data: [{ x: NEnd, y: dNEnd }],
          borderColor: "#e6b805",
          backgroundColor: "#e6b805",
          pointRadius: 7,
          showLine: false
        },
        {
          label: `K = ${K.toLocaleString()}`,
          data: [
            { x: K, y: Math.min(...dNrange) * 1.1 },
            { x: K, y: Math.max(...dNrange) * 1.1 }
          ],
          borderColor: "#6f5b94",
          borderWidth: 1,
          borderDash: [5, 4],
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400 },
      parsing: false,
      plugins: {
        legend: {
          labels: {
            color: "#5d7b00",
            font: { family: "'Space Mono'", size: 10 },
            boxWidth: 12
          }
        },
        tooltip: {
          backgroundColor: "#ffffff",
          borderColor: "#d6e4a1",
          borderWidth: 1,
          titleColor: "#5d7b00",
          bodyColor: "#88a500",
          titleFont: { family: "'Space Mono'" },
          bodyFont: { family: "'Space Mono'" }
        }
      },
      scales: {
        ...baseScales("Population size (N)", "Growth rate dN/dt"),
        x: { ...baseScales("Population size (N)", "Growth rate dN/dt").x, type: "linear", min: 0, max: K * 1.1 }
      }
    }
  });
}
function renderCompare(params) {
  const ctx = document.getElementById("chart-compare").getContext("2d");
  chartCompare?.destroy();
  const { N0, r, K, tMax, speciesName } = params;
  const scenarios = [
    { r: r * 0.5, K, color: "#88a500", label: "Slow grower (r\xD70.5)" },
    { r, K, color: "#5d7b00", label: `${speciesName} (baseline)` },
    { r: r * 1.8, K, color: "#e6b805", label: "Fast grower (r\xD71.8)" },
    { r, K: K * 0.5, color: "#c0392b", label: "Low K (K\xF72)" },
    { r, K: K * 2, color: "#6f5b94", label: "High K (K\xD72)" }
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
      fill: false
    };
  });
  chartCompare = new window.Chart(ctx, {
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
            color: "#5d7b00",
            font: { family: "'Space Mono'", size: 10 },
            boxWidth: 12
          }
        },
        tooltip: {
          backgroundColor: "#ffffff",
          borderColor: "#d6e4a1",
          borderWidth: 1,
          titleColor: "#5d7b00",
          bodyColor: "#88a500",
          titleFont: { family: "'Space Mono'" },
          bodyFont: { family: "'Space Mono'" }
        }
      },
      scales: {
        ...baseScales("Time (years)", "Population size (N)"),
        x: { ...baseScales("Time (years)", "Population size (N)").x, type: "linear", min: 0, max: tMax },
        y: { ...baseScales("Time (years)", "Population size (N)").y, min: 0 }
      }
    }
  });
}
function updateMetrics(params, result) {
  const { N, t, dNdt } = result;
  const { K } = params;
  const finalN = N[N.length - 1];
  const t50Idx = N.findIndex((n) => n >= K / 2);
  const maxGrowth = Math.max(...dNdt);
  const saturation = Math.min(finalN / K * 100, 100);
  document.getElementById("val-final").textContent = Math.round(finalN).toLocaleString();
  document.getElementById("val-t50").textContent = t50Idx !== -1 ? t[t50Idx].toFixed(1) : "\u2014";
  document.getElementById("val-peak").textContent = maxGrowth.toFixed(1);
  document.getElementById("val-sat").textContent = saturation.toFixed(1);
  const phase = getPhase(finalN, K);
  const badge = document.getElementById("phase-badge");
  badge.textContent = phase.label;
  badge.style.color = phase.color;
  badge.style.borderColor = phase.color + "55";
}
function initParticles() {
  const canvas = document.getElementById("bg-canvas");
  const ctx = canvas.getContext("2d");
  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);
  const particles = Array.from({ length: 55 }, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    r: Math.random() * 1.8 + 0.4,
    alpha: Math.random() * 0.3 + 0.05
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
      ctx.fillStyle = `rgba(93,123,0,${p.alpha})`;
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  frame();
}
function getParams() {
  return {
    N0: Number(document.getElementById("n0").value),
    K: Number(document.getElementById("K").value),
    r: Number(document.getElementById("r").value),
    tMax: Number(document.getElementById("tmax").value),
    speciesName: document.getElementById("species-name").value || "Species A",
    showPhase: document.getElementById("show-phase").checked,
    showCompare: document.getElementById("show-compare").checked,
    showCrash: document.getElementById("show-crash").checked
  };
}
function run() {
  const p = getParams();
  const result = solve(p.N0, p.r, p.K, p.tMax);
  const crashResult = p.showCrash ? solve(p.N0, p.r, p.K, p.tMax, 600, true) : void 0;
  destroyAll();
  renderMain(p, result, crashResult);
  updateMetrics(p, result);
  const cardPhase = document.getElementById("card-phase");
  if (p.showPhase) {
    cardPhase.classList.remove("hidden");
    renderPhase(p, result);
  } else {
    cardPhase.classList.add("hidden");
  }
  const cardCompare = document.getElementById("card-compare");
  if (p.showCompare) {
    cardCompare.classList.remove("hidden");
    renderCompare(p);
  } else {
    cardCompare.classList.add("hidden");
  }
  document.getElementById("main-chart-title").textContent = `Logistic Growth \u2014 ${p.speciesName}`;
}
function bindSlider(id, valId, fmt) {
  const el = document.getElementById(id);
  const val = document.getElementById(valId);
  el.addEventListener("input", () => {
    const n = Number(el.value);
    val.textContent = fmt ? fmt(n) : String(n);
    run();
  });
}
window.addEventListener("DOMContentLoaded", () => {
  initParticles();
  bindSlider("n0", "n0-val");
  bindSlider("K", "K-val", (v) => v.toLocaleString());
  bindSlider("r", "r-val", (v) => v.toFixed(2));
  bindSlider("tmax", "tmax-val");
  ["show-phase", "show-compare", "show-crash"].forEach((id) => {
    document.getElementById(id).addEventListener("change", run);
  });
  document.getElementById("species-name").addEventListener("input", run);
  run();
});
