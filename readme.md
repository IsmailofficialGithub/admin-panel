# Admin Dashboard - Full Stack Application

A comprehensive full-stack admin dashboard application with **admin-only authentication**, built with React frontend and Node.js/Express backend, powered by Supabase.

## 🚀 Overview

This is a complete admin panel solution for managing users, resellers, and consumers with advanced features like account status management, trial period control, search & filtering, and responsive design.

### **Key Features**

- 🔐 **Admin-Only Access** - Secure authentication restricting access to administrators only
- 👥 **User Management** - Complete CRUD operations for users with role assignment
- 📊 **Consumer Management** - Manage consumers with account status and trial extensions
- 🔄 **Reseller Management** - Handle resellers and track their referred consumers
- 🔍 **Advanced Search & Filtering** - Real-time debounced search across all entities
- 📱 **Responsive Design** - Mobile-friendly UI that works on all devices
- 🌍 **International Support** - Country selection with phone code integration
- 📧 **Email Integration** - Password reset via email
- 🎨 **Modern UI/UX** - Clean, intuitive interface with toast notifications

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Git**
- **Supabase Account** (free tier works fine)

---

## 🏗️ Project Structure

```
light-bootstrap-dashboard-react-master/
├── backend/                    # Node.js/Express API server
│   ├── config/                # Database and configuration
│   ├── middleware/            # Authentication middleware
│   ├── routes/                # API routes
│   │   ├── controllers/       # Route controllers
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── consumers.routes.js
│   │   └── resellers.routes.js
│   ├── services/              # Email and other services
│   ├── utils/                 # Helper functions
│   ├── server.js              # Main server file
│   ├── package.json
│   └── README.md              # Backend documentation
│
├── front-end/                 # React frontend application
│   ├── public/                # Static assets
│   ├── src/
│   │   ├── api/               # API integration layer
│   │   ├── assets/            # CSS, images, fonts
│   │   ├── auth/              # Authentication components
│   │   ├── components/        # Reusable UI components
│   │   ├── contexts/          # React contexts
│   │   ├── hooks/             # Custom React hooks
│   │   ├── layouts/           # Page layouts
│   │   ├── lib/               # External library configs
│   │   ├── routes/            # Route definitions
│   │   ├── services/          # Service layer
│   │   ├── utils/             # Utility functions
│   │   ├── views/             # Page components
│   │   └── index.js           # App entry point
│   ├── package.json
│   └── README.md              # Frontend documentation
│
└── README.md                  # This file
```

---

## 🚀 Quick Start

### **Option 1: Docker (Recommended)**

The easiest way to run the application:

```bash
# 1. Clone the repository
git clone <your-repository-url>
cd light-bootstrap-dashboard-react-master

# 2. Create .env file with your Supabase credentials
# See .env.docker.example or DOCKER.md for template

# 3. Start with Docker Compose
docker-compose up --build

# Access the application:
# - Frontend: http://localhost:3000
# - Backend: http://localhost:5000
```

📖 **Complete Docker guide**: See [DOCKER.md](DOCKER.md)

---

### **Option 2: Manual Setup**

### **1. Clone the Repository**

```bash
git clone <your-repository-url>
cd light-bootstrap-dashboard-react-master
```

### **2. Backend Setup**

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env with your Supabase credentials
# Required:
# - SUPABASE_URL
# - SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
# - CLIENT_URL (frontend URL)

# Start backend server
npm run dev
```

Backend will run on: **http://localhost:5000**

📖 **Detailed backend setup**: See [backend/README.md](backend/README.md)

### **3. Frontend Setup**

```bash
# Open new terminal and navigate to frontend
cd front-end

# Install dependencies
npm install

# Update Supabase configuration in:
# src/lib/supabase/Production/client.js
# src/lib/supabase/Production/admin.js
# src/lib/supabase/Production/server.js

# Start frontend development server
npm start
```

Frontend will run on: **http://localhost:3000**

📖 **Detailed frontend setup**: See [front-end/README.md](front-end/README.md)

### **4. Access the Application**

1. Open browser to `http://localhost:3000`
2. Login with **admin credentials**
3. Only users with `admin` role can access the dashboard

---

## 🔐 Authentication System

### **Admin-Only Access Flow**

