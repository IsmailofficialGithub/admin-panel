# Admin Dashboard - Frontend

A modern React-based admin dashboard with admin-only authentication and comprehensive management features for users, resellers, and consumers.

## 🚀 Features

- ✅ **Admin-Only Access**: Secure authentication system that restricts access to administrators only
- ✅ **User Management**: Create, update, delete users with role-based permissions
- ✅ **Consumer Management**: Complete CRUD operations for consumers with account status management
- ✅ **Reseller Management**: Manage resellers and view their referred consumers
- ✅ **Account Status Control**: Active, Deactive, and Expired Subscription statuses
- ✅ **Trial Extension**: Flexible trial period management for consumers
- ✅ **Search & Filtering**: Real-time search with debounce and status-based filtering
- ✅ **Responsive Design**: Mobile-friendly UI with adaptive layouts
- ✅ **Toast Notifications**: User-friendly feedback for all actions
- ✅ **Country & City Selection**: Comprehensive country selection with phone code integration
- ✅ **Password Reset**: Email-based password reset functionality

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API running (see `backend/README.md`)
- Supabase account and project

## 🛠️ Installation

1. Navigate to the frontend directory:
```bash
cd front-end
```

2. Install dependencies:
```bash
npm install
```

3. Create environment variables:
   - The Supabase configuration is located in `src/lib/supabase/Production/`
   - Update the Supabase URL and keys in the client configuration files

4. Ensure backend API is running on `http://localhost:5000`

## 🏃 Running the Application

### Development mode:
```bash
npm start
```

The app will open at `http://localhost:3000`

### Build for production:
```bash
npm run build
```

### Run production build:
```bash
npm run start:prod
```

## 🔐 Authentication Flow

This application implements **Admin-Only Authentication**:

1. **Login**: User enters credentials
2. **Validation**: Backend validates credentials via Supabase
3. **Role Check**: System verifies user has `admin` role
4. **Access Grant**: If admin, user is redirected to dashboard
5. **Access Denied**: If not admin:
   - User is signed out automatically
   - All tokens/cookies are cleared
   - User redirected to login with error message

### Session Management
- Sessions stored in both localStorage and cookies
- Custom storage adapter ensures cross-tab synchronization
- Automatic session refresh and validation
- Protected routes redirect non-authenticated users

## 📁 Project Structure

```
front-end/
├── public/                      # Static assets
│   ├── index.html
│   ├── favicon.ico
│   └── manifest.json
├── src/
│   ├── api/                     # API integration layer
│   │   └── backend/
│   │       ├── index.js         # Central API exports
│   │       ├── users.js         # User API calls
│   │       ├── consumers.js     # Consumer API calls
│   │       └── resellers.js     # Reseller API calls
│   ├── assets/                  # CSS, images, fonts
│   │   ├── css/
│   │   ├── img/
│   │   └── scss/
│   ├── auth/                    # Authentication components
│   │   ├── ProtectedRoute.js   # Route protection
│   │   └── RoleBasedRoute.js   # Role-based routing
│   ├── components/              # Reusable components
│   │   ├── Footer/
│   │   ├── Navbars/
│   │   ├── Sidebar/
│   │   └── ui/                  # UI modals
│   │       ├── createUserModel.jsx
│   │       ├── UpdateUserModel.jsx
│   │       ├── createConsumerModel.jsx
│   │       ├── updateConsumerModel.jsx
│   │       ├── createResellerModel.jsx
│   │       ├── updateResellerModel.jsx
│   │       └── deleteModel.jsx
│   ├── contexts/                # React contexts
│   │   └── AuthContext.js       # Authentication state
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.js
│   │   ├── useUsers.js
│   │   └── useConsumer.js
│   ├── layouts/                 # Page layouts
│   │   ├── Admin.js
│   │   ├── User.js
│   │   ├── Consumer.js
│   │   ├── Resellers.js
│   │   └── Viewer.js
│   ├── lib/                     # External libraries config
│   │   └── supabase/
│   │       └── Production/
│   │           ├── admin.js     # Admin Supabase client
│   │           ├── client.js    # Regular Supabase client
│   │           └── server.js    # Server-side client
│   ├── routes/                  # Route definitions
│   │   ├── consumerRoutes.js
│   │   ├── resellerRoutes.js
│   │   ├── userRoutes.js
│   │   └── viewerRoutes.js
│   ├── services/                # Service layer
│   │   └── apiClient.js         # Axios instance with interceptors
│   ├── utils/                   # Utility functions
│   │   ├── countryData.js       # Country list with phone codes
│   │   └── passwordGenerator.js # Password generation
│   ├── views/                   # Page components
│   │   ├── Login.js
│   │   ├── Users.js
│   │   ├── Consumers.js
│   │   ├── Resellers.js
│   │   ├── ResellerConsumers.js
│   │   ├── Dashboard.js
│   │   ├── UserProfile.js
│   │   └── TrialExpired.js
│   ├── index.js                 # App entry point
│   └── routes.js                # Main route config
├── package.json
└── README.md                    # This file
```

