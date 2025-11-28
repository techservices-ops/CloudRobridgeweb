#!/bin/bash
# Bash Script to Test Authentication Endpoints
# Run this after deploying to test the authentication system

echo "🧪 Testing Robridge Authentication Endpoints"
echo "=========================================="
echo ""

BASE_URL="https://robridgeexpress.onrender.com"

# Test 1: Health Check
echo "1. Testing Health Check..."
HEALTH=$(curl -s "$BASE_URL/api/health")
if [ $? -eq 0 ]; then
    echo "   ✅ Health Check: OK"
    echo "   Response: $HEALTH"
else
    echo "   ❌ Health Check Failed"
fi
echo ""

# Test 2: Login with Admin Credentials
echo "2. Testing Login (Admin)..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@robridge.com","password":"admin123"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo "   ✅ Login Successful!"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    echo "   Token: ${TOKEN:0:50}..."
    
    # Test 3: Verify Token
    echo ""
    echo "3. Testing Token Verification..."
    VERIFY_RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/verify" \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$VERIFY_RESPONSE" | grep -q '"success":true'; then
        echo "   ✅ Token Verification: OK"
    else
        echo "   ❌ Token Verification Failed"
    fi
else
    echo "   ❌ Login Failed"
    echo "   Response: $LOGIN_RESPONSE"
    if echo "$LOGIN_RESPONSE" | grep -q "404"; then
        echo "   ⚠️  Endpoint not found - Authentication endpoints may not be deployed yet"
    fi
fi
echo ""

# Test 4: Invalid Login
echo "4. Testing Invalid Login..."
INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"wrong@email.com","password":"wrong"}')

HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
    echo "   ✅ Invalid credentials correctly rejected (401)"
else
    echo "   ⚠️  Unexpected status: $HTTP_CODE"
fi
echo ""

# Test 5: Test Expo User Login
echo "5. Testing Expo User Login..."
EXPO_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"user@expo.com","password":"expo123"}')

if echo "$EXPO_RESPONSE" | grep -q '"success":true'; then
    echo "   ✅ Expo User Login: OK"
else
    echo "   ❌ Expo User Login Failed"
    echo "   Response: $EXPO_RESPONSE"
fi
echo ""

echo "=========================================="
echo "✅ Testing Complete!"
echo ""
echo "If you see 404 errors, the authentication endpoints need to be deployed first."

