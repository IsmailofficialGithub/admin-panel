/**
 * WebSocket Client Service for Real-time API Logs
 * Handles Socket.IO connection with authentication and retry logic
 */

import { io } from 'socket.io-client';
import { supabase } from '../lib/supabase/Production/client';

const API_BASE_URL = process.env.REACT_APP_Server_Url || 'http://localhost:5000';

// For WebSocket, we need the base URL without /api prefix
// Remove /api if it exists since Socket.IO namespaces are separate from REST API routes
const WS_BASE_URL = API_BASE_URL.replace(/\/api$/, '');

/**
 * Get authentication token
 */
const getAuthToken = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return session.access_token;
    } else {
      console.error('❌ WebSocket: No session or access token');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting auth token:', error);
    return null;
  }
};

/**
 * Create WebSocket connection to API Logs namespace
 * @param {Object} options - Connection options
 * @param {Function} options.onConnect - Callback when connected
 * @param {Function} options.onDisconnect - Callback when disconnected
 * @param {Function} options.onError - Callback on error
 * @param {Function} options.onNewLog - Callback when new log is received
 * @param {Function} options.onTodayLogs - Callback when today's logs are received
 * @returns {Object} Socket instance and connection control functions
 */
export const createApiLogsConnection = async (options = {}) => {
  const {
    onConnect,
    onDisconnect,
    onError,
    onNewLog,
    onTodayLogs
  } = options;

  let socket = null;
  let reconnectAttempts = 0;
  let maxReconnectAttempts = 5;
  let reconnectDelay = 1000; // Start with 1 second
  let reconnectTimer = null;
  let isManualDisconnect = false;

  /**
   * Connect to WebSocket server
   */
  const connect = async () => {
    try {
      // Get fresh token
      const token = await getAuthToken();
      
      if (!token) {
        console.error('❌ No authentication token available');
        if (onError) onError(new Error('No authentication token'));
        return null;
      }

      // Construct WebSocket URL (namespace is /api-logs, not /api/api-logs)
      const wsUrl = `${WS_BASE_URL}/api-logs`;
      
      // Create socket connection
      socket = io(wsUrl, {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: false, // We'll handle reconnection manually
        timeout: 10000,
        // Add extra options for debugging
        forceNew: true,
        upgrade: true
      });
      

      // Connection successful
      socket.on('connect', () => {
        reconnectAttempts = 0;
        reconnectDelay = 1000; // Reset delay
        
        if (onConnect) onConnect();

        // Request today's logs
        socket.emit('request_today_logs');
      });

      // Receive today's logs
      socket.on('today_logs', (data) => {
        if (onTodayLogs) onTodayLogs(data.logs || []);
      });

      // Receive new log in real-time
      socket.on('new_log', (logData) => {
        if (onNewLog) onNewLog(logData);
      });

      // Connection error
      socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        console.error('❌ Error details:', {
          message: error.message,
          type: error.type,
          description: error.description,
          context: error.context
        });
        
        if (error.message && (error.message.includes('Authentication') || error.message.includes('token') || error.message.includes('System administrator'))) {
          // Authentication error - don't retry
          console.error('❌ WebSocket: Authentication failed - not retrying');
          if (onError) onError(error);
          return;
        }

        // Other errors - retry with exponential backoff
        if (!isManualDisconnect && reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000); // Max 30 seconds
          
          
          reconnectTimer = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.error('❌ WebSocket: Max reconnection attempts reached');
          if (onError) onError(error);
        }
      });

      // Disconnected
      socket.on('disconnect', (reason) => {
        
        if (onDisconnect) onDisconnect(reason);

        // Auto-reconnect if not manual disconnect
        if (!isManualDisconnect && reason !== 'io server disconnect') {
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts - 1), 30000);
            
            
            reconnectTimer = setTimeout(() => {
              connect();
            }, delay);
          }
        }
      });

      // General error handler
      socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        if (onError) onError(error);
      });

      return socket;
    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      if (onError) onError(error);
      return null;
    }
  };

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = () => {
    isManualDisconnect = true;
    
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (socket) {
      socket.disconnect();
      socket = null;
    }
  };

  /**
   * Reconnect to WebSocket server
   */
  const reconnect = () => {
    isManualDisconnect = false;
    reconnectAttempts = 0;
    disconnect();
    setTimeout(() => {
      connect();
    }, 1000);
  };

  // Start connection
  await connect();

  return {
    socket,
    connect,
    disconnect,
    reconnect,
    isConnected: () => socket?.connected || false
  };
};

export default { createApiLogsConnection };

