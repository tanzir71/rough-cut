import { useEffect, useState } from "react"
import { FolderOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getExport, getJob, startExport } from "@/utils/api"

export function Export({ projectId }: { projectId: string }) {
  const [outputDir, setOutputDir] = useState("")
  const [xml, setXml] = useState(true)
  const [edl, setEdl] = useState(true)
  const [mp4, setMp4] = useState(true)
  const [jobId, setJobId] = useState<string | null>(null)
  const [exportId, setExportId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [progress01, setProgress01] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!jobId) return
    const t = setInterval(() => {
      void (async () => {
        const j = await getJob(jobId)
        setStatus(j.status)
        setProgress01(j.progress01)
        setMessage(j.message)
        if (exportId) {
          const exp = await getExport(exportId)
          setDownloadUrl(exp.download_url)
        }
      })()
    }, 800)
    return () => clearInterval(t)
  }, [jobId, exportId])

  async function pickDir() {
    const p = await window.desktop?.openDirectory?.()
    if (p) setOutputDir(p)
  }

  async function run() {
    const res = await startExport(projectId, { output_dir: outputDir, fps: 24, xml, edl, mp4 })
    setJobId(res.job_id)
    setExportId(res.export_id)
    setDownloadUrl(null)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
          <CardDescription>Creates a ZIP with XML/EDL (and MP4 in the next step).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input value={outputDir} onChange={(e) => setOutputDir(e.target.value)} placeholder="Output folder path" />
            <Button variant="outline" size="icon" onClick={pickDir}>
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 text-sm text-zinc-200">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={xml} onChange={(e) => setXml(e.target.checked)} />
              XML (FCP7-style)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={edl} onChange={(e) => setEdl(e.target.checked)} />
              EDL (CMX3600)
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={mp4} onChange={(e) => setMp4(e.target.checked)} />
              MP4 (H.264 1080p)
            </label>
          </div>
          <Button onClick={run} disabled={!outputDir}>
            Start export
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Worker progress and messages.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-zinc-200">{status || "Idle"}</div>
          {progress01 != null ? (
            <div className="mt-2">
              <div className="h-2 w-full overflow-hidden rounded bg-white/10">
                <div className="h-2 bg-blue-500" style={{ width: `${Math.round(progress01 * 100)}%` }} />
              </div>
            </div>
          ) : null}
          {message ? <div className="mt-2 text-xs text-zinc-400">{message}</div> : null}
          {downloadUrl ? (
            <div className="mt-3">
              <a
                href={downloadUrl}
                className="text-sm text-blue-300 underline"
                target="_blank"
                rel="noreferrer"
              >
                Download export package
              </a>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

