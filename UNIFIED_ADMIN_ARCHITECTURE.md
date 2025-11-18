# Unified Admin Panel Architecture - Multi-Product Database Solution

## Problem Statement
You have 4-5+ products, each with its own separate database and unique schema. You need ONE admin panel to manage all products while maintaining data isolation and product-specific functionality.

---

## Architecture Approaches

### **Approach 1: Database Connection Pool with Product Registry (Recommended)**

#### Overview
Create a product registry that maps each product to its database connection details. The admin panel dynamically connects to the appropriate database based on the selected product.

#### Architecture Components

1. **Product Registry Table** (in your main admin DB)
```sql
CREATE TABLE product_databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  database_type VARCHAR(50) NOT NULL, -- 'supabase', 'postgres', 'mysql', etc.
  connection_url TEXT NOT NULL, -- Encrypted
  connection_config JSONB, -- Additional config (schema, pool settings, etc.)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

2. **Database Connection Manager**
- Dynamic connection pool per product
- Connection caching/reuse
- Health checks and failover
- Encrypted credential storage

3. **Product-Specific Schema Mappers**
- Map common operations (users, data, analytics) across different schemas
- Abstract product differences behind a unified interface

#### Pros
✅ Complete data isolation per product
✅ Easy to add new products
✅ No schema conflicts
✅ Can scale each product independently
✅ Product-specific optimizations possible

#### Cons
❌ More complex connection management
❌ Cross-product queries require multiple connections
❌ Need to handle connection failures gracefully

---

### **Approach 2: API Gateway Pattern**

#### Overview
Each product exposes its own API. The admin panel communicates with product APIs instead of direct database access.

#### Architecture Components

1. **Product API Services**
   - Each product has its own API service
   - Standardized REST/GraphQL interface
   - Authentication via API keys or OAuth

2. **Admin API Gateway**
   - Routes requests to appropriate product API
   - Aggregates data from multiple products
   - Handles authentication/authorization
   - Rate limiting and caching

3. **Product Registry**
```sql
CREATE TABLE product_apis (
  id UUID PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  api_base_url TEXT NOT NULL,
  api_key_encrypted TEXT,
  api_version VARCHAR(20),
  health_check_endpoint TEXT,
  is_active BOOLEAN DEFAULT true
);
```

#### Pros
✅ Better security (no direct DB access)
✅ Products can be in different tech stacks
✅ Easier to version APIs
✅ Can add caching/rate limiting
✅ Microservices-ready

#### Cons
❌ Requires building/maintaining APIs for each product
❌ Network latency
❌ More moving parts
❌ API versioning complexity

---

### **Approach 3: Hybrid Approach (Best of Both Worlds)**

#### Overview
Combine direct database access for admin operations with API access for product-specific features.

#### Architecture
- **Direct DB Access**: For read-heavy admin operations (analytics, user management)
- **API Access**: For write operations and product-specific features
- **Smart Routing**: Route based on operation type and product capabilities

---

## Recommended Implementation Strategy

### Phase 1: Foundation (Week 1-2)

1. **Create Product Database Registry**
```sql
-- Enhanced product_databases table
CREATE TABLE product_databases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) UNIQUE,
  product_name VARCHAR(255) NOT NULL,
  
  -- Connection details (encrypted)
  db_type VARCHAR(50) NOT NULL, -- 'supabase', 'postgres', 'mysql'
  connection_url_encrypted TEXT NOT NULL,
  service_role_key_encrypted TEXT,
  
  -- Configuration
  schema_name VARCHAR(100) DEFAULT 'public',
  connection_pool_size INTEGER DEFAULT 10,
  max_connections INTEGER DEFAULT 20,
  
  -- Metadata
  product_version VARCHAR(50),
  last_health_check TIMESTAMP,
  health_status VARCHAR(20) DEFAULT 'unknown', -- 'healthy', 'degraded', 'down'
  
  -- Access control
  admin_access_level VARCHAR(50) DEFAULT 'full', -- 'full', 'read_only', 'limited'
  allowed_operations TEXT[], -- ['read_users', 'read_data', 'write_config']
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_product_databases_product_id ON product_databases(product_id);
CREATE INDEX idx_product_databases_active ON product_databases(is_active) WHERE is_active = true;
```

2. **Database Connection Service**
```javascript
// backend/services/productDatabaseService.js
class ProductDatabaseService {
  constructor() {
    this.connections = new Map(); // Cache connections
    this.connectionPools = new Map();
  }

