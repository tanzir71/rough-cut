/// <reference types="vite/client" />

interface Window {
  desktop?: {
    openDirectory: () => Promise<string | null>
    openFiles: () => Promise<string[]>
    getConfig: () => Promise<{ llmMode: 'LOCAL_ONLY' | 'OPENROUTER_ONLY' | 'LOCAL_FIRST'; openrouterApiKey?: string }>
    setConfig: (cfg: { llmMode: 'LOCAL_ONLY' | 'OPENROUTER_ONLY' | 'LOCAL_FIRST'; openrouterApiKey?: string }) => Promise<{
      llmMode: 'LOCAL_ONLY' | 'OPENROUTER_ONLY' | 'LOCAL_FIRST'
      openrouterApiKey?: string
    }>
  }
}
