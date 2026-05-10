import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { getTranscript, type TranscriptSegment } from "@/utils/api"
import { cacheTranscript, getCachedTranscript } from "@/utils/cache"
import { formatTime } from "@/utils/time"

type SpeakerGroup = {
  key: string
  speaker: string
  segments: TranscriptSegment[]
}

function groupBySpeaker(segments: TranscriptSegment[]): SpeakerGroup[] {
  const out: SpeakerGroup[] = []
  for (const seg of segments) {
    const speaker = seg.speaker || "Unknown"
    const last = out[out.length - 1]
    if (last && last.speaker === speaker) {
      last.segments.push(seg)
    } else {
      out.push({ key: `${speaker}-${seg.id}`, speaker, segments: [seg] })
    }
  }
  return out
}

export function TranscriptViewer({
  videoId,
  onSeek,
  onAddToTimeline,
}: {
  videoId: string
  onSeek: (sec: number) => void
  onAddToTimeline: (seg: TranscriptSegment) => void
}) {
  const [q, setQ] = useState("")
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const qq = q.trim() ? q.trim() : undefined
      try {
        const data = await getTranscript(videoId, qq)
        if (!cancelled) setSegments(data)
        if (!qq) void cacheTranscript(videoId, data)
      } catch {
        const cached = await getCachedTranscript(videoId, qq)
        if (!cancelled && cached) setSegments(cached)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [videoId, q])

  const groups = useMemo(() => groupBySpeaker(segments), [segments])

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search transcript" className="pl-8" />
        </div>
        <Button variant="outline" onClick={() => setQ("")}>Clear</Button>
      </div>
      <ScrollArea className="h-[440px] rounded-md border border-white/10 bg-white/5">
        <div className="p-2">
          {groups.map((g) => {
            const isCollapsed = !!collapsed[g.key]
            return (
              <div key={g.key} className="mb-2 rounded-md border border-white/10 bg-zinc-950/30">
                <button
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm"
                  onClick={() => setCollapsed((s) => ({ ...s, [g.key]: !s[g.key] }))}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <span className="font-medium">{g.speaker}</span>
                    <span className="text-xs text-zinc-500">{g.segments.length} segments</span>
                  </div>
                </button>
                {!isCollapsed ? (
                  <div className="divide-y divide-white/10">
                    {g.segments.map((seg) => (
                      <div key={seg.id} className="flex gap-3 px-3 py-2">
                        <button
                          className="w-20 shrink-0 rounded bg-white/5 px-2 py-1 text-xs text-zinc-200 hover:bg-white/10"
                          onClick={() => onSeek(seg.start_time)}
                        >
                          {formatTime(seg.start_time)}
                        </button>
                        <div className="flex-1">
                          <div className="text-sm text-zinc-100">{seg.text}</div>
                          {seg.topics?.length ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {seg.topics.map((t) => (
                                <Badge key={t} variant="default">
                                  {t}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => onAddToTimeline(seg)}>
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
          {!groups.length ? <div className="p-6 text-sm text-zinc-400">No transcript segments.</div> : null}
        </div>
        <ScrollBar />
      </ScrollArea>
    </div>
  )
}

