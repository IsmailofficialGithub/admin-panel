import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import { FileText, Download, Eye, Search, DollarSign, Calendar, User, Building, CheckCircle, XCircle, Clock, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllInvoices, getMyInvoices } from '../api/backend';
import { useAuth } from '../hooks/useAuth';

const Invoices = () => {
  const { profile } = useAuth();
  const userRole = profile?.role || 'admin';
  
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters = {
          status: filterStatus !== 'all' ? filterStatus : undefined,
          search: searchQuery || undefined
        };

        let result;
        if (userRole === 'admin') {
          result = await getAllInvoices(filters);
        } else if (userRole === 'reseller') {
          result = await getMyInvoices(filters);
        } else {
          // Consumer or other roles - for now, return empty
          setInvoices([]);
          setLoading(false);
          return;
        }

        if (result && result.success && result.data) {
          setInvoices(result.data);
        } else {
          throw new Error(result?.error || 'Failed to fetch invoices');
        }
      } catch (err) {
        console.error('Error fetching invoices:', err);
        setError(err.message || 'Failed to load invoices');
        toast.error(err.message || 'Failed to load invoices');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [userRole, filterStatus, searchQuery]);

  // Invoices are already filtered by backend, but we can do client-side filtering if needed
  // Since search and status are handled by backend, we'll just use invoices directly
  const filteredInvoices = invoices;

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return { bg: '#f0fdf4', border: '#86efac', text: '#166534', icon: CheckCircle };
      case 'pending':
        return { bg: '#fffbeb', border: '#fde047', text: '#854d0e', icon: Clock };
      case 'overdue':
        return { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: XCircle };
      default:
        return { bg: '#f3f4f6', border: '#d1d5db', text: '#374151', icon: FileText };
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(numAmount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewInvoice = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handleDownloadInvoice = (invoice) => {
    toast.success(`Downloading invoice ${invoice.invoice_number || invoice.id}...`);
    // In real implementation, download PDF
  };

  return (
    <Container fluid>
      <Row>
        <Col md="12">
          <Card className="strpied-tabled-with-hover" style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <Card.Header style={{ 
              padding: '20px 24px',
              borderBottom: '2px solid #f0f0f0',
              backgroundColor: 'white'
            }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '16px'
              }}>
                <div>
                  <h4 style={{ 
                    margin: 0, 
                    fontSize: '24px', 
                    fontWeight: '600',
                    color: '#2c3e50',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <FileText size={28} />
                    Invoices
                  </h4>
                  <p style={{ 
                    margin: '4px 0 0 0', 
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    {userRole === 'admin' ? 'View and manage all invoices' : 'View invoices for your referred consumers'}
                  </p>
                </div>
              </div>

              {/* Search and Filter Row */}
              <div style={{ 
                display: 'flex', 
                gap: '12px',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '200px' }}>
                  <Search size={18} style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af'
                  }} />
                  <input
                    type="text"
                    placeholder="Search invoices, consumers, emails..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    cursor: 'pointer',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </Card.Header>

            <Card.Body style={{ 
              padding: '24px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}>
              {loading ? (
                <div style={{ 
                  flex: 1,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  fontSize: '16px',
                  color: '#666'
                }}>
                  Loading invoices...
                </div>
              ) : filteredInvoices.length === 0 ? (
                <div style={{ 
                  flex: 1,
                  display: 'flex', 
                  flexDirection: 'column',
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: '#666'
                }}>
                  <FileText size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                  <p style={{ fontSize: '16px', margin: 0 }}>
                    {searchQuery ? 'No invoices found matching your search' : 'No invoices available'}
                  </p>
                </div>
              ) : (
                <div style={{
                  overflow: 'auto'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: '20px'
                  }}>
                    {filteredInvoices.map((invoice) => {
                      const statusStyle = getStatusColor(invoice.status);
                      const StatusIcon = statusStyle.icon;

                      return (
                        <div
                          key={invoice.id}
                          style={{
                            border: `1px solid ${statusStyle.border}`,
                            borderRadius: '12px',
                            padding: '20px',
                            backgroundColor: 'white',
                            transition: 'all 0.2s',
                            cursor: 'pointer',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                            minHeight: '400px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          {/* Status Badge */}
                          <div style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            backgroundColor: statusStyle.bg,
                            border: `1px solid ${statusStyle.border}`,
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '500',
                            color: statusStyle.text
                          }}>
                            <StatusIcon size={14} />
                            <span style={{ textTransform: 'capitalize' }}>{invoice.status}</span>
                          </div>

                          {/* Invoice ID */}
                          <div style={{ marginBottom: '16px', paddingRight: '100px' }}>
                            <h5 style={{
                              fontSize: '18px',
                              fontWeight: '600',
                              color: '#1f2937',
                              margin: '0 0 4px 0'
                            }}>
                              {invoice.invoice_number || invoice.id}
                            </h5>
                            <p style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              margin: 0
                            }}>
                              {formatDate(invoice.invoice_date)}
                            </p>
                          </div>

                          {/* Consumer Info */}
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              marginBottom: '8px'
                            }}>
                              <User size={16} color="#6b7280" />
                              <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                                {invoice.consumer_name}
                              </span>
                            </div>
                            <p style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              margin: '4px 0 0 22px'
                            }}>
                              {invoice.consumer_email}
                            </p>
                          </div>

                          {/* Reseller Info (only show for admin) */}
                          {userRole === 'admin' && invoice.reseller_name && (
                            <div style={{ marginBottom: '16px' }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                              }}>
                                <Building size={16} color="#6b7280" />
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                  Referred by: {invoice.reseller_name}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Products */}
                          <div style={{ marginBottom: '16px' }}>
                            <p style={{
                              fontSize: '12px',
                              color: '#6b7280',
                              margin: '0 0 4px 0'
                            }}>
                              Products:
                            </p>
                            <div style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '6px'
                            }}>
                              {invoice.products && invoice.products.length > 0 ? invoice.products.map((product, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: '11px',
                                    padding: '2px 8px',
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: '4px',
                                    color: '#374151'
                                  }}
                                  title={typeof product === 'object' ? `${product.name} (Qty: ${product.quantity})` : product}
                                >
                                  {typeof product === 'object' ? product.name : product}
                                </span>
                              )) : (
                                <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>No products</span>
                              )}
                            </div>
                          </div>

                          {/* Amount */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingTop: '16px',
                            borderTop: '1px solid #e5e7eb',
                            marginBottom: '12px'
                          }}>
                            <div>
                              <p style={{
                                fontSize: '12px',
                                color: '#6b7280',
                                margin: '0 0 4px 0'
                              }}>
                                Total Amount
                              </p>
                              <p style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                color: '#74317e',
                                margin: 0
                              }}>
                                {formatCurrency(invoice.total)}
                              </p>
                            </div>
                            {invoice.status !== 'paid' && (
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.success('Pay flow coming soon');
                                  }}
                                  style={{
                                    padding: '6px 10px',
                                    backgroundColor: '#74317e',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Pay Now
                                </button>
                                <DollarSign size={24} color="#74317e" />
                              </div>
                            )}
                          </div>

                          {/* Due Date */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '12px',
                            fontSize: '12px',
                            color: '#6b7280'
                          }}>
                            <Calendar size={14} />
                            <span>Due: {formatDate(invoice.due_date)}</span>
                          </div>

                          {/* Actions - Always at bottom */}
                          <div style={{
                            display: 'flex',
                            gap: '8px',
                            marginTop: 'auto',
                            paddingTop: '12px'
                          }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewInvoice(invoice);
                              }}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                backgroundColor: '#74317e',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#5a2460';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#74317e';
                              }}
                            >
                              <Eye size={14} />
                              View
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadInvoice(invoice);
                              }}
                              style={{
                                flex: 1,
                                padding: '8px 12px',
                                backgroundColor: 'white',
                                color: '#74317e',
                                border: '1px solid #74317e',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '500',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f3f4f6';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                              }}
                            >
                              <Download size={14} />
                              Download
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Invoice Detail Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: '20px'
        }}
        onClick={() => setShowInvoiceModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              backgroundColor: 'white',
              zIndex: 10
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
                Invoice Details
              </h3>
              <button
                onClick={() => setShowInvoiceModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              {/* Invoice Header */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                  {selectedInvoice.id}
                </h4>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '14px', color: '#6b7280' }}>
                  <span>Date: {formatDate(selectedInvoice.invoice_date)}</span>
                  <span>Due: {formatDate(selectedInvoice.due_date)}</span>
                </div>
              </div>

              {/* Consumer Info */}
              <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
                <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Bill To:
                </h5>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                  {selectedInvoice.consumer_name}
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#6b7280' }}>
                  {selectedInvoice.consumer_email}
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px', color: '#6b7280' }}>
                  {selectedInvoice.billing_address}
                </p>
              </div>

              {/* Products/Services */}
              <div style={{ marginBottom: '24px' }}>
                <h5 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                  Products/Services:
                </h5>
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: '#f9fafb' }}>
                      <tr>
                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                          Product
                        </th>
                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', fontWeight: '600', color: '#374151', borderBottom: '1px solid #e5e7eb' }}>
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.products.map((product, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937', borderBottom: '1px solid #f3f4f6' }}>
                            {typeof product === 'object' ? product.name : String(product)}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', fontSize: '14px', color: '#1f2937', borderBottom: '1px solid #f3f4f6' }}>
                            {typeof product === 'object' ? formatCurrency(product.total ?? (Number(product.price || 0) * Number(product.quantity || 1))) : formatCurrency(0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '24px'
              }}>
                <div style={{ width: '250px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedInvoice.amount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#6b7280' }}>
                    <span>Tax:</span>
                    <span>{formatCurrency(selectedInvoice.tax)}</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '2px solid #e5e7eb',
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    <span>Total:</span>
                    <span style={{ color: '#74317e' }}>{formatCurrency(selectedInvoice.total)}</span>
                  </div>
                </div>
              </div>

              {/* Status and Payment Info */}
              <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Status:</span>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: getStatusColor(selectedInvoice.status).bg,
                    color: getStatusColor(selectedInvoice.status).text,
                    border: `1px solid ${getStatusColor(selectedInvoice.status).border}`
                  }}>
                    {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                  </span>
                </div>
                {selectedInvoice.payment_date && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: '#6b7280' }}>
                    <span>Payment Date:</span>
                    <span>{formatDate(selectedInvoice.payment_date)}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'white',
                    color: '#374151',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
                {selectedInvoice.status !== 'paid' && (
                  <button
                    onClick={() => toast.success('Pay flow coming soon')}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#74317e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    Pay Now
                  </button>
                )}
                <button
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#111827',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer'
                  }}
                >
                  Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
};

export default Invoices;

