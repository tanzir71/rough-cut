import { useEffect, useState } from "react"

import { AppShell } from "@/components/layout/AppShell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

export default function Settings() {
  const [llmMode, setLlmMode] = useState<"LOCAL_ONLY" | "OPENROUTER_ONLY" | "LOCAL_FIRST">("LOCAL_ONLY")
  const [openrouterApiKey, setOpenrouterApiKey] = useState("")
  const [savedAt, setSavedAt] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const cfg = await window.desktop?.getConfig?.()
      if (!cfg) return
      setLlmMode(cfg.llmMode)
      setOpenrouterApiKey(cfg.openrouterApiKey || "")
    })()
  }, [])

  async function save() {
    await window.desktop?.setConfig?.({
      llmMode,
      openrouterApiKey: openrouterApiKey.trim() ? openrouterApiKey.trim() : undefined,
    })
    setSavedAt(new Date().toLocaleTimeString())
  }

  return (
    <AppShell>
      <div className="p-6">
        <div className="mb-4">
          <div className="text-lg font-semibold">Settings</div>
          <div className="text-sm text-zinc-400">Stored locally on this machine. Nothing is uploaded by default.</div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>LLM Provider</CardTitle>
              <CardDescription>Ollama works offline; OpenRouter is optional and user-configured.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <div className="text-sm text-zinc-300">Mode</div>
                <select
                  value={llmMode}
                  onChange={(e) => setLlmMode(e.target.value as "LOCAL_ONLY" | "OPENROUTER_ONLY" | "LOCAL_FIRST")}
                  className="h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 text-sm"
                >
                  <option value="LOCAL_ONLY">Local only (Ollama)</option>
                  <option value="OPENROUTER_ONLY">OpenRouter only</option>
                  <option value="LOCAL_FIRST">Local first, OpenRouter fallback</option>
                </select>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-zinc-300">OpenRouter API key</div>
                <Input
                  value={openrouterApiKey}
                  onChange={(e) => setOpenrouterApiKey(e.target.value)}
                  placeholder="Optional"
                  type="password"
                />
                <div className="text-xs text-zinc-500">Stored locally in your Electron user config.</div>
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={save}>Save</Button>
                {savedAt ? <div className="text-xs text-zinc-500">Saved {savedAt}</div> : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

