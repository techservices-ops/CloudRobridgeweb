# ✅ Deployment Checklist - Authentication System

## Current Status
- ✅ Code changes are committed
- ✅ Authentication endpoints are in `server.js`
- ❌ Endpoints returning 404 (not deployed yet)

## Steps to Deploy

### 1. Verify Code is Committed
```bash
git status
# Should show: "nothing to commit, working tree clean"
```

### 2. Push to Repository (if not already pushed)
```bash
git add .
git commit -m "Add proper authentication system with JWT"
git push origin master
```

### 3. Check Render.com Dashboard

#### A. Go to Your Service
- Navigate to: https://dashboard.render.com
- Find your `robridge-express` service

#### B. Check Build Status
1. Click on `robridge-express` service
2. Go to **"Events"** tab
3. Look for latest deployment
4. Check if build completed successfully

#### C. Check Logs
1. Go to **"Logs"** tab
2. Look for:
   - ✅ `npm install` completed
   - ✅ `bcrypt` and `jsonwebtoken` installed
   - ✅ Server started successfully
   - ✅ `Users table created/verified`
   - ✅ `Default users created`

#### D. Manual Deploy (if needed)
1. Click **"Manual Deploy"** button
2. Select **"Deploy latest commit"**
3. Wait for build to complete

### 4. Verify Dependencies Installed

In Render.com logs, you should see:
```
added 2 packages, and audited X packages in Ys
```

If `bcrypt` or `jsonwebtoken` are missing, the build may have failed.

### 5. Check Environment Variables

Ensure these are set in Render.com:
- ✅ `DATABASE_URL` - Your PostgreSQL connection string
- ✅ `NODE_ENV=production`
- ✅ `AI_SERVER_URL=https://robridgeaiserver.onrender.com`
- ⚠️ `JWT_SECRET` (optional but recommended)

### 6. Test After Deployment

Wait 2-3 minutes after deployment, then test:

```powershell
# Test login
$body = @{email="admin@robridge.com"; password="admin123"} | ConvertTo-Json
Invoke-RestMethod -Uri "https://robridgeexpress.onrender.com/api/auth/login" -Method Post -Body $body -ContentType "application/json"
```

## Common Issues & Solutions

### Issue: 404 on /api/auth/login

**Possible Causes:**
1. Build didn't complete
2. Server didn't restart
3. Code not deployed

**Solution:**
- Check Render.com logs
- Manually trigger deployment
- Wait 2-3 minutes for cold start

### Issue: Module not found (bcrypt/jsonwebtoken)

**Solution:**
- Check `package.json` has dependencies
- Verify `npm install` ran successfully
- Check build logs in Render.com

### Issue: Database connection failed

**Solution:**
- Verify `DATABASE_URL` is set correctly
- Check database is accessible
- Verify external connections allowed

### Issue: Users table not created

**Solution:**
- Check database connection
- Look for errors in server logs
- Verify `initUsersTable()` is called

## Expected Logs After Successful Deployment

```
Server Configuration:
   PORT: 10000
   AI_SERVER_URL: https://robridgeaiserver.onrender.com
   NODE_ENV: production
🔍 Database connection details:
   DATABASE_URL: Set
   NODE_ENV: production
Connected to PostgreSQL database
✅ Users table created/verified
✅ Default users created
   Admin: admin@robridge.com / admin123
   Expo: user@expo.com / expo123
   Full Access: user@robridge.com / full123
✅ Barcodes table created/verified
✅ saved_scans table ready
🚀 Robridge Backend Server Started
📡 Main server running on port 10000
```

## Quick Test After Deployment

Run this PowerShell command:

```powershell
.\test-auth-endpoints.ps1
```

Or test manually:

```powershell
# 1. Health check
Invoke-RestMethod -Uri "https://robridgeexpress.onrender.com/api/health"

# 2. Login test
$body = @{email="admin@robridge.com"; password="admin123"} | ConvertTo-Json
Invoke-RestMethod -Uri "https://robridgeexpress.onrender.com/api/auth/login" -Method Post -Body $body -ContentType "application/json"
```

## Success Indicators

✅ Login endpoint returns 200 (not 404)  
✅ Returns token and user data  
✅ Token verification works  
✅ Invalid credentials return 401  
✅ Default users can login  

---

**If endpoints still return 404 after 5 minutes, check Render.com logs for errors.**

