# 🧪 Local Testing Guide - Authentication System

## Quick Start Testing

Follow these steps to test the authentication system locally on your machine.

## 📋 Prerequisites

1. **Node.js** installed (v16+)
2. **PostgreSQL Database** - You can use:
   - Your Render.com database (External URL)
   - Local PostgreSQL installation
   - Docker PostgreSQL container

## 🚀 Step-by-Step Testing

### Step 1: Install Dependencies

```bash
cd "Robridge web"
npm install
```

This will install:
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT tokens
- All other dependencies

### Step 2: Set Up Database Connection

You have **two options**:

#### Option A: Use Render.com Database (Easiest)

Create a `.env` file in the `Robridge web` folder:

```bash
# Create .env file
cd "Robridge web"
```

Create `.env` file with this content:
```
DATABASE_URL=postgresql://robridgedb_user:8NcVhAHtrzMemZsRjcOVxztpxoxySsi5@dpg-d4kn2nk9c44c73f2hhdg-a.oregon-postgres.render.com/robridgedb
NODE_ENV=development
JWT_SECRET=your-local-test-secret-key-12345
```

#### Option B: Use Local PostgreSQL

If you have PostgreSQL installed locally:

```bash
# Create database
createdb robridgedb

# Set DATABASE_URL
DATABASE_URL=postgresql://localhost:5432/robridgedb
```

### Step 3: Start the Server

Open a terminal and run:

```bash
cd "Robridge web"
npm run server
```

**Expected Output:**
```
Server Configuration:
   PORT: 3001
   AI_SERVER_URL: https://robridgeaiserver.onrender.com
   NODE_ENV: development
🔍 Database connection details:
   DATABASE_URL: Set
   NODE_ENV: development
Connected to PostgreSQL database
✅ Users table created/verified
✅ Default users created
   Admin: admin@robridge.com / admin123
   Expo: user@expo.com / expo123
   Full Access: user@robridge.com / full123
✅ Barcodes table created/verified
✅ saved_scans table ready
═══════════════════════════════════════════════════════
🚀 Robridge Backend Server Started
═══════════════════════════════════════════════════════
📡 Main server running on port 3001
🌍 Environment: development
🤖 AI Server: https://robridgeaiserver.onrender.com
🏷️  Flask Server: http://localhost:5000
🔌 WebSocket server active on port 3001
🗄️  Database: PostgreSQL (Connected)
🌐 Local URL: http://localhost:3001
═══════════════════════════════════════════════════════
```

### Step 4: Start the React Frontend

Open a **new terminal window** and run:

```bash
cd "Robridge web"
npm start
```

This will:
- Start React development server on `http://localhost:3000`
- Automatically open your browser

**OR** use the combined command (both servers):

```bash
cd "Robridge web"
npm run dev
```

This starts both servers simultaneously.

### Step 5: Test Login

1. **Open Browser**: Go to `http://localhost:3000`
2. **You should see**: Login page
3. **Test Default Users**:

#### Test 1: Admin User
- Email: `admin@robridge.com`
- Password: `admin123`
- Expected: Login successful, redirect to dashboard

#### Test 2: Expo User
- Email: `user@expo.com`
- Password: `expo123`
- Expected: Login successful, limited access pages

#### Test 3: Full Access User
- Email: `user@robridge.com`
- Password: `full123`
- Expected: Login successful, full access

#### Test 4: Invalid Credentials
- Email: `wrong@email.com`
- Password: `wrongpass`
- Expected: Error message "Invalid email or password"

## 🔍 Testing Checklist

### ✅ Backend API Tests

Test these endpoints using **Postman** or **curl**:

#### 1. Health Check
```bash
curl http://localhost:3001/api/health
```
Expected: `{"status":"ok","timestamp":"..."}`

