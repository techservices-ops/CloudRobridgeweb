# 🔐 Proper Authentication System Setup

## Overview

The Robridge application now uses a **proper password-based authentication system** with:
- Secure password hashing (bcrypt)
- JWT token-based sessions
- PostgreSQL database storage
- Backend API authentication endpoints

## ✅ What Changed

### 1. **Backend Authentication**
- Added `bcrypt` and `jsonwebtoken` packages
- Created `users` table in PostgreSQL
- Added authentication endpoints:
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User login
  - `GET /api/auth/verify` - Token verification
  - `POST /api/auth/change-password` - Password change

### 2. **Frontend Updates**
- Updated `AuthContext.js` to call backend API
- Updated `LoginPage.js` for proper authentication flow
- JWT token stored in localStorage
- Automatic token verification on app load

### 3. **Default Users Created**
When the server starts for the first time, these default users are automatically created:

| Email | Password | Role | Access Level |
|-------|----------|------|--------------|
| `admin@robridge.com` | `admin123` | admin | Full system access + admin controls |
| `user@expo.com` | `expo123` | expo_user | Limited access (Dashboard, Scanner, Device) |
| `user@robridge.com` | `full123` | full_access | Full system access |

## 🚀 Installation

### 1. Install New Dependencies

```bash
cd "Robridge web"
npm install
```

This will install:
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT token generation

### 2. Set JWT Secret (Optional but Recommended)

Add to your environment variables:
```bash
JWT_SECRET=your-super-secret-key-change-this-in-production
```

Or in Render.com dashboard:
- Go to your Express service
- Environment → Add `JWT_SECRET`

### 3. Start the Server

The users table will be automatically created on first startup, along with default users.

```bash
npm run dev
```

## 📝 How to Use

### Login
1. Navigate to the login page
2. Enter email and password
3. Click "Sign In"
4. You'll be redirected to the dashboard on success

### Quick Login Buttons
The login page now has quick login buttons for:
- **Expo User**: `user@expo.com` / `expo123`
- **Admin**: `admin@robridge.com` / `admin123`
- **Full Access**: `user@robridge.com` / `full123`

### Register New Users

You can register new users via API:

```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "role": "expo_user"  // or "admin" or "full_access"
}
```

## 🔒 Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt (10 rounds)
2. **JWT Tokens**: Secure token-based sessions (7-day expiration)
3. **Token Verification**: Automatic token verification on app load
4. **Protected Routes**: Backend endpoints can use `authenticateToken` middleware

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'expo_user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 API Endpoints

### POST /api/auth/login
Login with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "User Name",
    "role": "expo_user"
  }
}
```

### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "newuser@example.com",
  "password": "password123",
  "name": "New User",
  "role": "expo_user"
}
```

### GET /api/auth/verify
Verify JWT token (requires Authorization header).

**Headers:**
```
Authorization: Bearer <token>
```

### POST /api/auth/change-password
Change user password (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

## 🛡️ Using Authentication in Backend Routes

To protect a route, use the `authenticateToken` middleware:

```javascript
app.get('/api/protected-route', authenticateToken, async (req, res) => {
  // req.user contains: { id, email, role }
  res.json({ message: 'This is protected', user: req.user });
});
```

## 🐛 Troubleshooting

### Login Not Working
1. Check that the server is running
2. Verify database connection
3. Check browser console for errors
4. Ensure JWT_SECRET is set (optional)

### Token Expired
- Tokens expire after 7 days
- User will need to login again
- Token is automatically cleared on expiration

### Default Users Not Created
- Check database connection
- Verify users table was created
- Check server logs for errors

## 📋 Next Steps

1. **Change Default Passwords**: Change default user passwords after first login
2. **Add User Management**: Create admin panel for user management
3. **Password Reset**: Implement password reset functionality
4. **Email Verification**: Add email verification for new registrations
5. **Two-Factor Authentication**: Add 2FA for enhanced security

## 🔐 Security Best Practices

1. **Change JWT_SECRET**: Use a strong, random secret in production
2. **Use HTTPS**: Always use HTTPS in production
3. **Password Policy**: Enforce strong password requirements
4. **Rate Limiting**: Add rate limiting to login endpoints
5. **Session Management**: Implement proper session management

---

**Note**: The old email-domain-based authentication has been completely replaced with proper password authentication. Users must now use valid credentials to login.

