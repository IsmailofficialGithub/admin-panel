import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { useLocation } from 'react-router-dom';
import { FileText, Download, Eye, Search, DollarSign, Calendar, User, Building, CheckCircle, XCircle, Clock, Loader, ChevronLeft, ChevronRight, Filter, X, Mail, Copy, Send, ArrowDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAllInvoices, getMyInvoices } from '../api/backend';
import { useAuth } from '../hooks/useAuth';
import apiClient from '../services/apiClient';
import { getConsumers } from '../api/backend/consumers';
import { getResellers } from '../api/backend/resellers';

const Invoices = () => {
  const { profile } = useAuth();
  const userRole = profile?.role || 'admin';
  
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('unpaid');
  const [filterConsumer, setFilterConsumer] = useState('');
  const [filterConsumerId, setFilterConsumerId] = useState('');
  const [filterReseller, setFilterReseller] = useState('');
  const [filterResellerId, setFilterResellerId] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterAmountMin, setFilterAmountMin] = useState('');
  const [filterAmountMax, setFilterAmountMax] = useState('');
  const [consumers, setConsumers] = useState([]);
  const [resellers, setResellers] = useState([]);
  const [loadingConsumers, setLoadingConsumers] = useState(false);
  const [loadingResellers, setLoadingResellers] = useState(false);
  const [showConsumerSuggestions, setShowConsumerSuggestions] = useState(false);
  const [showResellerSuggestions, setShowResellerSuggestions] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [consumerSearchTerm, setConsumerSearchTerm] = useState('');
  const [resellerSearchTerm, setResellerSearchTerm] = useState('');
  const [debouncedConsumerSearch, setDebouncedConsumerSearch] = useState('');
  const [debouncedResellerSearch, setDebouncedResellerSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [resendInvoiceLoading, setResendInvoiceLoading] = useState(false);
  const [resendInvoiceStatus, setResendInvoiceStatus] = useState(null); // 'success' | 'error' | null
  const [arrowDirection, setArrowDirection] = useState({ x: 0, y: 0 }); // Random direction for arrow
  const invoicesPerPage = 20;

  // Debounce consumer search - only trigger when 3+ characters
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (consumerSearchTerm.trim().length >= 3) {
        setDebouncedConsumerSearch(consumerSearchTerm.trim());
      } else {
        setDebouncedConsumerSearch('');
        setConsumers([]);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [consumerSearchTerm]);

  // Debounce reseller search - only trigger when 3+ characters
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (resellerSearchTerm.trim().length >= 3) {
        setDebouncedResellerSearch(resellerSearchTerm.trim());
      } else {
        setDebouncedResellerSearch('');
        setResellers([]);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [resellerSearchTerm]);

  // Fetch consumers from API when search term is 3+ characters
  useEffect(() => {
    const fetchConsumers = async () => {
      if (!debouncedConsumerSearch || debouncedConsumerSearch.length < 3) {
        setConsumers([]);
        setShowConsumerSuggestions(false);
        return;
      }

      setLoadingConsumers(true);
      try {
        if (userRole === 'reseller') {
          // For resellers, fetch their consumers and filter client-side
          const result = await apiClient.resellers.getMyConsumers();
          if (result && result.success && result.data) {
            const filtered = result.data.filter(consumer => {
              const searchLower = debouncedConsumerSearch.toLowerCase();
              const name = (consumer.full_name || '').toLowerCase();
              const email = (consumer.email || '').toLowerCase();
              return name.includes(searchLower) || email.includes(searchLower);
            });
            setConsumers(filtered);
            // Automatically show suggestions if results found
            if (filtered.length > 0) {
              setShowConsumerSuggestions(true);
            }
          }
        } else if (userRole === 'admin') {
          // For admin, use API search
          const result = await getConsumers({ search: debouncedConsumerSearch });
          if (result && !result.error && Array.isArray(result)) {
            setConsumers(result);
            // Automatically show suggestions if results found
            if (result.length > 0) {
              setShowConsumerSuggestions(true);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching consumers:', err);
        setConsumers([]);
        setShowConsumerSuggestions(false);
      } finally {
        setLoadingConsumers(false);
      }
    };

    fetchConsumers();
  }, [debouncedConsumerSearch, userRole]);

  // Fetch resellers from API when search term is 3+ characters
  useEffect(() => {
    const fetchResellers = async () => {
      if (userRole !== 'admin' || !debouncedResellerSearch || debouncedResellerSearch.length < 3) {
        if (userRole !== 'admin') {
          setResellers([]);
        } else if (!debouncedResellerSearch || debouncedResellerSearch.length < 3) {
          setResellers([]);
          setShowResellerSuggestions(false);
        }
        return;
      }

      setLoadingResellers(true);
      try {
        const result = await getResellers({ search: debouncedResellerSearch });
        if (result && !result.error && Array.isArray(result)) {
          setResellers(result);
          // Automatically show suggestions if results found
          if (result.length > 0) {
            setShowResellerSuggestions(true);
          }
        }
      } catch (err) {
        console.error('Error fetching resellers:', err);
        setResellers([]);
        setShowResellerSuggestions(false);
      } finally {
        setLoadingResellers(false);
      }
    };

    fetchResellers();
  }, [debouncedResellerSearch, userRole]);

  // Fetch all invoices from backend (no search filter)
  useEffect(() => {
    const fetchInvoices = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters = {
          status: filterStatus !== 'all' ? filterStatus : undefined
          // Removed search from backend - will filter client-side
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
  }, [userRole, filterStatus]);

  // Debounce search input
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1); // Reset to first page when search changes
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [searchInput]);

  // Reset to first page when any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterConsumerId, filterResellerId, filterDateFrom, filterDateTo, filterAmountMin, filterAmountMax]);

  // Handle consumer selection from suggestions
  const handleConsumerSelect = (consumer) => {
    setFilterConsumer(consumer.full_name || consumer.email || consumer.user_id);
    setFilterConsumerId(consumer.user_id);
    setShowConsumerSuggestions(false);
  };

  // Clear consumer filter
  const clearConsumerFilter = () => {
    setFilterConsumer('');
    setFilterConsumerId('');
    setConsumerSearchTerm('');
    setShowConsumerSuggestions(false);
    setConsumers([]);
  };

  // Handle reseller selection from suggestions
  const handleResellerSelect = (reseller) => {
    setFilterReseller(reseller.full_name || reseller.email || reseller.user_id);
    setFilterResellerId(reseller.user_id);
    setShowResellerSuggestions(false);
  };

  // Clear reseller filter
  const clearResellerFilter = () => {
    setFilterReseller('');
    setFilterResellerId('');
    setResellerSearchTerm('');
    setShowResellerSuggestions(false);
    setResellers([]);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setFilterConsumer('');
    setFilterConsumerId('');
    setFilterReseller('');
    setFilterResellerId('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterAmountMin('');
    setFilterAmountMax('');
    setFilterStatus('unpaid');
    setSearchInput('');
    setSearchQuery('');
    setConsumerSearchTerm('');
    setResellerSearchTerm('');
    setConsumers([]);
    setResellers([]);
  };

  // Filter consumers - show all from API (already filtered by search)
  const filteredConsumerSuggestions = consumers.slice(0, 10); // Limit to 10 suggestions

  // Filter resellers - show all from API (already filtered by search)
  const filteredResellerSuggestions = resellers.slice(0, 10); // Limit to 10 suggestions

  // Client-side filtering for search and all filters
  const filteredInvoices = invoices.filter(invoice => {
    // Filter by consumer (for resellers and admins)
    if (filterConsumerId) {
      const consumerId = invoice.consumer_id || invoice.receiver_id || invoice.receiver?.user_id || (invoice.receiver && typeof invoice.receiver === 'object' ? invoice.receiver.user_id : null);
      const consumerIdStr = String(consumerId || '');
      const filterIdStr = String(filterConsumerId || '');
      
      if (consumerIdStr !== filterIdStr) {
        return false;
      }
    }

    // Filter by reseller (for admins)
    if (userRole === 'admin' && filterResellerId) {
      const resellerId = invoice.reseller_id || invoice.sender_id || invoice.sender?.user_id || (invoice.sender && typeof invoice.sender === 'object' ? invoice.sender.user_id : null);
      const resellerIdStr = String(resellerId || '');
      const filterIdStr = String(filterResellerId || '');
      
      if (resellerIdStr !== filterIdStr) {
        return false;
      }
    }

    // Filter by date range
    if (filterDateFrom || filterDateTo) {
      const invoiceDate = invoice.invoice_date || invoice.created_at;
      if (invoiceDate) {
        const invoiceDateObj = new Date(invoiceDate);
        if (filterDateFrom) {
          const fromDate = new Date(filterDateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (invoiceDateObj < fromDate) {
            return false;
          }
        }
        if (filterDateTo) {
          const toDate = new Date(filterDateTo);
          toDate.setHours(23, 59, 59, 999);
          if (invoiceDateObj > toDate) {
            return false;
          }
        }
      }
    }

    // Filter by amount range
    if (filterAmountMin || filterAmountMax) {
      const invoiceAmount = parseFloat(invoice.total || 0);
      if (filterAmountMin) {
        const minAmount = parseFloat(filterAmountMin);
        if (invoiceAmount < minAmount) {
          return false;
        }
      }
      if (filterAmountMax) {
        const maxAmount = parseFloat(filterAmountMax);
        if (invoiceAmount > maxAmount) {
          return false;
        }
      }
    }

    // Filter by search query
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      (invoice.invoice_number && invoice.invoice_number.toLowerCase().includes(query)) ||
      (invoice.id && invoice.id.toLowerCase().includes(query)) ||
      (invoice.consumer_name && invoice.consumer_name.toLowerCase().includes(query)) ||
      (invoice.consumer_email && invoice.consumer_email.toLowerCase().includes(query)) ||
      (invoice.reseller_name && invoice.reseller_name.toLowerCase().includes(query)) ||
      (invoice.total && invoice.total.toString().includes(query))
    );
  });

  // Pagination calculations
  const indexOfLastInvoice = currentPage * invoicesPerPage;
  const indexOfFirstInvoice = indexOfLastInvoice - invoicesPerPage;
  const currentInvoices = filteredInvoices.slice(indexOfFirstInvoice, indexOfLastInvoice);
  const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return { bg: '#f0fdf4', border: '#86efac', text: '#166534', icon: CheckCircle };
      case 'unpaid':
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

  const handleResendInvoice = async (invoice) => {
    setResendInvoiceLoading(true);
    setResendInvoiceStatus(null);
    
    try {
      // Get invoice ID - handle different possible ID fields
      const invoiceId = invoice.id || invoice.invoice_id || invoice.invoiceId;
      console.log('Resending invoice with ID:', invoiceId, 'Invoice object:', invoice);
      
      if (!invoiceId) {
        toast.error('Invoice ID not found');
        setResendInvoiceLoading(false);
        return;
      }
      
      const result = await apiClient.invoices.resend(invoiceId);
      
      // Axios interceptor returns response.data directly, so result is already the response object
      if (result && result.success) {
        // Generate random direction for arrow animation (smaller distance to stay in button)
        const angle = Math.random() * Math.PI * 2; // Random angle in radians
        const distance = 30; // Small distance to stay within button area
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        setArrowDirection({ x, y });
        
        setResendInvoiceStatus('success');
        toast.success(result.message || 'Invoice email resent successfully');
        
        // Reset status after animation completes
        setTimeout(() => {
          setResendInvoiceStatus(null);
          setArrowDirection({ x: 0, y: 0 });
        }, 2000);
      } else {
        setResendInvoiceStatus('error');
        toast.error(result?.message || 'Failed to resend invoice email');
        
        // Reset status after animation
        setTimeout(() => {
          setResendInvoiceStatus(null);
        }, 2000);
      }
    } catch (error) {
      console.error('Error resending invoice:', error);
      setResendInvoiceStatus('error');
      toast.error(error?.message || error?.response?.data?.message || 'Failed to resend invoice email');
      
      // Reset status after animation
      setTimeout(() => {
        setResendInvoiceStatus(null);
      }, 2000);
    } finally {
      setResendInvoiceLoading(false);
    }
  };

  const handleCopyInvoiceLink = (invoice) => {
    console.log("invoice", invoice);
    const baseUrl = window.location.origin;
    console.log("baseUrl", baseUrl);
    
    // Get invoice data
    const invoiceId = invoice.id || '';
    const amount = invoice.total || invoice.total_amount || 0;
    const userId = invoice.receiver_id || invoice.consumer_id || invoice.receiver?.user_id || '';
    const invoiceNumber = invoice.invoice_number || '';
    
    // Build payment link with query parameters
    const params = new URLSearchParams({
      amount: parseFloat(amount).toFixed(2),
      invoice_id: invoiceId,
      user_id: userId,
      invoice_number: invoiceNumber
    });
    console.log("params", params);
    
    const invoiceLink = `${baseUrl}/consumer/payment?${params.toString()}`;
    console.log("invoiceLink", invoiceLink);
    navigator.clipboard.writeText(invoiceLink).then(() => {
      toast.success('Invoice payment link copied to clipboard');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = invoiceLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Invoice payment link copied to clipboard');
    });
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
                flexDirection: 'column',
                gap: '12px'
              }}>
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
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
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
                    <option value="unpaid">Unpaid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowFilterModal(true)}
                    style={{
                      padding: '10px 16px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      backgroundColor: (filterConsumerId || filterResellerId || filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax) ? '#74317e' : 'white',
                      color: (filterConsumerId || filterResellerId || filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax) ? 'white' : '#374151',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!(filterConsumerId || filterResellerId || filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax)) {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!(filterConsumerId || filterResellerId || filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax)) {
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                  >
                    <Filter size={18} />
                    Filters
                    {(filterConsumerId || filterResellerId || filterDateFrom || filterDateTo || filterAmountMin || filterAmountMax) && (
                      <span style={{
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        borderRadius: '12px',
                        padding: '2px 8px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {[
                          filterConsumerId && 1,
                          filterResellerId && 1,
                          filterDateFrom && 1,
                          filterDateTo && 1,
                          filterAmountMin && 1,
                          filterAmountMax && 1
                        ].filter(Boolean).length}
                      </span>
                    )}
                  </button>
                </div>
                {/* Quick Filter Links */}
                <div style={{ 
                  display: 'flex', 
                  gap: '12px',
                  alignItems: 'center',
                  flexWrap: 'wrap'
                }}>
                  <span
                    onClick={() => setFilterStatus('paid')}
                    style={{
                      fontSize: '14px',
                      color: '#3b82f6',
                      cursor: 'pointer',
                      textDecoration: filterStatus === 'paid' ? 'underline' : 'none',
                      fontWeight: filterStatus === 'paid' ? '600' : '400',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      if (filterStatus !== 'paid') {
                        e.currentTarget.style.textDecoration = 'none';
                      }
                    }}
                  >
                    Paid
                  </span>
                  <div style={{ 
                    width: '1px', 
                    height: '16px', 
                    backgroundColor: '#d1d5db',
                    margin: '0 4px'
                  }}></div>
                  <span
                    onClick={() => setFilterStatus('unpaid')}
                    style={{
                      fontSize: '14px',
                      color: '#3b82f6',
                      cursor: 'pointer',
                      textDecoration: filterStatus === 'unpaid' ? 'underline' : 'none',
                      fontWeight: filterStatus === 'unpaid' ? '600' : '400',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      if (filterStatus !== 'unpaid') {
                        e.currentTarget.style.textDecoration = 'none';
                      }
                    }}
                  >
                    Unpaid
                  </span>
                  <div style={{ 
                    width: '1px', 
                    height: '16px', 
                    backgroundColor: '#d1d5db',
                    margin: '0 4px'
                  }}></div>
                  <span
                    onClick={() => setFilterStatus('all')}
                    style={{
                      fontSize: '14px',
                      color: '#3b82f6',
                      cursor: 'pointer',
                      textDecoration: filterStatus === 'all' ? 'underline' : 'none',
                      fontWeight: filterStatus === 'all' ? '600' : '400',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      if (filterStatus !== 'all') {
                        e.currentTarget.style.textDecoration = 'none';
                      }
                    }}
                  >
                    All
                  </span>
                </div>
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
                    {currentInvoices.map((invoice) => {
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
                            <span style={{ textTransform: 'capitalize' }}>
                              {invoice.status}
                            </span>
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

              {/* Pagination */}
              {!loading && filteredInvoices.length > 0 && (
                <div style={{ 
                  padding: '16px 24px',
                  borderTop: '2px solid #f0f0f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  backgroundColor: 'white',
                  flexShrink: 0
                }}>
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    Showing {indexOfFirstInvoice + 1} to {Math.min(indexOfLastInvoice, filteredInvoices.length)} of {filteredInvoices.length} invoices
                  </div>
                  
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button
                      onClick={() => paginate(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        backgroundColor: currentPage === 1 ? '#f8f9fa' : 'white',
                        color: currentPage === 1 ? '#ccc' : '#333',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== 1) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    {[...Array(totalPages)].map((_, index) => {
                      const pageNumber = index + 1;
                      // Show first page, last page, current page, and pages around current
                      if (
                        pageNumber === 1 ||
                        pageNumber === totalPages ||
                        (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={pageNumber}
                            onClick={() => paginate(pageNumber)}
                            style={{
                              padding: '8px 12px',
                              border: `1px solid ${currentPage === pageNumber ? '#74317e' : '#e0e0e0'}`,
                              borderRadius: '6px',
                              backgroundColor: currentPage === pageNumber ? '#74317e' : 'white',
                              color: currentPage === pageNumber ? 'white' : '#333',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: currentPage === pageNumber ? '600' : '500',
                              transition: 'all 0.2s',
                              minWidth: '40px'
                            }}
                            onMouseEnter={(e) => {
                              if (currentPage !== pageNumber) {
                                e.currentTarget.style.backgroundColor = '#f8f9fa';
                                e.currentTarget.style.borderColor = '#74317e';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (currentPage !== pageNumber) {
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.borderColor = '#e0e0e0';
                              }
                            }}
                          >
                            {pageNumber}
                          </button>
                        );
                      } else if (
                        pageNumber === currentPage - 2 ||
                        pageNumber === currentPage + 2
                      ) {
                        return (
                          <span key={pageNumber} style={{ padding: '0 4px', color: '#666' }}>
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                    
                    <button
                      onClick={() => paginate(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #e0e0e0',
                        borderRadius: '6px',
                        backgroundColor: currentPage === totalPages ? '#f8f9fa' : 'white',
                        color: currentPage === totalPages ? '#ccc' : '#333',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (currentPage !== totalPages) {
                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentPage !== totalPages) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filter Modal */}
      {showFilterModal && (
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
        onClick={() => setShowFilterModal(false)}
        >
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            maxWidth: '600px',
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
                Filter Invoices
              </h3>
              <button
                onClick={() => setShowFilterModal(false)}
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
              {/* Consumer Filter */}
              {(userRole === 'reseller' || userRole === 'admin') && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Filter by Consumer
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Filter size={18} style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                      pointerEvents: 'none',
                      zIndex: 1
                    }} />
                    <input
                      type="text"
                      placeholder="Type at least 3 characters to search..."
                      value={filterConsumer}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilterConsumer(value);
                        setConsumerSearchTerm(value);
                        setShowConsumerSuggestions(value.length >= 3 && consumers.length > 0);
                        if (!value) {
                          setFilterConsumerId('');
                          setConsumerSearchTerm('');
                        }
                      }}
                      onFocus={() => {
                        if (filterConsumer.length >= 3) {
                          if (consumers.length > 0) {
                            setShowConsumerSuggestions(true);
                          } else if (!loadingConsumers) {
                            // If no consumers yet but search term is valid, show message
                            setShowConsumerSuggestions(false);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        // Only hide suggestions if clicking outside the input and suggestion box
                        const relatedTarget = e.relatedTarget;
                        if (!relatedTarget || !relatedTarget.closest('.consumer-suggestions-container')) {
                          setTimeout(() => setShowConsumerSuggestions(false), 200);
                        }
                      }}
                      onMouseDown={(e) => {
                        // Prevent input from losing focus when clicking inside it
                        e.preventDefault();
                        e.currentTarget.focus();
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: loadingConsumers ? '#f3f4f6' : 'white',
                        paddingRight: filterConsumerId ? '32px' : '12px'
                      }}
                    />
                    {filterConsumerId && (
                      <button
                        type="button"
                        onClick={clearConsumerFilter}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#9ca3af'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                      >
                        ×
                      </button>
                    )}
                    {showConsumerSuggestions && filteredConsumerSuggestions.length > 0 && (
                      <div 
                        className="consumer-suggestions-container"
                        onMouseDown={(e) => {
                          // Prevent input from losing focus when clicking suggestions
                          e.preventDefault();
                        }}
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
                      }}>
                        {filteredConsumerSuggestions.map((consumer) => (
                          <div
                            key={consumer.user_id}
                            onClick={() => handleConsumerSelect(consumer)}
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
                              {consumer.full_name || 'No Name'}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                              {consumer.email || consumer.user_id}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {filterConsumer && filterConsumer.length < 3 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px',
                        fontSize: '14px',
                        color: '#6b7280',
                        zIndex: 1000
                      }}>
                        Type at least 3 characters to search...
                      </div>
                    )}
                    {filterConsumer.length >= 3 && loadingConsumers && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px',
                        fontSize: '14px',
                        color: '#6b7280',
                        zIndex: 1000,
                        textAlign: 'center'
                      }}>
                        Searching...
                      </div>
                    )}
                    {filterConsumer.length >= 3 && !loadingConsumers && filteredConsumerSuggestions.length === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px',
                        fontSize: '14px',
                        color: '#6b7280',
                        zIndex: 1000
                      }}>
                        No consumers found matching "{filterConsumer}"
                      </div>
                    )}
                  </div>
                  
                  {/* Consumer Date Range Filter */}
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Consumer Invoice Date Range
                    </label>
                    <p style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      marginBottom: '12px',
                      lineHeight: '1.4'
                    }}>
                      Filter invoices by date range for this consumer
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#6b7280',
                          marginBottom: '6px'
                        }}>
                          From Date
                        </label>
                        <input
                          type="date"
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#6b7280',
                          marginBottom: '6px'
                        }}>
                          To Date
                        </label>
                        <input
                          type="date"
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                    {(filterDateFrom || filterDateTo) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterDateFrom('');
                          setFilterDateTo('');
                        }}
                        style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          color: '#ef4444',
                          background: 'none',
                          border: '1px solid #ef4444',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        Clear Date Range
                      </button>
                    )}
                  </div>

                  {/* Consumer Amount Range Filter */}
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#374151',
                      marginBottom: '8px'
                    }}>
                      Consumer Invoice Amount Range
                    </label>
                    <p style={{
                      fontSize: '11px',
                      color: '#6b7280',
                      marginBottom: '12px',
                      lineHeight: '1.4'
                    }}>
                      Filter invoices by amount range for this consumer
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#6b7280',
                          marginBottom: '6px'
                        }}>
                          Min Amount
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={filterAmountMin}
                          onChange={(e) => setFilterAmountMin(e.target.value)}
                          min="0"
                          step="0.01"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#6b7280',
                          marginBottom: '6px'
                        }}>
                          Max Amount
                        </label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={filterAmountMax}
                          onChange={(e) => setFilterAmountMax(e.target.value)}
                          min="0"
                          step="0.01"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '13px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                    {(filterAmountMin || filterAmountMax) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterAmountMin('');
                          setFilterAmountMax('');
                        }}
                        style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          color: '#ef4444',
                          background: 'none',
                          border: '1px solid #ef4444',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        Clear Amount Range
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Reseller Filter (Admin only) */}
              {userRole === 'admin' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Filter by Reseller
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Filter size={18} style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                      pointerEvents: 'none',
                      zIndex: 1
                    }} />
                    <input
                      type="text"
                      placeholder="Type at least 3 characters to search..."
                      value={filterReseller}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFilterReseller(value);
                        setResellerSearchTerm(value);
                        setShowResellerSuggestions(value.length >= 3 && resellers.length > 0);
                        if (!value) {
                          setFilterResellerId('');
                          setResellerSearchTerm('');
                        }
                      }}
                      onFocus={() => {
                        if (filterReseller.length >= 3) {
                          if (resellers.length > 0) {
                            setShowResellerSuggestions(true);
                          } else if (!loadingResellers) {
                            // If no resellers yet but search term is valid, show message
                            setShowResellerSuggestions(false);
                          }
                        }
                      }}
                      onBlur={(e) => {
                        // Only hide suggestions if clicking outside the input and suggestion box
                        const relatedTarget = e.relatedTarget;
                        if (!relatedTarget || !relatedTarget.closest('.reseller-suggestions-container')) {
                          setTimeout(() => setShowResellerSuggestions(false), 200);
                        }
                      }}
                      onMouseDown={(e) => {
                        // Prevent input from losing focus when clicking inside it
                        e.preventDefault();
                        e.currentTarget.focus();
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px 10px 36px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                        backgroundColor: loadingResellers ? '#f3f4f6' : 'white',
                        paddingRight: filterResellerId ? '32px' : '12px'
                      }}
                    />
                    {filterResellerId && (
                      <button
                        type="button"
                        onClick={clearResellerFilter}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          color: '#9ca3af'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
                      >
                        ×
                      </button>
                    )}
                    {showResellerSuggestions && filteredResellerSuggestions.length > 0 && (
                      <div 
                        className="reseller-suggestions-container"
                        onMouseDown={(e) => {
                          // Prevent input from losing focus when clicking suggestions
                          e.preventDefault();
                        }}
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
                      }}>
                        {filteredResellerSuggestions.map((reseller) => (
                          <div
                            key={reseller.user_id}
                            onClick={() => handleResellerSelect(reseller)}
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
                        ))}
                      </div>
                    )}
                    {filterReseller && filterReseller.length < 3 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px',
                        fontSize: '14px',
                        color: '#6b7280',
                        zIndex: 1000
                      }}>
                        Type at least 3 characters to search...
                      </div>
                    )}
                    {filterReseller.length >= 3 && loadingResellers && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px',
                        fontSize: '14px',
                        color: '#6b7280',
                        zIndex: 1000,
                        textAlign: 'center'
                      }}>
                        Searching...
                      </div>
                    )}
                    {filterReseller.length >= 3 && !loadingResellers && filteredResellerSuggestions.length === 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        backgroundColor: 'white',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        padding: '12px',
                        fontSize: '14px',
                        color: '#6b7280',
                        zIndex: 1000
                      }}>
                        No resellers found matching "{filterReseller}"
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Date Range Filter (Admin only) */}
              {userRole === 'admin' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Filter by Invoice Date
                  </label>
                  <p style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    margin: '0 0 12px 0'
                  }}>
                    Filter invoices by their issue date (when the invoice was created)
                  </p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6b7280',
                        marginBottom: '6px'
                      }}>
                        From Date
                      </label>
                      <input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6b7280',
                        marginBottom: '6px'
                      }}>
                        To Date
                      </label>
                      <input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none',
                          cursor: 'pointer'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Amount Range Filter (Admin only) */}
              {userRole === 'admin' && (
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Filter by Amount Range
                  </label>
                  <p style={{
                    fontSize: '12px',
                    color: '#6b7280',
                    margin: '0 0 12px 0'
                  }}>
                    Filter invoices by their total amount (in USD)
                  </p>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6b7280',
                        marginBottom: '6px'
                      }}>
                        Minimum Amount ($)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={filterAmountMin}
                        onChange={(e) => setFilterAmountMin(e.target.value)}
                        min="0"
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div style={{ flex: '1 1 200px' }}>
                      <label style={{
                        display: 'block',
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#6b7280',
                        marginBottom: '6px'
                      }}>
                        Maximum Amount ($)
                      </label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={filterAmountMax}
                        onChange={(e) => setFilterAmountMax(e.target.value)}
                        min="0"
                        step="0.01"
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
                <button
                  onClick={() => {
                    clearAllFilters();
                    setShowFilterModal(false);
                  }}
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
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
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
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
                {userRole === 'admin' && (
                  <>
                    <button
                      onClick={() => handleCopyInvoiceLink(selectedInvoice)}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <Copy size={16} />
                      Copy Link
                    </button>
                    <button
                      data-resend-button
                      onClick={() => handleResendInvoice(selectedInvoice)}
                      disabled={resendInvoiceLoading}
                      style={{
                        padding: '10px 20px',
                        backgroundColor: resendInvoiceStatus === 'success' ? '#10b981' : resendInvoiceStatus === 'error' ? '#ef4444' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: resendInvoiceLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        opacity: resendInvoiceLoading ? 0.7 : 1,
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'visible',
                        minWidth: '160px',
                        justifyContent: 'center'
                      }}
                    >
                      {resendInvoiceLoading ? (
                        <>
                          <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          <span>Loading...</span>
                        </>
                      ) : resendInvoiceStatus === 'success' ? (
                        <>
                          <div style={{ position: 'relative', width: '16px', height: '16px' }}>
                            <Send 
                              size={16} 
                              className="flying-arrow"
                              style={{ 
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                ['--arrow-x']: `${arrowDirection.x}px`,
                                ['--arrow-y']: `${arrowDirection.y}px`
                              }}
                            />
                          </div>
                          <span>Invoice Sent!</span>
                        </>
                      ) : resendInvoiceStatus === 'error' ? (
                        <>
                          <ArrowDown 
                            size={16} 
                            style={{ 
                              animation: 'arrowDown 0.6s ease-out',
                              transform: 'translateY(0)'
                            }} 
                          />
                          <span>Failed</span>
                        </>
                      ) : (
                        <>
                          <Mail size={16} />
                          <span>Resend Invoice</span>
                        </>
                      )}
                      <style>{`
                        @keyframes spin {
                          from { transform: rotate(0deg); }
                          to { transform: rotate(360deg); }
                        }
                        .flying-arrow {
                          animation: flyAway 1.5s ease-out forwards !important;
                        }
                        @keyframes flyAway {
                          0% {
                            transform: translate(0, 0) scale(1) rotate(0deg);
                            opacity: 1;
                          }
                          30% {
                            transform: translate(calc(var(--arrow-x, 0) * 0.3), calc(var(--arrow-y, 0) * 0.3)) scale(2) rotate(45deg);
                            opacity: 1;
                          }
                          70% {
                            transform: translate(calc(var(--arrow-x, 0) * 0.7), calc(var(--arrow-y, 0) * 0.7)) scale(3.5) rotate(90deg);
                            opacity: 0.6;
                          }
                          100% {
                            transform: translate(var(--arrow-x, 0), var(--arrow-y, 0)) scale(5) rotate(180deg);
                            opacity: 0;
                          }
                        }
                        @keyframes arrowDown {
                          0% {
                            transform: translateY(-10px);
                            opacity: 0;
                          }
                          50% {
                            transform: translateY(5px);
                            opacity: 1;
                          }
                          100% {
                            transform: translateY(0);
                            opacity: 1;
                          }
                        }
                      `}</style>
                    </button>
                  </>
                )}
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
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Download size={16} />
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

