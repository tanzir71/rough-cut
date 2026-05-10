import { openDB } from "idb"

import type { Project, Timeline, TranscriptSegment, VideoFile } from "@/utils/api"

const DB_NAME = "app-mvp-cache"
const DB_VERSION = 1

async function db() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(d) {
      if (!d.objectStoreNames.contains("projects")) d.createObjectStore("projects")
      if (!d.objectStoreNames.contains("videosByProject")) d.createObjectStore("videosByProject")
      if (!d.objectStoreNames.contains("transcriptByVideo")) d.createObjectStore("transcriptByVideo")
      if (!d.objectStoreNames.contains("timelineByProject")) d.createObjectStore("timelineByProject")
    },
  })
}

export async function cacheProjects(projects: Project[]) {
  const d = await db()
  await d.put("projects", projects, "all")
}

export async function getCachedProjects(): Promise<Project[] | null> {
  const d = await db()
  return (await d.get("projects", "all")) ?? null
}

export async function cacheVideos(projectId: string, videos: VideoFile[]) {
  const d = await db()
  await d.put("videosByProject", videos, projectId)
}

export async function getCachedVideos(projectId: string): Promise<VideoFile[] | null> {
  const d = await db()
  return (await d.get("videosByProject", projectId)) ?? null
}

export async function cacheTranscript(videoId: string, segs: TranscriptSegment[]) {
  const d = await db()
  await d.put("transcriptByVideo", segs, videoId)
}

export async function getCachedTranscript(videoId: string, q?: string): Promise<TranscriptSegment[] | null> {
  const d = await db()
  const segs = (await d.get("transcriptByVideo", videoId)) as TranscriptSegment[] | undefined
  if (!segs) return null
  if (!q) return segs
  const qq = q.toLowerCase()
  return segs.filter((s) => s.text.toLowerCase().includes(qq) || (s.speaker || "").toLowerCase().includes(qq))
}

export async function cacheTimeline(projectId: string, timeline: Timeline) {
  const d = await db()
  await d.put("timelineByProject", timeline, projectId)
}

export async function getCachedTimeline(projectId: string): Promise<Timeline | null> {
  const d = await db()
  return (await d.get("timelineByProject", projectId)) ?? null
}

