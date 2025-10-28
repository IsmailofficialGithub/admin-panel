import React, { useState, useEffect } from 'react';
import { X, User, Phone, Calendar } from 'lucide-react';

const UpdateConsumerModal = ({ isOpen, onClose, consumer, onUpdate }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    trial_expiry_date: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (consumer) {
      // Format date for input field (YYYY-MM-DD)
      let trialDate = '';
      if (consumer.trial_expiry || consumer.trial_expiry_date) {
        const dateStr = consumer.trial_expiry || consumer.trial_expiry_date;
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            trialDate = date.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Invalid trial date:', dateStr);
        }
      }
      
      setFormData({
        full_name: consumer.full_name || consumer.name || '',
        phone: consumer.phone || '',
        trial_expiry_date: trialDate
      });
      setErrors({});
    }
  }, [consumer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters';
    }
    
    // Phone validation (optional but must be valid if provided)
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onUpdate({
        ...consumer,
        full_name: formData.full_name.trim(),
        phone: formData.phone.trim() || null,
        trial_expiry_date: formData.trial_expiry_date || null
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#111827'
          }}>
            Update Consumer
          </h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* User ID Display */}
          <div style={{
            backgroundColor: '#f0fdf4',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid #86efac'
          }}>
            <User size={18} style={{ color: '#16a34a' }} />
            <div>
              <div style={{
                fontSize: '12px',
                color: '#166534',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Consumer ID
              </div>
              <div style={{
                fontSize: '14px',
                color: '#111827',
                fontWeight: '600',
                marginTop: '4px',
                fontFamily: 'monospace'
              }}>
                #{consumer?.id?.toString().slice(0, 8) || consumer?.user_id?.toString().slice(0, 8) || '-'}
              </div>
            </div>
          </div>

          {/* Full Name Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Full Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }}>
                <User size={18} />
              </div>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Enter full name"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: errors.full_name ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  if (!errors.full_name) {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.full_name ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            {errors.full_name && (
              <p style={{
                color: '#ef4444',
                fontSize: '12px',
                marginTop: '6px',
                marginBottom: 0
              }}>
                {errors.full_name}
              </p>
            )}
          </div>

          {/* Phone Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Phone Number <span style={{ color: '#9ca3af', fontWeight: '400' }}>(Optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }}>
                <Phone size={18} />
              </div>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: errors.phone ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  if (!errors.phone) {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.phone ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            {errors.phone && (
              <p style={{
                color: '#ef4444',
                fontSize: '12px',
                marginTop: '6px',
                marginBottom: 0
              }}>
                {errors.phone}
              </p>
            )}
          </div>

          {/* Trial Expiry Date Field (Optional) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              <Calendar size={16} style={{ color: '#6b7280' }} />
              Trial Expiry Date <span style={{ color: '#9ca3af', fontWeight: '400' }}>(Optional)</span>
            </label>
            <input
              type="date"
              name="trial_expiry_date"
              value={formData.trial_expiry_date}
              onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: errors.trial_expiry_date ? '1px solid #ef4444' : '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
                backgroundColor: 'white',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: '#374151'
              }}
              onFocus={(e) => {
                if (!errors.trial_expiry_date) {
                  e.target.style.borderColor = '#3b82f6';
                  e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }
              }}
              onBlur={(e) => {
                e.target.style.borderColor = errors.trial_expiry_date ? '#ef4444' : '#d1d5db';
                e.target.style.boxShadow = 'none';
              }}
            />
            {errors.trial_expiry_date && (
              <p style={{
                color: '#ef4444',
                fontSize: '12px',
                marginTop: '6px',
                marginBottom: 0
              }}>
                {errors.trial_expiry_date}
              </p>
            )}
            {formData.trial_expiry_date && (
              <p style={{
                color: '#6b7280',
                fontSize: '12px',
                marginTop: '6px',
                marginBottom: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span style={{ fontSize: '16px' }}>ℹ️</span>
                Trial expires: {new Date(formData.trial_expiry_date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            )}
          </div>

          {/* Email Display (Read-only) */}
          <div style={{
            backgroundColor: '#f9fafb',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: '500',
              marginBottom: '4px'
            }}>
              Email Address (Read-only)
            </div>
            <div style={{
              fontSize: '14px',
              color: '#111827',
              fontWeight: '500'
            }}>
              {consumer?.email || 'No email'}
            </div>
          </div>

          {/* Created At Display */}
          {consumer?.created_at && (
            <div style={{
              backgroundColor: '#f9fafb',
              padding: '12px 16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Calendar size={16} style={{ color: '#6b7280' }} />
              <div style={{
                fontSize: '13px',
                color: '#6b7280'
              }}>
                Created on {new Date(consumer.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.borderColor = '#9ca3af';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            Update Consumer
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateConsumerModal;

