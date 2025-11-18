# Practical Implementation Example

## Quick Start: Connecting to Multiple Product Databases

### Step 1: Database Schema for Product Registry

```sql
-- Run this in your main admin database
CREATE TABLE IF NOT EXISTS product_databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) UNIQUE,
  product_name VARCHAR(255) NOT NULL,
  
  -- Connection details (store encrypted)
  db_type VARCHAR(50) NOT NULL DEFAULT 'supabase',
  supabase_url TEXT,
  supabase_service_key_encrypted TEXT,
  
  -- Alternative: Direct PostgreSQL connection
  postgres_host TEXT,
  postgres_port INTEGER DEFAULT 5432,
  postgres_database TEXT,
  postgres_user_encrypted TEXT,
  postgres_password_encrypted TEXT,
  
  -- Configuration
  schema_name VARCHAR(100) DEFAULT 'public',
  is_active BOOLEAN DEFAULT true,
  health_status VARCHAR(20) DEFAULT 'unknown',
  last_health_check TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert your recruitment ATS product
INSERT INTO product_databases (
  product_id,
  product_name,
  db_type,
  supabase_url,
  supabase_service_key_encrypted
) VALUES (
  (SELECT id FROM products WHERE name = 'Recruitment ATS'),
  'Recruitment ATS',
  'supabase',
  'https://your-ats-project.supabase.co',
  encrypt('your-service-key-here', 'encryption-key')
) ON CONFLICT (product_id) DO NOTHING;
```

### Step 2: Backend Service Implementation

```javascript
// backend/services/productDatabaseManager.js
import { createClient } from '@supabase/supabase-js';
import { Pool } from 'pg';
import crypto from 'crypto';
import { supabase } from '../config/database.js';

const ENCRYPTION_KEY = process.env.DB_ENCRYPTION_KEY || 'your-encryption-key';
const ALGORITHM = 'aes-256-cbc';

class ProductDatabaseManager {
  constructor() {
    this.connections = new Map();
    this.connectionPools = new Map();
  }

  // Encryption helpers
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  decrypt(encryptedText) {
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Get product database configuration
  async getProductDbConfig(productId) {
    const { data, error } = await supabase
      .from('product_databases')
      .select('*')
      .eq('product_id', productId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error(`Product database config not found for product: ${productId}`);
    }

    return data;
  }

  // Get or create Supabase connection
  async getSupabaseConnection(productId) {
    // Check cache
    if (this.connections.has(productId)) {
      return this.connections.get(productId);
    }

    // Get config
    const config = await this.getProductDbConfig(productId);
    
    if (config.db_type !== 'supabase') {
      throw new Error(`Product ${productId} is not a Supabase database`);
    }

    // Decrypt service key
    const serviceKey = this.decrypt(config.supabase_service_key_encrypted);

    // Create Supabase client
    const client = createClient(config.supabase_url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Cache connection
    this.connections.set(productId, client);

    return client;
  }

  // Get or create PostgreSQL connection pool
  async getPostgresConnection(productId) {
    if (this.connectionPools.has(productId)) {
      return this.connectionPools.get(productId);
    }

    const config = await this.getProductDbConfig(productId);
    
    if (config.db_type !== 'postgres') {
      throw new Error(`Product ${productId} is not a PostgreSQL database`);
    }

    // Decrypt credentials
    const user = this.decrypt(config.postgres_user_encrypted);
    const password = this.decrypt(config.postgres_password_encrypted);

    // Create connection pool
    const pool = new Pool({
      host: config.postgres_host,
      port: config.postgres_port,
      database: config.postgres_database,
      user: user,
      password: password,
      max: 10, // Maximum pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.connectionPools.set(productId, pool);
    return pool;
  }

  // Health check
  async healthCheck(productId) {
    try {
      const config = await this.getProductDbConfig(productId);
      
      if (config.db_type === 'supabase') {
        const client = await this.getSupabaseConnection(productId);
        const { error } = await client.from('profiles').select('count', { count: 'exact', head: true });
        
        if (error) throw error;
        
        // Update health status
        await supabase
          .from('product_databases')
          .update({ 
            health_status: 'healthy',
            last_health_check: new Date().toISOString()
          })
          .eq('product_id', productId);
        
        return { status: 'healthy', timestamp: new Date() };
      } else if (config.db_type === 'postgres') {
        const pool = await this.getPostgresConnection(productId);
        await pool.query('SELECT 1');
        
        await supabase
          .from('product_databases')
          .update({ 
            health_status: 'healthy',
            last_health_check: new Date().toISOString()
          })
          .eq('product_id', productId);
        
        return { status: 'healthy', timestamp: new Date() };
      }
    } catch (error) {
      // Update health status to down
      await supabase
        .from('product_databases')
        .update({ 
          health_status: 'down',
          last_health_check: new Date().toISOString()
        })
        .eq('product_id', productId);
      
      return { status: 'down', error: error.message, timestamp: new Date() };
    }
  }

  // Get users from product
  async getProductUsers(productId, filters = {}) {
    const config = await this.getProductDbConfig(productId);
    const client = await this.getSupabaseConnection(productId);
    
    let query = client.from('profiles').select('*');
    
    // Apply filters
    if (filters.email) {
      query = query.eq('email', filters.email);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return data;
  }

  // Get product statistics
  async getProductStats(productId) {
    const client = await this.getSupabaseConnection(productId);
    
    // Get counts from different tables
    const [users, jobs, applicants, clients] = await Promise.all([
      client.from('profiles').select('*', { count: 'exact', head: true }),
      client.from('jobs').select('*', { count: 'exact', head: true }),
      client.from('Applicant').select('*', { count: 'exact', head: true }),
      client.from('clients').select('*', { count: 'exact', head: true })
    ]);
    
    // Get active jobs
    const { count: activeJobs } = await client
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    
    return {
      totalUsers: users.count || 0,
      totalJobs: jobs.count || 0,
      activeJobs: activeJobs || 0,
      totalApplicants: applicants.count || 0,
      totalClients: clients.count || 0
    };
  }
}

export default new ProductDatabaseManager();
```