#### 2. Login API
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@robridge.com","password":"admin123"}'
```

Expected Response:
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

#### 3. Verify Token
```bash
# First, get token from login response, then:
curl http://localhost:3001/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 4. Invalid Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"wrong@email.com","password":"wrong"}'
```

Expected: `{"success":false,"error":"Invalid email or password"}`

### ✅ Frontend Tests

1. **Login Page Loads**: ✅
2. **Quick Login Buttons Work**: ✅
3. **Form Validation**: ✅
4. **Error Messages Display**: ✅
5. **Success Redirect**: ✅
6. **Token Stored**: Check browser DevTools → Application → Local Storage
7. **Session Persists**: Refresh page, should stay logged in
8. **Logout Works**: Click logout, should clear session

## 🐛 Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
1. Check DATABASE_URL in `.env` file
2. Verify database is accessible
3. Check firewall settings
4. For Render.com database, ensure external connections are allowed

### Issue: "bcrypt module not found"

**Solution:**
```bash
cd "Robridge web"
npm install bcrypt jsonwebtoken
```

### Issue: "Port 3001 already in use"

**Solution:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID_NUMBER> /F

# Mac/Linux
lsof -ti:3001 | xargs kill -9
```

### Issue: "Users table not created"

**Solution:**
- Check database connection
- Look for errors in server console
- Verify DATABASE_URL is correct

### Issue: "Login fails but credentials are correct"

**Solution:**
1. Check server console for errors
2. Verify users were created (check database)
3. Check browser console for API errors
4. Verify CORS settings

## 📊 Database Verification

You can verify users were created by connecting to your database:

```bash
# Using psql
psql "postgresql://robridgedb_user:8NcVhAHtrzMemZsRjcOVxztpxoxySsi5@dpg-d4kn2nk9c44c73f2hhdg-a.oregon-postgres.render.com/robridgedb"

# Then run:
SELECT id, email, role, created_at FROM users;
```

Expected output:
```
 id |         email          |    role     |      created_at
----+------------------------+-------------+---------------------
  1 | admin@robridge.com     | admin       | 2024-01-15 10:00:00
  2 | user@expo.com          | expo_user   | 2024-01-15 10:00:00
  3 | user@robridge.com      | full_access | 2024-01-15 10:00:00
```

## 🎯 Quick Test Script

Create a test file `test-auth.js`:

```javascript
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testAuth() {
  console.log('🧪 Testing Authentication System...\n');

  // Test 1: Health Check
  console.log('1. Testing health endpoint...');
  const health = await fetch(`${BASE_URL}/api/health`);
  console.log('   ✅ Health check:', await health.json());

  // Test 2: Login
  console.log('\n2. Testing login...');
  const login = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@robridge.com',
      password: 'admin123'
    })
  });
  const loginData = await login.json();
  console.log('   ✅ Login result:', loginData.success ? 'SUCCESS' : 'FAILED');
  
  if (loginData.token) {
    // Test 3: Verify Token
    console.log('\n3. Testing token verification...');
    const verify = await fetch(`${BASE_URL}/api/auth/verify`, {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
    });
    const verifyData = await verify.json();
    console.log('   ✅ Token verification:', verifyData.success ? 'SUCCESS' : 'FAILED');
  }

  // Test 4: Invalid Login
  console.log('\n4. Testing invalid login...');
  const invalid = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'wrong@email.com',
      password: 'wrong'
    })
  });
  const invalidData = await invalid.json();
  console.log('   ✅ Invalid login rejected:', !invalidData.success ? 'SUCCESS' : 'FAILED');

  console.log('\n✅ All tests completed!');
}

testAuth().catch(console.error);
```

Run it:
```bash
node test-auth.js
```

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ Server starts without errors
2. ✅ Users table is created
3. ✅ Default users are created
4. ✅ Login page loads in browser
5. ✅ Login with default credentials works
6. ✅ Token is stored in localStorage
7. ✅ User is redirected to dashboard
8. ✅ Session persists after refresh
9. ✅ Invalid credentials are rejected

## 🎉 Next Steps

Once local testing is successful:

1. **Test all user roles** (admin, expo_user, full_access)
2. **Test password change** functionality
3. **Test registration** of new users
4. **Test session expiration**
5. **Deploy to production**

---

**Happy Testing!** 🚀

