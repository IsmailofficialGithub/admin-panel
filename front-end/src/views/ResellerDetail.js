import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { Card, Table, Container, Row, Col, Button, Badge } from 'react-bootstrap';
import { toast } from 'react-hot-toast';
import { getResellerById } from '../api/backend/resellers';
import apiClient from '../services/apiClient';

function ResellerDetail() {
  const { id } = useParams();
  const history = useHistory();
  const [reseller, setReseller] = useState(null);
  const [consumers, setConsumers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [consumersLoading, setConsumersLoading] = useState(true);

  useEffect(() => {
    fetchResellerData();
    fetchReferredConsumers();
  }, [id]);

  const fetchResellerData = async () => {
    setLoading(true);
    try {
      const result = await getResellerById(id);
      if (result && !result.error) {
        // Extract data from the response structure { success: true, data: {...} }
        const resellerData = result.data || result;
        setReseller(resellerData);
      } else {
        toast.error('Failed to load reseller details');
        history.push('/admin/resellers');
      }
    } catch (error) {
      console.error('Error fetching reseller:', error);
      toast.error('Error loading reseller details');
      history.push('/admin/resellers');
    } finally {
      setLoading(false);
    }
  };

  const fetchReferredConsumers = async () => {
    setConsumersLoading(true);
    try {
      const response = await apiClient.resellers.getReferredConsumers(id);
      if (response) {
        // Extract data from the response structure { success: true, count: X, data: [...] }
        const consumersData = response.data || response;
        if (Array.isArray(consumersData)) {
          setConsumers(consumersData);
        } else if (Array.isArray(response)) {
          setConsumers(response);
        }
      }
    } catch (error) {
      console.error('Error fetching referred consumers:', error);
      toast.error('Failed to load consumers');
    } finally {
      setConsumersLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAccountStatusBadge = (status) => {
    const statusColors = {
      active: 'success',
      deactive: 'secondary',
      expired_subscription: 'danger'
    };
    const statusLabels = {
      active: 'Active',
      deactive: 'Deactive',
      expired_subscription: 'Expired'
    };
    return (
      <Badge bg={statusColors[status] || 'secondary'}>
        {statusLabels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Container fluid>
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p className="mt-3">Loading reseller details...</p>
        </div>
      </Container>
    );
  }

  if (!reseller) {
    return (
      <Container fluid>
        <div className="text-center mt-5">
          <h3>Reseller not found</h3>
          <Button variant="primary" onClick={() => history.push('/admin/resellers')}>
            Back to Resellers
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid>
      {/* Header with Back Button */}
      <Row className="mb-4" style={{ marginTop: '20px' }}>
        <Col md="12">
          <button 
            onClick={() => history.push('/admin/resellers')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#666',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#007bff';
              e.currentTarget.style.color = '#007bff';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,123,255,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e0e0e0';
              e.currentTarget.style.color = '#666';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
            }}
          >
            <i className="nc-icon nc-minimal-left" style={{ fontSize: '16px' }}></i>
            Back to Resellers
          </button>
        </Col>
      </Row>

      {/* Reseller Details Card */}
      <Row>
        <Col md="12">
          <Card className="strpied-tabled-with-hover">
            <Card.Header style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '8px 8px 0 0',
              padding: '20px 24px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Card.Title as="h4" style={{ 
                  color: 'white', 
                  margin: 0,
                  fontSize: '22px',
                  fontWeight: '600'
                }}>
                  Reseller Details
                </Card.Title>
                <div style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  backdropFilter: 'blur(10px)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <i className="nc-icon nc-circle-09" style={{ color: 'white', fontSize: '16px' }}></i>
                  <span style={{ 
                    color: 'white', 
                    fontWeight: '600',
                    fontSize: '14px'
                  }}>
                    {consumers.length} Consumer{consumers.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </Card.Header>
            <Card.Body style={{ padding: '30px 24px' }}>
              <Row>
                <Col md="6">
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#999', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '6px',
                      fontWeight: '600'
                    }}>Name</div>
                    <div style={{ fontSize: '15px', color: '#333', fontWeight: '500' }}>
                      {reseller.full_name || reseller.name || 'N/A'}
                    </div>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#999', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '6px',
                      fontWeight: '600'
                    }}>Email</div>
                    <div style={{ fontSize: '15px', color: '#333', fontWeight: '500' }}>
                      {reseller.email || 'N/A'}
                    </div>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#999', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '6px',
                      fontWeight: '600'
                    }}>Phone</div>
                    <div style={{ fontSize: '15px', color: '#333', fontWeight: '500' }}>
                      {reseller.phone || 'N/A'}
                    </div>
                  </div>
                </Col>
                <Col md="6">
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#999', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '6px',
                      fontWeight: '600'
                    }}>Country</div>
                    <div style={{ fontSize: '15px', color: '#333', fontWeight: '500' }}>
                      {reseller.country || 'N/A'}
                    </div>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#999', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '6px',
                      fontWeight: '600'
                    }}>City</div>
                    <div style={{ fontSize: '15px', color: '#333', fontWeight: '500' }}>
                      {reseller.city || 'N/A'}
                    </div>
                  </div>
                  <div style={{ marginBottom: '20px' }}>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#999', 
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '6px',
                      fontWeight: '600'
                    }}>Member Since</div>
                    <div style={{ fontSize: '15px', color: '#333', fontWeight: '500' }}>
                      {formatDate(reseller.created_at)}
                    </div>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md="12">
          <Card className="strpied-tabled-with-hover">
            <Card.Header style={{ 
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              borderRadius: '8px 8px 0 0',
              padding: '20px 24px'
            }}>
              <Card.Title as="h4" style={{ 
                color: 'white', 
                margin: 0,
                fontSize: '22px',
                fontWeight: '600'
              }}>
                Referred Consumers
              </Card.Title>
              <p style={{ 
                color: 'rgba(255,255,255,0.9)', 
                margin: '8px 0 0 0',
                fontSize: '14px'
              }}>
                List of all consumers referred by this reseller
              </p>
            </Card.Header>
            <Card.Body className="table-full-width table-responsive px-0">
              {consumersLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Loading...</span>
                  </div>
                  <p className="mt-3">Loading consumers...</p>
                </div>
              ) : consumers.length === 0 ? (
                <div className="text-center py-5">
                  <i className="pe-7s-info" style={{ fontSize: '48px', color: '#ccc' }}></i>
                  <p className="mt-3 text-muted">No consumers referred yet</p>
                </div>
              ) : (
                <Table className="table-hover table-striped">
                  <thead>
                    <tr>
                      <th className="border-0">Name</th>
                      <th className="border-0">Email</th>
                      <th className="border-0">Phone</th>
                      <th className="border-0">Country</th>
                      <th className="border-0">Status</th>
                      <th className="border-0">Trial Expiry</th>
                      <th className="border-0">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumers.map((consumer, index) => (
                      <tr key={consumer.user_id || index}>
                        <td>{consumer.full_name || consumer.name || 'N/A'}</td>
                        <td>{consumer.email || 'N/A'}</td>
                        <td>{consumer.phone || 'N/A'}</td>
                        <td>{consumer.country || 'N/A'}</td>
                        <td>{getAccountStatusBadge(consumer.account_status)}</td>
                        <td>
                          {consumer.trial_expiry ? (
                            <span
                              style={{
                                color: new Date(consumer.trial_expiry) < new Date() ? '#dc3545' : '#28a745'
                              }}
                            >
                              {formatDate(consumer.trial_expiry)}
                            </span>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td>{formatDate(consumer.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default ResellerDetail;