### Step 3: Admin API Routes

```javascript
// backend/routes/admin.routes.js
import express from 'express';
import { authenticateAdmin } from '../middleware/auth.js';
import productDbManager from '../services/productDatabaseManager.js';

const router = express.Router();

// Get all products with health status
router.get('/products', authenticateAdmin, async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('product_databases')
      .select(`
        *,
        products:product_id (
          id,
          name,
          description
        )
      `)
      .eq('is_active', true);
    
    if (error) throw error;
    
    // Get health status for each
    const productsWithHealth = await Promise.all(
      products.map(async (product) => {
        const health = await productDbManager.healthCheck(product.product_id);
        return {
          ...product,
          health
        };
      })
    );
    
    res.json({
      success: true,
      data: productsWithHealth
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch products',
      message: error.message
    });
  }
});

// Get product dashboard data
router.get('/products/:productId/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const stats = await productDbManager.getProductStats(productId);
    const health = await productDbManager.healthCheck(productId);
    
    res.json({
      success: true,
      data: {
        productId,
        stats,
        health
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: error.message
    });
  }
});

// Get product users
router.get('/products/:productId/users', authenticateAdmin, async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 50, ...filters } = req.query;
    
    const users = await productDbManager.getProductUsers(productId, filters);
    
    // Pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedUsers = users.slice(start, end);
    
    res.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length,
        totalPages: Math.ceil(users.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch users',
      message: error.message
    });
  }
});

export default router;
```

### Step 4: Frontend Component

```javascript
// front-end/src/views/UnifiedAdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardBody,
  Row,
  Col,
  Table,
  Badge
} from 'reactstrap';
import ProductSelector from '../components/ProductSelector';
import api from '../api/backend/admin';

const UnifiedAdminDashboard = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadProductDashboard(selectedProduct);
    }
  }, [selectedProduct]);

  const loadProducts = async () => {
    try {
      const response = await api.getProducts();
      setProducts(response.data);
      if (response.data.length > 0) {
        setSelectedProduct(response.data[0].product_id);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const loadProductDashboard = async (productId) => {
    setLoading(true);
    try {
      const response = await api.getProductDashboard(productId);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthBadgeColor = (status) => {
    switch (status) {
      case 'healthy': return 'success';
      case 'degraded': return 'warning';
      case 'down': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <div className="content">
      <Row>
        <Col md="12">
          <Card>
            <CardHeader>
              <h4 className="title">Unified Admin Dashboard</h4>
              <ProductSelector
                products={products}
                selectedProduct={selectedProduct}
                onProductChange={setSelectedProduct}
              />
            </CardHeader>
            <CardBody>
              {loading ? (
                <div>Loading...</div>
              ) : dashboardData ? (
                <>
                  <Row>
                    <Col md="3">
                      <Card>
                        <CardBody>
                          <h5>Total Users</h5>
                          <h2>{dashboardData.stats.totalUsers}</h2>
                        </CardBody>
                      </Card>
                    </Col>
                    <Col md="3">
                      <Card>
                        <CardBody>
                          <h5>Total Jobs</h5>
                          <h2>{dashboardData.stats.totalJobs}</h2>
                        </CardBody>
                      </Card>
                    </Col>
                    <Col md="3">
                      <Card>
                        <CardBody>
                          <h5>Active Jobs</h5>
                          <h2>{dashboardData.stats.activeJobs}</h2>
                        </CardBody>
                      </Card>
                    </Col>
                    <Col md="3">
                      <Card>
                        <CardBody>
                          <h5>Health Status</h5>
                          <Badge color={getHealthBadgeColor(dashboardData.health.status)}>
                            {dashboardData.health.status}
                          </Badge>
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>
                </>
              ) : (
                <div>Select a product to view dashboard</div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default UnifiedAdminDashboard;
```

### Step 5: API Client

```javascript
// front-end/src/api/backend/admin.js
import apiClient from '../apiClient';

const adminApi = {
  getProducts: () => apiClient.get('/admin/products'),
  
  getProductDashboard: (productId) => 
    apiClient.get(`/admin/products/${productId}/dashboard`),
  
  getProductUsers: (productId, params) => 
    apiClient.get(`/admin/products/${productId}/users`, { params }),
};

export default adminApi;
```

---

## Environment Variables

Add to your `.env` file:

```env
# Database encryption key (generate a secure key)
DB_ENCRYPTION_KEY=your-32-character-hex-key-here

# Example: Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Security Best Practices

1. **Encrypt all credentials** before storing in database
2. **Use environment variables** for encryption keys
3. **Rotate encryption keys** periodically
4. **Limit admin access** - only authorized admins can access product databases
5. **Audit all operations** - log all admin actions
6. **Use connection pooling** - don't create new connections for each request
7. **Implement rate limiting** - prevent abuse

---

## Testing

```javascript
// Test script: backend/tests/productDatabaseManager.test.js
import productDbManager from '../services/productDatabaseManager.js';

async function test() {
  const productId = 'your-product-uuid';
  
  // Test health check
  const health = await productDbManager.healthCheck(productId);
  console.log('Health:', health);
  
  // Test getting users
  const users = await productDbManager.getProductUsers(productId);
  console.log('Users:', users.length);
  
  // Test getting stats
  const stats = await productDbManager.getProductStats(productId);
  console.log('Stats:', stats);
}

test();
```

---

This gives you a working foundation to start building your unified admin panel!

