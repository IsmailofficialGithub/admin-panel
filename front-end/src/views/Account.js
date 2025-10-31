import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { User, Mail, Phone, MapPin, Lock, Save, Edit2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { createClient } from '../lib/supabase/Production/client';
import toast from 'react-hot-toast';

const Account = () => {
  const { user, profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    country: '',
    city: '',
    role: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    if (profile && user) {
      setFormData({
        full_name: profile.full_name || '',
        email: user.email || '',
        phone: profile.phone || '',
        country: profile.country || '',
        city: profile.city || '',
        role: profile.role || ''
      });
    }
  }, [profile, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    if (!formData.full_name || formData.full_name.trim().length < 2) {
      toast.error('Full name must be at least 2 characters');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      if (!user || !user.id) {
        toast.error('User not authenticated');
        setLoading(false);
        return;
      }

      // Update profile in Supabase
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name.trim(),
          phone: formData.phone ? formData.phone.trim() : null,
          country: formData.country ? formData.country.trim() : null,
          city: formData.city ? formData.city.trim() : null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        console.error('Error updating profile:', error);
        toast.error(`Failed to update profile: ${error.message}`);
        return;
      }

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      
      // Optionally refresh the page to get updated data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match!');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters!');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      if (!user || !user.email) {
        toast.error('User not authenticated');
        setLoading(false);
        return;
      }

      // First, verify current password by trying to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword
      });

      if (signInError) {
        toast.error('Current password is incorrect');
        setLoading(false);
        return;
      }

      // Update password using Supabase auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) {
        console.error('Error updating password:', updateError);
        toast.error(`Failed to update password: ${updateError.message}`);
        return;
      }

      toast.success('Password updated successfully!');
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordForm(false);
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: '#3b82f6',
      reseller: '#8b5cf6',
      consumer: '#10b981'
    };
    return colors[role] || '#6c757d';
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
          Account Settings
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#6c757d',
          margin: 0
        }}>
          Manage your account information and preferences
        </p>
      </div>

      <Row>
        {/* Profile Information Card */}
        <Col lg={8} style={{ marginBottom: '24px' }}>
          <Card style={{
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
          }}>
            <Card.Body style={{ padding: '32px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#2c3e50',
                  margin: 0
                }}>
                  Profile Information
                </h4>
                {!isEditing && (
                  <Button
                    onClick={() => setIsEditing(true)}
                    style={{
                      backgroundColor: '#74317e',
                      border: 'none',
                      color: '#ffffff',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Edit2 size={16} />
                    Edit Profile
                  </Button>
                )}
              </div>

              <Form onSubmit={handleSubmit}>
                {/* Full Name */}
                <Form.Group style={{ marginBottom: '20px' }}>
                  <Form.Label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Full Name
                  </Form.Label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }} />
                    <Form.Control
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      disabled={!isEditing}
                      style={{
                        paddingLeft: '40px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: isEditing ? '#fff' : '#f9fafb'
                      }}
                    />
                  </div>
                </Form.Group>

                {/* Email */}
                <Form.Group style={{ marginBottom: '20px' }}>
                  <Form.Label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Email Address
                  </Form.Label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={18} style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }} />
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      disabled={true}
                      style={{
                        paddingLeft: '40px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: '#f9fafb',
                        cursor: 'not-allowed'
                      }}
                    />
                  </div>
                  <Form.Text style={{ fontSize: '12px', color: '#6c757d' }}>
                    Email cannot be changed
                  </Form.Text>
                </Form.Group>

                <Row>
                  {/* Phone */}
                  <Col md={6}>
                    <Form.Group style={{ marginBottom: '20px' }}>
                      <Form.Label style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Phone Number
                      </Form.Label>
                      <div style={{ position: 'relative' }}>
                        <Phone size={18} style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#9ca3af'
                        }} />
                        <Form.Control
                          type="text"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          disabled={!isEditing}
                          style={{
                            paddingLeft: '40px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            backgroundColor: isEditing ? '#fff' : '#f9fafb'
                          }}
                        />
                      </div>
                    </Form.Group>
                  </Col>

                  {/* Country */}
                  <Col md={6}>
                    <Form.Group style={{ marginBottom: '20px' }}>
                      <Form.Label style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '8px'
                      }}>
                        Country
                      </Form.Label>
                      <div style={{ position: 'relative' }}>
                        <MapPin size={18} style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#9ca3af'
                        }} />
                        <Form.Control
                          type="text"
                          name="country"
                          value={formData.country}
                          onChange={handleChange}
                          disabled={!isEditing}
                          style={{
                            paddingLeft: '40px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            backgroundColor: isEditing ? '#fff' : '#f9fafb'
                          }}
                        />
                      </div>
                    </Form.Group>
                  </Col>
                </Row>

                {/* City */}
                <Form.Group style={{ marginBottom: '20px' }}>
                  <Form.Label style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    City
                  </Form.Label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={18} style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af'
                    }} />
                    <Form.Control
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      disabled={!isEditing}
                      style={{
                        paddingLeft: '40px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: isEditing ? '#fff' : '#f9fafb'
                      }}
                    />
                  </div>
                </Form.Group>

                {isEditing && (
                  <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                    <Button
                      type="submit"
                      disabled={loading}
                      style={{
                        backgroundColor: '#74317e',
                        border: 'none',
                        padding: '10px 24px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Save size={16} />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      disabled={loading}
                      style={{
                        backgroundColor: '#6c757d',
                        border: 'none',
                        padding: '10px 24px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#ffffff'
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Sidebar Cards */}
        <Col lg={4}>
          {/* Account Info Card */}
          <Card style={{
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            marginBottom: '24px'
          }}>
            <Card.Body style={{ padding: '24px' }}>
              <h5 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '16px'
              }}>
                Account Information
              </h5>
              
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6c757d', margin: '0 0 4px 0' }}>
                  Role
                </p>
                <span style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  backgroundColor: `${getRoleBadgeColor(formData.role)}15`,
                  color: getRoleBadgeColor(formData.role),
                  textTransform: 'capitalize'
                }}>
                  {formData.role}
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '12px', color: '#6c757d', margin: '0 0 4px 0' }}>
                  User ID
                </p>
                <p style={{ fontSize: '14px', color: '#2c3e50', margin: 0, fontFamily: 'monospace' }}>
                  {user?.id?.slice(0, 16) || 'N/A'}...
                </p>
              </div>

              <div>
                <p style={{ fontSize: '12px', color: '#6c757d', margin: '0 0 4px 0' }}>
                  Account Created
                </p>
                <p style={{ fontSize: '14px', color: '#2c3e50', margin: 0 }}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'N/A'}
                </p>
              </div>
            </Card.Body>
          </Card>

          {/* Security Card */}
          <Card style={{
            border: 'none',
            borderRadius: '12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
          }}>
            <Card.Body style={{ padding: '24px' }}>
              <h5 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#2c3e50',
                marginBottom: '16px'
              }}>
                Security
              </h5>

              {!showPasswordForm ? (
                <Button
                  onClick={() => setShowPasswordForm(true)}
                  style={{
                    width: '100%',
                    backgroundColor: '#3b82f6',
                    border: 'none',
                    color: '#ffffff',
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Lock size={16} />
                  Change Password
                </Button>
              ) : (
                <Form onSubmit={handlePasswordSubmit}>
                  <Form.Group style={{ marginBottom: '16px' }}>
                    <Form.Label style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                      Current Password
                    </Form.Label>
                    <Form.Control
                      type="password"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      style={{
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </Form.Group>

                  <Form.Group style={{ marginBottom: '16px' }}>
                    <Form.Label style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                      New Password
                    </Form.Label>
                    <Form.Control
                      type="password"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      required
                      style={{
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </Form.Group>

                  <Form.Group style={{ marginBottom: '16px' }}>
                    <Form.Label style={{ fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                      Confirm New Password
                    </Form.Label>
                    <Form.Control
                      type="password"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      style={{
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </Form.Group>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      type="submit"
                      disabled={loading}
                      style={{
                        flex: 1,
                        backgroundColor: '#74317e',
                        border: 'none',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#ffffff'
                      }}
                    >
                      {loading ? 'Updating...' : 'Update'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                      disabled={loading}
                      style={{
                        flex: 1,
                        backgroundColor: '#6c757d',
                        border: 'none',
                        padding: '8px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#ffffff'
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </Form>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Account;

