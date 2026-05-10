# Samples

This folder includes a small sample video and expected export outputs.

## Sample video
- `assets/sample.mp4`

## Regenerate the sample video
From `app-mvp/` (requires `ffmpeg` installed locally):

```bash
ffmpeg -y -f lavfi -i testsrc2=size=1280x720:rate=24 -f lavfi -i sine=frequency=440:sample_rate=48000 -t 5 -c:v libx264 -pix_fmt yuv420p -preset veryfast -crf 23 -c:a aac -b:a 128k samples/assets/sample.mp4
```

## Expected exports
- `expected-sequence.edl`: CMX3600 EDL produced by a 1s single-clip timeline
- `expected-sequence.xml`: FCP7-style XMEML produced by a 1s single-clip timeline

## Smoke tests (Windows PowerShell)
- `powershell -ExecutionPolicy Bypass -File .\samples\ingest_demo.ps1`
- `powershell -ExecutionPolicy Bypass -File .\samples\export_demo.ps1`
