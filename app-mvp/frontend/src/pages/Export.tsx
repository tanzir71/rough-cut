import { useParams } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Export } from "@/components/Export"

export default function ExportPage() {
  const { projectId } = useParams()
  const pid = projectId || ""
  return (
    <AppShell projectId={pid}>
      <div className="p-6">
        <div className="mb-4">
          <div className="text-lg font-semibold">Export</div>
          <div className="text-sm text-zinc-400">Generate XML/EDL + MP4 preview package.</div>
        </div>
        <Export projectId={pid} />
      </div>
    </AppShell>
  )
}

