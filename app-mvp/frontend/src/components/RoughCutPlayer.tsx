import { useMemo } from "react"
import { AbsoluteFill, interpolate, Sequence, useCurrentFrame, Video } from "remotion"
import { Player } from "@remotion/player"

import type { TimelineSegment } from "@/components/Timeline"

type Props = {
  fps: number
  sources: Record<string, string>
  segments: TimelineSegment[]
  overlapFrames?: number
}

function RoughCutComposition({ fps, sources, segments, overlapFrames = 12 }: Props) {
  const frame = useCurrentFrame()
  const layout = useMemo(() => {
    let t = 0
    return segments
      .map((s) => {
        const durFrames = Math.max(1, Math.round((s.sourceOut - s.sourceIn) * fps))
        const from = t
        t = t + durFrames - overlapFrames
        return { seg: s, from, durFrames }
      })
      .filter((x) => x.durFrames > 0)
  }, [segments, fps, overlapFrames])

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      {layout.map(({ seg, from, durFrames }, idx) => {
        const src = sources[seg.videoId]
        if (!src) return null

        const local = frame - from
        const startFrom = Math.max(0, Math.round(seg.sourceIn * fps))
        const endAt = startFrom + durFrames

        const fadeIn = interpolate(local, [0, overlapFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
        const fadeOut = interpolate(local, [durFrames - overlapFrames, durFrames], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
        const opacity = idx === 0 ? fadeOut : Math.min(fadeIn, fadeOut)

        return (
          <Sequence key={seg.id} from={from} durationInFrames={durFrames}>
            <AbsoluteFill style={{ opacity }}>
              <Video src={src} startFrom={startFrom} endAt={endAt} />
            </AbsoluteFill>
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}

export function RoughCutPlayer(props: Props) {
  const durationInFrames = useMemo(() => {
    const overlap = props.overlapFrames ?? 12
    const total = props.segments.reduce((sum, s) => sum + Math.max(1, Math.round((s.sourceOut - s.sourceIn) * props.fps)), 0)
    const overlaps = Math.max(0, props.segments.length - 1) * overlap
    return Math.max(1, total - overlaps)
  }, [props.fps, props.overlapFrames, props.segments])

  return (
    <Player
      component={RoughCutComposition}
      inputProps={props}
      durationInFrames={durationInFrames}
      compositionWidth={1920}
      compositionHeight={1080}
      fps={props.fps}
      controls
      style={{ width: "100%" }}
    />
  )
}

