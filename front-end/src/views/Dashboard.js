import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Store, 
  TrendingUp, 
  Activity,
  Calendar,
  DollarSign,
  FileText,
  Package
} from 'lucide-react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { getDashboardStats } from '../api/backend';
import toast from 'react-hot-toast';

const Dashboard = () => {
  // Real data from API
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalConsumers: 0,
    activeConsumers: 0,
    expiredConsumers: 0,
    totalResellers: 0,
    newUsersThisMonth: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    revenueThisMonth: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
    totalProducts: 0,
    serverStatus: 'online'
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setLoading(true);
        const result = await getDashboardStats();
        
        console.log('📊 Dashboard Result:', result);
        
        if (result && result.success && result.data) {
          setStats({
            ...result.data
          });
        } else if (result && result.success === false) {
          toast.error(result.error || 'Failed to load dashboard statistics');
        } else {
          // If result is the data directly
          if (result && typeof result === 'object' && result.totalUsers !== undefined) {
            setStats({
              ...result
            });
          } else {
            console.error('Unexpected response format:', result);
            toast.error('Failed to load dashboard statistics');
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast.error('Failed to load dashboard statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardStats();
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

  const QuickActionCard = ({ title, description, icon: Icon, color, onClick }) => (
    <Card 
      onClick={onClick}
      style={{
        border: 'none',
        borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        height: '100%'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
      }}
    >
      <Card.Body style={{ padding: '20px', textAlign: 'center' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '10px',
          background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px'
        }}>
          <Icon size={24} style={{ color: color }} />
        </div>
        <h6 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#2c3e50' }}>
          {title}
        </h6>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#95a5a6' }}>
          {description}
        </p>
      </Card.Body>
    </Card>
  );

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
          Dashboard Overview
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#6c757d',
          margin: 0
        }}>
          Welcome back! Here's what's happening with your platform today.
        </p>
      </div>

      {/* Statistics Cards */}
      <Row style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={Users}
            color="#74317e"
            subtitle="All registered users"
            trend="+12% from last month"
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Active Consumers"
            value={stats.activeConsumers.toLocaleString()}
            icon={UserCheck}
            color="#10b981"
            subtitle="With active subscriptions"
            trend="+8% from last month"
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Expired Consumers"
            value={stats.expiredConsumers.toLocaleString()}
            icon={UserX}
            color="#ef4444"
            subtitle="Subscription expired"
            trend="-5% from last month"
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Total Resellers"
            value={stats.totalResellers.toLocaleString()}
            icon={Store}
            color="#8b5cf6"
            subtitle="Active reseller accounts"
            trend="+3 new this month"
          />
        </Col>
      </Row>

      {/* Additional Statistics */}
      <Row style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="New Users"
            value={stats.newUsersThisMonth.toLocaleString()}
            icon={Calendar}
            color="#f59e0b"
            subtitle="This month"
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Active Subscriptions"
            value={stats.activeSubscriptions.toLocaleString()}
            icon={Activity}
            color="#06b6d4"
            subtitle="Currently active"
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="#ec4899"
            subtitle={`$${stats.revenueThisMonth.toLocaleString()} this month`}
            trend={stats.revenueThisMonth > 0 ? `+$${stats.revenueThisMonth.toLocaleString()} this month` : null}
          />
        </Col>
      </Row>

      {/* Additional Statistics Row */}
      <Row style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Total Invoices"
            value={stats.totalInvoices.toLocaleString()}
            icon={FileText}
            color="#06b6d4"
            subtitle={`${stats.paidInvoices} paid, ${stats.unpaidInvoices} unpaid`}
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Total Products"
            value={stats.totalProducts.toLocaleString()}
            icon={Package}
            color="#f59e0b"
            subtitle="Available products"
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Total Consumers"
            value={stats.totalConsumers.toLocaleString()}
            icon={UserCheck}
            color="#10b981"
            subtitle={`${stats.activeConsumers} active, ${stats.expiredConsumers} expired`}
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <Card 
            style={{
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
              height: '100%',
              background: stats.serverStatus === 'online' 
                ? 'linear-gradient(135deg, #10b98115 0%, #10b98125 100%)'
                : 'linear-gradient(135deg, #ef444415 0%, #ef444425 100%)'
            }}
          >
            <Card.Body style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: stats.serverStatus === 'online' ? '#10b981' : '#ef4444',
                  animation: 'pulse 2s infinite'
                }} />
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#6c757d', fontWeight: '500' }}>
                    Server Status
                  </p>
                  <h3 style={{ 
                    margin: '4px 0 0 0', 
                    fontSize: '24px', 
                    fontWeight: '700',
                    color: stats.serverStatus === 'online' ? '#10b981' : '#ef4444',
                    textTransform: 'capitalize'
                  }}>
                    {stats.serverStatus}
                  </h3>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#2c3e50',
          margin: '0 0 16px 0'
        }}>
          Quick Actions
        </h4>
      </div>
      <Row>
        <Col xs={12} sm={6} md={4} lg={3} style={{ marginBottom: '16px' }}>
          <QuickActionCard
            title="Manage Users"
            description="View and edit users"
            icon={Users}
            color="#74317e"
            onClick={() => window.location.href = '/admin/users'}
          />
        </Col>
        <Col xs={12} sm={6} md={4} lg={3} style={{ marginBottom: '16px' }}>
          <QuickActionCard
            title="View Consumers"
            description="Manage consumers"
            icon={UserCheck}
            color="#10b981"
            onClick={() => window.location.href = '/admin/consumers'}
          />
        </Col>
        <Col xs={12} sm={6} md={4} lg={3} style={{ marginBottom: '16px' }}>
          <QuickActionCard
            title="Manage Resellers"
            description="View reseller accounts"
            icon={Store}
            color="#8b5cf6"
            onClick={() => window.location.href = '/admin/resellers'}
          />
        </Col>
        <Col xs={12} sm={6} md={4} lg={3} style={{ marginBottom: '16px' }}>
          <QuickActionCard
            title="Activity Report"
            description="View system activity"
            icon={Activity}
            color="#f59e0b"
            onClick={() => alert('Activity reports coming soon!')}
          />
        </Col>
      </Row>

      {/* Pulse Animation */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>
    </Container>
  );
};

export default Dashboard;
