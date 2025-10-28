# Next.js to Express Migration Guide - User Creation API

## ✅ Migration Complete

I've successfully migrated your Next.js user creation API to your Node.js/Express backend with **100% feature parity**.

## 📋 What Was Migrated

### 1. **User Creation Route** (`backend/routes/users.routes.js`)

**Next.js Features → Express Implementation:**

- ✅ **Phone number support** - Now accepts optional `phone` field
- ✅ **Exact validation** - `full_name`, `email`, `password` required
- ✅ **Conditional phone inclusion** - Only adds phone if provided (matching Next.js logic)
- ✅ **Profile upsert** - Uses array format `[{}]` like Next.js
- ✅ **Response format** - Matches Next.js response structure exactly
- ✅ **Error messages** - Same error text as Next.js

### 2. **Email Service** (`backend/services/emailService.js`)

**Next.js Features → Express Implementation:**

- ✅ **Transporter verification** - Verifies email server before sending
- ✅ **Error handling** - Same error: "Email server not ready"
- ✅ **Email template** - Using `AdminEmailTemplateUserCreated`
- ✅ **Sender name** - "Duha Nashrah.AI"
- ✅ **Subject line** - "New User Created: {name}"

### 3. **Email Template** (`backend/utils/emailTemplates.js`)

- ✅ Already using the same template as Next.js
- ✅ Same styling and layout
- ✅ Same variables: `full_name`, `email`, `password`, `website_url`

## 🔄 API Comparison

### Next.js API
```javascript
POST /api/users
```

### Express API
```javascript
POST http://localhost:5000/api/users
```

Both APIs now have **identical functionality**:
- Same request body structure
- Same validation rules
- Same response format
- Same error messages
- Same email functionality

## 📝 Request/Response Format

### Request Body
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "full_name": "John Doe",
  "role": "user",
  "phone": "+1234567890" // Optional
}
```

### Success Response (201)
```json
{
  "success": true,
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "user"
  }
}
```

### Error Responses

**400 - Validation Error**
```json
{
  "error": "Bad Request",
  "message": "FullName, Email, password are required"
}
```

**401 - Not Authenticated**
```json
{
  "error": "Unauthorized",
  "message": "No token provided"
}
```

**403 - Not Admin**
```json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
```

**500 - Profile Insert Failed**
```json
{
  "error": "Internal Server Error",
  "message": "User created but profile insert failed"
}
```

## 🔧 Environment Variables

### Backend `.env` Required Variables

```env
# Server Configuration
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Optional: Custom Email From Name (defaults to EMAIL_USER if not set)
# EMAIL_FROM_NAME=Duha Nashrah.AI
```

### Frontend `.env` Required Variables

```env
# Backend API URL
REACT_APP_Server_Url=http://localhost:5000/api

# Supabase Configuration (if using direct Supabase calls)
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🗄️ Database Schema

Ensure your Supabase `profiles` table has these columns:

```sql
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'user',
  phone TEXT,  -- 🆕 Added for phone number support
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration SQL (if phone column doesn't exist)

```sql
-- Add phone column if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;
```

## 🚀 Testing the Migration

### 1. **Start Backend Server**
```bash
cd backend
npm start
```

### 2. **Test API with cURL**
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456",
    "full_name": "Test User",
    "role": "user",
    "phone": "+1234567890"
  }'
```

### 3. **Test from Frontend**
```javascript
// Using your existing API client
import apiClient from './services/apiClient';

const userData = {
  email: 'test@example.com',
  password: 'Test123456',
  full_name: 'Test User',
  role: 'user',
  phone: '+1234567890' // Optional
};

const response = await apiClient.users.create(userData);
console.log(response);
```

### 4. **Expected Console Output**

**Backend Console:**
```
🔄 POST /api/users
📧 Sending custom welcome email to: test@example.com
✅ Welcome email sent successfully: <message-id>
```

**Frontend Console:**
```
🔄 API Request: POST /users
🔐 Auth token added to request
✅ API Response: /users {success: true, user: {...}}
```

## 📊 Migration Checklist

- ✅ User creation with phone support
- ✅ Input validation (full_name, email, password required)
- ✅ Conditional phone field
- ✅ Profile upsert with array format
- ✅ Email transporter verification
- ✅ Custom email template
- ✅ Matching response format
- ✅ Matching error messages
- ✅ Admin authentication check
- ✅ Supabase admin client usage

## 🔍 Key Differences from Next.js

### Similarities (100% Match)
- ✅ Same request/response format
- ✅ Same validation logic
- ✅ Same email template
- ✅ Same database operations
- ✅ Same error handling

### Minor Framework Differences (Expected)
- **Next.js:** Uses `NextResponse.json()`
- **Express:** Uses `res.status().json()`
- **Next.js:** Uses `await request.json()`
- **Express:** Uses `req.body` (parsed by middleware)
- **Next.js:** Uses `createServerSupabaseClient()`
- **Express:** Uses authentication middleware

These are framework-specific and don't affect functionality.

## 🐛 Troubleshooting

### "FullName, Email, password are required"
**Cause:** Missing required fields in request body  
**Fix:** Ensure you're sending all three fields

### "Email server not ready"
**Cause:** Email credentials not configured or incorrect  
**Fix:** Check `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASSWORD` in backend `.env`

### "User created but profile insert failed"
**Cause:** Database error or missing columns  
**Fix:** Check if `phone` column exists in profiles table

### "Admin access required"
**Cause:** User doesn't have admin role  
**Fix:** Update user's role to 'admin' in profiles table

## 📱 Phone Number Support

### Frontend Update Required

Update your `CreateUserModal` to send phone number:

```javascript
const result = await onCreate({
  email: formData.email.trim(),
  password: formData.password,
  full_name: formData.full_name.trim(),
  role: formData.role.toLowerCase(),
  phone: formData.phone.trim() || null  // 🆕 Add this line
});
```

The modal already has the phone field, so it should work automatically!

## ✅ Verification

To verify everything works:

1. **Backend Running:** http://localhost:5000/health should return `healthy`
2. **Create User:** Click "Create New User" in frontend
3. **Check Logs:** Browser console shows successful API call
4. **Check Email:** User receives welcome email
5. **Check Database:** User and profile created in Supabase

## 🎉 Next Steps

1. ✅ Migration is complete - test the functionality
2. 🔍 Check browser console for any errors
3. 📧 Verify email is being sent
4. 📱 Test with and without phone number
5. 🗄️ Ensure database has phone column

If you encounter any issues, check the console logs - the enhanced logging will show exactly what's happening!

