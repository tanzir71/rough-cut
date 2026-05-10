import { Link, useLocation } from "react-router-dom"
import { Film, LayoutDashboard, Package, Scissors, Settings } from "lucide-react"

import { cn } from "@/lib/utils"

export function AppShell({ projectId, children }: { projectId?: string; children: React.ReactNode }) {
  const loc = useLocation()
  const items = projectId
    ? [
        { to: "/", label: "Projects", icon: LayoutDashboard },
        { to: `/projects/${projectId}`, label: "Ingest & Log", icon: Film },
        { to: `/projects/${projectId}/editor`, label: "Timeline", icon: Scissors },
        { to: `/projects/${projectId}/export`, label: "Export", icon: Package },
        { to: "/settings", label: "Settings", icon: Settings },
      ]
    : [
        { to: "/", label: "Projects", icon: LayoutDashboard },
        { to: "/settings", label: "Settings", icon: Settings },
      ]

  return (
    <div className="min-h-screen bg-[#0B0F14] text-zinc-100">
      <div className="grid min-h-screen grid-cols-[240px_1fr]">
        <aside className="border-r border-white/10 bg-[#0B0F14]">
          <div className="px-4 py-4 text-sm font-semibold">Local Rough Cut</div>
          <nav className="px-2">
            {items.map((it) => {
              const active = loc.pathname === it.to
              const Icon = it.icon
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={cn(
                    "mb-1 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-zinc-300 hover:bg-white/5",
                    active && "bg-white/10 text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {it.label}
                </Link>
              )
            })}
          </nav>
        </aside>
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  )
}

