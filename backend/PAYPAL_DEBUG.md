# PayPal Authentication Debugging Guide

## Error: "Client Authentication failed"

This error means PayPal cannot authenticate with the provided credentials. Here's how to fix it:

### 1. Check Your .env File

Make sure your `backend/.env` file has the correct PayPal credentials:

```env
PAYPAL_CLIENT_ID=your_actual_client_id_here
PAYPAL_CLIENT_SECRET=your_actual_secret_here
PAYPAL_MODE=sandbox
```

### 2. Verify Credentials Are Loaded

**Important:** After adding/updating environment variables, you MUST restart your backend server:

```bash
# Stop the server (Ctrl+C)
# Then restart it
npm run dev
# or
npm start
```

### 3. Get PayPal Sandbox Credentials

1. Go to [PayPal Developer Dashboard](https://developer.paypal.com/)
2. Log in with your PayPal account
3. Navigate to **Dashboard** → **My Apps & Credentials**
4. Click on **Sandbox** tab (for testing) or **Live** tab (for production)
5. Find your app or create a new one
6. Copy the **Client ID** and **Secret**

### 4. Common Issues

#### Issue: Credentials are empty strings
**Solution:** Make sure there are no spaces around the `=` sign in your .env file:
```env
# ❌ Wrong
PAYPAL_CLIENT_ID = your_id_here
PAYPAL_CLIENT_ID= your_id_here
PAYPAL_CLIENT_ID =your_id_here

# ✅ Correct
PAYPAL_CLIENT_ID=your_id_here
```

#### Issue: Using placeholder values
**Solution:** Replace `your_paypal_client_id_here` with your actual Client ID from PayPal dashboard

#### Issue: Wrong mode
**Solution:** Make sure `PAYPAL_MODE` matches your credentials:
- If using **Sandbox** credentials → `PAYPAL_MODE=sandbox`
- If using **Live** credentials → `PAYPAL_MODE=live`

#### Issue: Server not restarted
**Solution:** Environment variables are loaded when the server starts. After changing .env, restart the server.

### 5. Test Your Credentials

You can test if your credentials work by making a direct API call:

```bash
# Replace YOUR_CLIENT_ID and YOUR_SECRET with your actual credentials
curl -X POST https://api-m.sandbox.paypal.com/v1/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -u "YOUR_CLIENT_ID:YOUR_SECRET" \
  -d "grant_type=client_credentials"
```

If this returns an access token, your credentials are correct.

### 6. Check Server Logs

The server now logs more detailed information about PayPal authentication:
- Check the console output when making a PayPal request
- Look for `[PayPal]` prefixed messages
- Verify the mode (sandbox/live) matches your credentials

