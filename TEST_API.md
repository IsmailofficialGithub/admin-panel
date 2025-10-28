# API Testing Guide for Create User Issue

## Quick Test

### 1. Open Browser Console
Press `F12` in your browser and go to the Console tab.

### 2. Paste this test code:

```javascript
// Test 1: Check if API client is loaded
console.log('Testing API Client...');

// Test 2: Check API URL
console.log('API Base URL:', process.env.REACT_APP_Server_Url || 'http://localhost:5000/api');

// Test 3: Try to create a user (replace with your actual test data)
fetch('http://localhost:5000/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE' // Get this from Application -> Local Storage -> Supabase token
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'Test123456',
    full_name: 'Test User',
    role: 'user'
  })
})
.then(response => response.json())
.then(data => console.log('✅ Response:', data))
.catch(error => console.error('❌ Error:', error));
```

## What to Look For

### Success Indicators:
- ✅ API Response logs appear
- ✅ Status: 201 Created
- ✅ User created successfully message

### Common Errors:

#### 1. Network Error / CORS
**Error:** `Access-Control-Allow-Origin` or network timeout
**Solution:**
- Ensure backend is running: http://localhost:5000/health
- Check backend `.env` has: `CLIENT_URL=http://localhost:3000`
- Restart backend server after .env changes

#### 2. Authentication Error
**Error:** `401 Unauthorized` or `No token`
**Solution:**
- You must be logged in as an admin
- Check browser console for "⚠️ No auth token found"
- Try logging out and logging back in

#### 3. Missing Environment Variable
**Error:** API calls go to wrong URL
**Solution:**
- Create `front-end/.env` file with:
  ```
  REACT_APP_Server_Url=http://localhost:5000/api
  ```
- Restart frontend: `npm start`

#### 4. Backend Database Error
**Error:** `Configuration Error` or Supabase errors
**Solution:**
- Check backend `.env` has valid Supabase credentials
- Verify Supabase service role key has admin permissions

## Enhanced Debugging

I've added comprehensive logging to your `apiClient.js`. When you click "Create User", you should see:

```
🔄 API Request: POST /users
🔐 Auth token added to request
✅ API Response: /users {success: true, ...}
```

Or if there's an error:
```
❌ API Error Details: {url: '/users', status: 400, message: '...'}
```

## Manual Steps to Test

1. **Restart Frontend** (required after env changes):
   ```bash
   cd front-end
   npm start
   ```

2. **Verify Backend is Running**:
   Open http://localhost:5000/health - should show "healthy"

3. **Login as Admin**:
   - Go to your login page
   - Login with admin credentials
   - You must have admin role to create users

4. **Open Browser Console** (F12)

5. **Click "Create New User" button**

6. **Fill the form** and click "Create User"

7. **Watch the console logs** - you'll see exactly where it fails

## Next Steps

After following these steps, you should see detailed logs in the console. Share those logs if you still have issues:
- The 🔄 request logs
- The 🔐 auth token status
- Any ❌ error messages with full details

