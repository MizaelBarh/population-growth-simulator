# 🌿 Logistic Population Growth Simulator
 
An interactive, browser-based visualizer for the **logistic population growth model** — a cornerstone of ecology and computational biology.
 
Built with **TypeScript**, **CSS**, and **HTML** — no frameworks, no build pipeline required. Just open `index.html`.
 
---
 
## 🔬 The Biology
 
The logistic model (Verhulst, 1838) captures how a population grows under resource constraints:
 
```
dN/dt = r · N · (1 − N/K)
```
 
| Symbol | Meaning |
|--------|---------|
| `N` | Current population size |
| `r` | Intrinsic growth rate |
| `K` | Carrying capacity (resource limit) |
| `t` | Time |
 
### Growth Phases
 
| Phase | When | What happens |
|-------|------|------|
| 🟡 Lag | N ≪ K | Few individuals, slow start |
| 🟢 Exponential | N ≈ K/4 | Resources plentiful, fastest growth |
| 🔵 Deceleration | N → K | Competition intensifies |
| 🟣 Plateau | N ≈ K | Births balance deaths |
 
---
 
## ✨ Features
 
- **Real-time sliders** — adjust N₀, K, r, and time span; charts update instantly
- **Phase-coloured growth curve** — each growth phase has its own colour
- **Phase plot** (dN/dt vs N) — shows exactly where growth accelerates or stalls
- **Multi-scenario comparison** — 5 species with varying r and K rendered simultaneously
- **Overshoot & crash** — extended model with resource depletion past K
- **Live metrics** — final population, time to K/2, peak growth rate, K saturation %
- **Ambient particle background** — subtle floating particles for visual depth
- **Fully responsive** — works on mobile and desktop
---
 
## 🗂️ Project Structure
 
```
population-simulator/
├── index.html      ← App shell and layout
├── style.css       ← Dark-theme styling, animations, responsive layout
├── main.ts         ← TypeScript source (RK4 ODE solver + Chart.js rendering)
├── main.js         ← Compiled JavaScript (ready to run in browser)
└── README.md
```

---
