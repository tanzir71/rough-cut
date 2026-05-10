$ErrorActionPreference = 'Stop'

$api = 'http://localhost:8000'
$projectBodyFile = New-TemporaryFile
Set-Content -Path $projectBodyFile -Value '{"name":"Demo"}' -Encoding utf8
$projectRaw = (curl.exe -s -X POST ($api + '/api/projects') -H 'Content-Type: application/json' --data-binary ('@' + $projectBodyFile))
if ($LASTEXITCODE -ne 0) {
  throw "curl.exe failed creating project (exit=$LASTEXITCODE)"
}
if ([string]::IsNullOrWhiteSpace($projectRaw)) {
  throw "Empty response creating project"
}
$project = ($projectRaw | ConvertFrom-Json)

$path = (Resolve-Path '.\samples\assets\sample.mp4').Path
$size = (Get-Item $path).Length

$initBody = (@{ filename = 'sample.mp4'; total_size = $size; chunk_size = 8388608 } | ConvertTo-Json)
$initBodyFile = New-TemporaryFile
Set-Content -Path $initBodyFile -Value $initBody -Encoding utf8
$initRaw = (curl.exe -s -X POST ($api + '/api/projects/' + $project.id + '/uploads/init') -H 'Content-Type: application/json' --data-binary ('@' + $initBodyFile))
if ($LASTEXITCODE -ne 0) {
  throw "curl.exe failed init upload (exit=$LASTEXITCODE)"
}
$init = ($initRaw | ConvertFrom-Json)

curl.exe -s -X POST ($api + '/api/uploads/' + $init.upload_id + '/chunk?chunk_index=0') -F ('chunk=@' + $path) | Out-Null

$complete = (curl.exe -s -X POST ($api + '/api/uploads/' + $init.upload_id + '/complete') | ConvertFrom-Json)
$jobId = $complete.job_id

Write-Host ('project=' + $project.id + ' upload=' + $init.upload_id + ' job=' + $jobId)

$job = $null
for ($i = 0; $i -lt 240; $i++) {
  Start-Sleep -Milliseconds 500
  $job = (curl.exe -s ($api + '/api/jobs/' + $jobId) | ConvertFrom-Json)
  if ($job.status -in @('SUCCEEDED', 'FAILED', 'CANCELED')) {
    break
  }
}

Write-Host ''
Write-Host 'Job:'
$job | ConvertTo-Json -Depth 10

$videos = (curl.exe -s ($api + '/api/projects/' + $project.id + '/videos') | ConvertFrom-Json)
Write-Host ''
Write-Host 'Videos:'
$videos | ConvertTo-Json -Depth 10

if ($videos.Count -gt 0) {
  $videoId = $videos[0].id
  $transcript = (curl.exe -s ($api + '/api/videos/' + $videoId + '/transcript') | ConvertFrom-Json)
  Write-Host ''
  Write-Host 'Transcript segments (first 10):'
  $transcript | Select-Object -First 10 | ConvertTo-Json -Depth 10
}

