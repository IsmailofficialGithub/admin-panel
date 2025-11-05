# 📧 Email Configuration Guide

## Overview

The backend sends **custom emails only** using Nodemailer. Supabase's default confirmation emails are **disabled** to prevent duplicate emails to users.

---

## ✅ Email Setup

### **1. Environment Variables (.env)**

Add these to your `backend/.env` file:

```env
# Email Service Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Optional: Custom sender name (default: "Duha Nashrah")
EMAIL_SENDER_NAME=Duha Nashrah
```

---

## 📧 Custom Email Features

### **1. Welcome Email (User Creation)**

**Triggered:** When admin creates a new user  
**Sender:** `"Duha Nashrah" <your-email@gmail.com>`  
**Subject:** `New User Created: {full_name}`  
**Template:** Beautiful HTML template with credentials

**Code Location:**
```javascript
// backend/services/emailService.js
export const sendWelcomeEmail = async ({ email, full_name, password }) => {
  const mailOptions = {
    from: `"Duha Nashrah" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `New User Created: ${full_name}`,
    html: htmlContent,
  };
  // ...
};
```

### **2. Password Reset Email**

**Triggered:** When admin resets user password  
**Sender:** `"Duha Nashrah" <your-email@gmail.com>`  
**Subject:** `Password Reset: {full_name}`  
**Template:** HTML template with new password

---

## 🚫 Disabling Supabase Default Emails

### **Important: Prevent Duplicate Emails**

By default, Supabase sends confirmation emails when you create users. To send **ONLY your custom emails**, you need to:

### **Option 1: Disable in Supabase Dashboard (Recommended)**

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** → **Email Templates**
4. Click on **"Confirm signup"** template
5. **Disable** or modify the template to not send
6. Save changes

### **Option 2: Disable Auto Emails in Settings**

1. Go to **Authentication** → **Settings**
2. Under **Email Settings**, find:
   - "Enable email confirmations" → **Disable** this
   - Or check "Skip email confirmation for admin-created users"

### **Option 3: Use Custom SMTP (Advanced)**

Configure Supabase to use your own SMTP server and disable default emails:

1. **Authentication** → **Settings** → **SMTP Settings**
2. Check "Enable Custom SMTP"
3. Leave settings blank or use dummy values
4. This prevents Supabase from sending any emails

---

## 🔧 How It Works

### **User Creation Flow:**

```
1. Admin creates user
   ↓
2. Backend creates user in Supabase Auth
   - email_confirm: true (user can login immediately)
   - No Supabase email sent ✅
   ↓
3. Backend inserts profile in database
   ↓
4. Backend sends ONLY custom email via Nodemailer
   - Beautiful HTML template
   - Includes credentials
   - From: "Duha Nashrah"
   ↓
5. User receives ONE email with all info ✅
```

### **Code Implementation:**

```javascript
// backend/routes/users.routes.js
const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
  email,
  password,
  email_confirm: true, // ✅ Auto-confirm (no email from Supabase)
  user_metadata: { full_name, role }
});

// ✅ Send ONLY our custom email
await sendWelcomeEmail({
  email,
  full_name,
  password
});
```

---

## 📧 Gmail Setup (For Testing)

### **Step 1: Enable 2-Factor Authentication**
1. Go to https://myaccount.google.com/security
2. Enable **2-Step Verification**

### **Step 2: Create App Password**
1. Go to https://myaccount.google.com/apppasswords
2. Select **App:** Mail
3. Select **Device:** Other (Custom name)
4. Enter: "Admin Panel Backend"
5. Click **Generate**
6. Copy the 16-character password

### **Step 3: Update .env**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # App password from step 2
```

---

## 🎨 Customizing Email Templates

### **Location:**
```
backend/utils/emailTemplates.js
```

### **Welcome Email Template:**
```javascript
export const AdminEmailTemplateUserCreated = ({ full_name, email, password, website_url }) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          /* Your custom styles */
        </style>
      </head>
      <body>
        <h1>Welcome ${full_name}!</h1>
        <p>Your account has been created.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> ${password}</p>
        <a href="${website_url}">Login Now</a>
      </body>
    </html>
  `;
};
```

### **Customize Sender Name:**

Edit `backend/services/emailService.js`:

```javascript
const mailOptions = {
  from: `"Your Custom Name" <${process.env.EMAIL_USER}>`,
  to: email,
  subject: `Your Custom Subject`,
  html: htmlContent,
};
```

---

## ✅ Testing Email Configuration

### **1. Test Email Service:**
```bash
cd backend
npm run dev
```

**Expected Output:**
```
✅ Email service is ready to send emails
```

### **2. Test Sending Email:**

Create a test user via API:

```bash
# Using curl
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "full_name": "Test User",
    "role": "user"
  }'
```

**Check:**
1. Backend console shows: `✅ Custom welcome email sent to: test@example.com`
2. User receives email from "Duha Nashrah"
3. Email subject: "New User Created: Test User"
4. **NO** email from Supabase ✅

---

## 🚨 Troubleshooting

### **Error: "Email service not ready"**

**Problem:** Email credentials not configured  
**Solution:**
```bash
# Check .env file
cat backend/.env | grep EMAIL

# Should show:
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### **Error: "Invalid login credentials"**

**Problem:** Wrong Gmail password or 2FA not enabled  
**Solution:**
1. Enable 2-Step Verification
2. Generate new App Password
3. Update EMAIL_PASSWORD in .env
4. Restart backend server

### **User receives 2 emails (Supabase + Custom)**

**Problem:** Supabase auto-emails not disabled  
**Solution:**
1. Go to Supabase Dashboard
2. Authentication → Email Templates
3. Disable "Confirm signup" template
4. Or disable "Enable email confirmations" in settings

### **Email sent but not received**

**Problem:** Email might be in spam or wrong email  
**Solution:**
1. Check spam/junk folder
2. Check backend console for: `✅ Welcome email sent successfully: <messageId>`
3. Verify EMAIL_USER is correct
4. Check email provider settings

---

## 📊 Email Flow Comparison

### **❌ OLD (Supabase Default Emails):**
```
1. Create user
2. Supabase sends confirmation email
3. User receives generic Supabase email
4. User clicks link to confirm
5. User can login

Problems:
- Generic template
- No credentials included
- Extra step for user
- Can't customize content
```

### **✅ NEW (Custom Emails Only):**
```
1. Create user with email_confirm: true
2. User account immediately active
3. Backend sends custom email
4. User receives beautiful branded email with credentials
5. User can login immediately

Benefits:
✅ Custom branding
✅ Includes credentials
✅ Professional template
✅ No extra confirmation step
✅ Better user experience
```

---

## 🎯 Summary

### **Configuration:**
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### **Features:**
✅ Custom sender: "Duha Nashrah"  
✅ Welcome email with credentials  
✅ Password reset email  
✅ Beautiful HTML templates  
✅ No Supabase duplicate emails  
✅ Immediate user access  

### **Important:**
⚠️ **Disable Supabase auto-emails** in dashboard to prevent duplicates!  
⚠️ Use **App Passwords** for Gmail (not regular password)  
⚠️ Enable **2-Factor Authentication** for Gmail  

---

**Your custom email service is ready! 📧🚀**


