import React, { useState, useEffect } from 'react';
import { X, FileText, Calendar, DollarSign, Package, User, Mail, AlertCircle, CheckCircle, Plus, Trash2, Loader } from 'lucide-react';
import { getConsumerProductsForInvoice, createInvoice, getProducts } from '../../api/backend';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const CreateInvoiceModal = ({ isOpen, onClose, onCreate, consumer }) => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [formData, setFormData] = useState({
    consumer_id: '',
    consumer_name: '',
    consumer_email: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    billing_address: '',
    products: [],
    tax_rate: 10,
    notes: ''
  });

  const [availableProducts, setAvailableProducts] = useState([]); // Consumer's accessed products
  const [allProducts, setAllProducts] = useState([]); // All products (for admin manual addition)
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });

  // Initialize form data and fetch consumer products when modal opens
  useEffect(() => {
    if (isOpen && consumer) {
      const consumerId = consumer.user_id || consumer.id;
      setFormData(prev => ({
        ...prev,
        consumer_id: consumerId,
        consumer_name: consumer.full_name || '',
        consumer_email: consumer.email || '',
        billing_address: consumer.billing_address || `${consumer.city || ''}, ${consumer.country || ''}`.trim(),
        products: [] // Reset products
      }));

      // Fetch consumer's accessed products
      const fetchConsumerProducts = async () => {
        setGeneratingInvoice(true);
        setLoadingProducts(true);
        try {
          const result = await getConsumerProductsForInvoice(consumerId);
          if (result && result.success && result.data) {
            const { consumer: consumerInfo, products } = result.data;
            
            // Update consumer info if needed
            if (consumerInfo) {
              setFormData(prev => ({
                ...prev,
                consumer_name: consumerInfo.full_name || prev.consumer_name,
                consumer_email: consumerInfo.email || prev.consumer_email
              }));
            }

            // Auto-populate products with their prices
            if (products && Array.isArray(products) && products.length > 0) {
              const invoiceProducts = products.map(product => ({
                product_id: product.product_id,
                product_name: product.product_name,
                quantity: 1,
                price: product.price,
                subtotal: product.price * 1
              }));
              setFormData(prev => ({
                ...prev,
                products: invoiceProducts
              }));
              setAvailableProducts(products);
              toast.success(`Loaded ${products.length} product(s) for this consumer`);
            } else {
              toast.error('This consumer has no accessed products');
            }

            // If admin, also fetch all products for manual addition
            if (isAdmin) {
              try {
                const allProductsResult = await getProducts();
                if (allProductsResult && allProductsResult.success && allProductsResult.data && Array.isArray(allProductsResult.data)) {
                  setAllProducts(allProductsResult.data);
                }
              } catch (error) {
                console.error('Error fetching all products:', error);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching consumer products:', error);
          toast.error(error?.message || 'Failed to load consumer products');
        } finally {
          setGeneratingInvoice(false);
          setLoadingProducts(false);
        }
      };

      fetchConsumerProducts();
    } else if (!isOpen) {
      // Reset when modal closes
      setAvailableProducts([]);
      setAllProducts([]);
      setGeneratingInvoice(false);
      setLoadingProducts(false);
    }
  }, [isOpen, consumer]);

  // Calculate due date as 30 days from invoice date
  useEffect(() => {
    if (formData.invoice_date) {
      const invoiceDate = new Date(formData.invoice_date);
      invoiceDate.setDate(invoiceDate.getDate() + 30);
      setFormData(prev => ({
        ...prev,
        due_date: invoiceDate.toISOString().split('T')[0]
      }));
    }
  }, [formData.invoice_date]);

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

  const handleAddProduct = () => {
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, { product_id: '', product_name: '', quantity: 1, price: 0, subtotal: 0 }]
    }));
  };

  const handleRemoveProduct = (index) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index)
    }));
  };

  const handleProductChange = (index, field, value) => {
    setFormData(prev => {
      const newProducts = [...prev.products];
      if (field === 'product_id') {
        // Search in both availableProducts (consumer's products) and allProducts (for admin)
        const product = availableProducts.find(p => p.product_id === value || p.id === value) 
                     || allProducts.find(p => p.id === value);
        newProducts[index] = {
          ...newProducts[index],
          product_id: value,
          product_name: product?.product_name || product?.name || '',
          price: parseFloat(product?.price || 0),
          subtotal: parseFloat(product?.price || 0) * (newProducts[index].quantity || 1)
        };
      } else if (field === 'quantity') {
        const qty = parseFloat(value) || 0;
        newProducts[index] = {
          ...newProducts[index],
          quantity: qty,
          subtotal: (newProducts[index].price || 0) * qty
        };
      } else if (field === 'price') {
        const price = parseFloat(value) || 0;
        newProducts[index] = {
          ...newProducts[index],
          price: price,
          subtotal: price * (newProducts[index].quantity || 1)
        };
      }
      return {
        ...prev,
        products: newProducts
      };
    });
  };

  const calculateTotals = () => {
    const subtotal = formData.products.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const tax = subtotal * (formData.tax_rate / 100);
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.consumer_id) {
      newErrors.consumer_id = 'Consumer is required';
    }
    if (!formData.invoice_date) {
      newErrors.invoice_date = 'Invoice date is required';
    }
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    }
    if (formData.products.length === 0) {
      newErrors.products = 'At least one product is required';
    }
    formData.products.forEach((product, index) => {
      if (!product.product_id) {
        newErrors[`product_${index}`] = 'Product selection is required';
      }
      if (!product.quantity || product.quantity <= 0) {
        newErrors[`quantity_${index}`] = 'Valid quantity is required';
      }
    });

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
      const { subtotal, tax, total } = calculateTotals();
      
      // Prepare invoice items for backend
      const invoiceItems = formData.products.map(product => ({
        product_id: product.product_id,
        quantity: parseInt(product.quantity),
        unit_price: parseFloat(product.price),
        tax_rate: formData.tax_rate
      }));
      
      const invoiceData = {
        receiver_id: formData.consumer_id,
        issue_date: formData.invoice_date,
        due_date: formData.due_date,
        tax_rate: formData.tax_rate,
        notes: formData.notes || null,
        items: invoiceItems
      };

      // Call backend API to create invoice
      const result = await createInvoice(invoiceData);

      if (result && result.success) {
        setSubmitMessage({ type: 'success', text: 'Invoice created successfully!' });
        toast.success('Invoice created successfully!');
        
        // Call the onCreate callback if provided
        if (onCreate) {
          await onCreate(result.data);
        }
        
        setTimeout(() => {
          // Reset form
          setFormData({
            consumer_id: '',
            consumer_name: '',
            consumer_email: '',
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: '',
            billing_address: '',
            products: [],
            tax_rate: 10,
            notes: ''
          });
          setErrors({});
          setSubmitMessage({ type: '', text: '' });
          onClose();
        }, 1500);
      } else {
        const errorMessage = result?.error || result?.message || 'Failed to create invoice';
        setSubmitMessage({ type: 'error', text: errorMessage });
        toast.error(errorMessage);
      }
    } catch (error) {
      const errorMessage = error?.message || 'An unexpected error occurred';
      setSubmitMessage({ type: 'error', text: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        consumer_id: '',
        consumer_name: '',
        consumer_email: '',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        billing_address: '',
        products: [],
        tax_rate: 10,
        notes: ''
      });
      setErrors({});
      setSubmitMessage({ type: '', text: '' });
      onClose();
    }
  };

  if (!isOpen) return null;

  const { subtotal, tax, total } = calculateTotals();

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
          maxWidth: '700px',
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
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <FileText size={24} />
            Create Invoice
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
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px' }}>
          {/* Loading State - Generating Invoice */}
          {generatingInvoice && (
            <div style={{
              marginBottom: '20px',
              padding: '20px',
              borderRadius: '8px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bae6fd',
              textAlign: 'center'
            }}>
              <Loader size={24} style={{ 
                color: '#74317e', 
                marginBottom: '12px', 
                display: 'inline-block',
                animation: 'spin 1s linear infinite'
              }} />
              <p style={{ margin: 0, fontSize: '14px', color: '#0369a1', fontWeight: '500' }}>
                Generating invoice... Loading consumer products...
              </p>
            </div>
          )}

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

          {/* Consumer Info (Read-only if provided) */}
          <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <User size={16} color="#6b7280" />
                <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                  {formData.consumer_name || 'Consumer Name'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '24px' }}>
                <Mail size={14} color="#9ca3af" />
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  {formData.consumer_email || 'Consumer Email'}
                </span>
              </div>
            </div>
          </div>

          {/* Invoice Date */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Invoice Date <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }} />
              <input
                type="date"
                name="invoice_date"
                value={formData.invoice_date}
                onChange={handleChange}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: errors.invoice_date ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  opacity: isSubmitting ? 0.6 : 1
                }}
              />
            </div>
            {errors.invoice_date && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', marginBottom: 0 }}>
                {errors.invoice_date}
              </p>
            )}
          </div>

          {/* Due Date */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Due Date <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar size={18} style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af'
              }} />
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 40px',
                  border: errors.due_date ? '1px solid #ef4444' : '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                  opacity: isSubmitting ? 0.6 : 1
                }}
              />
            </div>
            {errors.due_date && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '6px', marginBottom: 0 }}>
                {errors.due_date}
              </p>
            )}
          </div>

          {/* Billing Address */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Billing Address
            </label>
            <textarea
              name="billing_address"
              value={formData.billing_address}
              onChange={handleChange}
              placeholder="Enter billing address"
              disabled={isSubmitting}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
                opacity: isSubmitting ? 0.6 : 1,
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Products Section */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151'
              }}>
                Subscribed Products <span style={{ color: '#ef4444' }}>*</span>
                {formData.products.length > 0 && (
                  <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '400', marginLeft: '8px' }}>
                    ({formData.products.length} product{formData.products.length !== 1 ? 's' : ''})
                  </span>
                )}
              </label>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleAddProduct}
                  disabled={isSubmitting || generatingInvoice}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    backgroundColor: '#74317e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    cursor: isSubmitting || generatingInvoice ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: isSubmitting || generatingInvoice ? 0.5 : 1
                  }}
                >
                  <Plus size={14} />
                  Add Manual Product
                </button>
              )}
            </div>
            {errors.products && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>
                {errors.products}
              </p>
            )}
            {formData.products.map((product, index) => (
              <div key={index} style={{
                marginBottom: '12px',
                padding: '16px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                backgroundColor: '#f9fafb'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                    Product {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveProduct(index)}
                    disabled={isSubmitting}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
                      Product
                    </label>
                    <select
                      value={product.product_id}
                      onChange={(e) => handleProductChange(index, 'product_id', e.target.value)}
                      disabled={isSubmitting || loadingProducts}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: errors[`product_${index}`] ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    >
                      <option value="">Select product...</option>
                      {/* Show consumer's accessed products first */}
                      {availableProducts.map(p => (
                        <option key={p.product_id || p.id} value={p.product_id || p.id}>
                          {p.product_name || p.name} - ${parseFloat(p.price || 0).toFixed(2)}
                        </option>
                      ))}
                      {/* If admin and has all products, show remaining products */}
                      {isAdmin && allProducts.length > 0 && availableProducts.length > 0 && (
                        <optgroup label="Other Products">
                          {allProducts
                            .filter(p => !availableProducts.some(ap => (ap.product_id || ap.id) === p.id))
                            .map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} - ${parseFloat(p.price || 0).toFixed(2)}
                              </option>
                            ))}
                        </optgroup>
                      )}
                      {/* If admin and no consumer products, show all products */}
                      {isAdmin && availableProducts.length === 0 && allProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} - ${parseFloat(p.price || 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={product.quantity}
                      onChange={(e) => handleProductChange(index, 'quantity', e.target.value)}
                      disabled={isSubmitting}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: errors[`quantity_${index}`] ? '1px solid #ef4444' : '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '13px',
                        outline: 'none'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>
                      Price {isAdmin ? '(Editable)' : '(Fixed)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.price}
                      onChange={(e) => handleProductChange(index, 'price', e.target.value)}
                      disabled={isSubmitting || !isAdmin}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '13px',
                        outline: 'none',
                        backgroundColor: isAdmin ? 'white' : '#f3f4f6',
                        cursor: isAdmin ? 'text' : 'not-allowed',
                        opacity: isAdmin ? 1 : 0.7
                      }}
                      title={!isAdmin ? 'Only admin can edit prices' : 'Edit price'}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '8px', textAlign: 'right' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>Subtotal: </span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#74317e' }}>
                    ${product.subtotal.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Tax Rate */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Tax Rate (%)
            </label>
            <input
              type="number"
              name="tax_rate"
              value={formData.tax_rate}
              onChange={handleChange}
              min="0"
              max="100"
              step="0.1"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
                opacity: isSubmitting ? 0.6 : 1
              }}
            />
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151',
              marginBottom: '8px'
            }}>
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              placeholder="Additional notes or comments..."
              disabled={isSubmitting}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s',
                boxSizing: 'border-box',
                opacity: isSubmitting ? 0.6 : 1,
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Totals Summary */}
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Subtotal:</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                ${subtotal.toFixed(2)}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#6b7280' }}>Tax ({formData.tax_rate}%):</span>
              <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                ${tax.toFixed(2)}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '12px',
              borderTop: '2px solid #e5e7eb',
              marginTop: '8px'
            }}>
              <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151' }}>Total:</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#74317e' }}>
                ${total.toFixed(2)}
              </span>
            </div>
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
              <>
                <FileText size={16} />
                Create Invoice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateInvoiceModal;

