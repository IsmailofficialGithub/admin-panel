import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  DollarSign, 
  TrendingUp,
  Package,
  Calendar,
  Award,
  ShoppingCart,
  Activity
} from 'lucide-react';
import { Container, Row, Col, Card, Table, Badge } from 'react-bootstrap';

const ResellerDashboard = () => {
  // Demo data - will be replaced with real API calls later
  const [stats, setStats] = useState({
    totalConsumers: 0,
    activeConsumers: 0,
    expiredConsumers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalOrders: 0,
    newConsumersThisMonth: 0,
    commissionEarned: 0
  });

  const [recentConsumers, setRecentConsumers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call with demo data
    setTimeout(() => {
      setStats({
        totalConsumers: 127,
        activeConsumers: 98,
        expiredConsumers: 29,
        totalRevenue: 15680,
        monthlyRevenue: 3450,
        totalOrders: 234,
        newConsumersThisMonth: 12,
        commissionEarned: 2340
      });

      setRecentConsumers([
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          status: 'active',
          subscription: 'Premium Plan',
          joinDate: '2025-10-15',
          expiryDate: '2025-11-15'
        },
        {
          id: 2,
          name: 'Jane Smith',
          email: 'jane@example.com',
          status: 'active',
          subscription: 'Basic Plan',
          joinDate: '2025-10-20',
          expiryDate: '2025-11-20'
        },
        {
          id: 3,
          name: 'Mike Johnson',
          email: 'mike@example.com',
          status: 'expired',
          subscription: 'Pro Plan',
          joinDate: '2025-09-10',
          expiryDate: '2025-10-10'
        },
        {
          id: 4,
          name: 'Sarah Williams',
          email: 'sarah@example.com',
          status: 'active',
          subscription: 'Premium Plan',
          joinDate: '2025-10-25',
          expiryDate: '2025-11-25'
        },
        {
          id: 5,
          name: 'David Brown',
          email: 'david@example.com',
          status: 'active',
          subscription: 'Basic Plan',
          joinDate: '2025-10-28',
          expiryDate: '2025-11-28'
        }
      ]);

      setLoading(false);
    }, 500);
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
    <Card 
      style={{
        border: 'none',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        height: '100%'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
      }}
    >
      <Card.Body style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#6c757d',
              fontWeight: '500',
              marginBottom: '8px'
            }}>
              {title}
            </p>
            <h2 style={{
              margin: 0,
              fontSize: '32px',
              fontWeight: '700',
              color: '#2c3e50',
              marginBottom: '4px'
            }}>
              {loading ? (
                <span style={{ color: '#dee2e6' }}>---</span>
              ) : (
                value
              )}
            </h2>
            {subtitle && (
              <p style={{
                margin: 0,
                fontSize: '12px',
                color: '#95a5a6',
                marginTop: '4px'
              }}>
                {subtitle}
              </p>
            )}
            {trend && (
              <div style={{
                marginTop: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <TrendingUp size={14} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '500' }}>
                  {trend}
                </span>
              </div>
            )}
          </div>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={28} style={{ color: color }} />
          </div>
        </div>
      </Card.Body>
    </Card>
  );

  const getStatusBadge = (status) => {
    const statusColors = {
      active: 'success',
      expired: 'danger',
      pending: 'warning'
    };
    return (
      <Badge bg={statusColors[status]} style={{ textTransform: 'capitalize' }}>
        {status}
      </Badge>
    );
  };

  return (
    <Container fluid style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#2c3e50',
          margin: '0 0 8px 0'
        }}>
          Reseller Dashboard
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#6c757d',
          margin: 0
        }}>
          Manage your consumers and track your performance
        </p>
      </div>

      {/* Statistics Cards */}
      <Row style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Total Consumers"
            value={stats.totalConsumers.toLocaleString()}
            icon={Users}
            color="#3b82f6"
            subtitle="All your consumers"
            trend="+12 this month"
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Active Consumers"
            value={stats.activeConsumers.toLocaleString()}
            icon={UserCheck}
            color="#10b981"
            subtitle="With active subscriptions"
            trend="+8 this month"
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Expired Consumers"
            value={stats.expiredConsumers.toLocaleString()}
            icon={UserX}
            color="#ef4444"
            subtitle="Need renewal"
            trend="-3 from last month"
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Commission Earned"
            value={`$${stats.commissionEarned.toLocaleString()}`}
            icon={Award}
            color="#8b5cf6"
            subtitle="Total earnings"
            trend="+15% this month"
          />
        </Col>
      </Row>

      {/* Revenue Statistics */}
      <Row style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Monthly Revenue"
            value={`$${stats.monthlyRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="#ec4899"
            subtitle="This month"
            trend="+22% from last month"
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={TrendingUp}
            color="#f59e0b"
            subtitle="All time"
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Total Orders"
            value={stats.totalOrders.toLocaleString()}
            icon={ShoppingCart}
            color="#06b6d4"
            subtitle="Completed orders"
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Active Products"
            value="12"
            icon={Package}
            color="#14b8a6"
            subtitle="Available for sale"
          />
        </Col>
      </Row>

      {/* Recent Consumers Table */}
      <Row>
        <Col xs={12}>
          <Card style={{
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
          }}>
            <Card.Body style={{ padding: '24px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <div>
                  <h4 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#2c3e50',
                    margin: '0 0 4px 0'
                  }}>
                    Recent Consumers
                  </h4>
                  <p style={{
                    fontSize: '14px',
                    color: '#6c757d',
                    margin: 0
                  }}>
                    Your latest consumer registrations
                  </p>
                </div>
                <button
                  onClick={() => window.location.href = '/reseller/consumers'}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#74317e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#5a2460';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#74317e';
                  }}
                >
                  View All
                </button>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f4f6',
                    borderTop: '4px solid #74317e',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto'
                  }} />
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <Table hover responsive style={{ marginBottom: 0 }}>
                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                      <tr>
                        <th style={{ 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          color: '#6c757d',
                          textTransform: 'uppercase',
                          padding: '12px',
                          border: 'none'
                        }}>
                          Consumer
                        </th>
                        <th style={{ 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          color: '#6c757d',
                          textTransform: 'uppercase',
                          padding: '12px',
                          border: 'none'
                        }}>
                          Subscription
                        </th>
                        <th style={{ 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          color: '#6c757d',
                          textTransform: 'uppercase',
                          padding: '12px',
                          border: 'none'
                        }}>
                          Status
                        </th>
                        <th style={{ 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          color: '#6c757d',
                          textTransform: 'uppercase',
                          padding: '12px',
                          border: 'none'
                        }}>
                          Join Date
                        </th>
                        <th style={{ 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          color: '#6c757d',
                          textTransform: 'uppercase',
                          padding: '12px',
                          border: 'none'
                        }}>
                          Expiry Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentConsumers.map((consumer) => (
                        <tr key={consumer.id} style={{ cursor: 'pointer' }}>
                          <td style={{ padding: '12px', borderTop: '1px solid #e9ecef' }}>
                            <div>
                              <div style={{ 
                                fontSize: '14px', 
                                fontWeight: '500', 
                                color: '#2c3e50',
                                marginBottom: '2px'
                              }}>
                                {consumer.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#95a5a6' }}>
                                {consumer.email}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '12px', borderTop: '1px solid #e9ecef' }}>
                            <span style={{ 
                              fontSize: '14px', 
                              color: '#495057',
                              fontWeight: '500'
                            }}>
                              {consumer.subscription}
                            </span>
                          </td>
                          <td style={{ padding: '12px', borderTop: '1px solid #e9ecef' }}>
                            {getStatusBadge(consumer.status)}
                          </td>
                          <td style={{ padding: '12px', borderTop: '1px solid #e9ecef' }}>
                            <span style={{ fontSize: '14px', color: '#6c757d' }}>
                              {new Date(consumer.joinDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </td>
                          <td style={{ padding: '12px', borderTop: '1px solid #e9ecef' }}>
                            <span style={{ fontSize: '14px', color: '#6c757d' }}>
                              {new Date(consumer.expiryDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Loading Animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </Container>
  );
};

export default ResellerDashboard;

