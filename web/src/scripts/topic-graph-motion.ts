/**
 * Ported from web_plas (src/scripts/topic-graph-motion.ts); only the label
 * measurement changed, to support bilingual <tspan> labels.
 *
 * Layout responsivo + deriva lenta de nodos en grafos de temas:
 * canvas alto en mobile, etiquetas legibles, sin solaparse.
 * Pasar el cursor resalta un nodo y sus vecinos. Arrastrar "calienta" el grafo: las
 * aristas estiradas tiran de sus extremos en cadena (como d3-force) y el calor se
 * disipa al soltar; el nodo queda donde se dejó y vuelve a la deriva.
 */

type SimNode = {
  el: SVGGElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  pad: number;
  halfW: number;
};

type SimEdge = {
  line: SVGLineElement;
  a: number;
  b: number;
  /** Largo de la arista en el layout inicial; solo tira cuando se estira más allá. */
  rest: number;
};

type Drag = {
  sim: GraphSim;
  node: SimNode;
  pointerId: number;
  /** Dónde se tomó el nodo respecto a su centro, para que no salte al puntero. */
  offsetX: number;
  offsetY: number;
  grabX: number;
  grabY: number;
  startX: number;
  startY: number;
  /** Pasó el umbral de arrastre: al soltar no se sigue el enlace del nodo. */
  moved: boolean;
};

type GraphSim = {
  root: HTMLElement;
  svg: SVGSVGElement;
  nodes: SimNode[];
  edges: SimEdge[];
  w: number;
  h: number;
  mobile: boolean;
  /** 1 mientras se arrastra; decae al soltar. Escala resortes y velocidad máxima. */
  heat: number;
};

const DESKTOP = { w: 1100, h: 460, padX: 72, padY: 48 } as const;
const MOBILE = { w: 420, h: 680, padX: 48, padY: 40 } as const;

const SPEED = 0.055;
const DAMP = 0.992;
const MAX_V = 0.22;
const JITTER = 0.012;
const EDGE_PAD = 8;
const MOBILE_MQ = '(max-width: 767px)';
const SPRING_K = 0.008;
const HEAT_DECAY = 0.975;
const HEAT_MAX_V = 6;
const HEAT_DAMP = 0.88;
/** Fracción de la distancia al puntero que recorre el nodo sostenido por cuadro (fricción). */
const DRAG_FOLLOW = 0.2;
/** Desplazamiento (px de pantalla) a partir del cual un toque es arrastre y no clic. */
const CLICK_SLOP = 5;

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function isMobile() {
  return window.matchMedia(MOBILE_MQ).matches;
}

function radiusFor(weight: number, mobile: boolean) {
  const base = mobile ? 15 : 12;
  const step = mobile ? 3.2 : 2.6;
  return base + Math.min(weight, 5) * step;
}

function labelMetrics(el: SVGGElement, r: number, mobile: boolean) {
  // Bilingual labels: measure only the tspan of the language on screen.
  const spans = [...el.querySelectorAll('text tspan')];
  const visible = spans.find((span) => getComputedStyle(span).display !== 'none');
  const label = (visible ?? el.querySelector('text'))?.textContent?.trim() || '';
  const hubScale = el.classList.contains('topic-graph__node--hub') ? 1.2 : 1;
  const charW = (mobile ? 8.2 : 6.4) * hubScale;
  const halfW = Math.max(r + 10, (label.length * charW) / 2 + 4);
  const pad = r + (mobile ? 22 : 16);
  return { halfW, pad };
}

function placeFromNormalized(
  nx: number,
  ny: number,
  w: number,
  h: number,
  padX: number,
  padY: number,
) {
  return {
    x: padX + nx * (w - padX * 2),
    y: padY + ny * (h - padY * 2),
  };
}

