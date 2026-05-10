$ErrorActionPreference = 'Stop'

$api = 'http://localhost:8000'

$projectBodyFile = New-TemporaryFile
Set-Content -Path $projectBodyFile -Value '{"name":"ExportDemo"}' -Encoding utf8
$projectRaw = (curl.exe -s -X POST ($api + '/api/projects') -H 'Content-Type: application/json' --data-binary ('@' + $projectBodyFile))
if ($LASTEXITCODE -ne 0) { throw "curl.exe failed creating project (exit=$LASTEXITCODE)" }
$project = ($projectRaw | ConvertFrom-Json)

$path = (Resolve-Path '.\samples\assets\sample.mp4').Path
$size = (Get-Item $path).Length

$initBody = (@{ filename = 'sample.mp4'; total_size = $size; chunk_size = 8388608 } | ConvertTo-Json)
$initBodyFile = New-TemporaryFile
Set-Content -Path $initBodyFile -Value $initBody -Encoding utf8
$initRaw = (curl.exe -s -X POST ($api + '/api/projects/' + $project.id + '/uploads/init') -H 'Content-Type: application/json' --data-binary ('@' + $initBodyFile))
if ($LASTEXITCODE -ne 0) { throw "curl.exe failed init upload (exit=$LASTEXITCODE)" }
$init = ($initRaw | ConvertFrom-Json)

curl.exe -s -X POST ($api + '/api/uploads/' + $init.upload_id + '/chunk?chunk_index=0') -F ('chunk=@' + $path) | Out-Null

$complete = (curl.exe -s -X POST ($api + '/api/uploads/' + $init.upload_id + '/complete') | ConvertFrom-Json)
$jobId = $complete.job_id
Write-Host ('ingest job=' + $jobId)

$job = $null
for ($i = 0; $i -lt 240; $i++) {
  Start-Sleep -Milliseconds 500
  $job = (curl.exe -s ($api + '/api/jobs/' + $jobId) | ConvertFrom-Json)
  if ($job.status -in @('SUCCEEDED', 'FAILED', 'CANCELED')) { break }
}
if ($job.status -ne 'SUCCEEDED') { throw ('Ingest did not succeed: ' + ($job | ConvertTo-Json -Depth 10)) }

$videos = (curl.exe -s ($api + '/api/projects/' + $project.id + '/videos') | ConvertFrom-Json)
if ($videos.Count -lt 1) { throw 'No videos after ingest' }
$videoId = $videos[0].id

$timelineBody = (@{
  fps = 24
  segments = @(
    @{ id = 'seg-1'; videoId = $videoId; sourceIn = 0.0; sourceOut = 1.0; label = 'Segment 1' }
  )
} | ConvertTo-Json -Depth 10)
$timelineBodyFile = New-TemporaryFile
Set-Content -Path $timelineBodyFile -Value $timelineBody -Encoding utf8
curl.exe -s -X PUT ($api + '/api/projects/' + $project.id + '/timeline') -H 'Content-Type: application/json' --data-binary ('@' + $timelineBodyFile) | Out-Null

$exportBody = (@{ output_dir = '/tmp/app-mvp/exports-out'; fps = 24; xml = $true; edl = $true; mp4 = $true } | ConvertTo-Json)
$exportBodyFile = New-TemporaryFile
Set-Content -Path $exportBodyFile -Value $exportBody -Encoding utf8
$exportStartRaw = (curl.exe -s -X POST ($api + '/api/projects/' + $project.id + '/export') -H 'Content-Type: application/json' --data-binary ('@' + $exportBodyFile))
$exportStart = ($exportStartRaw | ConvertFrom-Json)

$exportJobId = $exportStart.job_id
$exportId = $exportStart.export_id
Write-Host ('export job=' + $exportJobId + ' export_id=' + $exportId)

for ($i = 0; $i -lt 600; $i++) {
  Start-Sleep -Milliseconds 500
  $job = (curl.exe -s ($api + '/api/jobs/' + $exportJobId) | ConvertFrom-Json)
  if ($job.status -in @('SUCCEEDED', 'FAILED', 'CANCELED')) { break }
}
if ($job.status -ne 'SUCCEEDED') { throw ('Export did not succeed: ' + ($job | ConvertTo-Json -Depth 10)) }

$exportStatus = (curl.exe -s ($api + '/api/exports/' + $exportId) | ConvertFrom-Json)
Write-Host ''
Write-Host 'Export status:'
$exportStatus | ConvertTo-Json -Depth 10

if ([string]::IsNullOrWhiteSpace($exportStatus.download_url)) { throw 'No download_url in export status' }

New-Item -ItemType Directory -Force -Path .\samples\outputs | Out-Null
$outZip = '.\samples\outputs\export.zip'
curl.exe -L -o $outZip $exportStatus.download_url | Out-Null

Write-Host ''
Write-Host ('Downloaded: ' + (Resolve-Path $outZip).Path)

