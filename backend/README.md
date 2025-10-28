# Admin Panel Backend API

A Node.js and Express backend server for the Admin Panel with role-based authentication using Supabase.

## 🚀 Features

- ✅ RESTful API with Express.js
- ✅ Role-based authentication (Admin, User, Viewer, Consumer)
- ✅ Supabase integration for database and auth
- ✅ Security headers with Helmet
- ✅ CORS enabled
- ✅ Rate limiting
- ✅ Request logging with Morgan
- ✅ Environment variable configuration

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account and project

## 🛠️ Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the backend directory:
```bash
# Copy from .env.example
cp .env.example .env
```

4. Configure your `.env` file:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

## 🏃 Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

## 📡 API Endpoints

### Authentication Routes (`/api/auth`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| POST | `/api/auth/login` | Public | Login user |
| POST | `/api/auth/logout` | Private | Logout user |
| GET | `/api/auth/me` | Private | Get current user |

### Users Routes (`/api/users`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/users` | Admin | Get all users |
| GET | `/api/users/:id` | Admin | Get user by ID |
| POST | `/api/users` | Admin | Create new user |
| PUT | `/api/users/:id` | Admin | Update user |
| DELETE | `/api/users/:id` | Admin | Delete user |

### Consumers Routes (`/api/consumers`)

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/api/consumers` | Admin | Get all consumers |
| GET | `/api/consumers/:id` | Admin | Get consumer by ID |
| PUT | `/api/consumers/:id` | Admin | Update consumer |

### Health Check

| Method | Endpoint | Access | Description |
|--------|----------|--------|-------------|
| GET | `/health` | Public | Server health status |
| GET | `/` | Public | API info |

## 🔐 Authentication

All protected routes require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_supabase_token>
```

### Role-Based Access:
- **Admin**: Full access to all routes
- **User**: Limited access (define based on requirements)
- **Viewer**: Read-only access
- **Consumer**: Consumer-specific routes

## 📁 Project Structure

```
backend/
├── config/
│   └── database.js          # Supabase configuration
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   ├── auth.routes.js       # Auth endpoints
│   ├── users.routes.js      # User management endpoints
│   └── consumers.routes.js  # Consumer endpoints
├── .env                     # Environment variables (create this)
├── .env.example             # Example env file
├── package.json             # Dependencies
├── server.js                # Main server file
└── README.md                # This file
```

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `NODE_ENV` | Environment (development/production) | No |
| `CLIENT_URL` | Frontend URL for CORS | Yes |
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (for admin operations) | Yes |

## 🛡️ Security Features

- **Helmet**: Security headers
- **CORS**: Configured for specific origin
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Environment Variables**: Sensitive data in .env
- **Role-Based Access Control**: Middleware for route protection

## 🧪 Testing

```bash
# Test server health
curl http://localhost:5000/health

# Test API info
curl http://localhost:5000/

# Test protected endpoint (replace TOKEN with actual token)
curl -H "Authorization: Bearer TOKEN" http://localhost:5000/api/auth/me
```

## 📝 API Response Format

### Success Response:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

### Error Response:
```json
{
  "error": "Error Type",
  "message": "Error description"
}
```

## 🚨 Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## 📦 Dependencies

- **express**: Web framework
- **cors**: CORS middleware
- **helmet**: Security headers
- **morgan**: Request logger
- **dotenv**: Environment variables
- **@supabase/supabase-js**: Supabase client
- **express-rate-limit**: Rate limiting

## 👨‍💻 Development

### Install nodemon for auto-reload:
```bash
npm install -D nodemon
```

### Run in development mode:
```bash
npm run dev
```

## 🚀 Deployment

1. Set `NODE_ENV=production` in your environment
2. Configure production environment variables
3. Use a process manager like PM2:

```bash
npm install -g pm2
pm2 start server.js --name admin-panel-backend
```

## 📄 License

ISC

## 🤝 Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request

---

Built with ❤️ using Node.js, Express, and Supabase

