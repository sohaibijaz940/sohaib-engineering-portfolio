param([switch]$SkipInstall)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (!(Test-Path .venv\Scripts\python.exe)) { py -3 -m venv .venv }
if (!$SkipInstall) {
  & .venv\Scripts\python.exe -m pip install -r requirements.txt
  if ($LASTEXITCODE -ne 0) { throw 'Python dependency installation failed' }
  npm ci
  if ($LASTEXITCODE -ne 0) { throw 'Frontend dependency installation failed' }
}
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed' }
& .venv\Scripts\python.exe -m unittest discover -s backend -p 'test_*.py' -v
if ($LASTEXITCODE -ne 0) { throw 'Tests failed' }
Write-Host 'Open http://localhost:8000 in your browser. Keep this window open.'
& .venv\Scripts\python.exe backend\server.py
