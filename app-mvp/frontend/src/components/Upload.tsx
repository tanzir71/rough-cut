import { useMemo, useRef, useState } from "react"
import { UploadCloud } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { initUpload, uploadChunk, completeUpload } from "@/utils/api"
import { probeDurationSeconds } from "@/utils/ffmpegWasm"

const DEFAULT_CHUNK_SIZE = 8 * 1024 * 1024

export function Upload({ projectId, onJobCreated }: { projectId: string; onJobCreated: (jobId: string) => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress01, setProgress01] = useState(0)
  const [label, setLabel] = useState<string | null>(null)
  const [localDuration, setLocalDuration] = useState<number | null>(null)

  const pct = useMemo(() => Math.round(progress01 * 100), [progress01])

  async function uploadFile(file: File) {
    setIsUploading(true)
    setProgress01(0)
    setLocalDuration(null)
    setLabel(`Initializing ${file.name}`)
    try {
      try {
        setLabel(`Probing locally (ffmpeg.wasm)`)
        const dur = await probeDurationSeconds(file)
        setLocalDuration(dur)
      } catch {
        setLocalDuration(null)
      }

      const { upload_id } = await initUpload(projectId, file.name, file.size, DEFAULT_CHUNK_SIZE)

      let idx = 0
      for (let offset = 0; offset < file.size; offset += DEFAULT_CHUNK_SIZE) {
        const blob = file.slice(offset, offset + DEFAULT_CHUNK_SIZE)
        setLabel(`Uploading chunk ${idx + 1}`)
        const res = await uploadChunk(upload_id, idx, blob)
        setProgress01(res.received_bytes / res.total_size)
        idx += 1
      }
      setLabel("Finalizing")
      const done = await completeUpload(upload_id)
      onJobCreated(done.job_id)
      setLabel("Queued for transcription + proxy")
    } finally {
      setIsUploading(false)
      setTimeout(() => setLabel(null), 2000)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload</CardTitle>
        <CardDescription>Drag a video here or pick a file. Uploads in chunks.</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className="flex min-h-28 items-center justify-center rounded-md border border-dashed border-white/15 bg-white/5 p-4"
          onDragOver={(e) => {
            e.preventDefault()
          }}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files?.[0]
            if (!f || isUploading) return
            void uploadFile(f)
          }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <UploadCloud className="h-6 w-6 text-zinc-300" />
            <div className="text-sm text-zinc-200">Drop video to upload</div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => inputRef.current?.click()}
                disabled={isUploading}
              >
                Choose file
              </Button>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="video/*,audio/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (!f) return
                  void uploadFile(f)
                }}
              />
            </div>
            {label ? <div className="text-xs text-zinc-400">{label}</div> : null}
            {localDuration != null ? (
              <div className="text-xs text-zinc-500">Local duration (probe): {localDuration.toFixed(2)}s</div>
            ) : null}
            {isUploading ? (
              <div className="w-64">
                <div className="h-2 w-full overflow-hidden rounded bg-white/10">
                  <div className="h-2 bg-blue-500" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-xs text-zinc-500">{pct}%</div>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