function applyStaticLayout(root: HTMLElement, mobile: boolean) {
  const svg = root.querySelector<SVGSVGElement>('.topic-graph__svg');
  if (!svg) return null;

  const base = mobile ? MOBILE : DESKTOP;
  const h = Number((mobile ? root.dataset.mobileHeight : root.dataset.height) || base.h);
  const box = { ...base, h };
  svg.setAttribute('viewBox', `0 0 ${box.w} ${box.h}`);
  root.classList.toggle('topic-graph--mobile', mobile);

  const nodeEls = [...svg.querySelectorAll<SVGGElement>('.topic-graph__node')];
  const indexById = new Map<string, number>();
  const positions: { x: number; y: number; r: number; pad: number; halfW: number }[] = [];

  nodeEls.forEach((el, i) => {
    const id = el.dataset.nodeId || String(i);
    indexById.set(id, i);
    const nx = Number((mobile && el.dataset.mx) || el.dataset.nx || 0.5);
    const ny = Number((mobile && el.dataset.my) || el.dataset.ny || 0.5);
    const weight = Number(el.dataset.weight ?? 3);
    const r = radiusFor(weight, mobile);
    const { x, y } = placeFromNormalized(nx, ny, box.w, box.h, box.padX, box.padY);
    const { halfW, pad } = labelMetrics(el, r, mobile);

    const circle = el.querySelector('circle');
    const text = el.querySelector('text');
    if (circle) circle.setAttribute('r', String(r));
    if (text) {
      text.setAttribute('y', String(r + (mobile ? 20 : 16)));
      text.setAttribute('font-size', mobile ? '18' : '13');
    }
    el.setAttribute('transform', `translate(${x} ${y})`);
    positions.push({ x, y, r, pad, halfW });
  });

  svg.querySelectorAll<SVGLineElement>('.topic-graph__edges line').forEach((line) => {
    const aId = line.dataset.source || '';
    const bId = line.dataset.target || '';
    const ai = indexById.get(aId);
    const bi = indexById.get(bId);
    if (ai == null || bi == null) return;
    const a = positions[ai];
    const b = positions[bi];
    line.setAttribute('x1', String(a.x));
    line.setAttribute('y1', String(a.y));
    line.setAttribute('x2', String(b.x));
    line.setAttribute('y2', String(b.y));
    if (mobile) {
      const sw = Number(line.getAttribute('stroke-width') || 2);
      line.setAttribute('stroke-width', String(Math.max(sw, 2.2)));
    }
  });

  return { svg, nodeEls, indexById, positions, box, mobile };
}

function buildSim(root: HTMLElement): GraphSim | null {
  const mobile = isMobile();
  const layout = applyStaticLayout(root, mobile);
  if (!layout) return null;

  const { svg, nodeEls, indexById, positions, box } = layout;
  const sepBoost = mobile ? 1.55 : 1.35;

  const nodes: SimNode[] = nodeEls.map((el, i) => {
    const p = positions[i];
    const angle = (i / nodeEls.length) * Math.PI * 2;
    const speed = mobile ? SPEED * 0.55 : SPEED;
    return {
      el,
      x: p.x,
      y: p.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: p.r,
      pad: p.pad * (mobile ? 1.08 : 1),
      halfW: p.halfW,
    };
  });

  const edges: SimEdge[] = [];
  svg.querySelectorAll<SVGLineElement>('.topic-graph__edges line').forEach((line) => {
    const aId = line.dataset.source || '';
    const bId = line.dataset.target || '';
    const a = indexById.get(aId);
    const b = indexById.get(bId);
    if (a == null || b == null) return;
    const rest = Math.hypot(positions[a].x - positions[b].x, positions[a].y - positions[b].y);
    edges.push({ line, a, b, rest });
  });

  // stash separation factor on root for step
  root.dataset.sep = String(sepBoost);

  return { root, svg, nodes, edges, w: box.w, h: box.h, mobile, heat: 0 };
}

function applyBounds(n: SimNode, w: number, h: number) {
  const minX = n.halfW + EDGE_PAD;
  const maxX = w - n.halfW - EDGE_PAD;
  const minY = n.r + EDGE_PAD + 6;
  const maxY = h - n.pad - EDGE_PAD;

  if (n.x < minX) {
    n.x = minX;
    n.vx = Math.abs(n.vx) * 0.8;
  } else if (n.x > maxX) {
    n.x = maxX;
    n.vx = -Math.abs(n.vx) * 0.8;
  }

  if (n.y < minY) {
    n.y = minY;
    n.vy = Math.abs(n.vy) * 0.8;
  } else if (n.y > maxY) {
    n.y = maxY;
    n.vy = -Math.abs(n.vy) * 0.8;
  }
}

function separate(nodes: SimNode[], sep: number, strength = 0.05) {
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      const minDist = (a.pad + b.pad) * sep * 0.72;
      const labelClash =
        Math.abs(dx) < (a.halfW + b.halfW) * 0.9 &&
        Math.abs(dy) < (a.pad + b.pad) * 0.5;
      if (dist >= minDist && !labelClash) continue;
      const target = labelClash ? Math.max(minDist, dist + 12) : minDist;
      const push = ((target - dist) / dist) * strength;
      const ox = dx * push;
      const oy = dy * push;
      a.x -= ox;
      a.y -= oy;
      b.x += ox;
      b.y += oy;
      a.vx -= ox * 0.08;
      a.vy -= oy * 0.08;
      b.vx += ox * 0.08;
      b.vy += oy * 0.08;
    }
  }
}

