import React, { useState, useEffect } from 'react';
import { X, User, Mail, Lock, Phone, Calendar, CheckCircle, AlertCircle, MapPin, Globe, ChevronDown, RefreshCw, Eye, Users, Package } from 'lucide-react';
import { countries, searchCountries } from '../../utils/countryData';
import { generatePassword } from '../../utils/passwordGenerator';
import { getResellers, getProducts } from '../../api/backend';
import { useAuth } from '../../hooks/useAuth';

const CreateConsumerModal = ({ isOpen, onClose, onCreate }) => {
  const { profile } = useAuth();
  const userRole = profile?.role || 'admin';
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    trial_expiry_date: '',
    country: '',
    city: '',
    referred_by: '',
    subscribed_products: []
  });

  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showProductsDropdown, setShowProductsDropdown] = useState(false);
  const [resellers, setResellers] = useState([]);
  const [loadingResellers, setLoadingResellers] = useState(false);
  const [resellerSearchTerm, setResellerSearchTerm] = useState('');
  const [showResellerSuggestions, setShowResellerSuggestions] = useState(false);
  const [selectedReseller, setSelectedReseller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });

  // Fetch products when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchProducts = async () => {
        setLoadingProducts(true);
        try {
          const result = await getProducts();
          console.log('Fetched products:', result); // Debug log
          if (result && result.success && result.data && Array.isArray(result.data)) {
            setProducts(result.data);
            console.log('Products set:', result.data.length); // Debug log
          } else if (result && result.error) {
            console.error('Error from getProducts:', result.error);
          }
        } catch (error) {
          console.error('Error fetching products:', error);
        } finally {
          setLoadingProducts(false);
        }
      };

      fetchProducts();
    }
  }, [isOpen]);

  // Search resellers when user types 2+ characters
  useEffect(() => {
    if (resellerSearchTerm.length >= 2) {
      const fetchResellers = async () => {
        setLoadingResellers(true);
        try {
          const result = await getResellers({ search: resellerSearchTerm });
          console.log('🔍 Resellers search result:', result);
          if (result && !result.error) {
            // Ensure we have an array of resellers
            let resellersList = [];
            if (Array.isArray(result)) {
              resellersList = result;
            } else if (result.data && Array.isArray(result.data)) {
              resellersList = result.data;
            } else if (result.success && Array.isArray(result.data)) {
              resellersList = result.data;
            }
            console.log('📋 Resellers list:', resellersList);
            console.log('📋 First reseller:', resellersList[0]);
            setResellers(resellersList);
          } else {
            setResellers([]);
          }
        } catch (error) {
          console.error('Error fetching resellers:', error);
          setResellers([]);
        } finally {
          setLoadingResellers(false);
        }
      };

      const debounceTimer = setTimeout(() => {
        fetchResellers();
      }, 300); // Debounce search

      return () => clearTimeout(debounceTimer);
    } else {
      setResellers([]);
      setShowResellerSuggestions(false);
    }
  }, [resellerSearchTerm]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showResellerSuggestions && !event.target.closest('.reseller-search-container')) {
        setShowResellerSuggestions(false);
      }
    };

    if (showResellerSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showResellerSuggestions]);

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // Only allow numbers
    const numericValue = value.replace(/\D/g, '');
    
    setFormData(prev => ({ ...prev, phone: numericValue }));
    
    // Clear phone error
    if (errors.phone) {
      setErrors(prev => ({ ...prev, phone: '' }));
    }
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    
    // Remove any existing country code from phone number
    let cleanPhone = formData.phone;
    if (selectedCountry && formData.phone.startsWith(selectedCountry.phoneCode)) {
      cleanPhone = formData.phone.substring(selectedCountry.phoneCode.length).trim();
    }
    
    setFormData(prev => ({
      ...prev,
      country: country.name,
      phone: cleanPhone // Just the local number without country code
    }));
    setCountrySearch('');
    setShowCountryDropdown(false);
    if (errors.country) {
      setErrors(prev => ({ ...prev, country: '' }));
    }
  };

  const handleCountryInputChange = (e) => {
    const value = e.target.value;
    setCountrySearch(value);
    setSelectedCountry(null);
    setFormData(prev => ({ ...prev, country: '' }));
    setShowCountryDropdown(true);
  };

  const handleCountryInputFocus = () => {
    setShowCountryDropdown(true);
  };

  const handleCountryInputClick = () => {
    // If a country is selected and user clicks to edit, clear it for searching
    if (selectedCountry) {
      setSelectedCountry(null);
      setCountrySearch('');
      setFormData(prev => ({ ...prev, country: '' }));
      setShowCountryDropdown(true);
    }
  };

  const filteredCountries = countrySearch 
    ? searchCountries(countrySearch)
    : countries;

  const handleGeneratePassword = () => {
    const newPassword = generatePassword(12);
    setFormData(prev => ({
      ...prev,
      password: newPassword,
      confirmPassword: newPassword
    }));
    if (errors.password || errors.confirmPassword) {
      setErrors(prev => ({
        ...prev,
        password: '',
        confirmPassword: ''
      }));
    }
    // Clear submit message
    if (submitMessage.text) {
      setSubmitMessage({ type: '', text: '' });
    }
  };

  // Handle product selection
  const handleProductToggle = (productId) => {
    setFormData(prev => ({
      ...prev,
      subscribed_products: prev.subscribed_products.includes(productId)
        ? prev.subscribed_products.filter(id => id !== productId)
        : [...prev.subscribed_products, productId]
    }));
  };

  // Check if product is selected
  const isProductSelected = (productId) => {
    return formData.subscribed_products.includes(productId);
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Full Name validation
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters';
    }
    
    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    // Confirm Password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    // Country validation
    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    }
    
    // City validation
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    
    // Trial Period validation
    if (!formData.trial_expiry_date) {
      newErrors.trial_expiry_date = 'Trial period is required';
    }
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    }
    
    
    // Phone validation (optional but must be valid if provided)
    if (formData.phone && !/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      setSubmitMessage({ type: 'error', text: 'Please fix the errors above' });
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    try {
      // Combine country code with phone number
      const fullPhone = selectedCountry && formData.phone 
        ? `${selectedCountry.phoneCode} ${formData.phone.trim()}`
        : formData.phone.trim() || null;

      // Calculate trial expiry date from selected days
      let trialExpiryDate = null;
      if (formData.trial_expiry_date) {
        const days = parseInt(formData.trial_expiry_date);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        trialExpiryDate = expiryDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      }

      // Logic: If reseller is assigned, use that reseller ID
      // If no reseller assigned, use the logged-in user from token
      const referredBy = (formData.referred_by && formData.referred_by !== '') 
        ? formData.referred_by 
        : (selectedReseller?.user_id || profile?.id || profile?.user_id || null);
      
      console.log('🔍 Creating consumer with referred_by:', {
        selectedReseller: selectedReseller,
        selectedResellerId: selectedReseller?.user_id,
        profile: profile,
        profileId: profile?.id,
        profileUserId: profile?.user_id,
        formDataReferredBy: formData.referred_by,
        finalReferredBy: referredBy
      });

      const result = await onCreate({
        email: formData.email.trim(),
        password: formData.password,
        full_name: formData.full_name.trim(),
        phone: fullPhone,
        trial_expiry_date: trialExpiryDate,
        country: formData.country.trim() || null,
        city: formData.city.trim() || null,
        referred_by: referredBy,
        subscribed_products: formData.subscribed_products
      });

      if (result.success) {
        setSubmitMessage({ type: 'success', text: 'Consumer created successfully!' });
        // Reset form
        setTimeout(() => {
          setFormData({
            full_name: '',
            email: '',
            password: '',
            confirmPassword: '',
            phone: '',
            trial_expiry_date: '',
            country: '',
            city: '',
            referred_by: '',
            subscribed_products: []
          });
          setSelectedReseller(null);
          setResellerSearchTerm('');
          setShowResellerSuggestions(false);
          setSelectedCountry(null);
          setCountrySearch('');
          setShowPassword(false);
          setShowConfirmPassword(false);
          setSubmitMessage({ type: '', text: '' });
          onClose();
        }, 1500);
      } else {
        setSubmitMessage({ type: 'error', text: result.error || 'Failed to create consumer' });
      }
    } catch (error) {
      setSubmitMessage({ type: 'error', text: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        full_name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        trial_expiry_date: '',
        country: '',
        city: '',
        referred_by: '',
        subscribed_products: []
      });
      setSelectedCountry(null);
      setCountrySearch('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setErrors({});
      setSubmitMessage({ type: '', text: '' });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={handleClose}
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
          maxWidth: '550px',
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
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          backgroundColor: 'white',
          zIndex: 10
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#111827'
          }}>
            Create New Consumer
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              padding: '8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              transition: 'all 0.2s',
              opacity: isSubmitting ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#111827';
              }
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
          {/* Success/Error Message */}
          {submitMessage.text && (
            <div style={{
              marginBottom: '20px',
              padding: '12px 16px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: submitMessage.type === 'success' ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${submitMessage.type === 'success' ? '#86efac' : '#fecaca'}`
            }}>
              {submitMessage.type === 'success' ? (
                <CheckCircle size={20} style={{ color: '#22c55e' }} />
              ) : (
                <AlertCircle size={20} style={{ color: '#ef4444' }} />
              )}
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: submitMessage.type === 'success' ? '#166534' : '#991b1b',
                fontWeight: '500'
              }}>
                {submitMessage.text}
              </p>
            </div>
          )}

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
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: errors.full_name ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  opacity: isSubmitting ? 0.6 : 1
                }}
                onFocus={(e) => {
                  if (!errors.full_name && !isSubmitting) {
                    e.target.style.borderColor = '#74317e';
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

          {/* Email Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Email Address <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }}>
                <Mail size={18} />
              </div>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: errors.email ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  opacity: isSubmitting ? 0.6 : 1
                }}
                onFocus={(e) => {
                  if (!errors.email && !isSubmitting) {
                    e.target.style.borderColor = '#74317e';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.email ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            {errors.email && (
              <p style={{
                color: '#ef4444',
                fontSize: '12px',
                marginTop: '6px',
                marginBottom: 0
              }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Password <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <button
                type="button"
                onClick={handleGeneratePassword}
                disabled={isSubmitting}
                style={{
                  display: 'flex',
                  alignItems: 'center',

                  gap: '4px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  color: '#74317e',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #74317e',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dbeafe';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#eff6ff';
                }}
              >
                <RefreshCw size={12} />
                Generate
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }}>
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password (min. 6 characters)"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 40px',
                  border: errors.password ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  opacity: isSubmitting ? 0.6 : 1
                }}
                onFocus={(e) => {
                  if (!errors.password && !isSubmitting) {
                    e.target.style.borderColor = '#74317e';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.password ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#9ca3af',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#9ca3af';
                }}
              >
                {showPassword ? <Eye size={18} /> : <Eye size={18} style={{ opacity: 0.5 }} />}
              </button>
            </div>
            {errors.password && (
              <p style={{
                color: '#ef4444',
                fontSize: '12px',
                marginTop: '6px',
                marginBottom: 0
              }}>
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Confirm Password <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }}>
                <Lock size={18} />
              </div>
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 40px',
                  border: errors.confirmPassword ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  opacity: isSubmitting ? 0.6 : 1
                }}
                onFocus={(e) => {
                  if (!errors.confirmPassword && !isSubmitting) {
                    e.target.style.borderColor = '#74317e';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isSubmitting}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#9ca3af',
                  borderRadius: '4px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#9ca3af';
                }}
              >
                {showConfirmPassword ? <Eye size={18} /> : <Eye size={18} style={{ opacity: 0.5 }} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p style={{
                color: '#ef4444',
                fontSize: '12px',
                marginTop: '6px',
                marginBottom: 0
              }}>
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Country Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Country <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                zIndex: 1
              }}>
                <Globe size={18} />
              </div>
              <input
                type="text"
                value={selectedCountry ? `${selectedCountry.flag} ${selectedCountry.name}` : countrySearch}
                onChange={handleCountryInputChange}
                onFocus={handleCountryInputFocus}
                onClick={handleCountryInputClick}
                placeholder="Search country..."
                disabled={isSubmitting}
                readOnly={false}
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 40px',
                  border: errors.country ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  opacity: isSubmitting ? 0.6 : 1,
                  cursor: selectedCountry ? 'pointer' : 'text',
                  backgroundColor: selectedCountry ? '#f9fafb' : 'white'
                }}
                onFocusCapture={(e) => {
                  if (!errors.country && !isSubmitting) {
                    e.target.style.borderColor = '#74317e';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  setTimeout(() => setShowCountryDropdown(false), 200);
                  e.target.style.borderColor = errors.country ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {selectedCountry ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCountry(null);
                    setCountrySearch('');
                    setFormData(prev => ({ ...prev, country: '', phone: '' }));
                    setShowCountryDropdown(true);
                  }}
                  disabled={isSubmitting}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#9ca3af',
                    borderRadius: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                    e.currentTarget.style.color = '#374151';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#9ca3af';
                  }}
                >
                  <X size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCountryDropdown(!showCountryDropdown);
                  }}
                  disabled={isSubmitting}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: `translateY(-50%) rotate(${showCountryDropdown ? '180deg' : '0deg'})`,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#9ca3af',
                    borderRadius: '4px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e5e7eb';
                    e.currentTarget.style.color = '#374151';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#9ca3af';
                  }}
                >
                  <ChevronDown size={18} />
                </button>
              )}
              
              {/* Country Dropdown */}
              {showCountryDropdown && !isSubmitting && !selectedCountry && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  backgroundColor: 'white',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  zIndex: 1000
                }}>
                  {filteredCountries.length > 0 ? (
                    filteredCountries.map((country) => (
                      <div
                        key={country.code}
                        onClick={() => handleCountrySelect(country)}
                        style={{
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          borderBottom: '1px solid #f3f4f6',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                      >
                        <span style={{ fontSize: '20px' }}>{country.flag}</span>
                        <span style={{ fontSize: '14px', color: '#374151', flex: 1 }}>{country.name}</span>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>{country.phoneCode}</span>
                      </div>
                    ))
                  ) : (
                    <div style={{
                      padding: '12px',
                      textAlign: 'center',
                      color: '#9ca3af',
                      fontSize: '14px'
                    }}>
                      No countries found
                    </div>
                  )}
                </div>
              )}
            </div>
            {errors.country && (
              <p style={{
                color: '#ef4444',
                fontSize: '12px',
                marginTop: '6px',
                marginBottom: 0
              }}>
                {errors.country}
              </p>
            )}
          </div>

          {/* City Field */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              City <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }}>
                <MapPin size={18} />
              </div>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter city"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: errors.city ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  opacity: isSubmitting ? 0.6 : 1
                }}
                onFocus={(e) => {
                  if (!errors.city && !isSubmitting) {
                    e.target.style.borderColor = '#74317e';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.city ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            {errors.city && (
              <p style={{
                color: '#ef4444',
                fontSize: '12px',
                marginTop: '6px',
                marginBottom: 0
              }}>
                {errors.city}
              </p>
            )}
          </div>

          {/* Phone Field (Optional) */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Phone Number <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
              {selectedCountry && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  backgroundColor: '#f9fafb',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  minWidth: '80px',
                  justifyContent: 'center'
                }}>
                  {selectedCountry.phoneCode}
                </div>
              )}
              <div style={{ position: 'relative', flex: 1 }}>
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
                  onChange={handlePhoneChange}
                  placeholder={selectedCountry ? "Enter phone number" : "Select country first"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    border: errors.phone ? '1px solid #ef4444' : '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    opacity: isSubmitting ? 0.6 : 1
                  }}
                  onFocus={(e) => {
                    // If no country is selected, open the country dropdown
                    if (!selectedCountry && !isSubmitting) {
                      setShowCountryDropdown(true);
                      e.target.blur(); // Remove focus from phone field
                      // Scroll to country field
                      const countrySection = document.querySelector('input[placeholder*="Search country"]');
                      if (countrySection) {
                        countrySection.focus();
                        countrySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    } else if (!errors.phone && !isSubmitting) {
                      e.target.style.borderColor = '#74317e';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.phone ? '#ef4444' : '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
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

          {/* Reseller Field (Optional) - Only for Admin */}
          {userRole === 'admin' && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Assign to Reseller <span style={{ color: '#9ca3af', fontWeight: '400' }}>(Optional)</span>
              </label>
              <div style={{ position: 'relative' }} className="reseller-search-container">
                <div style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  zIndex: 1,
                  pointerEvents: 'none'
                }}>
                  <Users size={18} />
                </div>
                <input
                  type="text"
                  placeholder={selectedReseller ? `${selectedReseller.full_name} (${selectedReseller.email})` : "Type at least 2 characters to search resellers..."}
                  value={selectedReseller ? `${selectedReseller.full_name} (${selectedReseller.email})` : resellerSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setResellerSearchTerm(value);
                    if (selectedReseller) {
                      setSelectedReseller(null);
                      setFormData(prev => ({ ...prev, referred_by: '' }));
                    }
                    setShowResellerSuggestions(value.length >= 2);
                  }}
                  onFocus={() => {
                    if (resellerSearchTerm.length >= 2 || resellers.length > 0) {
                      setShowResellerSuggestions(true);
                    }
                  }}
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 40px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    opacity: isSubmitting ? 0.6 : 1,
                    backgroundColor: 'white',
                    cursor: isSubmitting ? 'not-allowed' : 'text',
                    fontFamily: 'inherit',
                    color: selectedReseller ? '#374151' : '#9ca3af'
                  }}
                />
                {selectedReseller && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedReseller(null);
                      setResellerSearchTerm('');
                      setFormData(prev => ({ ...prev, referred_by: '' }));
                      setShowResellerSuggestions(false);
                    }}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                  >
                    <X size={18} />
                  </button>
                )}
                
                {/* Reseller Suggestions */}
                {showResellerSuggestions && resellerSearchTerm.length >= 2 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: 'white',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      maxHeight: '300px',
                      overflowY: 'auto',
                      zIndex: 1000
                    }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {loadingResellers ? (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                        Searching...
                      </div>
                    ) : resellers.length > 0 ? (
                      resellers.map(reseller => (
                        <div
                          key={reseller.user_id}
                          onClick={() => {
                            console.log('🎯 Reseller selected:', reseller);
                            setSelectedReseller(reseller);
                            setFormData(prev => {
                              console.log('📝 Setting referred_by to:', reseller.user_id);
                              return { ...prev, referred_by: reseller.user_id };
                            });
                            setResellerSearchTerm('');
                            setShowResellerSuggestions(false);
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f3f4f6',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          <div style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937' }}>
                            {reseller.full_name || 'No Name'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                            {reseller.email || reseller.user_id}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                        No resellers found
                      </div>
                    )}
                  </div>
                )}
              </div>
              {selectedReseller && (
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
                  This consumer will be assigned to: {selectedReseller.full_name}
                </p>
              )}
            </div>
          )}

          {/* Subscribed Products Field (Multi-select) */}
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
              <Package size={16} style={{ color: '#6b7280' }} />
              Subscribed Products <span style={{ color: '#9ca3af', fontWeight: '400' }}>(Optional)</span>
            </label>
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => !isSubmitting && setShowProductsDropdown(!showProductsDropdown)}
                style={{
                  width: '100%',
                  minHeight: '42px',
                  padding: '8px 40px 8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  backgroundColor: 'white',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  alignItems: 'center',
                  opacity: isSubmitting ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.borderColor = '#74317e';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#d1d5db';
                }}
              >
                {loadingProducts ? (
                  <span style={{ color: '#9ca3af' }}>Loading products...</span>
                ) : formData.subscribed_products.length === 0 ? (
                  <span style={{ color: '#9ca3af' }}>Select products...</span>
                ) : (
                  formData.subscribed_products.map(productId => {
                    const product = products.find(p => p.id === productId);
                    return (
                      <span
                        key={productId}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          backgroundColor: '#74317e',
                          color: 'white',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {product?.name}
                        <X
                          size={14}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isSubmitting) handleProductToggle(productId);
                          }}
                          style={{ cursor: 'pointer' }}
                        />
                      </span>
                    );
                  })
                )}
                <div style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none'
                }}>
                  <ChevronDown size={16} style={{ color: '#9ca3af' }} />
                </div>
              </div>

              {/* Products Dropdown */}
              {showProductsDropdown && !isSubmitting && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: 'white',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000
                  }}
                >
                  {loadingProducts ? (
                    <div style={{ padding: '10px 12px', textAlign: 'center', color: '#9ca3af' }}>
                      Loading products...
                    </div>
                  ) : products.length === 0 ? (
                    <div style={{ padding: '10px 12px', textAlign: 'center', color: '#9ca3af' }}>
                      No products available
                    </div>
                  ) : (
                    products.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleProductToggle(product.id)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background-color 0.2s',
                        backgroundColor: isProductSelected(product.id) ? '#eff6ff' : 'white'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isProductSelected(product.id) ? '#dbeafe' : '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isProductSelected(product.id) ? '#eff6ff' : 'white';
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          border: isProductSelected(product.id) ? '2px solid #74317e' : '2px solid #d1d5db',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isProductSelected(product.id) ? '#74317e' : 'white',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isProductSelected(product.id) && (
                          <CheckCircle size={12} style={{ color: 'white' }} />
                        )}
                      </div>
                      <span style={{
                        fontSize: '14px',
                        color: '#374151',
                        fontWeight: isProductSelected(product.id) ? '500' : '400'
                      }}>
                        {product.name}
                      </span>
                    </div>
                  ))
                  )}
                </div>
              )}
            </div>
            {formData.subscribed_products.length > 0 && (
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
                {formData.subscribed_products.length} product{formData.subscribed_products.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Trial Period Field (Required) */}
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
              Trial Period <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <select
                name="trial_expiry_date"
                value={formData.trial_expiry_date}
                onChange={handleChange}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: errors.trial_expiry_date ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  opacity: isSubmitting ? 0.6 : 1,
                  backgroundColor: 'white',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  color: formData.trial_expiry_date ? '#374151' : '#9ca3af',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '40px'
                }}
                onFocus={(e) => {
                  if (!errors.trial_expiry_date && !isSubmitting) {
                    e.target.style.borderColor = '#74317e';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = errors.trial_expiry_date ? '#ef4444' : '#d1d5db';
                  e.target.style.boxShadow = 'none';
                }}
              >
                <option value="">Select trial period</option>
                <option value="1">1 Day</option>
                <option value="2">2 Days</option>
                <option value="3">3 Days</option>
              </select>
            </div>
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
                Trial expires: {(() => {
                  const days = parseInt(formData.trial_expiry_date);
                  const expiryDate = new Date();
                  expiryDate.setDate(expiryDate.getDate() + days);
                  return expiryDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                })()}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          position: 'sticky',
          bottom: 0,
          backgroundColor: 'white'
        }}>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#374151',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isSubmitting ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#9ca3af';
              }
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
            disabled={isSubmitting}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: isSubmitting ? '#b896c0' : '#74317e',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = '#5a2460';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.backgroundColor = '#74317e';
              }
            }}
          >
            {isSubmitting ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid white',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Creating...
              </>
            ) : (
              'Create Consumer'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateConsumerModal;

