import type { ReactNode } from "react"

export default function Home() {
  const product = {
    name: "RoughCut",
    tagline: "Local-first AI assistant for video editors.",
    description:
      "Ingest footage, auto-transcribe, build rough cuts, generate social clips, and export cleanly to Premiere/Resolve/FCP — offline after setup.",
    primaryCta: { label: "View repo", href: "https://github.com/tanzir/rough-cut" },
    secondaryCta: { label: "See workflow", href: "#features" },
    keywords: ["Local-first", "Offline", "faster-whisper", "Ollama", "XML/EDL", "Premiere/Resolve/FCP"],
    features: [
      {
        title: "A-roll logging",
        body: "Upload video, transcribe locally, segment by speaker/topic, and search like code.",
      },
      {
        title: "Rough cuts",
        body: "Select transcript chunks or prompt a cut. Drag-to-timeline with crossfades for MVP.",
      },
      {
        title: "Social clips",
        body: "Prompt: “make a 30s clip about X” and get a suggested sequence using your chosen LLM provider.",
      },
      {
        title: "Export to NLE",
        body: "Generate XML/EDL plus an H.264 1080p preview package that imports cleanly into Premiere/Resolve/FCP.",
      },
    ],
    tech: [
      { label: "Desktop", value: "Electron + React + TypeScript" },
      { label: "Local services", value: "FastAPI + Postgres + Redis + Celery + MinIO" },
      { label: "AI (offline)", value: "faster-whisper + Ollama (Qwen2.5 Instruct)" },
      { label: "Media", value: "ffmpeg (server) + Remotion Player (preview) + XML/EDL exports" },
    ],
    contact: { label: "Open an issue", href: "https://github.com/tanzir/rough-cut/issues" },
  }

  return (
    <div className="min-h-dvh bg-white text-zinc-950">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-zinc-300 focus:bg-white focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-md border border-zinc-200">
              <span className="font-mono text-xs">RC</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">{product.name}</span>
          </div>

          <nav className="flex flex-wrap items-center justify-end gap-2 text-sm">
            <HeaderLink href="#features">Features</HeaderLink>
            <HeaderLink href="#tech">Tech</HeaderLink>
            <HeaderLink href="#contact">Contact</HeaderLink>
            <a
              href={product.primaryCta.href}
              className="inline-flex h-9 items-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white outline-none transition-colors hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
              rel="noreferrer"
              target="_blank"
            >
              {product.primaryCta.label}
            </a>
          </nav>
        </div>
      </header>

      <main id="content">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(0,0,0,0.06),transparent_55%)]" />
          <div className="mx-auto max-w-6xl px-4 py-20 sm:py-24">
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700">
                <span className="font-mono">v1</span>
                <span>Local-first • offline after setup • no cloud required</span>
              </p>

              <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                {product.tagline}
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-zinc-600 sm:text-lg">
                {product.description}
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <a
                  href={product.primaryCta.href}
                  className="inline-flex h-11 items-center rounded-md bg-zinc-950 px-4 text-sm font-medium text-white outline-none transition-colors hover:bg-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                  rel="noreferrer"
                  target="_blank"
                >
                  {product.primaryCta.label}
                </a>
                <a
                  href={product.secondaryCta.href}
                  className="inline-flex h-11 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-950 outline-none transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
                >
                  {product.secondaryCta.label}
                </a>
              </div>

              <div className="mt-8 flex flex-wrap gap-2">
                {product.keywords.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-2.5 py-1 font-mono text-xs text-zinc-800"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <Section id="features" title="Workflow" subtitle="Ingest → log → cut → export. All local by default.">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {product.features.map((f) => (
              <div
                key={f.title}
                className="rounded-lg border border-zinc-200 bg-white p-4 transition-colors hover:border-zinc-300"
              >
                <h3 className="text-sm font-semibold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600">{f.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="tech" title="Stack" subtitle="Local-first architecture with optional cloud LLM fallback.">
          <div className="rounded-lg border border-zinc-200 bg-white">
            <dl className="grid grid-cols-1 divide-y divide-zinc-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
              {product.tech.map((t) => (
                <div key={t.label} className="p-4">
                  <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{t.label}</dt>
                  <dd className="mt-2 font-mono text-sm text-zinc-900">{t.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>

        <Section id="contact" title="Get involved" subtitle="Ship the MVP, then iterate with editors.">
          <div className="flex flex-col items-start justify-between gap-4 rounded-lg border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium">Want this on your machine?</p>
              <p className="mt-1 text-sm text-zinc-600">Open an issue with your workflow and target NLE.</p>
            </div>
            <a
              href={product.contact.href}
              className="inline-flex h-10 items-center rounded-md border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-950 outline-none transition-colors hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
            >
              {product.contact.label}
            </a>
          </div>
        </Section>
      </main>

      <footer className="border-t border-zinc-200">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-10 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-zinc-500">© {new Date().getFullYear()} {product.name}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <FooterLink href={product.primaryCta.href}>GitHub</FooterLink>
            <FooterLink href="#features">Features</FooterLink>
            <FooterLink href={product.contact.href}>Email</FooterLink>
          </div>
        </div>
      </footer>
    </div>
  )
}

function HeaderLink(props: { href: string; children: string }) {
  return (
    <a
      href={props.href}
      className="inline-flex h-9 items-center rounded-md px-2 text-zinc-700 outline-none transition-colors hover:bg-zinc-50 hover:text-zinc-950 focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
    >
      {props.children}
    </a>
  )
}

function FooterLink(props: { href: string; children: string }) {
  const isExternal = /^https?:\/\//.test(props.href) || props.href.startsWith("mailto:")
  return (
    <a
      href={props.href}
      className="text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline"
      rel={isExternal ? "noreferrer" : undefined}
      target={isExternal ? "_blank" : undefined}
    >
      {props.children}
    </a>
  )
}

function Section(props: { id: string; title: string; subtitle: string; children: ReactNode }) {
  return (
    <section id={props.id} className="mx-auto max-w-6xl px-4 py-16 sm:py-20">
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{props.title}</h2>
        <p className="mt-2 text-sm text-zinc-600 sm:text-base">{props.subtitle}</p>
      </div>
      {props.children}
    </section>
  )
}