function clampVelocity(n: SimNode, mobile: boolean, heat: number) {
  const maxV = (mobile ? MAX_V * 0.65 : MAX_V) + heat * HEAT_MAX_V;
  const speed = mobile ? SPEED * 0.55 : SPEED;
  const sp = Math.hypot(n.vx, n.vy);
  if (sp > maxV) {
    n.vx = (n.vx / sp) * maxV;
    n.vy = (n.vy / sp) * maxV;
  }
  if (sp < speed * 0.35) {
    const angle = Math.random() * Math.PI * 2;
    n.vx += Math.cos(angle) * speed * 0.25;
    n.vy += Math.sin(angle) * speed * 0.25;
  }
}

function paint(sim: GraphSim) {
  for (const n of sim.nodes) {
    n.el.setAttribute('transform', `translate(${n.x.toFixed(2)} ${n.y.toFixed(2)})`);
  }
  for (const e of sim.edges) {
    const a = sim.nodes[e.a];
    const b = sim.nodes[e.b];
    e.line.setAttribute('x1', a.x.toFixed(2));
    e.line.setAttribute('y1', a.y.toFixed(2));
    e.line.setAttribute('x2', b.x.toFixed(2));
    e.line.setAttribute('y2', b.y.toFixed(2));
  }
}

/** El nodo sostenido persigue al puntero (dentro del lienzo) con algo de retraso. */
function followPointer(sim: GraphSim, d: Drag) {
  const n = d.node;
  const x = Math.min(Math.max(d.grabX, n.halfW + EDGE_PAD), sim.w - n.halfW - EDGE_PAD);
  const y = Math.min(Math.max(d.grabY, n.r + EDGE_PAD + 6), sim.h - n.pad - EDGE_PAD);
  n.vx = (x - n.x) * DRAG_FOLLOW;
  n.vy = (y - n.y) * DRAG_FOLLOW;
  n.x += n.vx;
  n.y += n.vy;
}

/** Aristas estiradas tiran de sus extremos; así el arrastre se propaga a vecinos de vecinos. */
function pullEdges(sim: GraphSim, held: SimNode | null) {
  for (const e of sim.edges) {
    const a = sim.nodes[e.a];
    const b = sim.nodes[e.b];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const stretch = dist - e.rest;
    if (stretch <= 0) continue;
    const f = (stretch * SPRING_K * sim.heat) / dist;
    if (a !== held) {
      a.vx += dx * f;
      a.vy += dy * f;
    }
    if (b !== held) {
      b.vx -= dx * f;
      b.vy -= dy * f;
    }
  }
}

function step(sim: GraphSim) {
  const sep = Number(sim.root.dataset.sep || 1.35);
  const held = drag?.sim === sim ? drag.node : null;
  if (held && drag) {
    sim.heat = 1;
    followPointer(sim, drag);
  } else if (sim.heat > 0) {
    sim.heat = sim.heat < 0.005 ? 0 : sim.heat * HEAT_DECAY;
  }
  if (sim.heat > 0) pullEdges(sim, held);

  const damp = DAMP - (DAMP - HEAT_DAMP) * sim.heat;
  for (const n of sim.nodes) {
    if (n === held) continue;
    n.vx += (Math.random() - 0.5) * (sim.mobile ? JITTER * 0.7 : JITTER);
    n.vy += (Math.random() - 0.5) * (sim.mobile ? JITTER * 0.7 : JITTER);
    n.vx *= damp;
    n.vy *= damp;
    clampVelocity(n, sim.mobile, sim.heat);
    n.x += n.vx;
    n.y += n.vy;
  }
  const heldX = held?.x ?? 0;
  const heldY = held?.y ?? 0;
  separate(sim.nodes, sep, 0.05 + sim.heat * 0.3);
  if (held) {
    held.x = heldX;
    held.y = heldY;
  }
  for (const n of sim.nodes) applyBounds(n, sim.w, sim.h);
  paint(sim);
}

/** Resalta un nodo, sus aristas y sus vecinos; `null` quita el resaltado. */
function focusNode(sim: GraphSim, node: SimNode | null) {
  const related = new Set<SimNode>(node ? [node] : []);
  for (const e of sim.edges) {
    const a = sim.nodes[e.a];
    const b = sim.nodes[e.b];
    const on = node != null && (a === node || b === node);
    e.line.classList.toggle('is-related', on);
    if (on) {
      related.add(a);
      related.add(b);
    }
  }
  for (const n of sim.nodes) n.el.classList.toggle('is-related', related.has(n));
  sim.root.classList.toggle('topic-graph--focus', node != null);
}

