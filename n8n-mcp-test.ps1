$headers = @{
    'Content-Type' = 'application/json'
    'Authorization' = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI2YmE4Njk0MS02YmNiLTQwMmUtYThlNC02NTUxZTVhNGE3MzMiLCJpc3MiOiJuOG4iLCJhdWQiOiJtY3Atc2VydmVyLWFwaSIsImp0aSI6IjFiNTVkZmJmLTdkMWItNDljMC1hMjNiLTRhMmYzNWYxZWQ5NSIsImlhdCI6MTc2NjY2OTAxN30.N3-Sp-HdFytPYvZGERbtz0oMV2iWjg7foxwdIQe-GHc'
}

$body = @{
    jsonrpc = "2.0"
    method = "tools/list"
    id = 1
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri 'https://agenciabase.app.n8n.cloud/mcp-server/http' -Method POST -Headers $headers -Body $body -ContentType 'application/json'
$response | ConvertTo-Json -Depth 10