```
User Login
    ↓
Validate Credentials (Supabase)
    ↓
Check User Role in Database
    ↓
    ├─ Role = 'admin' → Grant Access ✅
    └─ Role ≠ 'admin' → Sign Out, Clear Tokens, Redirect to Login ❌
```

### **Role Types in Database**

| Role | Access Level | Description |
|------|--------------|-------------|
| `admin` | Full Access | Can manage all users, consumers, and resellers |
| `user` | No Access | Cannot access admin dashboard |
| `viewer` | No Access | Cannot access admin dashboard |
| `consumer` | No Access | Cannot access admin dashboard |
| `reseller` | No Access | Cannot access admin dashboard |

**Note**: Currently, only `admin` role has access to the dashboard.

---

## 🎯 Core Features

### **1. User Management**
- Create, read, update, delete users
- Assign roles (Admin, User, Viewer)
- Reset passwords via email
- Search by name or email
- Required fields: Name, Email, Role, Country, City, Phone

### **2. Consumer Management**
- Full CRUD operations
- **Account Status Control**:
  - `Active` - Extends trial by 30 days or custom period
  - `Deactive` - Maintains current trial period
  - `Expired Subscription` - Sets trial to current date
- **Trial Extension**: 1, 2, or 3 days
- **Smart Extension**: Only show if trial ≤ 2 days remaining
- Assign to resellers during creation
- Filter by account status
- Search by name or email

### **3. Reseller Management**
- Create and manage resellers
- Track referred consumer count
- **Hover Tooltips**: View consumer details on hover
  - Shows first 5 consumers
  - Displays name, email, status
  - "View More" option for additional consumers
- Search by name or email

### **4. Search & Filtering**
- **Debounced Search**: 1.5-2 second delay for performance
- Real-time auto-updating results
- Multiple filter options
- One-click filter clearing
- Results count display

### **5. International Support**
- 250+ countries with flags
- Automatic phone code prepending
- Smart country dropdown with search
- Format: `+XX XXXXXXXXXX`

---

## 🛠️ Technology Stack

### **Frontend**
- **React** 17.0.2 - UI framework
- **React Router** 5.2.0 - Routing
- **Axios** - HTTP client
- **Supabase Client** - Authentication & database
- **React Hot Toast** - Notifications
- **Lucide React** - Icons
- **React Bootstrap** - UI components

### **Backend**
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Supabase** - Database & authentication
- **Nodemailer** - Email service
- **Helmet** - Security headers
- **Morgan** - Request logging
- **Express Rate Limit** - Rate limiting
- **CORS** - Cross-origin resource sharing

### **Database & Auth**
- **Supabase** - PostgreSQL database
- **Supabase Auth** - Authentication service
- **Row Level Security** - Database security

---

## 📡 API Endpoints

### **Authentication** (`/api/auth`)
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

### **Users** (`/api/users`)
- `GET /api/users` - Get all users (with search)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `POST /api/users/:id/reset-password` - Reset user password

### **Consumers** (`/api/consumers`)
- `GET /api/consumers` - Get all consumers (with filters)
- `GET /api/consumers/:id` - Get consumer by ID
- `POST /api/consumers` - Create new consumer
- `PUT /api/consumers/:id` - Update consumer
- `PATCH /api/consumers/:id/account-status` - Update account status
- `DELETE /api/consumers/:id` - Delete consumer
- `POST /api/consumers/:id/reset-password` - Reset consumer password

### **Resellers** (`/api/resellers`)
- `GET /api/resellers` - Get all resellers (with search)
- `GET /api/resellers/:id` - Get reseller by ID
- `GET /api/resellers/:id/referred-consumers` - Get referred consumers
- `POST /api/resellers` - Create new reseller
- `PUT /api/resellers/:id` - Update reseller
- `DELETE /api/resellers/:id` - Delete reseller
- `POST /api/resellers/:id/reset-password` - Reset reseller password

---

## 🔒 Security Features

- ✅ **Admin-Only Access** - Non-admin users automatically signed out
- ✅ **JWT Authentication** - Secure token-based auth via Supabase
- ✅ **Password Hashing** - Supabase handles secure password storage
- ✅ **CORS Protection** - Configured for specific origins
- ✅ **Rate Limiting** - 100 requests per 15 minutes
- ✅ **Helmet Security** - HTTP headers protection
- ✅ **Environment Variables** - Sensitive data in .env files
- ✅ **XSS Protection** - React's built-in protection
- ✅ **Session Management** - Automatic token refresh

