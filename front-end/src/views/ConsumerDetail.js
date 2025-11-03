import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Button, Table } from 'react-bootstrap';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Package, Edit, Trash2, Key, FileText, DollarSign, Eye, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getConsumerById, resetConsumerPassword, deleteConsumer } from '../api/backend';
import { getConsumerInvoices } from '../api/backend/invoices';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../services/apiClient';

function ConsumerDetail() {
  const { id } = useParams();
  const history = useHistory();
  const { isAdmin, isReseller } = useAuth();
  const [consumer, setConsumer] = useState(null);
  const [products, setProducts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [invoicesLoading, setInvoicesLoading] = useState(true);

  useEffect(() => {
    fetchConsumerData();
    fetchConsumerProducts();
    fetchConsumerInvoices();
  }, [id]);

  const fetchConsumerData = async () => {
    setLoading(true);
    try {
      let result;
      
      // If reseller, use reseller's consumer endpoint
      if (isReseller) {
        result = await apiClient.resellers.getMyConsumers();
        if (result && result.success && result.data) {
          const consumerData = result.data.find(c => c.user_id === id);
          if (!consumerData) {
            toast.error('Consumer not found or you do not have access');
            history.push('/reseller/consumers');
            return;
          }
          setConsumer(consumerData);
        } else {
          toast.error('Failed to load consumer details');
          history.push('/reseller/consumers');
        }
      } else if (isAdmin) {
        // Admin can see all consumers
        result = await getConsumerById(id);
        if (result && !result.error) {
          const consumerData = result.data || result;
          setConsumer(consumerData);
        } else {
          toast.error('Failed to load consumer details');
          history.push('/admin/consumers');
        }
      } else {
        toast.error('Access denied');
        history.push('/admin/consumers');
      }
    } catch (error) {
      console.error('Error fetching consumer:', error);
      toast.error('Error loading consumer details');
      if (isReseller) {
        history.push('/reseller/consumers');
      } else {
        history.push('/admin/consumers');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchConsumerProducts = async () => {
    setProductsLoading(true);
    try {
      // Get product access for this consumer
      const response = await apiClient.invoices.getConsumerProducts(id);
      if (response && response.success && response.data && response.data.products) {
        setProducts(response.data.products);
      }
    } catch (error) {
      console.error('Error fetching consumer products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchConsumerInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const response = await getConsumerInvoices(id);
      if (response && response.success && response.data) {
        setInvoices(response.data);
      }
    } catch (error) {
      console.error('Error fetching consumer invoices:', error);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numAmount);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return { bg: '#f0fdf4', border: '#86efac', text: '#166534' };
      case 'unpaid':
        return { bg: '#fffbeb', border: '#fde047', text: '#854d0e' };
      case 'overdue':
        return { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' };
      default:
        return { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' };
    }
  };

  const getAccountStatusBadge = (status) => {
    const statusColors = {
      active: 'success',
      deactive: 'danger',
      expired_subscription: 'danger'
    };
    const statusLabels = {
      active: 'Active',
      deactive: 'Deactive',
      expired_subscription: 'Expired Subscription'
    };
    return (
      <Badge bg={statusColors[status] || 'secondary'}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return null;
    try {
      const expiry = new Date(expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiry.setHours(0, 0, 0, 0);
      const diffTime = expiry - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (e) {
      return null;
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm(`Are you sure you want to reset password for ${consumer?.full_name || consumer?.email}?`)) {
      return;
    }

    try {
      const result = await resetConsumerPassword(id);
      if (result.success) {
        toast.success('Password reset email sent successfully!');
      } else {
        toast.error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast.error('Failed to reset password');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${consumer?.full_name || consumer?.email}? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteConsumer(id);
      if (result.success) {
        toast.success('Consumer deleted successfully!');
        if (isReseller) {
          history.push('/reseller/consumers');
        } else {
          history.push('/admin/consumers');
        }
      } else {
        toast.error(result.error || 'Failed to delete consumer');
      }
    } catch (error) {
      console.error('Error deleting consumer:', error);
      toast.error('Failed to delete consumer');
    }
  };

  if (loading) {
    return (
      <Container fluid style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #74317e',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <p>Loading consumer details...</p>
        </div>
      </Container>
    );
  }

  if (!consumer) {
    return (
      <Container fluid style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <p>Consumer not found</p>
          <Button onClick={() => {
            if (isReseller) {
              history.push('/reseller/consumers');
            } else {
              history.push('/admin/consumers');
            }
          }}>
            Back to Consumers
          </Button>
        </div>
      </Container>
    );
  }

  const daysRemaining = getDaysRemaining(consumer.trial_expiry);
  const isTrialExpired = daysRemaining !== null && daysRemaining < 0;

  return (
    <Container fluid style={{ padding: '24px' }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>

      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Button
            variant="outline-secondary"
            onClick={() => {
              if (isReseller) {
                history.push('/reseller/consumers');
              } else {
                history.push('/admin/consumers');
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px'
            }}
          >
            <ArrowLeft size={18} />
            Back
          </Button>
          <div>
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '600' }}>Consumer Details</h2>
            <p style={{ margin: '4px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
              View and manage consumer information
            </p>
          </div>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="outline-warning"
              onClick={handleResetPassword}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Key size={18} />
              Reset Password
            </Button>
            <Button
              variant="outline-danger"
              onClick={handleDelete}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Trash2 size={18} />
              Delete
            </Button>
          </div>
        )}
      </div>

      <Row>
        {/* Main Information */}
        <Col md={8}>
          <Card style={{ marginBottom: '24px' }}>
            <Card.Header style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
              <h5 style={{ margin: 0, fontWeight: '600' }}>Personal Information</h5>
            </Card.Header>
            <Card.Body style={{ padding: '24px' }}>
              <Row>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <User size={20} color="#6c757d" />
                    <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
                      Full Name
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212529' }}>
                    {consumer.full_name || 'N/A'}
                  </p>
                </Col>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <Mail size={20} color="#6c757d" />
                    <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
                      Email
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212529' }}>
                    {consumer.email || 'N/A'}
                  </p>
                </Col>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <Phone size={20} color="#6c757d" />
                    <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
                      Phone
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212529' }}>
                    {consumer.phone || 'N/A'}
                  </p>
                </Col>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <MapPin size={20} color="#6c757d" />
                    <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
                      Location
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212529' }}>
                    {consumer.city && consumer.country ? `${consumer.city}, ${consumer.country}` : (consumer.city || consumer.country || 'N/A')}
                  </p>
                </Col>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <Calendar size={20} color="#6c757d" />
                    <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
                      Trial Expiry
                    </span>
                  </div>
                  <div>
                    {consumer.trial_expiry ? (
                      <div>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212529' }}>
                          {formatDate(consumer.trial_expiry)}
                        </p>
                        {daysRemaining !== null && (
                          <Badge bg={isTrialExpired ? 'danger' : 'success'} style={{ marginTop: '4px' }}>
                            {isTrialExpired 
                              ? `Expired ${Math.abs(daysRemaining)} days ago` 
                              : `${daysRemaining} days remaining`}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#6c757d' }}>No trial expiry</p>
                    )}
                  </div>
                </Col>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
                      Account Status
                    </span>
                  </div>
                  <div>
                    {getAccountStatusBadge(consumer.account_status || 'active')}
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Products Section */}
          <Card style={{ marginBottom: '24px' }}>
            <Card.Header style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
              <h5 style={{ margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} />
                Subscribed Products
              </h5>
            </Card.Header>
            <Card.Body style={{ padding: '24px' }}>
              {productsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #74317e',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto'
                  }} />
                </div>
              ) : products.length === 0 ? (
                <p style={{ color: '#6c757d', textAlign: 'center', margin: 0 }}>No products subscribed</p>
              ) : (
                <Table striped hover>
                  <thead>
                    <tr>
                      <th>Product Name</th>
                      <th>Price</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, index) => (
                      <tr key={product.id || index}>
                        <td>{product.name || 'N/A'}</td>
                        <td>${product.price || 0}</td>
                        <td>{product.description || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>

          {/* Invoices Section */}
          <Card style={{ marginBottom: '24px' }}>
            <Card.Header style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
              <h5 style={{ margin: 0, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={20} />
                Invoices ({invoices.length})
              </h5>
            </Card.Header>
            <Card.Body style={{ padding: '24px' }}>
              {invoicesLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #74317e',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto'
                  }} />
                </div>
              ) : invoices.length === 0 ? (
                <p style={{ color: '#6c757d', textAlign: 'center', margin: 0 }}>No invoices found</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <Table striped hover>
                    <thead>
                      <tr>
                        <th>Invoice Number</th>
                        <th>Date</th>
                        <th>Due Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                        {isAdmin && <th>Reseller</th>}
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.map((invoice) => {
                        const statusStyle = getStatusColor(invoice.status);
                        return (
                          <tr key={invoice.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                              {invoice.invoice_number || invoice.id.substring(0, 8)}
                            </td>
                            <td>{formatShortDate(invoice.invoice_date)}</td>
                            <td>{formatShortDate(invoice.due_date)}</td>
                            <td style={{ fontWeight: '600', color: '#74317e' }}>
                              {formatCurrency(invoice.total)}
                            </td>
                            <td>
                              <Badge 
                                style={{
                                  backgroundColor: statusStyle.bg,
                                  color: statusStyle.text,
                                  border: `1px solid ${statusStyle.border}`,
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  textTransform: 'capitalize'
                                }}
                              >
                                {invoice.status || 'unpaid'}
                              </Badge>
                            </td>
                            {isAdmin && (
                              <td style={{ fontSize: '12px' }}>
                                {invoice.reseller_name || 'N/A'}
                              </td>
                            )}
                            <td>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <button
                                  onClick={() => {
                                    toast.success('View invoice functionality coming soon');
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: '#74317e',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px'
                                  }}
                                  title="View Invoice"
                                >
                                  <Eye size={12} />
                                </button>
                                <button
                                  onClick={() => {
                                    toast.success('Download invoice functionality coming soon');
                                  }}
                                  style={{
                                    padding: '4px 8px',
                                    backgroundColor: 'white',
                                    color: '#74317e',
                                    border: '1px solid #74317e',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '11px'
                                  }}
                                  title="Download Invoice"
                                >
                                  <Download size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Side Information */}
        <Col md={4}>
          <Card style={{ marginBottom: '24px' }}>
            <Card.Header style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #e9ecef' }}>
              <h5 style={{ margin: 0, fontWeight: '600' }}>Account Information</h5>
            </Card.Header>
            <Card.Body style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <Calendar size={18} color="#6c757d" />
                  <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
                    Created At
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#212529' }}>
                  {formatDate(consumer.created_at)}
                </p>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <Calendar size={18} color="#6c757d" />
                  <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
                    Updated At
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '14px', color: '#212529' }}>
                  {formatDate(consumer.updated_at)}
                </p>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
                    Consumer ID
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace', color: '#6c757d', wordBreak: 'break-all' }}>
                  {consumer.user_id || consumer.id}
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default ConsumerDetail;

