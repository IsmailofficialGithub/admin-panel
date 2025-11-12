# Invitation System Documentation

## Overview

This document explains the invitation system that allows:
- **Resellers** to create, invite, and manage other resellers
- **Admins** to invite users, resellers, and consumers
- Invited users to sign up using a secure token-based invitation link

---

## Features

### 1. Reseller Invites Resellers
- Resellers can invite other resellers via email
- Invited resellers are linked to the inviting reseller via `referred_by`
- Resellers can view, update, and delete their own resellers

### 2. Admin Invites Users/Resellers/Consumers
- Admins can invite users, resellers, or consumers
- Each invitation includes role-specific metadata (e.g., trial_expiry for consumers, subscribed_products)

### 3. Secure Token-Based Signup
- Each invitation generates a unique, secure token
- Tokens expire after 7 days
- Users sign up via a dedicated signup page using the token

---

## Database Schema

### `invitations` Table

```sql
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'reseller', 'consumer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  referred_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trial_expiry_date TIMESTAMP WITH TIME ZONE,
  subscribed_products UUID[] DEFAULT '{}'
);
```

---

## Backend API Endpoints

### Invitation Endpoints

#### `POST /api/invitations/invite` (Admin Only)
Invite a user, reseller, or consumer.

**Request Body:**
```json
{
  "email": "user@example.com",
  "role": "reseller", // "user", "reseller", or "consumer"
  "trial_expiry_date": "2025-12-31", // Optional, for consumers
  "subscribed_products": ["uuid1", "uuid2"] // Optional, for consumers
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "invitation": {
    "id": "uuid",
    "email": "user@example.com",
    "role": "reseller",
    "expires_at": "2025-01-15T00:00:00Z"
  }
}
```

#### `POST /api/invitations/invite-reseller` (Reseller Only)
Reseller invites another reseller.

**Request Body:**
```json
{
  "email": "reseller@example.com"
}
```

#### `GET /api/invitations/validate/:token` (Public)
Validate an invitation token.

**Response:**
```json
{
  "success": true,
  "invitation": {
    "email": "user@example.com",
    "role": "reseller",
    "expires_at": "2025-01-15T00:00:00Z"
  }
}
```

#### `POST /api/invitations/signup` (Public)
Sign up using an invitation token.

**Request Body:**
```json
{
  "token": "invitation_token",
  "password": "SecurePassword123!",
  "full_name": "John Doe",
  "phone": "+1234567890",
  "country": "USA",
  "city": "New York"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "reseller"
  }
}
```

### Reseller Management Endpoints (Reseller's Own Resellers)

#### `GET /api/resellers/my-resellers` (Reseller Only)
Get all resellers created by the logged-in reseller.

#### `GET /api/resellers/my-resellers/:id` (Reseller Only)
Get a specific reseller by ID (only if created by the current reseller).

#### `PUT /api/resellers/my-resellers/:id` (Reseller Only)
Update a reseller (only if created by the current reseller).

**Request Body:**
```json
{
  "full_name": "Updated Name",
  "phone": "+1234567890",
  "country": "USA",
  "city": "New York"
}
```

#### `DELETE /api/resellers/my-resellers/:id` (Reseller Only)
Delete a reseller (only if created by the current reseller).

---

## Frontend Implementation

### 1. Signup Page (`/signup`)

Create a signup page at `front-end/src/views/Signup.js` that:
- Accepts a `token` query parameter from the URL
- Validates the token on load
- Shows a form with fields: password, full_name, phone, country, city
- Submits to `/api/invitations/signup`
- Redirects to login after successful signup

**Example URL:**
```
http://localhost:3000/signup?token=abc123...
```

### 2. Update Resellers Views

Add "Invite Reseller" buttons to:
- `front-end/src/views/Resellers.js` (Admin view)
- `front-end/src/views/Reseller's-Reseller.js` (Reseller view)

