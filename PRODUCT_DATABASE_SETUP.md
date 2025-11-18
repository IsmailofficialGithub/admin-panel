# Product Database Setup Guide

## Overview
This guide explains how to configure product databases so admins can switch between different products and view their data in the unified admin panel.

## Prerequisites
1. You have multiple products, each with its own database
2. You have admin access to the main admin database
3. You have the Supabase URL and Service Role Key for each product database

## Step 1: Run the Migration

Run the migration to create the `product_databases` table:

```sql
-- Run this in your main admin database
\i backend/migrations/009_create_product_databases_table.sql
```

Or manually execute the SQL from `backend/migrations/009_create_product_databases_table.sql`

## Step 2: Register a Product Database

For each product, you need to register its database connection details.

### Example: Registering a Supabase Product Database

```sql
INSERT INTO product_databases (
  product_id,
  product_name,
  db_type,
  supabase_url,
  supabase_service_key_encrypted,
  is_active
) VALUES (
  (SELECT id FROM products WHERE name = 'Recruitment ATS'), -- Replace with your product name
  'Recruitment ATS',
  'supabase',
  'https://your-project-id.supabase.co',
  'your-service-role-key-here', -- In production, encrypt this!
  true
);
```

**Important Security Note:**
- In production, you should encrypt the `supabase_service_key_encrypted` field
- The backend service includes encryption/decryption helpers, but for now it stores the key as-is
- Consider using a proper encryption service for production

## Step 3: Verify the Setup

1. Go to `/admin/products` in your admin panel
2. You should see all your products listed
3. Click the "..." menu on a product card
4. Click "Switch to Product"
5. You should be redirected to `/admin/product/:id` where you can see:
   - Product dashboard with statistics
   - Users from that product's database
   - Database connection information

## Step 4: Test the Connection

The system automatically performs health checks when you view a product. You can verify the connection status in the product detail page.

## Troubleshooting

### "Product database not configured" Error
- Make sure you've run the migration and inserted a record in `product_databases`
- Verify the `product_id` matches an existing product

### "Product database config not found" Error
- Check that `is_active = true` in the `product_databases` table
- Verify the `product_id` is correct

### Health Check Fails
- Verify the Supabase URL is correct
- Verify the Service Role Key is correct and has proper permissions
- Check that the product database is accessible
- Ensure the database has at least a `profiles` or `users` table

### No Data Showing
- Check that the product database has data
- Verify the table names match what the system expects (profiles, users, jobs, etc.)
- Check the browser console for errors

## Database Connection Details

### For Supabase Products
- `db_type`: `'supabase'`
- `supabase_url`: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
- `supabase_service_key_encrypted`: Your Supabase service role key

### For Direct PostgreSQL (Future)
- `db_type`: `'postgres'`
- `postgres_host`: Database host
- `postgres_port`: Database port (default: 5432)
- `postgres_database`: Database name
- `postgres_user_encrypted`: Database user (encrypted)
- `postgres_password_encrypted`: Database password (encrypted)

## API Endpoints

Once configured, these endpoints are available (admin only):

- `GET /api/admin/products/:id` - Get product detail with database info
- `GET /api/admin/products/:id/dashboard` - Get product dashboard statistics
- `GET /api/admin/products/:id/users` - Get product users (with pagination)

## Security Considerations

1. **Encryption**: Encrypt sensitive credentials before storing
2. **Access Control**: Only admins can access product databases
3. **Service Role Keys**: Use service role keys with minimal required permissions
4. **Audit Logging**: Consider logging all admin operations on product databases
5. **Connection Pooling**: The system caches connections for performance

## Next Steps

After setting up product databases, you can:
1. View real-time statistics from each product
2. Manage users across different products
3. Monitor database health
4. Add more product-specific views and features

For more information, see:
- `UNIFIED_ADMIN_ARCHITECTURE.md` - Architecture overview
- `IMPLEMENTATION_EXAMPLE.md` - Code examples
- `QUICK_START_GUIDE.md` - Quick reference

