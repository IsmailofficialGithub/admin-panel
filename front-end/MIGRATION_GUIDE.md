# Frontend Migration Guide

## 🔄 Migrating from Direct Supabase to Backend API

This guide shows how to update your components to use the new backend API instead of direct Supabase calls.

---

## ✅ Quick Migration

### Option 1: Use New Backend API (Recommended)

Simply change your imports from old API to new backend API:

**Before:**
```javascript
import { getAdminUsers } from '../api/users/getAdminUsers';
import { createUser } from '../api/users/createUser';
import { updateUserRole } from '../api/users/updateUser';
import { deleteUser } from '../api/deleteUser';
import { resetUserPassword } from '../api/resetPassword';
```

**After:**
```javascript
import { 
  getAdminUsers, 
  createUser, 
  updateUserRole, 
  deleteUser, 
  resetUserPassword 
} from '../api/backend';
```

**That's it!** The function signatures are the same, so no other changes needed.

---

## 📋 Function Mapping

### Users API

| Old Location | New Location | Function | Status |
|--------------|--------------|----------|--------|
| `api/users/getAdminUsers.js` | `api/backend/users.js` | `getAdminUsers()` | ✅ |
| `api/users/createUser.js` | `api/backend/users.js` | `createUser(userData)` | ✅ |
| `api/users/updateUser.js` | `api/backend/users.js` | `updateUserRole(id, role, name)` | ✅ |
| `api/deleteUser.js` | `api/backend/users.js` | `deleteUser(id)` | ✅ |
| `api/resetPassword.js` | `api/backend/users.js` | `resetUserPassword(id)` | ✅ |

### Consumers API

| Old Location | New Location | Function | Status |
|--------------|--------------|----------|--------|
| `api/consumer/getConsumer.js` | `api/backend/consumers.js` | `getConsumers()` | ✅ |
| `api/consumer/createComsumer.js` | `api/backend/consumers.js` | `createConsumer(data)` | ✅ |
| `api/consumer/updateConsumer.js` | `api/backend/consumers.js` | `updateConsumer(id, data)` | ✅ |
| - | `api/backend/consumers.js` | `deleteConsumer(id)` | ✅ New! |

---

## 🔍 Detailed Examples

### Example 1: Users.js Component

**Before:**
```javascript
import { getAdminUsers } from '../api/users/getAdminUsers';
import { updateUserRole } from '../api/users/updateUser';
import { resetUserPassword } from '../api/resetPassword';
import { createUser } from '../api/users/createUser';
import { deleteUser } from '../api/deleteUser';

// Component code...
const fetchUsers = async () => {
  const users = await getAdminUsers();
  setUsers(users);
};
```

**After:**
```javascript
import { 
  getAdminUsers, 
  updateUserRole, 
  resetUserPassword, 
  createUser, 
  deleteUser 
} from '../api/backend';

// Component code remains the same!
const fetchUsers = async () => {
  const users = await getAdminUsers();
  setUsers(users);
};
```

---

### Example 2: Consumers.js Component

**Before:**
```javascript
import { getConsumers } from '../api/consumer/getConsumer';
import { createUser } from '../api/consumer/createComsumer';
import { updateConsumer } from '../api/consumer/updateConsumer';
import { deleteUser } from '../api/deleteUser';

// Component code...
```

**After:**
```javascript
import { 
  getConsumers, 
  createConsumer, 
  updateConsumer, 
  deleteConsumer 
} from '../api/backend';

// Component code remains the same!
// Just replace deleteUser with deleteConsumer
```

---

## ⚙️ What Happens Behind the Scenes

### Authentication Flow
```
1. User logs in → Supabase Auth (still same)
2. JWT token stored in session
3. API calls include JWT in Authorization header
4. Backend verifies token
5. Backend performs operation
6. Response sent back to frontend
```

### New Features Added:
- ✅ **Email Notifications**: Users receive welcome emails and password reset emails
- ✅ **Better Security**: Supabase service role key hidden in backend
- ✅ **Server-side Validation**: Data validated before hitting database
- ✅ **Rate Limiting**: Protects against abuse
- ✅ **Centralized Logic**: Easier to maintain and update

---

## 🚨 Breaking Changes

### None! 
The new API functions have the same signatures as the old ones. Simply update your imports.

### What Still Uses Supabase Directly:
- ✅ **Authentication** (Login/Logout) - in `views/Login.js`
- ✅ **Auth State Management** - in `hooks/useAuth.js`
- ✅ **Protected Routes** - in `auth/RoleBasedRoute.js`

These continue to use Supabase client directly for real-time auth state.

---

## 📦 File Changes Summary

### New Files Created:
```
✅ front-end/src/services/apiClient.js       - Backend API client
✅ front-end/src/api/backend/users.js        - User API wrapper
✅ front-end/src/api/backend/consumers.js    - Consumer API wrapper
✅ front-end/src/api/backend/index.js        - Central exports
```

### Old Files (Can be deleted after migration):
```
⚠️  front-end/src/api/users/getAdminUsers.js
⚠️  front-end/src/api/users/createUser.js
⚠️  front-end/src/api/users/updateUser.js
⚠️  front-end/src/api/consumer/getConsumer.js
⚠️  front-end/src/api/consumer/createComsumer.js
⚠️  front-end/src/api/consumer/updateConsumer.js
⚠️  front-end/src/api/deleteUser.js
⚠️  front-end/src/api/resetPassword.js
⚠️  front-end/src/Email/                    - Moved to backend
⚠️  front-end/src/helper/                   - Moved to backend
⚠️  front-end/src/middleware/checkAuth.js   - Not needed (backend auth)
```

---

## 🔧 Configuration

### 1. Create `.env` file in `front-end/`:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SUPABASE_URL_PRODUCTION=your_url
REACT_APP_SUPABASE_ANON_KEY_PRODUCTION=your_key
```

### 2. Start Backend Server:
```bash
cd backend
npm install
npm run dev
```

### 3. Start Frontend:
```bash
cd front-end
npm install
npm start
```

---

## ✅ Migration Checklist

### Components to Update:
- [ ] `views/Users.js` - Change imports to use `api/backend`
- [ ] `views/Consumers.js` - Change imports to use `api/backend`
- [ ] Any custom hooks using old API

### Files to Delete (After Testing):
- [ ] `api/users/` folder
- [ ] `api/consumer/` folder
- [ ] `api/deleteUser.js`
- [ ] `api/resetPassword.js`
- [ ] `Email/` folder
- [ ] `helper/` folder
- [ ] `middleware/checkAuth.js`

### Testing:
- [ ] Test user creation (should receive email)
- [ ] Test password reset (should receive email)
- [ ] Test all CRUD operations
- [ ] Test with different user roles
- [ ] Check console for errors

---

## 🆘 Troubleshooting

### API calls failing?
1. Check backend is running: `http://localhost:5000/health`
2. Verify `.env` has `REACT_APP_API_URL`
3. Check browser console for errors
4. Verify user is logged in (JWT token needed)

### Emails not sending?
- Check backend `.env` has EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD
- Run `npm run dev` in backend to see email logs
- Emails are sent in background, API will succeed even if email fails

### CORS errors?
- Backend has CORS enabled for `http://localhost:3000`
- Check `CLIENT_URL` in backend `.env`

---

## 🎯 Summary

**Simple 3-step migration:**
1. ✅ Change imports to use `api/backend`
2. ✅ Ensure backend is running
3. ✅ Test everything works

**No code changes needed** - just update imports! 🎉

