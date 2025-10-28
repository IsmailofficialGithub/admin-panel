# Environment Setup Instructions

## Issue: Create New User Button API Cannot Call

The issue is that the frontend needs proper environment configuration to communicate with the backend API.

## Solution

### 1. Create Frontend Environment File

Create a file named `.env` in the `front-end` directory with the following content:

```
# Backend API URL
REACT_APP_Server_Url=http://localhost:5000/api

# Supabase Configuration (if using Supabase)
# REACT_APP_SUPABASE_URL=your_supabase_url
# REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Backend Environment Check

Make sure your backend `.env` file in the `backend` directory has:

```
# Server Configuration
PORT=5000
CLIENT_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_service_key

# Email Configuration (if using email features)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password
```

### 3. Restart Both Servers

After creating/updating the `.env` files:

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

### 4. Test the API Connection

Open your browser console (F12) and try to create a new user. You should now see detailed logs:
- 🔄 API Request logs
- 🔐 Auth token status
- ✅ Successful responses
- ❌ Any errors with full details

### 5. Common Issues

**Issue: "Network error. Please check if backend is running."**
- Solution: Make sure backend server is running on port 5000

**Issue: "Failed to create user"**
- Solution: Check if you're logged in with admin credentials
- Check backend console for detailed error messages

**Issue: CORS errors**
- Solution: Verify CLIENT_URL in backend .env matches your frontend URL

### 6. Verification

To verify everything is working:

1. Backend health check: http://localhost:5000/health
2. Check if you can see API logs in the browser console
3. Check if backend shows incoming requests in its console

## Enhanced Logging

I've added comprehensive logging to the API client that will show:
- All outgoing requests with method and URL
- Authentication token status
- Full error details with status codes
- Response data for successful calls

This will help identify exactly where the issue is occurring.

