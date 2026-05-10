export function formatTime(sec: number) {
  const s = Math.max(0, sec)
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = Math.floor(s % 60)
  const ms = Math.floor((s - Math.floor(s)) * 1000)
  if (hh > 0) return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(ms).padStart(3, "0")}`
  return `${mm}:${String(ss).padStart(2, "0")}.${String(ms).padStart(3, "0")}`
}

