import { FFmpeg } from "@ffmpeg/ffmpeg"
import { fetchFile } from "@ffmpeg/util"

let _ffmpeg: FFmpeg | null = null
let _loading: Promise<FFmpeg> | null = null

export async function getFfmpeg(): Promise<FFmpeg> {
  if (_ffmpeg) return _ffmpeg
  if (_loading) return _loading
  _loading = (async () => {
    const ffmpeg = new FFmpeg()
    await ffmpeg.load()
    _ffmpeg = ffmpeg
    return ffmpeg
  })()
  return _loading
}

export async function probeDurationSeconds(file: File): Promise<number | null> {
  const ffmpeg = await getFfmpeg()
  const name = `input_${Date.now()}.mp4`

  await ffmpeg.writeFile(name, await fetchFile(file))
  let logText = ""
  const onLog = ({ message }: { message: string }) => {
    logText += message + "\n"
  }
  ffmpeg.on("log", onLog)

  try {
    try {
      await ffmpeg.exec(["-i", name])
    } catch {
      // ffmpeg -i exits non-zero; logs still contain metadata
    }
    const m = logText.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/)
    if (!m) return null
    const hh = Number(m[1])
    const mm = Number(m[2])
    const ss = Number(m[3])
    if (Number.isNaN(hh) || Number.isNaN(mm) || Number.isNaN(ss)) return null
    return hh * 3600 + mm * 60 + ss
  } finally {
    ffmpeg.off("log", onLog)
    try {
      await ffmpeg.deleteFile(name)
    } catch {
      // ignore
    }
  }
}