## 🎨 Key Features

### 1. User Management
- Create users with roles (Admin, User, Viewer)
- Update user information (name, role, country, city, phone)
- Delete users with confirmation
- Reset user passwords via email
- Search users by name or email
- Required fields: Name, Email, Role, Country, City, Phone

### 2. Consumer Management
- Create consumers with trial periods
- Update consumer information
- **Account Status Management**:
  - Active: Extends trial by 30 days (or custom)
  - Deactive: Maintains current trial period
  - Expired Subscription: Sets trial expiry to current date
- **Trial Extension**: Choose 1, 2, or 3 days to extend trial
- **Conditional Trial Extension**: Show extension option only if trial ≤ 2 days
- Search consumers by name or email
- Filter by account status (All, Active, Deactive, Expired)
- Assign consumers to resellers
- Color-coded status badges
- Debounced search (1.5 seconds)

### 3. Reseller Management
- Create and manage resellers
- View referred consumer count
- **Hover Tooltips**: View referred consumer details on hover
  - Shows up to 5 consumers
  - Display consumer name, email, account status
  - "View More" button for additional consumers
- Search resellers by name or email
- Update reseller information
- Delete resellers with confirmation

### 4. Country & Phone Management
- Comprehensive country list with flags and phone codes
- Automatic phone code prepending
- Smart country dropdown with search
- Click-to-clear country selection
- Phone number validation
- Format: `+XX XXXXXXXXXX`

### 5. Search & Filtering
- **Debounced Search**: 1.5-2 second delay for optimal performance
- **Real-time Results**: Auto-updates as you type
- **Multiple Filters**: Status, role, and text-based filters
- **Clear Filters**: One-click filter reset
- **Results Count**: Display number of matching records

### 6. Responsive Design
- Mobile-friendly tables and forms
- Adaptive navigation
- Touch-optimized buttons and inputs
- Responsive modals
- Flexible layouts for all screen sizes

## 🔧 Configuration

### API Client (`src/services/apiClient.js`)
- Base URL: `http://localhost:5000/api`
- Request interceptor adds authorization headers
- Response interceptor handles errors
- Axios instance with custom configuration

### Supabase Configuration (`src/lib/supabase/Production/client.js`)
- Custom storage adapter for localStorage + cookies
- Automatic token refresh
- Cross-tab session synchronization
- Storage key: `sb-auth-token`

## 📡 API Integration

The frontend communicates with the backend API at `http://localhost:5000/api`

### Available API Modules:

#### Users API (`/api/users`)
- `getAdminUsers({ search })` - Get all users with optional search
- `createUser(userData)` - Create new user
- `updateUser(userId, updateData)` - Update user
- `deleteUser(userId)` - Delete user
- `resetUserPassword(userId)` - Reset user password

#### Consumers API (`/api/consumers`)
- `getConsumers({ account_status, search })` - Get consumers with filters
- `getConsumerById(id)` - Get single consumer
- `createConsumer(consumerData)` - Create consumer
- `updateConsumer(id, updateData)` - Update consumer
- `updateConsumerAccountStatus(id, status, trialDate)` - Update account status
- `deleteConsumer(id)` - Delete consumer
- `resetConsumerPassword(id)` - Reset consumer password

