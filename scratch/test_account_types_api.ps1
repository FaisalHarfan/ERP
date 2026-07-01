$ErrorActionPreference = 'Stop'
try {
    # Login
    $login = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method POST -ContentType 'application/json' -Body '{"email":"admin@tanasubur.co.id","password":"admin123"}'
    $token = $login.token
    Write-Host "Login OK. Token starts: $($token.Substring(0,30))..."
    
    $headers = @{ 'Authorization' = "Bearer $token"; 'Content-Type' = 'application/json' }
    
    # GET accountTypes
    $types = Invoke-RestMethod -Uri 'http://localhost:3000/api/data/accountTypes' -Method GET -Headers $headers
    Write-Host "GET accountTypes OK - count: $($types.Count)"
    
    # POST accountTypes
    $body = '{"name":"Test Pendapatan AR","baseType":"INCOME"}'
    $newType = Invoke-RestMethod -Uri 'http://localhost:3000/api/data/accountTypes' -Method POST -Headers $headers -Body $body
    Write-Host "POST accountTypes OK - new ID: $($newType.id)"
    
    # DELETE it
    Invoke-RestMethod -Uri "http://localhost:3000/api/data/accountTypes/$($newType.id)" -Method DELETE -Headers $headers
    Write-Host "DELETE OK"
    
    Write-Host "`nSemua test berhasil!"
} catch {
    Write-Host "ERROR: $_"
}
