const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://localhost:8000"

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, body: unknown) {
    super(typeof body === "string" ? body : `API error (${status})`)
    this.status = status
    this.body = body
  }
}

async function parseBody(res: Response) {
  const ct = res.headers.get("content-type") || ""
  if (ct.includes("application/json")) return res.json()
  return res.text()
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init)
  const body = await parseBody(res)
  if (!res.ok) throw new ApiError(res.status, body)
  return body as T
}

export type Project = {
  id: string
  name: string
  user_id: string
  created_at: string
}

export type VideoFile = {
  id: string
  project_id: string
  filename: string
  duration: number | null
  status: string
  proxy_url: string | null
}

export type TranscriptSegment = {
  id: string
  video_id: string
  start_time: number
  end_time: number
  text: string
  speaker: string | null
  topics: string[]
}

export type Timeline = {
  project_id: string
  fps: number
  segments: Array<{
    id: string
    videoId: string
    sourceIn: number
    sourceOut: number
    label?: string
  }>
  updated_at: string
}

export type Job = {
  id: string
  project_id: string
  type: string
  status: string
  progress01: number | null
  message: string | null
  created_at: string
  updated_at: string
}

export async function health() {
  return request<{ ok: boolean }>("/api/health")
}

export async function createProject(name: string) {
  return request<Project>("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, user_id: "local" }),
  })
}

export async function listProjects() {
  return request<Project[]>("/api/projects")
}

export async function getProject(projectId: string) {
  return request<Project>(`/api/projects/${projectId}`)
}

export async function listVideos(projectId: string) {
  return request<VideoFile[]>(`/api/projects/${projectId}/videos`)
}

export async function getTranscript(videoId: string, q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : ""
  return request<TranscriptSegment[]>(`/api/videos/${videoId}/transcript${qs}`)
}

export async function getTimeline(projectId: string) {
  return request<Timeline>(`/api/projects/${projectId}/timeline`)
}

export async function saveTimeline(projectId: string, fps: number, segments: Timeline["segments"]) {
  return request<Timeline>(`/api/projects/${projectId}/timeline`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fps, segments }),
  })
}

export async function initUpload(projectId: string, filename: string, totalSize: number, chunkSize: number) {
  return request<{ upload_id: string }>(`/api/projects/${projectId}/uploads/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, total_size: totalSize, chunk_size: chunkSize }),
  })
}

export async function uploadChunk(uploadId: string, chunkIndex: number, blob: Blob) {
  const form = new FormData()
  form.append("chunk", blob)
  return request<{ received_bytes: number; total_size: number }>(`/api/uploads/${uploadId}/chunk?chunk_index=${chunkIndex}`, {
    method: "POST",
    body: form,
  })
}

export async function completeUpload(uploadId: string) {
  return request<{ video_id: string | null; job_id: string }>(`/api/uploads/${uploadId}/complete`, { method: "POST" })
}

export async function getJob(jobId: string) {
  return request<Job>(`/api/jobs/${jobId}`)
}

export async function startExport(projectId: string, payload: { output_dir: string; fps: number; xml: boolean; edl: boolean; mp4: boolean }) {
  return request<{ export_id: string; job_id: string }>(`/api/projects/${projectId}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
}

export async function getExport(exportId: string) {
  return request<{
    id: string
    project_id: string
    status: string
    files: Array<Record<string, unknown>>
    download_url: string | null
  }>(`/api/exports/${exportId}`)
}

export async function suggest(
  projectId: string,
  payload: { mode: string; topic: string; target_seconds: number; video_id?: string },
  opts?: { openrouterApiKey?: string }
) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (opts?.openrouterApiKey) headers["X-OpenRouter-Key"] = opts.openrouterApiKey
  return request<{ selected_ids: string[]; reason: string }>(`/api/projects/${projectId}/suggest`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  })
}

