import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Shield } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getUserById } from '../api/backend';
import { useAuth } from '../hooks/useAuth';

function UserDetail() {
  const { id } = useParams();
  const history = useHistory();
  const { isAdmin } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Admin access required');
      history.push('/admin/users');
      return;
    }
    fetchUserData();
  }, [id, isAdmin, history]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const result = await getUserById(id);
      if (result && !result.error) {
        const userData = result.data || result;
        setUser(userData);
      } else {
        toast.error('Failed to load user details');
        history.push('/admin/users');
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      toast.error('Error loading user details');
      history.push('/admin/users');
    } finally {
      setLoading(false);
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

  const getAccountStatusBadge = (status) => {
    const statusColors = {
      active: 'success',
      deactive: 'secondary',
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

  const getRoleBadge = (role) => {
    const roleColors = {
      admin: 'danger',
      user: 'primary',
      viewer: 'info'
    };
    return (
      <Badge bg={roleColors[role?.toLowerCase()] || 'secondary'}>
        {role?.charAt(0).toUpperCase() + role?.slice(1) || 'Unknown'}
      </Badge>
    );
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
          <p>Loading user details...</p>
        </div>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container fluid style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
          <p>User not found</p>
          <Button onClick={() => history.push('/admin/users')}>Back to Users</Button>
        </div>
      </Container>
    );
  }

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
            onClick={() => history.push('/admin/users')}
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
            <h2 style={{ margin: 0, fontSize: '28px', fontWeight: '600' }}>User Details</h2>
            <p style={{ margin: '4px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
              View and manage user information
            </p>
          </div>
        </div>
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
                    {user.full_name || 'N/A'}
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
                    {user.email || 'N/A'}
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
                    {user.phone || 'N/A'}
                  </p>
                </Col>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <Shield size={20} color="#6c757d" />
                    <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
                      Role
                    </span>
                  </div>
                  <div>
                    {getRoleBadge(user.role)}
                  </div>
                </Col>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <MapPin size={20} color="#6c757d" />
                    <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
                      Location
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '16px', fontWeight: '500', color: '#212529' }}>
                    {user.city && user.country ? `${user.city}, ${user.country}` : (user.city || user.country || 'N/A')}
                  </p>
                </Col>
                <Col md={6} style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
                      Account Status
                    </span>
                  </div>
                  <div>
                    {getAccountStatusBadge(user.account_status || 'active')}
                  </div>
                </Col>
              </Row>
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
                  {formatDate(user.created_at)}
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
                  {formatDate(user.updated_at)}
                </p>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#6c757d', fontWeight: '600', textTransform: 'uppercase' }}>
                    User ID
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', fontFamily: 'monospace', color: '#6c757d', wordBreak: 'break-all' }}>
                  {user.user_id || user.id}
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default UserDetail;

