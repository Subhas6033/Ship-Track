import { Fragment, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import Navbar from "./Navbar";
import "./Landing.css";

/* ------------------------------------------------------------------ */
/*  Content                                                            */
/* ------------------------------------------------------------------ */

const SHIP_VIDEO =
  "https://videos.pexels.com/video-files/26893759/12028879_1920_1080_24fps.mp4";

const CAPABILITIES = [
  "Compare live carrier rates",
  "Track every shipment",
  "Catch invoice overcharges",
];

const ROTATING_LINES = [
  "Compare live rates.",
  "Follow every container.",
  "Catch every overcharge.",
];

const RAIL = [
  { label: "Intro", at: 0 },
  { label: "Rates", at: 0.46 },
  { label: "Tracking", at: 0.69 },
  { label: "Invoices", at: 0.93 },
];

const LANES = [
  {
    label: "Nhava Sheva to Los Angeles",
    rows: [
      { carrier: "Northwind Line", days: 26, rate: 2310 },
      { carrier: "Blue Ledger Lines", days: 28, rate: 2140 },
      { carrier: "Aster Shipping", days: 29, rate: 2190 },
      { carrier: "Corvid Marine", days: 31, rate: 2085 },
      { carrier: "Halcyon Container", days: 33, rate: 2040 },
    ],
  },
  {
    label: "Nhava Sheva to Rotterdam",
    rows: [
      { carrier: "Northwind Line", days: 19, rate: 1560 },
      { carrier: "Blue Ledger Lines", days: 21, rate: 1420 },
      { carrier: "Aster Shipping", days: 22, rate: 1490 },
      { carrier: "Corvid Marine", days: 24, rate: 1365 },
      { carrier: "Halcyon Container", days: 25, rate: 1330 },
    ],
  },
  {
    label: "Nhava Sheva to Singapore",
    rows: [
      { carrier: "Northwind Line", days: 8, rate: 610 },
      { carrier: "Blue Ledger Lines", days: 9, rate: 560 },
      { carrier: "Aster Shipping", days: 9, rate: 585 },
      { carrier: "Corvid Marine", days: 11, rate: 540 },
      { carrier: "Halcyon Container", days: 12, rate: 520 },
    ],
  },
];

const SHIPMENTS = [
  {
    id: "MRDN-24081",
    route: "Nhava Sheva to Los Angeles",
    status: "moving",
    label: "In transit",
    progress: 62,
    note: "Arrives 16 Oct",
  },
  {
    id: "MRDN-24077",
    route: "Nhava Sheva to Rotterdam",
    status: "delivered",
    label: "Delivered",
    progress: 100,
    note: "Delivered 02 Oct",
  },
  {
    id: "MRDN-24090",
    route: "Nhava Sheva to Singapore",
    status: "attention",
    label: "Needs attention",
    progress: 38,
    note: "Customs hold at origin",
  },
  {
    id: "MRDN-24093",
    route: "Nhava Sheva to Los Angeles",
    status: "moving",
    label: "In transit",
    progress: 21,
    note: "Arrives 29 Oct",
  },
];

const INVOICE_LINES = [
  { label: "Ocean freight, 40ft", contract: 2140, invoiced: 2140 },
  { label: "Terminal handling", contract: 285, invoiced: 285 },
  { label: "Bunker surcharge", contract: 190, invoiced: 210 },
  { label: "Documentation fee", contract: 60, invoiced: 60 },
  { label: "Detention", contract: 0, invoiced: 230 },
];

const STATS = [
  { to: 145, suffix: "+", label: "Connected ports" },
  { to: 5, suffix: "", label: "Carrier partners" },
  { to: 3, suffix: " min", label: "To compare live rates" },
  { to: 100, suffix: "%", label: "Of invoice lines checked against contract" },
];

const MARQUEE_PORTS = [
  "Nhava Sheva",
  "Los Angeles",
  "Rotterdam",
  "Singapore",
  "Shanghai",
  "Jebel Ali",
  "Santos",
  "Durban",
  "Felixstowe",
  "Busan",
  "Antwerp",
  "Savannah",
];

const FEATURES = [
  {
    icon: "search",
    title: "Find your next rate",
    desc: "Compare carriers, routes, and transit times before you book.",
  },
  {
    icon: "pin",
    title: "Know where it is",
    desc: "See what's moving, delivered, or needs attention at a glance.",
  },
  {
    icon: "check",
    title: "Keep the numbers honest",
    desc: "Catch invoice variances against your contracted rates.",
  },
  {
    icon: "mail",
    title: "Let updates come to you",
    desc: "Turn plain-text carrier emails into useful shipment updates.",
  },
  {
    icon: "book",
    title: "Keep contracts in one place",
    desc: "Store negotiated rates once. Every quote and invoice is checked against them.",
  },
  {
    icon: "users",
    title: "Share one view",
    desc: "Brokers, finance, and warehouse teams see the same status without forwarding emails.",
  },
];

const STEPS = [
  {
    title: "Quote",
    desc: "Search a lane and see live rates from every carrier partner, side by side with transit time.",
    chips: ["Live rates", "Transit times"],
  },
  {
    title: "Book",
    desc: "Pick the option that fits. Your contract rates are applied automatically, so nothing is retyped.",
    chips: ["Contract rates", "One booking record"],
  },
  {
    title: "Sail",
    desc: "Carrier emails become structured updates. Delays and schedule changes surface the moment they arrive.",
    chips: ["Email parsing", "Delay alerts"],
  },
  {
    title: "Arrive",
    desc: "Discharge, customs and delivery milestones are logged against the shipment for everyone on the team.",
    chips: ["Milestones", "Shared status"],
  },
  {
    title: "Reconcile",
    desc: "When the invoice lands, each line is checked against your contract. Variances are flagged before you pay.",
    chips: ["Variance flags", "Dispute-ready"],
  },
];

const QUOTES = [
  {
    text: "We used to chase three carrier portals to answer one question. Now the answer is on one screen.",
    name: "Priya Nair",
    role: "Logistics lead, Kestrel Textiles",
  },
  {
    text: "The invoice check paid for itself in the first month. Detention charges don't slip through anymore.",
    name: "Daniel Okafor",
    role: "Finance controller, Harbor & Vale Foods",
  },
  {
    text: "Carrier emails land in the tracker as proper updates. Nobody on my team retypes ETAs.",
    name: "Mei Lin Tan",
    role: "Operations manager, Lattice Home Goods",
  },
];

const FAQS = [
  {
    q: "Which carriers can I compare?",
    a: "Rates from our five carrier partners appear side by side for each lane, with transit time and cost per container. More partners are added as the network grows.",
  },
  {
    q: "How does the invoice check work?",
    a: "Your contracted rates are stored once. When an invoice arrives, every line is compared against the contract and any difference is flagged with the amount, so you can dispute it before paying.",
  },
  {
    q: "Can I forward carrier emails?",
    a: "Yes. Plain-text carrier emails are read for vessel, container, port and date details and turned into shipment updates. Schedule changes are highlighted.",
  },
  {
    q: "Do I have to change how I book?",
    a: "No. You can keep working with the carriers you already use. Meridian sits alongside your bookings and brings the rates, status and invoices into one place.",
  },
  {
    q: "Who can see my shipments?",
    a: "Only the people you invite to your workspace. Brokers, finance and warehouse teams can each be given the view they need.",
  },
];

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: ["Rates", "Tracking", "Invoice audit", "Carrier emails"],
  },
  { title: "Company", links: ["About", "Careers", "Press", "Contact"] },
  {
    title: "Resources",
    links: ["Guides", "Port directory", "Help centre", "Status"],
  },
];