---

## 🧪 Testing

### **Backend API Testing**

```bash
# Health check
curl http://localhost:5000/health

# Test protected endpoint (replace TOKEN)
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/users
```

### **Frontend Testing**

```bash
cd front-end
npm test
```

---

## 🌐 Environment Variables

### **Backend** (`.env` in `backend/` directory)

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email Configuration (Optional for password reset)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### **Frontend** (in Supabase config files)

Update the following files with your Supabase credentials:
- `front-end/src/lib/supabase/Production/client.js`
- `front-end/src/lib/supabase/Production/admin.js`
- `front-end/src/lib/supabase/Production/server.js`

---

## 📱 Responsive Design

The application is fully responsive and works on:
- 📱 **Mobile** (320px - 768px)
- 📱 **Tablet** (769px - 1024px)
- 💻 **Desktop** (1025px+)

---

## 🚀 Deployment

### **Option 1: Docker Deployment (Recommended)**

Deploy using Docker Compose with production configuration:

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Access:
# - Frontend: http://localhost (port 80)
# - Backend: http://localhost:5000
```

**Production Features:**
- Multi-stage builds for smaller images
- Nginx serving optimized static files
- Non-root user for security
- Health checks and logging
- Production dependencies only

📖 **See [DOCKER.md](DOCKER.md) for complete deployment guide**

---

### **Option 2: Traditional Deployment**

#### **Backend Deployment**

1. Choose a hosting platform (Heroku, Railway, Render, etc.)
2. Set environment variables
3. Deploy from Git or use platform CLI
4. Ensure `NODE_ENV=production`

#### **Frontend Deployment**

1. Build the production bundle:
```bash
cd front-end
npm run build
```

2. Deploy the `build/` folder to:
   - Vercel
   - Netlify
   - AWS S3 + CloudFront
   - Azure Static Web Apps

3. Update API base URL in `src/services/apiClient.js`

---

## 📚 Documentation

- **Frontend Docs**: [front-end/README.md](front-end/README.md)
- **Backend Docs**: [backend/README.md](backend/README.md)
- **Docker Guide**: [DOCKER.md](DOCKER.md) - Complete Docker setup and deployment
- **Docker Quick Ref**: [DOCKER_QUICK_REFERENCE.md](DOCKER_QUICK_REFERENCE.md) - Command cheat sheet

---

## 🐛 Common Issues & Solutions

### **Issue: Cannot connect to backend**
**Solution**: Ensure backend is running on port 5000 and CORS is configured properly

### **Issue: 401 Unauthorized**
**Solution**: Check Supabase credentials and ensure user is logged in as admin

### **Issue: Form fields not populating**
**Solution**: Verify data structure matches expected format and all fields are being passed

### **Issue: Search not working**
**Solution**: Wait for debounce delay (1.5 seconds) and check network tab

### **Issue: "Access Denied" on login**
**Solution**: Ensure user has `admin` role in the `profiles` table

---

## 🔄 Git Workflow

### **Branches**
- `master` - Production-ready code
- `ismail` - Main development branch
- `codeBackup` - Backup branch

### **Common Commands**

```bash
# Check current branch
git branch

# Switch branches
git checkout ismail

# Check status
git status

# Stage changes
git add .

# Commit changes
git commit -m "Your message"

# Push to remote
git push origin ismail
```

---

## 📊 Database Schema

### **Profiles Table**
```sql
profiles (
  user_id UUID PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  role TEXT (admin, user, viewer, consumer, reseller),
  phone TEXT,
  country TEXT,
  city TEXT,
  account_status TEXT (active, deactive, expired_subscription),
  trial_expiry TIMESTAMP,
  referred_by UUID (references profiles.user_id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

ISC

---

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/)
- Powered by [Supabase](https://supabase.com/)
- UI components from [React Bootstrap](https://react-bootstrap.github.io/)
- Icons by [Lucide](https://lucide.dev/)

---

## 📞 Support

For issues and questions:
1. Check the [Frontend README](front-end/README.md)
2. Check the [Backend README](backend/README.md)
3. Review common issues above
4. Check application logs

---

Built with ❤️ using React, Node.js, Express, and Supabase

**Version**: 1.0.0  
**Last Updated**: 2025