function nodeAt(target: EventTarget | null) {
  if (!(target instanceof Element)) return null;
  const el = target.closest<SVGGElement>('.topic-graph__node');
  const sim = el && sims.find((s) => s.svg.contains(el));
  const node = sim?.nodes.find((n) => n.el === el);
  return sim && node ? { sim, node } : null;
}

function onPointerOver(event: PointerEvent) {
  if (drag) return;
  const hit = nodeAt(event.target);
  if (hit) focusNode(hit.sim, hit.node);
}

function onPointerOut(event: PointerEvent) {
  if (drag) return;
  const from = nodeAt(event.target);
  if (!from || nodeAt(event.relatedTarget)?.node === from.node) return;
  focusNode(from.sim, null);
}

let drag: Drag | null = null;
let dragBound = false;
let suppressClick = false;

function svgPoint(svg: SVGSVGElement, clientX: number, clientY: number) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  const hit = nodeAt(event.target);
  if (!hit) return;
  const { sim, node } = hit;
  event.preventDefault();
  focusNode(sim, node);
  const p = svgPoint(sim.svg, event.clientX, event.clientY);
  const offsetX = node.x - p.x;
  const offsetY = node.y - p.y;
  drag = {
    sim,
    node,
    pointerId: event.pointerId,
    offsetX,
    offsetY,
    grabX: p.x + offsetX,
    grabY: p.y + offsetY,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };
  node.el.classList.add('is-dragging');
  sim.root.classList.add('topic-graph--dragging');
}

function onPointerMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const p = svgPoint(drag.sim.svg, event.clientX, event.clientY);
  drag.grabX = p.x + drag.offsetX;
  drag.grabY = p.y + drag.offsetY;
  if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > CLICK_SLOP) {
    drag.moved = true;
  }
}

function onPointerUp(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const { sim, node, moved } = drag;
  node.el.classList.remove('is-dragging');
  sim.root.classList.remove('topic-graph--dragging');
  drag = null;
  if (moved) {
    suppressClick = true;
    window.setTimeout(() => {
      suppressClick = false;
    }, 0);
  }
  if (event.pointerType !== 'mouse' || nodeAt(event.target)?.node !== node) focusNode(sim, null);
}

function onClick(event: MouseEvent) {
  if (!suppressClick || !nodeAt(event.target)) return;
  suppressClick = false;
  event.preventDefault();
  event.stopPropagation();
}

function bindDrag() {
  if (dragBound) return;
  dragBound = true;
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('pointermove', onPointerMove);
  document.addEventListener('pointerup', onPointerUp);
  document.addEventListener('pointercancel', onPointerUp);
  document.addEventListener('pointerover', onPointerOver);
  document.addEventListener('pointerout', onPointerOut);
  document.addEventListener('click', onClick, true);
}

let raf = 0;
let sims: GraphSim[] = [];
let visibilityBound = false;
let resizeBound = false;
let resizeTimer = 0;

function onVisibility() {
  if (document.hidden) {
    window.cancelAnimationFrame(raf);
    raf = 0;
  } else if (!raf && sims.length > 0 && !reducedMotion()) {
    raf = window.requestAnimationFrame(loop);
  }
}

function loop() {
  for (const sim of sims) step(sim);
  raf = window.requestAnimationFrame(loop);
}

export function stopTopicGraphMotion() {
  window.cancelAnimationFrame(raf);
  raf = 0;
  sims = [];
  drag = null;
}

function startMotion() {
  if (reducedMotion() || sims.length === 0) return;
  if (!raf) raf = window.requestAnimationFrame(loop);
}

export function initTopicGraphMotion() {
  stopTopicGraphMotion();

  const roots = [...document.querySelectorAll<HTMLElement>('.topic-graph')];
  // Always apply layout (even with reduced motion) so mobile stays readable
  if (reducedMotion()) {
    for (const root of roots) applyStaticLayout(root, isMobile());
    return;
  }

  sims = roots.map(buildSim).filter((s): s is GraphSim => Boolean(s));
  if (sims.length === 0) return;
  bindDrag();

  if (!visibilityBound) {
    visibilityBound = true;
    document.addEventListener('visibilitychange', onVisibility);
  }

  if (!resizeBound) {
    resizeBound = true;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        initTopicGraphMotion();
      }, 180);
    });
  }

  startMotion();
}