/* ------------------------------------------------------------------ */
/*  Shared Tailwind class strings                                      */
/* ------------------------------------------------------------------ */

const PAD = "px-[clamp(22px,6vw,96px)]";
const SECTION_Y = "py-[clamp(80px,11vw,150px)]";
const H2 =
  "font-display text-[clamp(2.2rem,5vw,4.2rem)] font-semibold leading-none tracking-[-0.03em]";

const BTN =
  "inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-[0.98rem] font-bold transition duration-300";
const BTN_PRIMARY = `${BTN} bg-signal text-abyss shadow-[0_14px_36px_-12px_rgba(255,107,61,0.7)] hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-12px_rgba(255,107,61,0.9)]`;
const BTN_DARK = `${BTN} bg-abyss text-foam hover:-translate-y-0.5 hover:bg-deep`;

const BEAT_CARD =
  "mx-beat-card w-full max-w-[520px] rounded-3xl border border-white/10 bg-abyss/85 p-6 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)] ring-1 ring-white/5 backdrop-blur-xl sm:p-9";
const BEAT_WRAP =
  "pointer-events-none absolute inset-0 flex items-end pb-14 pt-24 [perspective:1200px] md:items-center md:py-28";

const TH =
  "whitespace-nowrap border-b border-ink/10 px-2.5 py-3 text-left text-xs font-bold text-[#5b7482] last:text-right";
const TD =
  "whitespace-nowrap border-b border-ink/10 px-2.5 py-3 text-left last:text-right";
