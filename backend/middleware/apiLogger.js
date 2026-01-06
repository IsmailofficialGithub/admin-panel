import { writeApiLog } from '../services/apiLogger.js';

/**
 * Public IP cache - stores the public IP and when it was fetched
 * Cache expires after 10 minutes
 */
let publicIpCache = {
  ip: null,
  timestamp: 0,
  fetching: false
};

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

/**
 * Check if an IP address is localhost or private
 */
const isPrivateIp = (ip) => {
  if (!ip || ip === 'unknown') return false;
  
  // Check for localhost
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost' || ip.startsWith('::ffff:127.0.0.1')) {
    return true;
  }
  
  // Check for private network ranges (IPv4)
  if (ip.startsWith('192.168.') || 
      ip.startsWith('10.') || 
      (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) {
    return true;
  }
  
  // Check for link-local IPv6
  if (ip.startsWith('fe80:')) {
    return true;
  }
  
  return false;
};

/**
 * Fetch public IP address from external service (cached, non-blocking)
 * Returns cached value if available and fresh, otherwise fetches in background
 */
const getPublicIp = async () => {
  const now = Date.now();
  
  // Return cached IP if it's still valid
  if (publicIpCache.ip && (now - publicIpCache.timestamp) < CACHE_DURATION) {
    return publicIpCache.ip;
  }
  
  // If already fetching, return cached value (even if expired) to avoid multiple requests
  if (publicIpCache.fetching) {
    return publicIpCache.ip;
  }
  
  // Fetch in background (non-blocking)
  publicIpCache.fetching = true;
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
  
  // Use the fastest service (ipify is usually fastest)
  fetch('https://api.ipify.org?format=json', {
    signal: controller.signal,
    headers: { 'Accept': 'application/json' }
  })
    .then(response => {
      clearTimeout(timeoutId);
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to fetch public IP');
    })
    .then(data => {
      if (data && data.ip) {
        publicIpCache.ip = data.ip;
        publicIpCache.timestamp = Date.now();
        publicIpCache.fetching = false;
      } else {
        publicIpCache.fetching = false;
      }
    })
    .catch(() => {
      clearTimeout(timeoutId);
      // Silently fail - keep using old cache or null
      // Try alternative service as fallback
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 2000);
      
      fetch('https://api64.ipify.org?format=json', {
        signal: controller2.signal,
        headers: { 'Accept': 'application/json' }
      })
        .then(response => {
          clearTimeout(timeoutId2);
          return response.ok ? response.json() : null;
        })
        .then(data => {
          if (data && data.ip) {
            publicIpCache.ip = data.ip;
            publicIpCache.timestamp = Date.now();
          }
          publicIpCache.fetching = false;
        })
        .catch(() => {
          clearTimeout(timeoutId2);
          // Final fallback - use ipapi.co
          const controller3 = new AbortController();
          const timeoutId3 = setTimeout(() => controller3.abort(), 2000);
          
          fetch('https://ipapi.co/ip/', {
            signal: controller3.signal
          })
            .then(response => {
              clearTimeout(timeoutId3);
              return response.ok ? response.text() : null;
            })
            .then(ip => {
              if (ip && ip.trim()) {
                publicIpCache.ip = ip.trim();
                publicIpCache.timestamp = Date.now();
              }
              publicIpCache.fetching = false;
            })
            .catch(() => {
              clearTimeout(timeoutId3);
              // All services failed - keep existing cache or null
              publicIpCache.fetching = false;
            });
        });
    });
  
  // Return cached value immediately (even if expired) - update happens in background
  return publicIpCache.ip;
};

/**
 * Extract client IP address from request
 * Handles proxy headers and IPv6 loopback addresses
 */
const getClientIp = (req) => {
  // Check x-forwarded-for header first (can be comma-separated list)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // Take the first IP (original client) from the comma-separated list
    const ip = forwardedFor.split(',')[0].trim();
    if (ip) {
      // Convert IPv6 loopback to IPv4 for consistency
      return ip === '::1' ? '127.0.0.1' : ip;
    }
  }

  // Check x-real-ip header (common with nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return realIp === '::1' ? '127.0.0.1' : realIp.trim();
  }

  // Fall back to Express req.ip (requires trust proxy to be enabled)
  if (req.ip && req.ip !== '::1') {
    return req.ip;
  }

  // Fall back to connection remoteAddress
  const remoteAddress = req.connection?.remoteAddress || req.socket?.remoteAddress;
  if (remoteAddress) {
    // Convert IPv6 loopback to IPv4 for consistency
    if (remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1') {
      return '127.0.0.1';
    }
    return remoteAddress;
  }

  return 'unknown';
};

/**
 * Middleware to log all API requests
 * Captures detailed information about each request for auditing purposes
 */
export const apiLogger = (req, res, next) => {
  // Skip logging for health checks and root endpoint
  if (req.path === '/health' || req.path === '/') {
    return next();
  }

  // Capture request start time
  const startTime = Date.now();

  // Capture original end function
  const originalEnd = res.end;

  // Get client IP
  const clientIp = getClientIp(req);
  
  // Check if we need to fetch public IP (only for private IPs)
  let publicIpPromise = null;
  if (isPrivateIp(clientIp)) {
    // Fetch public IP asynchronously (non-blocking, cached)
    publicIpPromise = getPublicIp();
  }

  // Capture request data
  const requestData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    endpoint: req.path,
    user_id: req.user?.id || null,
    user_email: req.user?.email || req.userProfile?.email || null,
    user_name: req.userProfile?.full_name || null,
    ip_address: clientIp,
    query_params: Object.keys(req.query).length > 0 ? req.query : null,
    request_body: req.body && Object.keys(req.body).length > 0 ? req.body : null
  };

  // Override end function to capture response data
  res.end = function(chunk, encoding) {
    // Calculate duration
    const duration = Date.now() - startTime;

    // Capture response data
    const responseData = {
      status_code: res.statusCode,
      duration_ms: duration,
      response_size: chunk ? Buffer.byteLength(chunk, encoding) : 0
    };

    // Combine request and response data
    const logData = {
      ...requestData,
      ...responseData
    };

    // Add public IP if available (for private IPs only)
    if (isPrivateIp(clientIp) && publicIpPromise) {
      // Get public IP (will use cache if available, or fetch in background)
      publicIpPromise
        .then(publicIp => {
          if (publicIp) {
            logData.public_ip = publicIp;
          }
          // Write log with public IP
          writeApiLog(logData);
        })
        .catch(() => {
          // If fetch fails, write log without public IP
          writeApiLog(logData);
        });
    } else {
      // Write log immediately (no public IP needed)
      // Use setImmediate to ensure it doesn't block the response
      setImmediate(() => {
        writeApiLog(logData);
      });
    }

    // Call original end function
    originalEnd.call(this, chunk, encoding);
  };

  // Continue to next middleware
  next();
};