**Implementation Steps:**
1. Add invite modal/button
2. Call `POST /api/invitations/invite-reseller` (for resellers)
3. Call `POST /api/invitations/invite` with role="reseller" (for admins)
4. Show success/error messages

### 3. Update Users/Consumers Views

Add invite functionality to:
- `front-end/src/views/Users.js` (Admin can invite users)
- `front-end/src/views/Consumers.js` (Admin can invite consumers)

---

## Email Templates

Invitation emails are sent using the `InviteEmailTemplate` from `backend/utils/emailTemplates.js`.

The email includes:
- Inviter's name
- Role being invited for
- Invitation link with token
- Expiration notice (7 days)

---

## Security Features

1. **Secure Token Generation**: Uses `crypto.randomBytes(32)` for secure token generation
2. **Token Expiration**: Tokens expire after 7 days
3. **One-Time Use**: Tokens are marked as used after signup
4. **Email Validation**: Prevents duplicate invitations for the same email
5. **User Existence Check**: Prevents inviting users who already exist
6. **Role-Based Access**: Resellers can only manage their own resellers

---

## Workflow

### Reseller Invites Reseller

1. Reseller clicks "Invite Reseller" button
2. Enters email address
3. Backend creates invitation record with token
4. Email sent with invitation link
5. Invited user clicks link → redirected to `/signup?token=...`
6. User fills signup form
7. Account created with `referred_by` set to inviting reseller
8. Invitation marked as used

### Admin Invites User/Reseller/Consumer

1. Admin clicks "Invite [Role]" button
2. Enters email and role-specific data (if applicable)
3. Backend creates invitation record
4. Email sent with invitation link
5. Same signup flow as above

---

## Migration

Run the database migration to create the `invitations` table:

```bash
# The migration file is at:
backend/migrations/008_create_invitations_table.sql
```

Apply it to your Supabase database.

---

## Testing

### Test Invitation Flow

1. **Create Invitation:**
   ```bash
   curl -X POST http://localhost:5000/api/invitations/invite \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{"email": "test@example.com", "role": "reseller"}'
   ```

2. **Validate Token:**
   ```bash
   curl http://localhost:5000/api/invitations/validate/TOKEN_FROM_EMAIL
   ```

3. **Signup:**
   ```bash
   curl -X POST http://localhost:5000/api/invitations/signup \
     -H "Content-Type: application/json" \
     -d '{
       "token": "TOKEN_FROM_EMAIL",
       "password": "SecurePass123!",
       "full_name": "Test User",
       "phone": "+1234567890",
       "country": "USA",
       "city": "New York"
     }'
   ```

---

## Frontend Components Needed

### 1. Signup Page (`front-end/src/views/Signup.js`)
- Form with password, full_name, phone, country, city
- Token validation on mount
- Submit to `/api/invitations/signup`

### 2. Invite Modal Component
- Reusable modal for inviting users
- Fields: email, role (for admin), optional fields for consumers
- Success/error handling

### 3. Update Existing Views
- Add invite buttons to Resellers, Users, Consumers views
- Add "My Resellers" section to Reseller's dashboard

---

## Notes

- Invitation tokens are single-use and expire after 7 days
- Resellers can only manage resellers they invited (via `referred_by`)
- Admins can manage all users, resellers, and consumers
- Email service must be configured in `.env` for invitations to work
- The signup page should be accessible without authentication

---

## Next Steps

1. ✅ Database migration created
2. ✅ Backend endpoints created
3. ✅ Email service added
4. ⏳ Create frontend signup page
5. ⏳ Add invite buttons to views
6. ⏳ Test the complete flow

---

## Support

For issues or questions, refer to:
- `backend/routes/controllers/invitations.controller.js` - Invitation logic
- `backend/routes/controllers/resellers.controller.js` - Reseller management
- `backend/services/emailService.js` - Email sending
- `backend/utils/emailTemplates.js` - Email templates

