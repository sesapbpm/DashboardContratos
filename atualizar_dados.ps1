# Script para atualizar os dados dos contratos da SESAP-RN diretamente da API do ComprasNet
$ErrorActionPreference = "Stop"
Write-Host "Consultando API ComprasNet (UG: 925550)..." -ForegroundColor Cyan
$timestamp = Get-Date -Format "dd/MM/yyyy HH:mm"
$json = Invoke-RestMethod -Uri "https://contratos.comprasnet.gov.br/api/contrato/ug/925550" -Method Get
$count = $json.Count
Write-Host "Total de contratos obtidos: $count" -ForegroundColor Green

$jsonText = $json | ConvertTo-Json -Depth 10 -Compress
$content = "const lastUpdateDate = `"$timestamp`";`r`nconst staticData = $jsonText;"
$targetPath = Join-Path $PSScriptRoot "data.js"
[System.IO.File]::WriteAllText($targetPath, $content, [System.Text.Encoding]::UTF8)

Write-Host "Arquivo data.js atualizado com sucesso em $timestamp ($count contratos)!" -ForegroundColor Green