const PILL = "inline-block rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold";
const STATUS_PILL = {
  moving: `${PILL} bg-[#dfe9f2] text-[#1d4f7a]`,
  delivered: `${PILL} bg-[#e0efe6] text-[#1f6b43]`,
  attention: `${PILL} bg-[#ffe6dc] text-[#b33a14]`,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutBack = (x) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
const seeded = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const money = (n) => "$" + n.toLocaleString("en-US");
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/*  Animated typography                                                */
/* ------------------------------------------------------------------ */

function SplitText({
  text,
  delay = 0,
  step = 0.035,
  scatter = false,
  seedOffset = 0,
  as: Tag = "span",
}) {
  const words = text.split(" ");
  let n = 0;
  return (
    <Tag className="mx-split">
      <span className="sr-only">{text}</span>
      {words.map((word, wi) => (
        <Fragment key={wi}>
          <span className="mx-word" aria-hidden="true">
            {[...word].map((ch) => {
              const i = n++;
              const s = i + seedOffset;
              const style = { "--d": `${(delay + i * step).toFixed(3)}s` };
              if (scatter) {
                style["--dx"] = Math.round((seeded(s + 1) - 0.5) * 760);
                style["--dy"] = -Math.round(80 + seeded(s + 7) * 280);
                style["--dz"] = -Math.round(260 + seeded(s + 3) * 520);
                style["--rz"] = Math.round((seeded(s + 5) - 0.5) * 110);
              }
              return (
                <span className="mx-char" key={i} style={style}>
                  <span className="mx-glyph">{ch}</span>
                </span>
              );
            })}
          </span>
          {wi < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </Tag>
  );
}

function RotatingText({ items, delay = 0, interval = 2800 }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setIdx((i) => (i + 1) % items.length),
      interval,
    );
    return () => clearInterval(t);
  }, [items.length, interval]);
  return (
    <span>
      <SplitText
        key={idx}
        text={items[idx]}
        step={0.022}
        delay={idx === 0 ? delay : 0}
      />
    </span>
  );
}

function CountUp({ to, suffix = "", duration = 1600 }) {
  const ref = useRef(null);
  const [val, setVal] = useState(0);
  useEffect(() => {
    const el = ref.current;
    let raf = 0;
    let started = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        if (prefersReducedMotion()) {
          setVal(to);
          return;
        }
        const t0 = performance.now();
        const tick = (now) => {
          const k = clamp((now - t0) / duration);
          setVal(Math.round(to * (1 - Math.pow(1 - k, 3))));
          if (k < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return (
    <span ref={ref}>
      {val}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Three.js world: ocean, globe, route                                */
/* ------------------------------------------------------------------ */

function createWorld(canvas, reduced) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  const CAM_Z = 10;
  camera.position.set(0, 1.4, CAM_Z);

  scene.add(new THREE.AmbientLight(0xcfeeff, 0.75));
  scene.add(new THREE.HemisphereLight(0xbfe9ff, 0x0a2a3a, 0.7));
  const sun = new THREE.DirectionalLight(0xfff1de, 3);
  sun.position.set(4, 8, 6);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0x7fd6c8, 2.2);
  rim.position.set(-6, 2, -4);
  scene.add(rim);

  const OCEAN_Y = -1.5;

  /* ---------------- Ocean (travelling wave points) ---------------- */
  const OC = 110;
  const OR = 64;
  const ox = new Float32Array(OC * OR);
  const oz = new Float32Array(OC * OR);
  const oceanPos = new Float32Array(OC * OR * 3);
  for (let j = 0; j < OR; j++) {
    for (let i = 0; i < OC; i++) {
      const idx = j * OC + i;
      ox[idx] = (i / (OC - 1) - 0.5) * 44;
      oz[idx] = -30 + (j / (OR - 1)) * 36;
      oceanPos[idx * 3] = ox[idx];
      oceanPos[idx * 3 + 2] = oz[idx];
    }
  }
  const oceanGeo = new THREE.BufferGeometry();
  oceanGeo.setAttribute("position", new THREE.BufferAttribute(oceanPos, 3));
  const oceanMat = new THREE.PointsMaterial({
    color: 0x9fe8e0,
    size: 0.08,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
  const ocean = new THREE.Points(oceanGeo, oceanMat);
  ocean.position.y = OCEAN_Y;
  ocean.frustumCulled = false;
  scene.add(ocean);

  /* ---------------- Spray ---------------- */
  const DUST = 240;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (seeded(i + 1) - 0.5) * 18;
    dustPos[i * 3 + 1] = (seeded(i + 2) - 0.5) * 10;
    dustPos[i * 3 + 2] = -4 + seeded(i + 3) * 10;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.035,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  /* ---------------- Globe ---------------- */
  const R = 2.1;
  const globe = new THREE.Group();
  scene.add(globe);
  const toVec = (lat, lon, r = R) => {
    const phi = (lat * Math.PI) / 180;
    const lam = (lon * Math.PI) / 180;
    return new THREE.Vector3(
      r * Math.cos(phi) * Math.sin(lam),
      r * Math.sin(phi),
      r * Math.cos(phi) * Math.cos(lam),
    );
  };

  const core = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.995, 64, 48),
    new THREE.MeshBasicMaterial({
      color: 0x08283b,
      transparent: true,
      opacity: 0.86,
    }),
  );
  core.renderOrder = -1;
  globe.add(core);

  globe.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(R * 1.13, 48, 32),
      new THREE.MeshBasicMaterial({
        color: 0x7fd6c8,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
        depthWrite: false,
      }),
    ),
  );

  const landPts = [];
  const N = 3200;
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2;
    const rad = Math.sqrt(1 - y * y);
    const th = i * 2.399963;
    const x = Math.cos(th) * rad;
    const z = Math.sin(th) * rad;
    const lat = (Math.asin(y) * 180) / Math.PI;
    const lon = (Math.atan2(x, z) * 180) / Math.PI;
    const n =
      Math.sin(lat * 0.09 + 1.3) * Math.cos(lon * 0.05 - 0.4) +
      Math.sin(lon * 0.11 + lat * 0.07) * 0.5 +
      Math.cos(lat * 0.2 - lon * 0.03) * 0.3;
    if (n > 0.3) landPts.push(x * R, y * R, z * R);
  }
  const landGeo = new THREE.BufferGeometry();
  landGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(landPts, 3),
  );
  globe.add(
    new THREE.Points(
      landGeo,
      new THREE.PointsMaterial({
        color: 0x7fd6c8,
        size: 0.04,
        transparent: true,
        opacity: 0.85,
      }),
    ),
  );

  const gl = [];
  const seg = 96;
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let s = 0; s < seg; s++) {
      const a = toVec(lat, (s / seg) * 360, R * 1.001);
      const b = toVec(lat, ((s + 1) / seg) * 360, R * 1.001);
      gl.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  for (let lon = 0; lon < 360; lon += 30) {
    for (let s = 0; s < seg; s++) {
      const a = toVec(-90 + (s / seg) * 180, lon, R * 1.001);
      const b = toVec(-90 + ((s + 1) / seg) * 180, lon, R * 1.001);
      gl.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
  }
  const grGeo = new THREE.BufferGeometry();
  grGeo.setAttribute("position", new THREE.Float32BufferAttribute(gl, 3));
  globe.add(
    new THREE.LineSegments(
      grGeo,
      new THREE.LineBasicMaterial({
        color: 0x9fe8e0,
        transparent: true,
        opacity: 0.1,
      }),
    ),
  );

  const PORTS = {
    nhava: { lat: 18.95, lon: 72.95 },
    la: { lat: 33.74, lon: -118.27 },
    rotterdam: { lat: 51.95, lon: 4.14 },
    singapore: { lat: 1.27, lon: 103.8 },
    shanghai: { lat: 31.2, lon: 121.9 },
    jebel: { lat: 25.0, lon: 55.06 },
    santos: { lat: -23.98, lon: -46.3 },
    durban: { lat: -29.87, lon: 31.03 },
    savannah: { lat: 32.08, lon: -81.09 },
    busan: { lat: 35.1, lon: 129.04 },
  };
  const portGeo = new THREE.SphereGeometry(0.035, 12, 12);
  const portMat = new THREE.MeshBasicMaterial({ color: 0xbff5ec });
  Object.values(PORTS).forEach((p) => {
    const m = new THREE.Mesh(portGeo, portMat);
    m.position.copy(toVec(p.lat, p.lon, R * 1.004));
    globe.add(m);
  });

  const makeArc = (a, b, lift) => {
    const va = toVec(a.lat, a.lon);
    const vb = toVec(b.lat, b.lon);
    const mid = va
      .clone()
      .add(vb)
      .multiplyScalar(0.5)
      .normalize()
      .multiplyScalar(R * (1 + lift * (va.distanceTo(vb) / (2 * R))));
    return new THREE.QuadraticBezierCurve3(va, mid, vb);
  };

  [
    ["nhava", "rotterdam"],
    ["nhava", "singapore"],
    ["nhava", "jebel"],
    ["shanghai", "la"],
    ["busan", "savannah"],
    ["santos", "rotterdam"],
    ["durban", "nhava"],
  ].forEach(([a, b]) => {
    const curve = makeArc(PORTS[a], PORTS[b], 0.5);
    globe.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)),
        new THREE.LineBasicMaterial({
          color: 0x7fd6c8,
          transparent: true,
          opacity: 0.32,
        }),
      ),
    );
  });

  const routeCurve = makeArc(PORTS.nhava, PORTS.la, 0.55);
  const routeGeo = new THREE.TubeGeometry(routeCurve, 120, 0.018, 8, false);
  const routeIndexCount = routeGeo.index.count;
  globe.add(
    new THREE.Mesh(routeGeo, new THREE.MeshBasicMaterial({ color: 0xff6b3d })),
  );
  routeGeo.setDrawRange(0, 0);

  const routeShip = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  routeShip.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 16),
      new THREE.MeshBasicMaterial({
        color: 0xff6b3d,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    ),
  );
  globe.add(routeShip);

  const rings = ["nhava", "la"].map((key) => {
    const pos = toVec(PORTS[key].lat, PORTS[key].lon, R * 1.006);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff6b3d,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.1, 32), mat);
    ring.position.copy(pos);
    ring.lookAt(pos.clone().multiplyScalar(2));
    globe.add(ring);
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff6b3d }),
    );
    dot.position.copy(pos);
    globe.add(dot);
    return { ring, mat };
  });

  globe.visible = false;
  const LON_MID = (157.5 * Math.PI) / 180;

  /* ---------------- Layout ---------------- */
  const layout = {
    globePos: new THREE.Vector3(),
    globeScale: 1,
  };
  const resize = () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * CAM_Z;
    const halfW = halfH * camera.aspect;
    if (camera.aspect > 1.15) {
      layout.globePos.set(halfW - R * 1.6, 0, 0);
      layout.globeScale = 0.95;
    } else {
      layout.globePos.set(0, 1.35, 0);
      layout.globeScale = 0.78;
    }
  };

  /* ---------------- Frame ---------------- */
  const render = (p, t, dt, pointer) => {
    const tt = reduced ? 0 : t;

    // camera: starts above the deck looking down, levels out as you scroll
    const camLift = lerp(1.4, 0, smooth(0.12, 0.5, p));
    camera.position.x += (pointer.x * 0.6 - camera.position.x) * 0.04;
    camera.position.y +=
      (camLift + pointer.y * 0.35 - camera.position.y) * 0.04;
    camera.position.z = CAM_Z - smooth(0.55, 1, p) * 1.2;
    camera.lookAt(0, -0.35 * (1 - smooth(0.12, 0.5, p)), 0);

    // ocean surface
    const pos = oceanGeo.attributes.position.array;
    for (let i = 0; i < OC * OR; i++) {
      pos[i * 3 + 1] =
        Math.sin(ox[i] * 0.35 - tt * 1.2) * 0.2 +
        Math.cos(oz[i] * 0.45 + tt * 0.7) * 0.16;
    }
    oceanGeo.attributes.position.needsUpdate = true;
    oceanMat.opacity = 0.14 + 0.46 * (1 - smooth(0.25, 0.5, p));

    // spray
    if (!reduced) {
      const dp = dustGeo.attributes.position.array;
      for (let i = 0; i < DUST; i++) {
        dp[i * 3 + 1] += dt * (0.08 + seeded(i + 4) * 0.18);
        if (dp[i * 3 + 1] > 5) dp[i * 3 + 1] = -5;
      }
      dustGeo.attributes.position.needsUpdate = true;
    }

    // globe
    const gIn = smooth(0.26, 0.52, p);
    globe.visible = gIn > 0.001;
    globe.position.copy(layout.globePos);
    globe.scale.setScalar(
      Math.max(0.001, easeOutBack(gIn) * layout.globeScale),
    );
    globe.rotation.y =
      -LON_MID +
      (1 - smooth(0.26, 0.66, p)) * 3.2 +
      smooth(0.62, 1, p) * 0.55 +
      Math.sin(tt * 0.2) * 0.04;
    globe.rotation.x = 0.38 - smooth(0.62, 1, p) * 0.1;

    const drawn = smooth(0.4, 0.64, p);
    routeGeo.setDrawRange(0, Math.floor((routeIndexCount * drawn) / 3) * 3);
    const shipT = lerp(0.06, 0.78, smooth(0.5, 0.92, p));
    routeShip.position.copy(routeCurve.getPoint(shipT));
    routeShip.visible = drawn >= shipT - 0.01;

    rings.forEach((r, i) => {
      const f = (tt * 0.7 + i * 0.5) % 1;
      r.ring.scale.setScalar(1 + f * 2.6);
      r.mat.opacity = 0.8 * (1 - f);
    });

    renderer.render(scene, camera);
  };

  const dispose = () => {
    scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) {
        const list = Array.isArray(o.material) ? o.material : [o.material];
        list.forEach((m) => {
          if (m.map) m.map.dispose();
          m.dispose();
        });
      }
    });
    renderer.dispose();
  };

  return { render, resize, dispose };
}

