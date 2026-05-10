import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Plus } from "lucide-react"

import { AppShell } from "@/components/layout/AppShell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { health, createProject, listProjects, type Project } from "@/utils/api"
import { cacheProjects, getCachedProjects } from "@/utils/cache"

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

  async function refresh() {
    try {
      const h = await health()
      setIsHealthy(h.ok)
    } catch {
      setIsHealthy(false)
    }
    try {
      const ps = await listProjects()
      setProjects(ps)
      void cacheProjects(ps)
    } catch {
      const cached = await getCachedProjects()
      setProjects(cached || [])
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <AppShell>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Projects</div>
            <div className="text-sm text-zinc-400">Local services: {isHealthy === null ? "…" : isHealthy ? "Ready" : "Offline"}</div>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle>{p.name}</CardTitle>
                <CardDescription>{new Date(p.created_at).toLocaleString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="secondary">
                  <Link to={`/projects/${p.id}`}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
          {!projects.length ? (
            <Card>
              <CardHeader>
                <CardTitle>No projects yet</CardTitle>
                <CardDescription>Create your first project to start ingesting.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setOpen(true)}>Create project</Button>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
              <DialogDescription>Projects are stored in Postgres + MinIO locally.</DialogDescription>
            </DialogHeader>
            <div className="mt-3 space-y-2">
              <div className="text-sm text-zinc-300">Name</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Interview rough cut" />
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const created = await createProject(name.trim() || "Untitled")
                  setOpen(false)
                  setName("")
                  await refresh()
                  window.location.href = `/projects/${created.id}`
                }}
              >
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  )
}