#### Resellers API (`/api/resellers`)
- `getResellers({ search })` - Get resellers with search
- `getResellerById(id)` - Get single reseller
- `createReseller(resellerData)` - Create reseller
- `updateReseller(id, updateData)` - Update reseller
- `deleteReseller(id)` - Delete reseller
- `getReferredConsumers(id)` - Get reseller's referred consumers

## 🎭 Component Details

### Protected Route
```jsx
<ProtectedRoute>
  <AdminLayout />
</ProtectedRoute>
```
- Checks if user is authenticated and is admin
- Shows loading spinner during auth check
- Redirects to `/login` if not authenticated or not admin

### Update Modals
All update modals include:
- Auto-populated form fields
- Country selection with search
- Phone number with country code
- Validation with error messages
- Success/error toast notifications

### Account Status Update (Consumers)
- Dropdown with three status options
- Confirmation modal before update
- Conditional trial extension dropdown
- Automatic trial period calculation
- Status badge with color coding

## 🔨 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start development server (port 3000) |
| `npm run build` | Build for production |
| `npm test` | Run tests |
| `npm run eject` | Eject from Create React App |

## 🛡️ Security Features

- **Admin-Only Access**: Non-admin users cannot access the application
- **Protected Routes**: All routes require admin authentication
- **Automatic Token Management**: Tokens stored securely in localStorage and cookies
- **Session Validation**: Continuous validation of user session
- **Auto Sign-Out**: Non-admin users are automatically signed out
- **CSRF Protection**: Implemented via Supabase
- **XSS Protection**: React's built-in XSS protection

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  /* Mobile-specific styles */
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  /* Tablet-specific styles */
}

/* Desktop */
@media (min-width: 1025px) {
  /* Desktop-specific styles */
}
```

## 🎨 UI/UX Features

- **Toast Notifications**: Real-time feedback using `react-hot-toast`
- **Loading States**: Spinners for async operations
- **Confirmation Modals**: Prevent accidental deletions
- **Hover Effects**: Visual feedback on interactive elements
- **Color-Coded Status**: Visual distinction for different statuses
- **Icon Library**: Lucide React icons throughout
- **Smooth Animations**: CSS transitions for better UX

## 🔍 Search & Filter Implementation

### Debounced Search
```javascript
useEffect(() => {
  const debounceTimer = setTimeout(() => {
    setSearchQuery(searchInput);
  }, 1500); // 1.5 second delay

  return () => clearTimeout(debounceTimer);
}, [searchInput]);
```

### Status Filter
```javascript
const handleFilterChange = (e) => {
  setAccountStatusFilter(e.target.value);
  setCurrentPage(1); // Reset to first page
};
```

## 🐛 Debugging

### Enable Console Logs
All unnecessary console.logs have been removed from production code. Only error logs remain for debugging:
- `console.error()` - For error tracking
- No `console.log()` in production code

### Common Issues

1. **401 Unauthorized**
   - Check if backend is running
   - Verify Supabase credentials
   - Ensure user is authenticated

2. **Form not populating**
   - Verify data structure matches expected format
   - Check console for errors
   - Ensure all required fields are passed

3. **Search not working**
   - Wait for debounce delay (1.5 seconds)
   - Check network tab for API calls
   - Verify search parameter in backend

## 📦 Key Dependencies

- **react** (^17.0.2): UI framework
- **react-router-dom** (^5.2.0): Routing
- **@supabase/supabase-js**: Supabase client
- **axios**: HTTP client
- **react-hot-toast**: Toast notifications
- **lucide-react**: Icon library
- **react-bootstrap**: UI components

## 🚀 Deployment

1. Update API base URL in `src/services/apiClient.js`
2. Update Supabase configuration in `src/lib/supabase/Production/`
3. Build the application:
```bash
npm run build
```
4. Deploy the `build/` folder to your hosting service

### Recommended Hosting
- Vercel
- Netlify
- AWS S3 + CloudFront
- Azure Static Web Apps

## 🔄 Version History

### Current Version
- Admin-only authentication
- Complete CRUD for users, consumers, resellers
- Account status management
- Trial extension features
- Search and filtering
- Responsive design
- Hover tooltips for reseller consumers

## 📄 License

ISC

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

---

Built with ❤️ using React, Supabase, and Modern Web Technologies