/* ------------------------------------------------------------------ */
/*  Hero: sticky stage, video + 3D scene + scroll beats                */
/* ------------------------------------------------------------------ */

function Hero({ onEnter }) {
  const trackRef = useRef(null);
  const stageRef = useRef(null);
  const canvasRef = useRef(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const reduced = prefersReducedMotion();

    const vid = stage.querySelector("video");
    if (reduced && vid) vid.pause();

    let world = null;
    try {
      world = createWorld(canvas, reduced);
      world.resize();
    } catch (err) {
      // WebGL not available: the video and text experience still works.
      world = null;
    }

    let target = 0;
    let current = 0;
    let inView = true;
    let pageVisible = !document.hidden;
    let raf = 0;
    let lastIdx = -1;
    const pointer = { x: 0, y: 0 };
    const clock = new THREE.Clock();

    const readScroll = () => {
      const r = track.getBoundingClientRect();
      const span = Math.max(1, r.height - window.innerHeight);
      target = clamp(-r.top / span);
    };
    const onPointer = (ev) => {
      pointer.x = (ev.clientX / window.innerWidth - 0.5) * 2;
      pointer.y = -(ev.clientY / window.innerHeight - 0.5) * 2;
    };
    const onResize = () => {
      readScroll();
      if (world) world.resize();
    };
    const onVis = () => {
      pageVisible = !document.hidden;
    };
    const onLost = (ev) => {
      ev.preventDefault();
      world = null; // fall back to video + text
    };

    readScroll();
    current = target;
    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    canvas.addEventListener("webglcontextlost", onLost);
    const io = new IntersectionObserver(
      ([entry]) => (inView = entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(track);
    const ro = new ResizeObserver(() => world && world.resize());
    ro.observe(stage);

    const applyUI = (p) => {
      const beat = (a, b, hasOut = true) =>
        smooth(a, a + 0.06, p) * (hasOut ? 1 - smooth(b - 0.06, b, p) : 1);
      stage.style.setProperty("--p", p.toFixed(4));
      stage.style.setProperty("--exit", smooth(0.1, 0.34, p).toFixed(4));
      stage.style.setProperty(
        "--dim",
        lerp(0.3, 0.65, smooth(0.15, 0.55, p)).toFixed(4),
      );
      stage.style.setProperty("--b1", beat(0.38, 0.62).toFixed(4));
      stage.style.setProperty("--b2", beat(0.58, 0.8).toFixed(4));
      stage.style.setProperty("--b3", beat(0.78, 1, false).toFixed(4));
      const idx = p < 0.3 ? 0 : p < 0.58 ? 1 : p < 0.78 ? 2 : 3;
      if (idx !== lastIdx) {
        lastIdx = idx;
        setActive(idx);
      }
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (!inView || !pageVisible) {
        clock.getDelta(); // keep dt small when we resume
        return;
      }
      const dt = Math.min(clock.getDelta(), 0.05);
      current = reduced ? target : lerp(current, target, 1 - Math.exp(-dt * 6));
      applyUI(current);
      if (world) {
        world.render(current, clock.elapsedTime, dt, pointer);
      }
    };
    frame();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("webglcontextlost", onLost);
      io.disconnect();
      ro.disconnect();
      if (world) world.dispose();
    };
  }, []);

  const goTo = (frac) => {
    const track = trackRef.current;
    const r = track.getBoundingClientRect();
    const top = window.scrollY + r.top + frac * (r.height - window.innerHeight);
    window.scrollTo({ top, behavior: "smooth" });
  };

  const rates = LANES[0].rows.slice(0, 3);

  return (
    <section className="relative h-[480vh]" id="platform" ref={trackRef}>
      <div
        className="sticky top-0 h-[100svh] overflow-hidden bg-abyss"
        ref={stageRef}
        style={{
          "--p": 0,
          "--exit": 0,
          "--dim": 0.3,
          "--b1": 0,
          "--b2": 0,
          "--b3": 0,
        }}
      >
        {/* Video, plays for the whole hero */}
        <div className="absolute inset-0 overflow-hidden">
          <video
            className="mx-zoom absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-label="A cargo ship sailing across open ocean"
          >
            <source src={SHIP_VIDEO} type="video/mp4" />
          </video>
          <div className="mx-shade absolute inset-0" />
          <div className="mx-dim absolute inset-0 bg-abyss" />
          <div className="mx-grain absolute inset-0" />
        </div>

        <canvas
          className="pointer-events-none absolute inset-0 h-full w-full"
          ref={canvasRef}
          aria-hidden="true"
        />

        {/* Intro: animated typography */}
        <div
          className={`pointer-events-none absolute inset-0 flex items-center pb-24 pt-24 md:pb-32 ${PAD}`}
        >
          <div
            className={`mx-hero-inner w-full max-w-[920px] ${
              active === 0 ? "pointer-events-auto" : ""
            }`}
          >
            <div
              className="mx-rise mb-5 inline-flex items-center gap-3 text-[0.95rem] font-semibold text-seaglass"
              style={{ "--rd": "0.1s" }}
            >
              <span className="mx-pulse h-[9px] w-[9px] rounded-full bg-signal" />
              Your ocean freight, in focus
            </div>
            <h1 className="font-display text-[clamp(2.3rem,min(8vw,10.5svh),6.8rem)] font-semibold leading-[0.98] tracking-[-0.035em]">
              <span className="block whitespace-nowrap pb-[0.04em]">
                <SplitText
                  text="Move freight."
                  delay={0.35}
                  step={0.04}
                  scatter
                />
              </span>
              <span className="block whitespace-nowrap pb-[0.04em] font-light text-seaglass">
                <SplitText
                  text="Move forward."
                  delay={0.93}
                  step={0.04}
                  scatter
                  seedOffset={20}
                />
              </span>
            </h1>
            <div className="mt-5 flex min-h-[1.6em] items-center gap-4 font-display text-[clamp(1.15rem,2.1vw,1.7rem)]">
              <span className="h-0.5 w-11 flex-none bg-signal" />
              <RotatingText items={ROTATING_LINES} delay={1.6} />
            </div>
            <p
              className="mx-rise mt-3 max-w-[34rem] text-[clamp(1rem,1.25vw,1.12rem)] leading-relaxed text-foam/80"
              style={{ "--rd": "2s" }}
            >
              The clearer way to manage ocean freight. Find competitive rates,
              follow every shipment, and keep invoices on contract, all in one
              connected workspace.
            </p>
            <div
              className="mx-rise mt-7 flex flex-wrap items-center gap-x-5 gap-y-3"
              style={{ "--rd": "2.2s" }}
            >
              <button className={BTN_PRIMARY} onClick={onEnter}>
                Explore your workspace <span aria-hidden="true">→</span>
              </button>
              <button
                className="group inline-flex items-center gap-3 px-2 py-3 font-bold"
                onClick={() => goTo(0.46)}
              >
                <span
                  className="grid h-11 w-11 place-items-center rounded-full border border-white/40 transition group-hover:translate-y-1 group-hover:bg-white/15"
                  aria-hidden="true"
                >
                  ↓
                </span>
                Discover the platform
              </button>
            </div>
            <ul
              className="mx-rise mt-6 flex flex-wrap gap-x-6 gap-y-2.5 text-sm text-foam/75 [@media(max-height:780px)]:!hidden"
              style={{ "--rd": "2.4s" }}
            >
              {CAPABILITIES.map((c) => (
                <li key={c} className="inline-flex items-center gap-2">
                  <i
                    className="grid h-5 w-5 place-items-center rounded-full bg-seaglass text-[0.7rem] not-italic text-abyss"
                    aria-hidden="true"
                  >
                    ✓
                  </i>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Beat 1: rates */}
        <div className={`${BEAT_WRAP} ${PAD}`}>
          <div
            className={`${BEAT_CARD} ${active === 1 ? "pointer-events-auto" : ""}`}
            style={{ "--b": "var(--b1)" }}
          >
            <p className="mb-2.5 text-sm font-bold text-signal">Rates</p>
            <h2 className="font-display text-[clamp(2rem,3.6vw,3.1rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
              Find your next rate.
            </h2>
            <p className="mt-3 max-w-[30rem] text-foam/80">
              Compare carriers, routes, and transit times before you book.
            </p>
            <ul className="mt-5 border-t border-white/10">
              {rates.map((r) => (
                <li
                  key={r.carrier}
                  className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-white/10 py-3 text-[0.95rem] text-foam/80"
                >
                  <span>{r.carrier}</span>
                  <span>{r.days} days</span>
                  <b className="min-w-[4.5ch] text-right font-semibold tabular-nums text-foam">
                    {money(r.rate)}
                  </b>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 text-xs text-brine">
              Sample rates, Nhava Sheva to Los Angeles, 40ft container.
            </p>
          </div>
        </div>

        {/* Beat 2: tracking */}
        <div className={`${BEAT_WRAP} ${PAD}`}>
          <div
            className={`${BEAT_CARD} ${active === 2 ? "pointer-events-auto" : ""}`}
            style={{ "--b": "var(--b2)" }}
          >
            <p className="mb-2.5 text-sm font-bold text-signal">Tracking</p>
            <h2 className="font-display text-[clamp(2rem,3.6vw,3.1rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
              Know where it is.
            </h2>
            <p className="mt-3 max-w-[30rem] text-foam/80">
              See what's moving, delivered, or needs attention at a glance.
            </p>
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-seaglass">
                <i className="mx-pulse h-2 w-2 rounded-full bg-seaglass" />
                Vessel in transit
              </span>
              <div className="my-3 flex items-center gap-2.5 font-display text-2xl font-semibold">
                Pacific Meridian
                <span className="rounded-md bg-white/15 px-2 py-0.5 font-body text-[0.7rem] font-bold">
                  PM
                </span>
              </div>
              <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3.5">
                <div className="relative grid gap-0.5 pl-[18px]">
                  <i className="absolute left-0 top-[5px] h-2.5 w-2.5 rounded-full bg-signal" />
                  <strong className="text-[0.92rem]">Nhava Sheva</strong>
                  <small className="text-xs text-brine">Departed 18 Sep</small>
                </div>
                <div className="relative h-0.5 rounded-full bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.35)_0_6px,transparent_6px_12px)]">
                  <span className="absolute left-[62%] top-1/2 -ml-1.5 -mt-1.5 h-3 w-3 rounded-full bg-signal shadow-[0_0_0_6px_rgba(255,107,61,0.25)]" />
                </div>
                <div className="relative grid gap-0.5 pl-[18px]">
                  <i className="absolute left-0 top-[5px] h-2.5 w-2.5 rounded-full border-2 border-seaglass" />
                  <strong className="text-[0.92rem]">Los Angeles</strong>
                  <small className="text-xs text-brine">Arrives 16 Oct</small>
                </div>
              </div>
              <div className="mt-4 flex justify-between border-t border-white/10 pt-3 text-xs text-brine">
                <span>40ft container</span>
                <span>28 days at sea</span>
              </div>
            </div>
          </div>
        </div>

        {/* Beat 3: invoices */}
        <div className={`${BEAT_WRAP} ${PAD}`}>
          <div
            className={`${BEAT_CARD} ${active === 3 ? "pointer-events-auto" : ""}`}
            style={{ "--b": "var(--b3)" }}
          >
            <p className="mb-2.5 text-sm font-bold text-signal">Invoices</p>
            <h2 className="font-display text-[clamp(2rem,3.6vw,3.1rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
              Keep the numbers honest.
            </h2>
            <p className="mt-3 max-w-[30rem] text-foam/80">
              Catch invoice variances against your contracted rates.
            </p>
            <ul className="mt-5 border-t border-white/10">
              <li className="grid grid-cols-[1fr_auto] gap-4 border-b border-white/10 py-3 text-[0.95rem] text-foam/80">
                <span>Contracted</span>
                <b className="font-semibold tabular-nums text-foam">
                  {money(2675)}
                </b>
              </li>
              <li className="grid grid-cols-[1fr_auto] gap-4 border-b border-white/10 py-3 text-[0.95rem] text-foam/80">
                <span>Invoiced</span>
                <b className="font-semibold tabular-nums text-foam">
                  {money(2925)}
                </b>
              </li>
              <li className="grid grid-cols-[1fr_auto] gap-4 border-b border-white/10 py-3 text-[0.95rem] text-signal">
                <span>Variance flagged</span>
                <b className="font-semibold tabular-nums">+{money(250)}</b>
              </li>
            </ul>
            <button className={`${BTN_PRIMARY} mt-6`} onClick={onEnter}>
              Open your workspace <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>

        {/* Scroll progress rail */}
        <nav
          className="absolute right-3 top-1/2 z-[3] hidden -translate-y-1/2 gap-1 md:grid lg:right-8"
          aria-label="Hero sections"
        >
          {RAIL.map((item, i) => (
            <button
              key={item.label}
              className="group flex items-center justify-end gap-3 py-2"
              onClick={() => goTo(item.at)}
              aria-label={`Go to ${item.label}`}
            >
              <span
                className={`text-xs font-semibold text-foam transition duration-300 ${
                  active === i
                    ? "translate-x-0 opacity-100"
                    : "translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100"
                }`}
              >
                {item.label}
              </span>
              <i
                className={`block w-[3px] rounded-full transition-all duration-300 ${
                  active === i ? "h-10 bg-signal" : "h-[22px] bg-white/30"
                }`}
              />
            </button>
          ))}
        </nav>

        <div className="mx-meta-fade absolute bottom-8 [@media(max-height:820px)]:!hidden left-[clamp(22px,6vw,96px)] hidden items-center gap-4 text-sm text-foam/75 md:flex">
          <span>
            <b className="mr-1 font-display text-xl font-semibold text-foam">
              145+
            </b>
            connected ports
          </span>
          <i className="h-1 w-1 rounded-full bg-seaglass" />
          <span>
            <b className="mr-1 font-display text-xl font-semibold text-foam">
              5
            </b>
            carrier partners
          </span>
          <i className="h-1 w-1 rounded-full bg-seaglass" />
          <span>
            <b className="mr-1 font-display text-xl font-semibold text-foam">
              1
            </b>
            clear view
          </span>
        </div>

        <button
          className="mx-cue-fade absolute bottom-7 left-1/2 hidden -translate-x-1/2 items-center gap-3 text-xs tracking-wide text-foam/70 md:inline-flex"
          onClick={() => goTo(0.46)}
        >
          <span className="mx-cue-line h-9 w-px origin-top" /> Scroll to explore
        </button>
        <div className="absolute bottom-3 right-4 text-[0.7rem] text-foam/40">
          Aerial ocean footage from Pexels
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

function Icon({ name }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className: "h-[26px] w-[26px]",
    "aria-hidden": true,
  };
  switch (name) {
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="6" />
          <path d="M16 16l5 5" />
        </svg>
      );
    case "pin":
      return (
        <svg {...props}>
          <path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" />
          <circle cx="12" cy="11" r="2.2" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path d="M4 12l5 5L20 6" />
        </svg>
      );
    case "mail":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      );
    case "book":
      return (
        <svg {...props}>
          <path d="M5 4h10a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" />
          <path d="M8 20a3 3 0 0 1-3-3" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <path d="M16 6.2a3 3 0 0 1 0 5.6M18 14.4c1.8.8 3 2.5 3 5.6" />
        </svg>
      );
  }
}

function Marquee() {
  const list = [...MARQUEE_PORTS, ...MARQUEE_PORTS];
  return (
    <section
      className="overflow-hidden border-y border-white/10 bg-deep py-6"
      id="network"
      aria-label="Ports on the network"
    >
      <div className="mx-marquee-track flex w-max">
        {list.map((p, i) => (
          <span
            key={i}
            className="mx-port-name inline-flex items-center whitespace-nowrap font-display text-[clamp(1.3rem,2.4vw,2rem)] font-light text-foam/85"
          >
            {p}
          </span>
        ))}
      </div>
    </section>
  );
}

function Stats() {
  return (
    <section
      className={`grid grid-cols-2 gap-x-8 gap-y-10 bg-abyss py-[clamp(48px,7vw,90px)] md:grid-cols-4 ${PAD}`}
    >
      {STATS.map((s) => (
        <div
          key={s.label}
          className="grid content-start gap-2 border-t border-white/15 pt-5"
        >
          <strong className="font-display text-[clamp(2.6rem,5vw,4.6rem)] font-medium leading-none tracking-[-0.03em] tabular-nums">
            <CountUp to={s.to} suffix={s.suffix} />
          </strong>
          <span className="max-w-[14rem] text-[0.95rem] text-brine">
            {s.label}
          </span>
        </div>
      ))}
    </section>
  );
}

function FeatureCard({ icon, title, desc, n }) {
  const onMove = (e) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${((x - 0.5) * 12).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - y) * 12).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  };
  const onLeave = (e) => {
    const el = e.currentTarget;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };
  return (
    <article
      className="mx-feature relative overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.07),rgba(255,255,255,0.02))] px-7 pb-9 pt-8 hover:border-seaglass/40"
      style={{ "--n": n }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <span className="mb-10 grid h-[52px] w-[52px] place-items-center rounded-2xl border border-seaglass/30 bg-seaglass/10 text-seaglass">
        <Icon name={icon} />
      </span>
      <h3 className="font-display text-2xl font-semibold tracking-[-0.02em]">
        {title}
      </h3>
      <p className="mt-2.5 text-brine">{desc}</p>
    </article>
  );
}

function Features() {
  return (
    <section
      className={`bg-abyss bg-[radial-gradient(900px_500px_at_85%_0%,rgba(15,58,82,0.55),transparent_70%)] ${PAD} ${SECTION_Y}`}
      id="features"
    >
      <div className="mb-[clamp(36px,5vw,64px)] max-w-[44rem]" data-reveal>
        <h2 className={H2}>Every detail, in its right place.</h2>
        <p className="mt-4 max-w-[34rem] text-lg text-brine">
          From first quote to final delivery, the whole journey stays connected.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-reveal>
        {FEATURES.map((f, i) => (
          <FeatureCard key={f.title} n={i} {...f} />
        ))}
      </div>
    </section>
  );
}

const WS_TABS = [
  {
    title: "Compare rates",
    desc: "See every carrier's rate and transit time for a lane in one table. Sort by price or speed and book from the row.",
  },
  {
    title: "Track shipments",
    desc: "Moving, delivered, or needing attention. Every container has a status, a progress bar, and the next date that matters.",
  },
  {
    title: "Check invoices",
    desc: "Each invoice line is compared with your contract. Differences are flagged with the exact amount before you pay.",
  },
  {
    title: "Read carrier emails",
    desc: "Forward a plain-text carrier email and get structured fields back: vessel, container, ports and dates.",
  },
];

function RatesPanel({ onEnter }) {
  const [lane, setLane] = useState(0);
  const [sort, setSort] = useState("rate");
  const rows = LANES[lane].rows;
  const minDays = Math.min(...rows.map((r) => r.days));
  const minRate = Math.min(...rows.map((r) => r.rate));
  const sorted = [...rows].sort((a, b) => a[sort] - b[sort]);
  const sortBtn = (key) =>
    `border-b border-current font-bold ${
      sort === key ? "border-solid text-ink" : "border-dashed text-[#5b7482]"
    }`;
  return (
    <div className="mx-panel" key="rates">
      <div
        className="mb-4 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Lane"
      >
        {LANES.map((l, i) => (
          <button
            key={l.label}
            className={`rounded-full px-3.5 py-2 text-[0.84rem] font-semibold transition ${
              lane === i
                ? "bg-ink text-foam"
                : "bg-[#efeadb] text-[#3d5666] hover:bg-[#e3dcc7]"
            }`}
            onClick={() => setLane(i)}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.93rem] tabular-nums">
          <thead>
            <tr>
              <th className={TH}>Carrier</th>
              <th className={TH}>
                <button
                  className={sortBtn("days")}
                  onClick={() => setSort("days")}
                >
                  Transit
                </button>
              </th>
              <th className={TH}>
                <button
                  className={sortBtn("rate")}
                  onClick={() => setSort("rate")}
                >
                  40ft rate
                </button>
              </th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.carrier}>
                <td className={TD}>
                  {r.carrier}
                  {r.days === minDays && (
                    <span
                      className={`${PILL} ml-2 bg-[#dfe9f2] text-[#1d4f7a]`}
                    >
                      Fastest
                    </span>
                  )}
                  {r.rate === minRate && (
                    <span
                      className={`${PILL} ml-2 bg-[#e0efe6] text-[#1f6b43]`}
                    >
                      Lowest rate
                    </span>
                  )}
                </td>
                <td className={TD}>{r.days} days</td>
                <td className={TD}>
                  <b>{money(r.rate)}</b>
                </td>
                <td className={TD}>
                  <button
                    className="rounded-full bg-ink px-3.5 py-1.5 text-[0.82rem] font-bold text-foam transition hover:bg-signal hover:text-ink"
                    onClick={onEnter}
                  >
                    Book
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrackPanel() {
  const counts = SHIPMENTS.reduce(
    (acc, s) => ({ ...acc, [s.status]: (acc[s.status] || 0) + 1 }),
    {},
  );
  return (
    <div className="mx-panel" key="track">
      <div className="mb-4 grid gap-2.5 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#efeadb] px-4 py-3.5">
          <b className="block font-display text-3xl font-semibold leading-none">
            {counts.moving || 0}
          </b>
          <span className="text-[0.82rem] text-[#5b7482]">Moving</span>
        </div>
        <div className="rounded-2xl bg-[#efeadb] px-4 py-3.5">
          <b className="block font-display text-3xl font-semibold leading-none">
            {counts.delivered || 0}
          </b>
          <span className="text-[0.82rem] text-[#5b7482]">Delivered</span>
        </div>
        <div className="rounded-2xl bg-[#ffe6dc] px-4 py-3.5">
          <b className="block font-display text-3xl font-semibold leading-none text-[#b33a14]">
            {counts.attention || 0}
          </b>
          <span className="text-[0.82rem] text-[#5b7482]">Needs attention</span>
        </div>
      </div>
      <ul className="grid gap-2.5">
        {SHIPMENTS.map((s) => (
          <li
            key={s.id}
            className="rounded-2xl border border-ink/10 px-4 py-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <strong className="block text-[0.95rem]">{s.id}</strong>
                <small className="text-xs text-[#5b7482]">{s.route}</small>
              </div>
              <span className={STATUS_PILL[s.status]}>{s.label}</span>
            </div>
            <div className="my-3 h-1.5 overflow-hidden rounded-full bg-[#e8e2d0]">
              <span
                className="block h-full rounded-full bg-[linear-gradient(90deg,#7fd6c8,#1d8f93)]"
                style={{ width: `${s.progress}%` }}
              />
            </div>
            <small className="text-xs text-[#5b7482]">{s.note}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InvoicePanel() {
  const flagged = INVOICE_LINES.filter((l) => l.invoiced !== l.contract);
  const totalContract = INVOICE_LINES.reduce((a, l) => a + l.contract, 0);
  const totalInvoiced = INVOICE_LINES.reduce((a, l) => a + l.invoiced, 0);
  return (
    <div className="mx-panel" key="audit">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[0.93rem] tabular-nums">
          <thead>
            <tr>
              <th className={TH}>Line</th>
              <th className={TH}>Contract</th>
              <th className={TH}>Invoiced</th>
              <th className={TH}>Variance</th>
            </tr>
          </thead>
          <tbody>
            {INVOICE_LINES.map((l) => {
              const v = l.invoiced - l.contract;
              const bg = v ? "bg-signal/10" : "";
              return (
                <tr key={l.label}>
                  <td className={`${TD} ${bg}`}>{l.label}</td>
                  <td className={`${TD} ${bg}`}>{money(l.contract)}</td>
                  <td className={`${TD} ${bg}`}>{money(l.invoiced)}</td>
                  <td className={`${TD} ${bg}`}>
                    {v ? (
                      <b className="text-[#b33a14]">+{money(v)}</b>
                    ) : (
                      <span className="text-[0.85rem] font-semibold text-[#1f6b43]">
                        Matched
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold">
              <td className="whitespace-nowrap px-2.5 py-3 text-left">Total</td>
              <td className="whitespace-nowrap px-2.5 py-3 text-left">
                {money(totalContract)}
              </td>
              <td className="whitespace-nowrap px-2.5 py-3 text-left">
                {money(totalInvoiced)}
              </td>
              <td className="whitespace-nowrap px-2.5 py-3 text-right">
                {money(totalInvoiced - totalContract)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3.5 text-sm text-[#5b7482]">
        {flagged.length} lines differ from contract. Review them before
        approving payment.
      </p>
    </div>
  );
}

function InboxPanel() {
  return (
    <div className="mx-panel grid gap-4 sm:grid-cols-2" key="inbox">
      <pre className="m-0 overflow-x-auto whitespace-pre-wrap rounded-2xl bg-[#11242f] p-4 font-mono text-[0.78rem] leading-relaxed text-[#cfe3e0]">{`From: ops@corvid-marine.example
Subject: Pacific Meridian ETA update

Hello team,

MV Pacific Meridian sailed from Nhava Sheva
on 18 Sep with container MRDN4021788 on board.
Revised ETA Los Angeles is 16 Oct (was 14 Oct)
due to berth congestion.

Regards,
Operations`}</pre>
      <div className="rounded-2xl border border-ink/10 p-4">
        <span className={`${PILL} mb-3 bg-[#ffe6dc] text-[#b33a14]`}>
          Schedule changed
        </span>
        <dl className="grid gap-3">
          {[
            ["Vessel", "Pacific Meridian"],
            ["Container", "MRDN4021788"],
            ["Departed", "Nhava Sheva, 18 Sep"],
          ].map(([dt, dd]) => (
            <div key={dt}>
              <dt className="text-xs font-bold text-[#5b7482]">{dt}</dt>
              <dd className="mt-0.5 font-semibold">{dd}</dd>
            </div>
          ))}
          <div>
            <dt className="text-xs font-bold text-[#5b7482]">ETA</dt>
            <dd className="mt-0.5 font-semibold">
              Los Angeles, 16 Oct{" "}
              <small className="font-normal text-[#b33a14]">(was 14 Oct)</small>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function Workspace({ onEnter }) {
  const [tab, setTab] = useState(0);
  return (
    <section className={`bg-sand text-ink ${PAD} ${SECTION_Y}`} id="workspace">
      <div className="mb-[clamp(36px,5vw,64px)] max-w-[44rem]" data-reveal>
        <h2 className={H2}>Inside the workspace.</h2>
        <p className="mt-4 max-w-[34rem] text-lg text-[#4b6573]">
          Four things you do every week, in one place. Try them below.
        </p>
      </div>
      <div className="grid items-start gap-8 lg:grid-cols-[5fr_7fr] lg:gap-16">
        <div className="grid gap-1" role="tablist" aria-label="Workspace views">
          {WS_TABS.map((t, i) => (
            <button
              key={t.title}
              role="tab"
              aria-selected={tab === i}
              className={`block w-full border-l-[3px] px-5 py-4 text-left transition ${
                tab === i
                  ? "border-signal bg-white/45 text-ink"
                  : "border-ink/15 text-ink/55 hover:text-ink"
              }`}
              onClick={() => setTab(i)}
            >
              <strong className="font-display text-[clamp(1.3rem,2.1vw,1.7rem)] font-semibold tracking-[-0.02em]">
                {t.title}
              </strong>
              <span
                className={`grid transition-[grid-template-rows] duration-300 ${
                  tab === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <p
                  className={`max-w-[26rem] overflow-hidden text-[0.98rem] text-[#3d5666] ${
                    tab === i ? "pt-2" : ""
                  }`}
                >
                  {t.desc}
                </p>
              </span>
            </button>
          ))}
        </div>
        <div
          className="mx-window overflow-hidden rounded-[20px] bg-paper text-ink shadow-[0_50px_90px_-40px_rgba(8,32,47,0.55)] ring-1 ring-ink/10"
          data-reveal
        >
          <div className="flex items-center gap-1.5 border-b border-ink/10 bg-[#efeadb] px-4 py-3.5">
            <i className="h-[11px] w-[11px] rounded-full bg-ink/20" />
            <i className="h-[11px] w-[11px] rounded-full bg-ink/20" />
            <i className="h-[11px] w-[11px] rounded-full bg-ink/20" />
            <span className="ml-3 text-xs text-[#5b7482]">
              meridian / {["rates", "shipments", "invoices", "updates"][tab]}
            </span>
          </div>
          <div className="min-h-[420px] p-4 sm:p-6">
            {tab === 0 && <RatesPanel onEnter={onEnter} />}
            {tab === 1 && <TrackPanel />}
            {tab === 2 && <InvoicePanel />}
            {tab === 3 && <InboxPanel />}
          </div>
        </div>
      </div>
    </section>
  );
}

function Journey() {
  const ref = useRef(null);
  const [reached, setReached] = useState(0);
  useEffect(() => {
    const el = ref.current;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const prog = clamp((window.innerHeight * 0.65 - r.top) / r.height);
      el.style.setProperty("--prog", prog.toFixed(4));
      setReached(Math.min(STEPS.length, Math.floor(prog * STEPS.length + 0.7)));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <section
      className={`bg-deep bg-[radial-gradient(800px_500px_at_10%_100%,rgba(15,58,82,0.6),transparent_70%)] ${PAD} ${SECTION_Y}`}
      id="how-it-works"
    >
      <div className="mb-[clamp(36px,5vw,64px)] max-w-[44rem]" data-reveal>
        <h2 className={H2}>From first quote to final invoice.</h2>
        <p className="mt-4 max-w-[34rem] text-lg text-brine">
          One shipment, five stages. Scroll to follow a container from booking
          to payment.
        </p>
      </div>
      <div
        className="relative mx-auto max-w-[1100px]"
        ref={ref}
        style={{ "--prog": 0 }}
      >
        <div
          className="absolute bottom-0 left-[15px] top-0 -ml-px w-0.5 bg-white/10 md:left-1/2"
          aria-hidden="true"
        >
          <div className="absolute inset-x-0 top-0 bg-[linear-gradient(#7fd6c8,#ff6b3d)] [height:calc(var(--prog)*100%)]" />
          <div className="absolute left-1/2 -ml-[19px] -mt-[19px] grid h-[38px] w-[38px] place-items-center rounded-xl bg-signal text-abyss shadow-[0_10px_30px_-8px_rgba(255,107,61,0.8)] [top:calc(var(--prog)*100%)]">
            <svg
              className="h-[22px] w-[22px]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="7" width="18" height="10" rx="1.5" />
              <path d="M8 7v10M12 7v10M16 7v10" />
            </svg>
          </div>
        </div>
        {STEPS.map((s, i) => {
          const isReached = i < reached;
          const isRight = i % 2 === 1;
          return (
            <div
              key={s.title}
              className="relative grid py-6 pl-[50px] [perspective:1100px] md:grid-cols-2 md:gap-x-24 md:pl-0"
            >
              <span
                className={`absolute left-[15px] top-[50px] z-[2] -ml-[15px] grid h-[30px] w-[30px] place-items-center rounded-full border-2 text-xs font-bold transition duration-500 md:left-1/2 ${
                  isReached
                    ? "border-seaglass bg-seaglass text-abyss"
                    : "border-white/20 bg-deep text-brine"
                }`}
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <div
                className={`mx-step-card rounded-[20px] border border-white/10 bg-white/5 p-7 ${
                  isRight ? "is-right md:col-start-2" : ""
                } ${isReached ? "is-reached" : ""}`}
              >
                <h3 className="font-display text-3xl font-semibold tracking-[-0.02em]">
                  {s.title}
                </h3>
                <p className="mt-2.5 text-brine">{s.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {s.chips.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-seaglass/25 bg-seaglass/10 px-3 py-1 text-[0.8rem] font-semibold text-seaglass"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className={`bg-abyss ${PAD} ${SECTION_Y}`}>
      <div className="mb-[clamp(36px,5vw,64px)] max-w-[44rem]" data-reveal>
        <h2 className={H2}>Less chasing. More moving.</h2>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-3" data-reveal>
        {QUOTES.map((q, i) => (
          <figure
            key={q.name}
            className={`mx-quote flex flex-col justify-between gap-9 rounded-[22px] border border-white/10 bg-[linear-gradient(170deg,#0f3a52,#08202f)] px-7 py-8 ${
              i === 1 ? "lg:mt-12" : ""
            }`}
            style={{ "--n": i }}
          >
            <blockquote className="font-display text-[clamp(1.15rem,1.7vw,1.4rem)] leading-snug tracking-[-0.01em]">
              {q.text}
            </blockquote>
            <figcaption className="grid gap-0.5 text-sm">
              <strong>{q.name}</strong>
              <span className="text-brine">{q.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section className={`bg-abyss pb-[clamp(80px,11vw,150px)] ${PAD}`} id="faq">
      <div className="grid gap-8 border-t border-white/10 pt-[clamp(60px,8vw,110px)] lg:grid-cols-[4fr_7fr] lg:gap-24">
        <div data-reveal>
          <h2 className={H2}>Questions, answered.</h2>
          <p className="mt-4 max-w-[34rem] text-lg text-brine">
            Can't find what you need? Open the workspace and ask the team from
            inside.
          </p>
        </div>
        <div data-reveal>
          {FAQS.map((f) => (
            <details key={f.q} className="border-b border-white/10">
              <summary className="mx-summary flex list-none items-center justify-between gap-5 py-6 font-display text-[clamp(1.15rem,1.8vw,1.5rem)] font-medium">
                {f.q}
              </summary>
              <p className="mx-panel max-w-[38rem] pb-6 text-brine">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Closing({ onEnter }) {
  return (
    <section
      className={`grid items-end gap-10 bg-signal py-[clamp(72px,10vw,140px)] text-abyss md:grid-cols-[1fr_auto] ${PAD}`}
      data-reveal
    >
      <h2 className="font-display text-[clamp(2.8rem,8vw,7.4rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
        <span className="block">
          <SplitText text="Keep your freight" step={0.03} />
        </span>
        <span className="block">
          <SplitText text="moving forward." delay={0.5} step={0.03} />
        </span>
      </h2>
      <div className="grid max-w-[21rem] gap-5 font-medium">
        <p>
          Bring your lanes, contracts and carrier emails into one clear view.
        </p>
        <button className={`${BTN_DARK} justify-self-start`} onClick={onEnter}>
          Open your workspace <span aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className={`bg-abyss pb-8 pt-[clamp(56px,7vw,90px)] ${PAD}`}>
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="sm:col-span-2 lg:col-span-1">
          <strong className="font-display text-3xl font-bold">Meridian</strong>
          <p className="mt-2 text-brine">Trade moves better with clarity.</p>
        </div>
        {FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3.5 text-sm font-bold text-seaglass">
              {col.title}
            </h4>
            <ul>
              {col.links.map((l) => (
                <li key={l} className="mb-2">
                  <a
                    className="text-[0.95rem] text-foam/75 no-underline transition hover:text-foam"
                    href="#top"
                    onClick={(e) => e.preventDefault()}
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mt-14 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6 text-sm text-brine">
        <span>© 2026 Meridian Freight Intelligence</span>
        <span>
          Footage:{" "}
          <a
            className="text-foam"
            href="https://www.pexels.com/video/aerial-view-of-a-cargo-ship-in-the-ocean-26893759/"
            target="_blank"
            rel="noreferrer"
          >
            Pexels
          </a>
        </span>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function Landing({ onEnter, onLogin }) {
  const rootRef = useRef(null);

  useEffect(() => {
    const nodes = rootRef.current.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.18, rootMargin: "0px 0px -40px 0px" },
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="mx-landing relative overflow-x-clip bg-abyss font-body leading-relaxed text-foam antialiased"
      ref={rootRef}
      id="top"
    >
      <Navbar onEnter={onEnter} onLogin={onLogin} />
      <main>
        <Hero onEnter={onEnter} />
        <Marquee />
        <Stats />
        <Features />
        <Workspace onEnter={onEnter} />
        <Journey />
        <Testimonials />
        <Faq />
        <Closing onEnter={onEnter} />
      </main>
      <Footer />
    </div>
  );
}
