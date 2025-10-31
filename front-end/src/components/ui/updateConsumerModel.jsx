import React, { useState, useEffect } from 'react';
import { X, User, Phone, Calendar, Globe, MapPin, ChevronDown, Package, CheckCircle } from 'lucide-react';
import { countries, searchCountries } from '../../utils/countryData';
import { getProducts } from '../../api/backend';

const UpdateConsumerModal = ({ isOpen, onClose, consumer, onUpdate }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    trial_expiry_date: '',
    country: '',
    city: '',
    subscribed_products: []
  });

  const [countrySearch, setCountrySearch] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [showProductsDropdown, setShowProductsDropdown] = useState(false);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
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
      
      const consumerProducts = consumer.subscribed_products || [];
      console.log('Update modal: Setting subscribed_products from consumer:', consumerProducts);
      
      setFormData({
        full_name: consumer.full_name || consumer.name || '',
        phone: '',
        trial_expiry_date: trialDate,
        country: consumer.country || '',
        city: consumer.city || '',
        subscribed_products: consumerProducts
      });
      
      // If consumer has a country, find and set it
      if (consumer.country) {
        const country = countries.find(c => c.name === consumer.country);
        if (country) {
          setSelectedCountry(country);
          // Remove country code from phone if it exists
          if (consumer.phone) {
            // Extract just the number part (remove country code)
            const phoneStr = String(consumer.phone).trim();
            // Remove the country code if it's at the start
            let phoneWithoutCode = phoneStr;
            if (phoneStr.startsWith(country.phoneCode)) {
              phoneWithoutCode = phoneStr.substring(country.phoneCode.length).trim();
            }
            setFormData(prev => ({ ...prev, phone: phoneWithoutCode }));
          }
        } else {
          setSelectedCountry(null);
          // If country name doesn't match, just set phone as is
          if (consumer.phone) {
            setFormData(prev => ({ ...prev, phone: String(consumer.phone).trim() }));
          }
        }
      } else {
        setSelectedCountry(null);
        // If no country but has phone, just set the phone as is
        if (consumer.phone) {
          setFormData(prev => ({ ...prev, phone: String(consumer.phone).trim() }));
        }
      }
      
      setCountrySearch('');
      setErrors({});
    }
  }, [consumer]);

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
    setFormData(prev => ({
      ...prev,
      country: country.name,
      // Keep only the number part without any country code
      phone: prev.phone ? prev.phone.replace(/^\+?\d+\s*/, '').trim() : ''
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
    // Convert both to strings for comparison to handle UUID string comparison issues
    const productIdStr = String(productId);
    return formData.subscribed_products.some(id => String(id) === productIdStr);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Full name is required';
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters';
    }
    
    if (!formData.country.trim()) {
      newErrors.country = 'Country is required';
    }
    
    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }
    
    // Phone validation - required
    if (!formData.phone || formData.phone.trim() === '') {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Combine country code with phone number
      const fullPhone = selectedCountry && formData.phone 
        ? `${selectedCountry.phoneCode} ${formData.phone.trim()}`
        : formData.phone.trim() || null;

      const updateData = {
        ...consumer,
        full_name: formData.full_name.trim(),
        phone: fullPhone,
        trial_expiry_date: formData.trial_expiry_date || null,
        country: formData.country.trim() || null,
        city: formData.city.trim() || null,
        subscribed_products: formData.subscribed_products || []
      };

      console.log('Update modal sending subscribed_products:', updateData.subscribed_products);
      
      onUpdate(updateData);
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
                  cursor: selectedCountry ? 'pointer' : 'text',
                  backgroundColor: selectedCountry ? '#f9fafb' : 'white'
                }}
                onFocusCapture={(e) => {
                  if (!errors.country) {
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
                    setFormData(prev => ({ ...prev, country: '' }));
                    setShowCountryDropdown(true);
                  }}
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
              {showCountryDropdown && !selectedCountry && (
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
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: errors.city ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  if (!errors.city) {
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

          {/* Phone Field */}
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
                  placeholder={selectedCountry ? "Enter phone number" : "Enter phone number"}
                  inputMode="numeric"
                  pattern="[0-9]*"
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
                    // If no country is selected, open the country dropdown
                    if (!selectedCountry) {
                      setShowCountryDropdown(true);
                      e.target.blur();
                      const countrySection = document.querySelector('input[placeholder*="Search country"]');
                      if (countrySection) {
                        countrySection.focus();
                        countrySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    } else if (!errors.phone) {
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
                onClick={() => setShowProductsDropdown(!showProductsDropdown)}
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
                  cursor: 'pointer',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#74317e';
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
                            handleProductToggle(productId);
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
              {showProductsDropdown && (
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
              e.currentTarget.style.backgroundColor = '#5a2460';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#74317e';
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

