import { useEffect, useState } from "react";

const NAV = [
  { id: "platform", label: "Platform" },
  { id: "network", label: "Network" },
  { id: "workspace", label: "Workspace" },
  { id: "how-it-works", label: "How it works" },
  { id: "faq", label: "FAQ" },
];

function scrollToId(id) {
  if (id === "platform") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Navbar({ onEnter, onLogin }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("platform");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Highlight the section that is under the header
  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => e.isIntersecting && setCurrent(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (e, id) => {
    e.preventDefault();
    setOpen(false);
    scrollToId(id);
  };

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-all duration-300 ${
        scrolled || open
          ? "border-white/10 bg-abyss/85 shadow-[0_10px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          : "border-transparent bg-gradient-to-b from-abyss/70 to-transparent"
      }`}
    >
      <div
        className={`mx-auto flex max-w-[1600px] items-center justify-between gap-6 px-5 transition-all duration-300 sm:px-10 ${
          scrolled ? "py-3" : "py-4"
        }`}
      >
        <a
          href="#top"
          onClick={(e) => go(e, "platform")}
          className="inline-flex items-center gap-3 text-foam no-underline"
          aria-label="Meridian home"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-seaglass/35 bg-seaglass/10 text-seaglass">
            <svg
              className="h-6 w-6"
              viewBox="0 0 40 40"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 24c5-5 10-5 16 0s11 5 16 0M4 31c5-5 10-5 16 0s11 5 16 0"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M20 5v14m-6-6 6 6 6-6"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="grid leading-tight">
            <strong className="font-display text-xl font-bold tracking-tight">
              Meridian
            </strong>
            <small className="hidden text-[0.68rem] tracking-[0.12em] text-brine sm:block">
              Ocean intelligence
            </small>
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((n) => {
            const on = current === n.id;
            return (
              <a
                key={n.id}
                href={`#${n.id}`}
                onClick={(e) => go(e, n.id)}
                aria-current={on ? "true" : undefined}
                className={`relative rounded-full px-4 py-2 text-sm font-medium no-underline transition-colors ${
                  on ? "bg-white/10 text-foam" : "text-foam/70 hover:text-foam"
                }`}
              >
                {n.label}
              </a>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={onLogin}
            className="hidden rounded-full border border-white/25 px-5 py-2.5 text-sm font-bold text-foam transition hover:bg-white/10 sm:inline-flex"
          >
            Login
          </button>
          <button
            onClick={onEnter}
            className="hidden items-center gap-2 rounded-full bg-signal px-5 py-2.5 text-sm font-bold text-abyss transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(255,107,61,0.9)] sm:inline-flex"
          >
            Open workspace <span aria-hidden="true">↗</span>
          </button>
          <button
            className="grid h-11 w-11 place-items-center rounded-full border border-white/25 text-foam lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            <span className="relative block h-3.5 w-5" aria-hidden="true">
              <i
                className={`absolute left-0 h-0.5 w-5 rounded bg-current transition-all duration-300 ${
                  open ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <i
                className={`absolute left-0 top-1.5 h-0.5 w-5 rounded bg-current transition-opacity duration-200 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <i
                className={`absolute left-0 h-0.5 w-5 rounded bg-current transition-all duration-300 ${
                  open ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        className={`grid overflow-hidden transition-[grid-template-rows] duration-300 lg:hidden ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <nav
          className="min-h-0 overflow-hidden px-5 sm:px-10"
          aria-label="Mobile"
          inert={!open}
        >
          <ul className="grid gap-1 border-t border-white/10 py-4">
            {NAV.map((n) => (
              <li key={n.id}>
                <a
                  href={`#${n.id}`}
                  onClick={(e) => go(e, n.id)}
                  className={`block rounded-xl px-4 py-3 font-display text-lg font-medium no-underline ${
                    current === n.id ? "bg-white/10 text-foam" : "text-foam/75"
                  }`}
                >
                  {n.label}
                </a>
              </li>
            ))}
            <li className="pt-2">
              <button
                onClick={() => {
                  setOpen(false);
                  onLogin();
                }}
                className="mb-2 w-full rounded-full border border-white/25 px-5 py-3.5 font-bold text-foam"
              >
                Login
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  onEnter();
                }}
                className="w-full rounded-full bg-signal px-5 py-3.5 font-bold text-abyss"
              >
                Open workspace ↗
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
