# PowerShell Script to Test Authentication Endpoints
# Run this after deploying to test the authentication system

Write-Host "🧪 Testing Robridge Authentication Endpoints" -ForegroundColor Cyan
Write-Host "==========================================`n" -ForegroundColor Cyan

$baseUrl = "https://robridgeexpress.onrender.com"

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get
    Write-Host "   ✅ Health Check: OK" -ForegroundColor Green
    Write-Host "   Response: $($health | ConvertTo-Json)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Login with Admin Credentials
Write-Host "2. Testing Login (Admin)..." -ForegroundColor Yellow
try {
    $loginBody = @{
        email = "admin@robridge.com"
        password = "admin123"
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    
    if ($loginResponse.success) {
        Write-Host "   ✅ Login Successful!" -ForegroundColor Green
        Write-Host "   User: $($loginResponse.user.email)" -ForegroundColor Gray
        Write-Host "   Role: $($loginResponse.user.role)" -ForegroundColor Gray
        Write-Host "   Token: $($loginResponse.token.Substring(0, 50))..." -ForegroundColor Gray
        
        $token = $loginResponse.token
        
        # Test 3: Verify Token
        Write-Host "`n3. Testing Token Verification..." -ForegroundColor Yellow
        try {
            $headers = @{
                "Authorization" = "Bearer $token"
            }
            $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/verify" -Method Get -Headers $headers
            
            if ($verifyResponse.success) {
                Write-Host "   ✅ Token Verification: OK" -ForegroundColor Green
                Write-Host "   User: $($verifyResponse.user.email)" -ForegroundColor Gray
            } else {
                Write-Host "   ❌ Token Verification Failed" -ForegroundColor Red
            }
        } catch {
            Write-Host "   ❌ Token Verification Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "   ❌ Login Failed: $($loginResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Login Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "   ⚠️  Endpoint not found - Authentication endpoints may not be deployed yet" -ForegroundColor Yellow
    }
}
Write-Host ""

# Test 4: Invalid Login
Write-Host "4. Testing Invalid Login..." -ForegroundColor Yellow
try {
    $invalidBody = @{
        email = "wrong@email.com"
        password = "wrongpassword"
    } | ConvertTo-Json

    try {
        $invalidResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $invalidBody -ContentType "application/json"
        Write-Host "   ❌ Should have failed but didn't!" -ForegroundColor Red
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        if ($statusCode -eq 401) {
            Write-Host "   ✅ Invalid credentials correctly rejected (401)" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  Unexpected status: $statusCode" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "   ⚠️  Error: $($_.Exception.Message)" -ForegroundColor Yellow
}
Write-Host ""

# Test 5: Test Expo User Login
Write-Host "5. Testing Expo User Login..." -ForegroundColor Yellow
try {
    $expoBody = @{
        email = "user@expo.com"
        password = "expo123"
    } | ConvertTo-Json

    $expoResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/login" -Method Post -Body $expoBody -ContentType "application/json"
    
    if ($expoResponse.success) {
        Write-Host "   ✅ Expo User Login: OK" -ForegroundColor Green
        Write-Host "   Role: $($expoResponse.user.role)" -ForegroundColor Gray
    } else {
        Write-Host "   ❌ Expo User Login Failed: $($expoResponse.error)" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Expo User Login Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ Testing Complete!" -ForegroundColor Green
Write-Host "`nIf you see 404 errors, the authentication endpoints need to be deployed first." -ForegroundColor Yellow

