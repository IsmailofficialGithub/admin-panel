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
  Activity,
  Percent
} from 'lucide-react';
import { Container, Row, Col, Card, Table, Badge } from 'react-bootstrap';
import apiClient from '../services/apiClient';
import { getMyCommission } from '../api/backend';
import { useAuth } from '../hooks/useAuth';

const ResellerDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalConsumers: 0,
    activeConsumers: 0,
    expiredConsumers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalOrders: 0,
    newConsumersThisMonth: 0,
    commissionEarned: 0,
    commissionRate: 0
  });

  const [recentConsumers, setRecentConsumers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commissionData, setCommissionData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch commission data
      const commissionResult = await getMyCommission();
      console.log('📊 Commission Result:', commissionResult);
      
      let commissionRate = 0;
      let commissionDataToSet = null;
      
      if (commissionResult && commissionResult.success && commissionResult.data) {
        // Standard response structure: { success: true, data: { commissionRate: 30, ... } }
        commissionRate = parseFloat(commissionResult.data.commissionRate || 0);
        commissionDataToSet = commissionResult.data;
        console.log('📊 Parsed Commission Rate (standard structure):', commissionRate);
      } else if (commissionResult && commissionResult.commissionRate !== undefined) {
        // Alternative response structure: { commissionRate: 30, ... }
        commissionRate = parseFloat(commissionResult.commissionRate || 0);
        commissionDataToSet = commissionResult;
        console.log('📊 Parsed Commission Rate (alternative structure):', commissionRate);
      } else {
        console.warn('⚠️ Commission result structure unexpected:', commissionResult);
      }
      
      if (commissionRate > 0 || commissionDataToSet) {
        setCommissionData(commissionDataToSet);
        setStats(prev => ({
          ...prev,
          commissionRate: commissionRate
        }));
      }

      // Fetch consumers count
      try {
        const consumersResponse = await apiClient.resellers.getMyConsumers();
        console.log('📊 Consumers response:', consumersResponse);
        
        if (consumersResponse) {
          // Handle different response structures
          let consumers = [];
          if (consumersResponse.data) {
            if (consumersResponse.data.data) {
              consumers = consumersResponse.data.data;
            } else if (Array.isArray(consumersResponse.data)) {
              consumers = consumersResponse.data;
            }
          } else if (Array.isArray(consumersResponse)) {
            consumers = consumersResponse;
          }
          
          console.log('📊 Processed consumers:', consumers);
          
          // Calculate active and expired consumers
          // Active: account_status is 'active' OR trial_expiry is in the future
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          const activeConsumers = consumers.filter(c => {
            if (c.account_status === 'active') return true;
            if (c.trial_expiry) {
              const expiryDate = new Date(c.trial_expiry);
              return expiryDate > now;
            }
            return false;
          }).length;
          
          // Expired: account_status is 'expired_subscription' OR trial_expiry is in the past
          const expiredConsumers = consumers.filter(c => {
            if (c.account_status === 'expired_subscription') return true;
            if (c.trial_expiry) {
              const expiryDate = new Date(c.trial_expiry);
              return expiryDate <= now;
            }
            return c.account_status === 'expired' || c.account_status === 'inactive';
          }).length;
        
          // Get recent consumers (last 5)
          const recent = consumers.slice(0, 5).map(c => ({
            id: c.user_id,
            name: c.full_name || 'Unknown',
            email: c.email || '',
            status: c.account_status || 'active',
            subscription: 'Active',
            joinDate: c.created_at,
            expiryDate: c.trial_expiry
          }));

          // Calculate new consumers this month
          const newThisMonth = consumers.filter(c => {
            const createdDate = new Date(c.created_at);
            return createdDate >= startOfMonth;
          }).length;

          setRecentConsumers(recent);
          setStats(prev => ({
            ...prev,
            totalConsumers: consumers.length,
            activeConsumers,
            expiredConsumers,
            newConsumersThisMonth: newThisMonth
          }));
        }
      } catch (error) {
        console.error('❌ Error fetching consumers:', error);
        // Don't break the entire dashboard if consumers fail to load
      }

      // Fetch invoices to calculate revenue
      try {
        const invoicesResponse = await apiClient.invoices.getMyInvoices('?status=paid');
        if (invoicesResponse && invoicesResponse.data) {
          const invoices = invoicesResponse.data.data || invoicesResponse.data || [];
          
          // Calculate total revenue from paid invoices
          const totalRevenue = invoices.reduce((sum, inv) => {
            return sum + parseFloat(inv.total_amount || inv.total || 0);
          }, 0);

          // Calculate monthly revenue
          const invoiceNow = new Date();
          const invoiceStartOfMonth = new Date(invoiceNow.getFullYear(), invoiceNow.getMonth(), 1);
          const monthlyRevenue = invoices
            .filter(inv => {
              const createdDate = new Date(inv.created_at || inv.createdAt);
              return createdDate >= invoiceStartOfMonth;
            })
            .reduce((sum, inv) => {
              return sum + parseFloat(inv.total_amount || inv.total || 0);
            }, 0);

          // Calculate commission earnings using the commission rate from stats (already set from API)
          const commissionRate = stats.commissionRate || (commissionData ? parseFloat(commissionData.commissionRate || 0) : 0);
          const commissionEarned = (totalRevenue * commissionRate) / 100;

          setStats(prev => ({
            ...prev,
            totalRevenue,
            monthlyRevenue,
            totalOrders: invoices.length,
            commissionEarned
          }));
        }
      } catch (error) {
        console.error('❌ Error fetching invoices:', error);
        // Don't break the entire dashboard if invoices fail to load
      }
    } catch (error) {
      console.error('❌ Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
            title="Commission Rate"
            value={loading ? '---' : `${stats.commissionRate.toFixed(2)}%`}
            icon={Percent}
            color="#8b5cf6"
            subtitle={commissionData && commissionData.commissionType === 'custom' ? 'Custom rate' : 'Default rate'}
          />
        </Col>
      </Row>

      {/* Total Revenue and Reseller Earnings Row */}
      <Row style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6} lg={6} style={{ marginBottom: '24px' }}>
          <StatCard
            title="TOTAL REVENUE"
            value={loading ? '---' : `$${stats.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="#f59e0b"
            subtitle="Total revenue from all consumers' paid invoices"
          />
        </Col>
        <Col xs={12} sm={6} lg={6} style={{ marginBottom: '24px' }}>
          <StatCard
            title="RESELLER EARNINGS"
            value={loading ? '---' : `$${stats.commissionEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={Award}
            color="#10b981"
            subtitle={stats.commissionRate > 0 ? `(${stats.commissionRate.toFixed(2)}% commission)` : '(0.00% commission)'}
            trend={stats.totalRevenue > 0 ? `Total profit from referred consumers` : 'No revenue yet'}
          />
        </Col>
      </Row>

      {/* Additional Statistics */}
      <Row style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Monthly Revenue"
            value={loading ? '---' : `$${stats.monthlyRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="#ec4899"
            subtitle="This month"
            trend={stats.commissionRate > 0 ? `Est. earnings: $${((stats.monthlyRevenue * stats.commissionRate) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Total Orders"
            value={loading ? '---' : stats.totalOrders.toLocaleString()}
            icon={ShoppingCart}
            color="#06b6d4"
            subtitle="Paid invoices"
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="New Consumers This Month"
            value={loading ? '---' : stats.newConsumersThisMonth.toLocaleString()}
            icon={TrendingUp}
            color="#14b8a6"
            subtitle="Recent signups"
          />
        </Col>
        <Col xs={12} sm={6} lg={3} style={{ marginBottom: '24px' }}>
          <StatCard
            title="Active Products"
            value={loading ? '---' : '12'}
            icon={Package}
            color="#8b5cf6"
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