  async getConnection(productId) {
    // Check cache
    if (this.connections.has(productId)) {
      return this.connections.get(productId);
    }

    // Fetch product DB config
    const dbConfig = await this.getProductDbConfig(productId);
    
    // Create connection based on type
    const connection = await this.createConnection(dbConfig);
    
    // Cache connection
    this.connections.set(productId, connection);
    
    return connection;
  }

  async createConnection(config) {
    switch(config.db_type) {
      case 'supabase':
        return this.createSupabaseConnection(config);
      case 'postgres':
        return this.createPostgresConnection(config);
      default:
        throw new Error(`Unsupported DB type: ${config.db_type}`);
    }
  }

  async healthCheck(productId) {
    try {
      const conn = await this.getConnection(productId);
      // Perform simple query
      await conn.from('profiles').select('count', { count: 'exact', head: true });
      return { status: 'healthy', timestamp: new Date() };
    } catch (error) {
      return { status: 'down', error: error.message, timestamp: new Date() };
    }
  }
}
```

### Phase 2: Unified Data Access Layer (Week 3-4)

3. **Schema Abstraction Layer**
```javascript
// backend/services/schemaMapper.js
class SchemaMapper {
  // Map common operations across different product schemas
  
  async getUsers(productId, filters = {}) {
    const conn = await productDbService.getConnection(productId);
    const config = await this.getProductSchemaConfig(productId);
    
    // Different products might have different user table names
    const userTable = config.userTable || 'profiles';
    const userFields = config.userFields || ['id', 'email', 'full_name'];
    
    return await conn
      .from(userTable)
      .select(userFields.join(', '))
      .match(filters);
  }

  async getProductStats(productId) {
    const conn = await productDbService.getConnection(productId);
    const config = await this.getProductSchemaConfig(productId);
    
    // Product-specific stats queries
    return await this.executeProductQuery(productId, 'stats', config);
  }
}

