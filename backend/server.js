import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import consumersRoutes from './routes/consumers.routes.js';
import resellersRoutes from './routes/resellers.routes.js';
import productsRoutes from './routes/products.routes.js';
import invoicesRoutes from './routes/invoices.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import activityLogsRoutes from './routes/activityLogs.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import offersRoutes from './routes/offers.routes.js';
import invitationsRoutes from './routes/invitations.routes.js';
import stripeRoutes from './routes/stripe.routes.js';
import paypalRoutes from './routes/paypal.routes.js';
import productDetailRoutes from './routes/productDetail.routes.js';
import productDatabaseRoutes from './routes/productDatabase.routes.js';
import customerSupportRoutes from './routes/customerSupport.routes.js';
import publicSupportRoutes from './routes/publicSupport.routes.js';
import permissionsRoutes from './routes/permissions.routes.js';
import callLogsRoutes from './routes/callLogs.routes.js';
import { testRedisConnection } from './config/redis.js';

// Load environment variables
dotenv.config();

// Initialize Redis connection
testRedisConnection();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet({
  // Configure helmet for public support routes
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Security headers

// CORS configuration - more permissive for public routes
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin)
    if (!origin) return callback(null, true);
    
    // Allow requests from CLIENT_URL (your admin panel)
    const allowedOrigins = [
      process.env.CLIENT_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ].filter(Boolean);
    
    // For public support routes, allow all origins
    // For other routes, check against allowed origins
    if (origin) {
      callback(null, true); // Allow all origins for now (you can restrict this in production)
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // Logging
app.use('/api/', limiter); // Apply rate limiting to all API routes

// Routes.
app.get('/', (req, res) => {
  res.json({
    message: 'Admin Panel Backend API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/consumers', consumersRoutes);
app.use('/api/resellers', resellersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/activity-logs', activityLogsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/offers', offersRoutes);
app.use('/api/invitations', invitationsRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/paypal', paypalRoutes);
app.use('/api/admin/products', productDetailRoutes);
app.use('/api/admin/product-databases', productDatabaseRoutes);
app.use('/api/customer-support', customerSupportRoutes);
app.use('/api/public/customer-support', publicSupportRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/call-logs', callLogsRoutes);

// Debug: Log all registered routes
;
// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 Admin Panel Backend Server                      ║
║                                                       ║
║   📡 Server running on: http://localhost:${PORT}     ║
║   🌍 Environment: ${process.env.NODE_ENV || 'development'}                    ║
║   ⏰ Started at: ${new Date().toLocaleString()}      ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  app.close(() => {
    console.log('HTTP server closed');
  });
});

export default app;

