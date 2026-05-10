import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"

import { AppShell } from "@/components/layout/AppShell"
import { RoughCutPlayer } from "@/components/RoughCutPlayer"
import { Timeline, type TimelineSegment } from "@/components/Timeline"
import { TranscriptViewer } from "@/components/TranscriptViewer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getTranscript, getTimeline, listVideos, saveTimeline, suggest, type TranscriptSegment, type VideoFile } from "@/utils/api"
import { cacheTimeline, cacheVideos, getCachedTimeline, getCachedVideos } from "@/utils/cache"

export default function Editor() {
  const { projectId } = useParams()
  const pid = projectId || ""
  const [searchParams] = useSearchParams()
  const [videos, setVideos] = useState<VideoFile[]>([])
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<TimelineSegment[]>([])
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined)
  const [prompt, setPrompt] = useState("")
  const [mode, setMode] = useState<"LOCAL_ONLY" | "OPENROUTER_ONLY" | "LOCAL_FIRST">("LOCAL_ONLY")
  const [openrouterKey, setOpenrouterKey] = useState<string | undefined>(undefined)
  const [reason, setReason] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [previewMode, setPreviewMode] = useState<"native" | "remotion">("remotion")
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const persistTimeline = useCallback(
    async (next: TimelineSegment[]) => {
      try {
        const tl = await saveTimeline(pid, 24, next)
        void cacheTimeline(pid, tl)
      } catch {
        void cacheTimeline(pid, { project_id: pid, fps: 24, segments: next, updated_at: new Date().toISOString() })
      }
    },
    [pid]
  )

  const setAndPersistTimeline = useCallback(
    (next: TimelineSegment[]) => {
      setTimeline(next)
      void persistTimeline(next)
    },
    [persistTimeline]
  )

  const addToTimeline = useCallback(
    (seg: TranscriptSegment) => {
      const item: TimelineSegment = {
        id: crypto.randomUUID(),
        videoId: seg.video_id,
        sourceIn: seg.start_time,
        sourceOut: seg.end_time,
        label: seg.text.slice(0, 42),
      }
      setTimeline((prev) => {
        const next = [...prev, item]
        void persistTimeline(next)
        return next
      })
    },
    [persistTimeline]
  )

  useEffect(() => {
    if (!pid) return
    void (async () => {
      const cfg = await window.desktop?.getConfig?.()
      if (cfg) {
        setMode(cfg.llmMode)
        setOpenrouterKey(cfg.openrouterApiKey)
      }
      let vlist: VideoFile[] = []
      try {
        const v = await listVideos(pid)
        vlist = v
        setVideos(vlist)
        void cacheVideos(pid, v)
      } catch {
        const cached = await getCachedVideos(pid)
        if (cached) {
          vlist = cached
          setVideos(vlist)
        }
      }
      const spVideoId = searchParams.get("videoId")
      const resolvedActiveId = spVideoId || vlist[0]?.id || null
      setActiveVideoId(resolvedActiveId)
      try {
        const tl = await getTimeline(pid)
        setTimeline(tl.segments)
        void cacheTimeline(pid, tl)
      } catch {
        const cached = await getCachedTimeline(pid)
        if (cached) setTimeline(cached.segments)
      }
      const addSegmentId = searchParams.get("addSegmentId")
      if (addSegmentId) {
        const vid = resolvedActiveId
        if (!vid) return
        const segs = await getTranscript(vid)
        const seg = segs.find((s) => s.id === addSegmentId)
        if (seg) addToTimeline(seg)
      }
    })()
  }, [pid, addToTimeline, searchParams])

  const active = useMemo(() => videos.find((v) => v.id === activeVideoId) || null, [videos, activeVideoId])
  const sources = useMemo(() => {
    const m: Record<string, string> = {}
    for (const v of videos) {
      if (v.proxy_url) m[v.id] = v.proxy_url
    }
    return m
  }, [videos])

  async function runPrompt() {
    if (!active) return
    setBusy(true)
    setReason(null)
    try {
      const res = await suggest(pid, { mode, topic: prompt, target_seconds: 30, video_id: active.id }, { openrouterApiKey: openrouterKey })
      setReason(res.reason)
      const segs = await getTranscript(active.id)
      const selected = segs.filter((s) => res.selected_ids.includes(s.id))
      const next = selected.map((s) => ({
        id: crypto.randomUUID(),
        videoId: s.video_id,
        sourceIn: s.start_time,
        sourceOut: s.end_time,
        label: s.text.slice(0, 42),
      }))
      setTimeline(next)
      await persistTimeline(next)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell projectId={pid}>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold">Rough Cut Timeline</div>
            <div className="text-sm text-zinc-400">Select transcript segments, arrange, then export XML/EDL and MP4.</div>
          </div>
          <Button asChild variant="secondary">
            <Link to={`/projects/${pid}/export`}>Export</Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr_420px]">
          <Card>
            <CardHeader>
              <CardTitle>Clips</CardTitle>
              <CardDescription>Pick a clip to pull transcript.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {videos.map((v) => (
                <button
                  key={v.id}
                  className="flex w-full items-center justify-between rounded-md border border-white/10 bg-zinc-950/30 px-3 py-2 text-left hover:bg-white/5"
                  onClick={() => setActiveVideoId(v.id)}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm text-zinc-100">{v.filename}</div>
                    <div className="text-xs text-zinc-500">{v.id.slice(0, 8)}</div>
                  </div>
                  <Badge variant={v.status === "READY" ? "success" : "warning"}>{v.status}</Badge>
                </button>
              ))}
              {!videos.length ? <div className="text-sm text-zinc-400">No clips.</div> : null}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>Plays proxies sequentially during timeline editing (MVP).</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs text-zinc-400">Preview mode</div>
                  <div className="flex items-center gap-2">
                    <button
                      className={
                        "rounded-md px-2 py-1 text-xs " +
                        (previewMode === "remotion" ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5")
                      }
                      onClick={() => setPreviewMode("remotion")}
                    >
                      Remotion
                    </button>
                    <button
                      className={
                        "rounded-md px-2 py-1 text-xs " +
                        (previewMode === "native" ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5")
                      }
                      onClick={() => setPreviewMode("native")}
                    >
                      Native
                    </button>
                  </div>
                </div>
                {previewMode === "remotion" && timeline.length ? (
                  <div className="overflow-hidden rounded-md bg-black">
                    <RoughCutPlayer fps={24} segments={timeline} sources={sources} />
                  </div>
                ) : active?.proxy_url ? (
                  <video ref={videoRef} src={active.proxy_url} controls className="aspect-video w-full rounded-md bg-black" />
                ) : (
                  <div className="aspect-video w-full rounded-md bg-black/50" />
                )}
              </CardContent>
            </Card>

            <Timeline
              fps={24}
              segments={timeline}
              onChange={setAndPersistTimeline}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
            />

            <Card>
              <CardHeader>
                <CardTitle>Prompt-based Rough Cut</CardTitle>
                <CardDescription>Uses Ollama by default; OpenRouter optional.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as "LOCAL_ONLY" | "OPENROUTER_ONLY" | "LOCAL_FIRST")}
                    className="h-9 rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm"
                  >
                    <option value="LOCAL_ONLY">Local only</option>
                    <option value="OPENROUTER_ONLY">OpenRouter only</option>
                    <option value="LOCAL_FIRST">Local first</option>
                  </select>
                  <Input value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="make a 30s social clip about …" />
                  <Button onClick={runPrompt} disabled={!prompt.trim() || busy || !active}>
                    Generate
                  </Button>
                </div>
                {reason ? <div className="text-xs text-zinc-400">{reason}</div> : null}
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
                onAddToTimeline={addToTimeline}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Transcript</CardTitle>
                  <CardDescription>Select a clip.</CardDescription>
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

