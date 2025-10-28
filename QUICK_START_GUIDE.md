# 🚀 Quick Start Guide - Testing User Creation

## Prerequisites Checklist

- ✅ Backend running on port 5000
- ✅ Frontend running on port 3000
- ✅ Logged in as admin user
- ✅ Browser console open (F12)

## Step 1: Apply Database Migration (If Needed)

Run this SQL in your Supabase SQL Editor:

```sql
-- Add phone column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;
```

Or run the migration file:
```bash
# In Supabase Dashboard -> SQL Editor
# Copy and paste: backend/migrations/001_add_phone_to_profiles.sql
```

## Step 2: Verify Environment Variables

### Backend `.env`
```env
PORT=5000
CLIENT_URL=http://localhost:3000
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
```

### Frontend `.env`
```env
REACT_APP_Server_Url=http://localhost:5000/api
```

## Step 3: Restart Servers (If You Changed .env)

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd front-end
npm start
```

## Step 4: Test User Creation

### Option A: Use the UI

1. Open http://localhost:3000
2. Login as admin
3. Navigate to Users page
4. Click "Create New User" button (➕ icon)
5. Fill in the form:
   - **Full Name:** John Doe
   - **Email:** john@example.com
   - **Password:** Test123456
   - **Role:** User
   - **Phone:** +1234567890 (optional)
6. Click "Create User"

### Option B: Use Browser Console

Open browser console (F12) and run:

```javascript
// Test API directly
fetch('http://localhost:5000/api/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE' // Get from Application -> Local Storage
  },
  body: JSON.stringify({
    email: 'test@example.com',
    password: 'Test123456',
    full_name: 'Test User',
    role: 'user',
    phone: '+1234567890'
  })
})
.then(r => r.json())
.then(d => console.log('✅ Success:', d))
.catch(e => console.error('❌ Error:', e));
```

### Option C: Use cURL

```bash
# Replace YOUR_TOKEN with your actual admin token
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "full_name": "Test User",
    "role": "user",
    "phone": "+1234567890"
  }'
```

## Step 5: Expected Results

### ✅ Success Indicators

**Browser Console:**
```
🔄 API Request: POST /users
🔐 Auth token added to request
✅ API Response: /users {
  success: true,
  user: {
    id: "uuid...",
    email: "test@example.com",
    full_name: "Test User",
    role: "user"
  }
}
```

**Backend Console:**
```
POST /api/users 201 - - ms
📧 Sending custom welcome email to: test@example.com
✅ Welcome email sent successfully: <message-id>
```

**UI:**
```
✅ "User created successfully!" message appears
✅ Modal closes after 1.5 seconds
✅ New user appears in the users table
```

**Email:**
```
📧 User receives welcome email with credentials
```

**Database:**
```sql
-- Check in Supabase
SELECT * FROM profiles WHERE email = 'test@example.com';
-- Should show: full_name, email, role, phone
```

### ❌ Common Errors & Solutions

#### Error: "⚠️ No auth token found"
**Cause:** Not logged in or session expired  
**Solution:** Logout and login again

#### Error: "FullName, Email, password are required"
**Cause:** Missing required fields  
**Solution:** Provide all three fields in request

#### Error: "Admin access required"
**Cause:** Your user doesn't have admin role  
**Solution:** 
```sql
-- Run in Supabase SQL Editor
UPDATE profiles 
SET role = 'admin' 
WHERE email = 'your_email@example.com';
```

#### Error: "Network error"
**Cause:** Backend not running  
**Solution:** 
```bash
cd backend && npm start
```

#### Error: "User created but profile insert failed"
**Cause:** Database column missing  
**Solution:** Run the migration SQL from Step 1

#### Error: "Email server not ready"
**Cause:** Email credentials not configured  
**Solution:** Add EMAIL_USER and EMAIL_PASSWORD to backend .env

## Step 6: Verify Everything

### 1. Check Browser Console
- Should see API request/response logs
- No errors in red

### 2. Check Backend Console
- Should see email sending log
- No errors

### 3. Check Database
```sql
SELECT user_id, full_name, email, role, phone 
FROM profiles 
ORDER BY created_at DESC 
LIMIT 1;
```

### 4. Check Email Inbox
- User should receive welcome email
- Email should contain credentials

### 5. Test Login
- Try logging in with the new user credentials
- Should work successfully

## 🎯 Testing Checklist

- [ ] Database migration applied (phone column exists)
- [ ] Backend .env configured
- [ ] Frontend .env configured
- [ ] Both servers running
- [ ] Logged in as admin
- [ ] Browser console open
- [ ] Created test user successfully
- [ ] Saw success logs in browser console
- [ ] Saw success logs in backend console
- [ ] User appears in database
- [ ] User receives email
- [ ] Can login with new credentials

## 🐛 Debug Mode

If something isn't working, enable debug mode:

### Backend Debug Logs
The logs are already enhanced. Watch for:
- `📧 Sending custom welcome email to:`
- `✅ Welcome email sent successfully:`
- Any `❌` error messages

### Frontend Debug Logs
Already enhanced with:
- `🔄 API Request: POST /users`
- `🔐 Auth token added to request`
- `✅ API Response:` or `❌ API Error Details:`

### Network Tab
- Open DevTools (F12) → Network tab
- Filter by: Fetch/XHR
- Look for POST request to `/users`
- Check:
  - Request Headers (Authorization present?)
  - Request Payload (all fields included?)
  - Response Status (201 = success)
  - Response Body (check error message if failed)

## 📞 Still Having Issues?

Share these details:

1. **Browser Console Logs** (full output)
2. **Backend Console Logs** (full output)
3. **Network Tab Screenshot** (request/response)
4. **Environment Check:**
   ```bash
   # Run these commands and share output
   netstat -ano | findstr :5000  # Backend running?
   netstat -ano | findstr :3000  # Frontend running?
   ```
5. **Database Check:**
   ```sql
   -- Run in Supabase and share result
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'profiles';
   ```

With enhanced logging, you'll see exactly where the issue is! 🔍

