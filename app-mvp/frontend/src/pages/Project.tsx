import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { Upload } from "@/components/Upload"
import { TranscriptViewer } from "@/components/TranscriptViewer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { listVideos, type TranscriptSegment, type VideoFile } from "@/utils/api"
import { cacheVideos, getCachedVideos } from "@/utils/cache"
import { formatTime } from "@/utils/time"

export default function Project() {
  const { projectId } = useParams()
  const pid = projectId || ""
  const [videos, setVideos] = useState<VideoFile[]>([])
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const refresh = useCallback(async () => {
    try {
      const v = await listVideos(pid)
      setVideos(v)
      void cacheVideos(pid, v)
      if (!activeVideoId && v[0]) setActiveVideoId(v[0].id)
    } catch {
      const cached = await getCachedVideos(pid)
      if (cached) {
        setVideos(cached)
        if (!activeVideoId && cached[0]) setActiveVideoId(cached[0].id)
      }
    }
  }, [activeVideoId, pid])

  useEffect(() => {
    if (!pid) return
    void refresh()
    const t = setInterval(() => void refresh(), 1500)
    return () => clearInterval(t)
  }, [pid, refresh])

  const active = useMemo(() => videos.find((v) => v.id === activeVideoId) || null, [videos, activeVideoId])

  return (
    <AppShell projectId={pid}>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Ingest & Log</div>
            <div className="text-sm text-zinc-400">Upload, transcription, segment review, and timeline pickup.</div>
          </div>
          <Button asChild variant="secondary">
            <Link to={`/projects/${pid}/editor`}>Go to timeline</Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[360px_1fr_420px]">
          <div className="space-y-4">
            <Upload
              projectId={pid}
              onJobCreated={(jid) => {
                setJobId(jid)
                void refresh()
              }}
            />
            <Card>
              <CardHeader>
                <CardTitle>Media</CardTitle>
                <CardDescription>Processing status updates automatically.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {videos.map((v) => (
                  <button
                    key={v.id}
                    className={
                      "flex w-full items-center justify-between rounded-md border border-white/10 bg-zinc-950/30 px-3 py-2 text-left hover:bg-white/5"
                    }
                    onClick={() => setActiveVideoId(v.id)}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm text-zinc-100">{v.filename}</div>
                      <div className="text-xs text-zinc-500">{v.duration != null ? formatTime(v.duration) : "—"}</div>
                    </div>
                    <Badge
                      variant={v.status === "READY" ? "success" : v.status === "FAILED" ? "error" : "warning"}
                      className="shrink-0"
                    >
                      {v.status}
                    </Badge>
                  </button>
                ))}
                {!videos.length ? <div className="text-sm text-zinc-400">No media yet.</div> : null}
                {jobId ? <div className="text-xs text-zinc-500">Last job: {jobId}</div> : null}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Player</CardTitle>
                <CardDescription>Uses proxy when available for smooth scrubbing.</CardDescription>
              </CardHeader>
              <CardContent>
                {active?.proxy_url ? (
                  <video ref={videoRef} src={active.proxy_url} controls className="aspect-video w-full rounded-md bg-black" />
                ) : (
                  <div className="aspect-video w-full rounded-md bg-black/50" />
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            {active ? (
              <TranscriptViewer
                videoId={active.id}
                onSeek={(sec) => {
                  if (!videoRef.current) return
                  videoRef.current.currentTime = sec
                  void videoRef.current.play()
                }}
                onAddToTimeline={(seg: TranscriptSegment) => {
                  window.location.href = `/projects/${pid}/editor?videoId=${active.id}&addSegmentId=${seg.id}`
                }}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Transcript</CardTitle>
                  <CardDescription>Select a clip to view transcript.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-zinc-400">No clip selected.</CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

