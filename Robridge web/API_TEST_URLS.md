# 🔗 API Test URLs - Authentication Endpoints

## Current Status

✅ **Server Running**: https://robridgeexpress.onrender.com  
✅ **Health Check**: Working  
❌ **Auth Endpoints**: Need to be deployed (currently 404)

## Test URLs (After Deployment)

### 1. Health Check
```
GET https://robridgeexpress.onrender.com/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-28T10:21:06.244Z"
}
```

### 2. User Login
```
POST https://robridgeexpress.onrender.com/api/auth/login
Content-Type: application/json

{
  "email": "admin@robridge.com",
  "password": "admin123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@robridge.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

### 3. Token Verification
```
GET https://robridgeexpress.onrender.com/api/auth/verify
Authorization: Bearer YOUR_TOKEN_HERE
```

**Expected Response:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "admin@robridge.com",
    "name": "Admin User",
    "role": "admin"
  }
}
```

### 4. User Registration
```
POST https://robridgeexpress.onrender.com/api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "role": "expo_user"
}
```

### 5. Change Password (Requires Auth)
```
POST https://robridgeexpress.onrender.com/api/auth/change-password
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

## Quick Test Commands

### Using PowerShell (Windows)
```powershell
# Test Login
$body = @{email="admin@robridge.com"; password="admin123"} | ConvertTo-Json
Invoke-RestMethod -Uri "https://robridgeexpress.onrender.com/api/auth/login" -Method Post -Body $body -ContentType "application/json"

# Or run the test script:
.\test-auth-endpoints.ps1
```

### Using curl (Mac/Linux)
```bash
# Test Login
curl -X POST https://robridgeexpress.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@robridge.com","password":"admin123"}'

# Or run the test script:
chmod +x test-auth-endpoints.sh
./test-auth-endpoints.sh
```

### Using Browser (GET requests only)
Open these URLs in your browser:
- Health: https://robridgeexpress.onrender.com/api/health

For POST requests, use:
- **Postman** (Recommended)
- **Thunder Client** (VS Code extension)
- **curl** or **PowerShell**

## Test Credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@robridge.com` | `admin123` | admin |
| `user@expo.com` | `expo123` | expo_user |
| `user@robridge.com` | `full123` | full_access |

## Expected Status Codes

- **200 OK**: Success
- **400 Bad Request**: Missing/invalid data
- **401 Unauthorized**: Invalid credentials
- **403 Forbidden**: Account deactivated or invalid token
- **404 Not Found**: Endpoint doesn't exist (not deployed yet)
- **500 Internal Server Error**: Server error

## After Deployment

Once you deploy, test in this order:

1. ✅ Health check (should work)
2. ✅ Login with admin credentials
3. ✅ Verify token from login response
4. ✅ Test invalid login (should return 401)
5. ✅ Test other user roles

---

**Note**: The authentication endpoints will return 404 until you deploy the updated code to Render.com.