// Product schema configuration
const productSchemas = {
  'recruitment-ats': {
    userTable: 'profiles',
    candidateTable: 'Applicant',
    jobTable: 'jobs',
    statsQueries: {
      totalCandidates: 'SELECT COUNT(*) FROM "Applicant"',
      totalJobs: 'SELECT COUNT(*) FROM jobs',
      activeJobs: 'SELECT COUNT(*) FROM jobs WHERE status = \'active\''
    }
  },
  'product-2': {
    userTable: 'users',
    // ... different schema
  }
};
```

### Phase 3: Admin UI Components (Week 5-6)

4. **Product Selector Component**
```javascript
// front-end/src/components/ProductSelector.jsx
const ProductSelector = ({ onProductChange }) => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleProductChange = (productId) => {
    setSelectedProduct(productId);
    onProductChange(productId);
  };

  return (
    <Select value={selectedProduct} onChange={handleProductChange}>
      {products.map(product => (
        <Option key={product.id} value={product.id}>
          {product.name}
        </Option>
      ))}
    </Select>
  );
};
```

5. **Unified Admin Dashboard**
```javascript
// front-end/src/views/UnifiedAdminDashboard.jsx
const UnifiedAdminDashboard = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dashboardData, setDashboardData] = useState({});

  useEffect(() => {
    if (selectedProduct) {
      loadProductData(selectedProduct);
    }
  }, [selectedProduct]);

  const loadProductData = async (productId) => {
    const data = await api.get(`/admin/products/${productId}/dashboard`);
    setDashboardData(data);
  };

  return (
    <div>
      <ProductSelector onProductChange={setSelectedProduct} />
      {selectedProduct && (
        <ProductDashboard 
          productId={selectedProduct}
          data={dashboardData}
        />
      )}
    </div>
  );
};
```

---

## Security Considerations

### 1. **Credential Encryption**
```javascript
// Encrypt database credentials at rest
const encrypted = encrypt(dbCredentials, process.env.ENCRYPTION_KEY);
// Store encrypted in product_databases table
```

### 2. **Row Level Security (RLS)**
- Each product database should have RLS enabled
- Admin connections use service role keys (bypass RLS for admin operations)
- Regular users still respect RLS

### 3. **Access Control**
```sql
-- Track admin access to products
CREATE TABLE admin_product_access (
  admin_user_id UUID REFERENCES profiles(id),
  product_id UUID REFERENCES products(id),
  access_level VARCHAR(50), -- 'full', 'read_only', 'analytics_only'
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  PRIMARY KEY (admin_user_id, product_id)
);
```

### 4. **Audit Logging**
```sql
CREATE TABLE admin_operations_log (
  id UUID PRIMARY KEY,
  admin_user_id UUID,
  product_id UUID,
  operation VARCHAR(100), -- 'read_users', 'update_config', etc.
  resource_type VARCHAR(100),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Data Aggregation Strategies

### Cross-Product Analytics
```javascript
// Aggregate data across all products
async function getCrossProductStats() {
  const products = await getActiveProducts();
  
  const stats = await Promise.all(
    products.map(async (product) => {
      const conn = await productDbService.getConnection(product.id);
      return {
        productId: product.id,
        productName: product.name,
        stats: await getProductStats(conn, product.id)
      };
    })
  );
  
  return {
    totalProducts: products.length,
    totalUsers: stats.reduce((sum, s) => sum + s.stats.users, 0),
    productBreakdown: stats
  };
}
```

---

## Migration Path

### Step 1: Add Product Database Registry
- Create `product_databases` table
- Add encryption service for credentials
- Create connection manager service

### Step 2: Build Schema Mappers
- Document each product's schema
- Create mapping configurations
- Build abstraction layer

### Step 3: Create Admin Endpoints
- `/api/admin/products/:id/dashboard` - Product dashboard data
- `/api/admin/products/:id/users` - Product users
- `/api/admin/products/:id/stats` - Product statistics
- `/api/admin/products/:id/config` - Product configuration

### Step 4: Build Admin UI
- Product selector
- Unified dashboard
- Product-specific views
- Cross-product analytics

### Step 5: Testing & Rollout
- Test with one product first
- Gradually add more products
- Monitor performance and errors

---

## Performance Optimization

1. **Connection Pooling**: Reuse database connections
2. **Caching**: Cache frequently accessed data (Redis)
3. **Lazy Loading**: Load product data on-demand
4. **Pagination**: Always paginate large datasets
5. **Background Jobs**: Use queues for heavy operations

---

## Monitoring & Observability

1. **Health Checks**: Regular checks on all product databases
2. **Performance Metrics**: Track query times, connection pool usage
3. **Error Tracking**: Log and alert on connection failures
4. **Usage Analytics**: Track which products are accessed most

---

## Example: Admin API Endpoints

```javascript
// backend/routes/admin.routes.js

// Get all products with health status
GET /api/admin/products
Response: {
  products: [
    {
      id: "uuid",
      name: "Recruitment ATS",
      healthStatus: "healthy",
      lastHealthCheck: "2024-01-15T10:30:00Z",
      stats: {
        totalUsers: 150,
        totalJobs: 45,
        activeJobs: 12
      }
    }
  ]
}

// Get product dashboard data
GET /api/admin/products/:productId/dashboard
Response: {
  productId: "uuid",
  productName: "Recruitment ATS",
  stats: {
    users: { total: 150, active: 120, new: 5 },
    jobs: { total: 45, active: 12, closed: 33 },
    candidates: { total: 500, shortlisted: 50 }
  },
  recentActivity: [...],
  alerts: [...]
}

// Get product users
GET /api/admin/products/:productId/users?page=1&limit=50
Response: {
  users: [...],
  pagination: { page: 1, limit: 50, total: 150 }
}

// Execute product-specific query
POST /api/admin/products/:productId/query
Body: {
  query: "SELECT * FROM jobs WHERE status = 'active'",
  params: {}
}
```

---

## Recommended Tech Stack

- **Backend**: Node.js/Express (your current stack)
- **Database Connections**: 
  - Supabase JS client for Supabase products
  - `pg` library for direct PostgreSQL
  - Connection pooling with `pg-pool`
- **Encryption**: `crypto` or `node-forge` for credential encryption
- **Caching**: Redis for connection and data caching
- **Monitoring**: Winston for logging, Prometheus for metrics
- **Frontend**: React (your current stack)

---

## Next Steps

1. **Choose Approach**: Start with Approach 1 (Database Connection Pool)
2. **Create Product Registry**: Implement the `product_databases` table
3. **Build Connection Service**: Create the database connection manager
4. **Test with One Product**: Start with your recruitment ATS product
5. **Iterate**: Add more products gradually

---

## Questions to Consider

1. **Do all products use the same database type?** (Supabase, PostgreSQL, etc.)
2. **What admin operations do you need?** (Read-only analytics vs. full CRUD)
3. **Do you need real-time data or is cached data acceptable?**
4. **What's your security requirement?** (Direct DB access vs. API-only)
5. **How many admins will use this panel?** (Affects connection pooling needs)

---

This architecture provides a scalable, secure, and maintainable solution for managing multiple product databases from a single admin panel.

