import { useMemo } from "react"
import { GripVertical, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type TimelineSegment = {
  id: string
  videoId: string
  sourceIn: number
  sourceOut: number
  label?: string
}

export function Timeline({
  fps,
  segments,
  onChange,
  selectedId,
  onSelect,
}: {
  fps: number
  segments: TimelineSegment[]
  onChange: (segments: TimelineSegment[]) => void
  selectedId?: string
  onSelect: (id: string) => void
}) {
  const items = useMemo(() => {
    return segments.map((s) => {
      const dur = Math.max(0, s.sourceOut - s.sourceIn)
      const frames = Math.max(1, Math.round(dur * fps))
      return { ...s, dur, frames }
    })
  }, [segments, fps])

  return (
    <div className="rounded-md border border-white/10 bg-white/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">Timeline</div>
        <div className="text-xs text-zinc-500">1px = 1 frame @ {fps}fps</div>
      </div>
      <div className="overflow-x-auto">
        <div className="flex min-h-16 items-stretch gap-1">
          {items.map((s, idx) => (
            <div
              key={s.id}
              className={cn(
                "group relative flex h-16 cursor-pointer items-center justify-between rounded-md border border-white/10 bg-zinc-950/30 px-2 text-xs",
                selectedId === s.id && "ring-2 ring-blue-500"
              )}
              style={{ width: `${s.frames}px` }}
              onClick={() => onSelect(s.id)}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", s.id)
                e.dataTransfer.effectAllowed = "move"
              }}
              onDragOver={(e) => {
                e.preventDefault()
              }}
              onDrop={(e) => {
                e.preventDefault()
                const draggedId = e.dataTransfer.getData("text/plain")
                if (!draggedId || draggedId === s.id) return
                const from = segments.findIndex((x) => x.id === draggedId)
                const to = idx
                if (from < 0) return
                const next = segments.slice()
                const [moved] = next.splice(from, 1)
                next.splice(to, 0, moved)
                onChange(next)
              }}
            >
              <div className="mr-2 flex items-center gap-2 overflow-hidden">
                <GripVertical className="h-4 w-4 shrink-0 text-zinc-600" />
                <div className="truncate text-zinc-100">{s.label || `Segment ${idx + 1}`}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange(segments.filter((x) => x.id !== s.id))
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {!items.length ? <div className="text-sm text-zinc-400">Add transcript segments to start.</div> : null}
        </div>
      </div>
    </div>
  )
}

