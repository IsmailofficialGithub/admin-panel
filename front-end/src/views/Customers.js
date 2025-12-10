import React, { useState, useEffect, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import { 
  MessageSquare, Search, Filter, Plus, Eye, MoreVertical, 
  Send, Paperclip, X, CheckCircle, Clock, AlertCircle, 
  User, Calendar, Tag, ChevronLeft, ChevronRight, FileText,
  Download, Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  getTickets, 
  getTicket, 
  createTicket, 
  addMessage, 
  updateTicketStatus,
  getTicketStats
} from '../api/backend';
import { useAuth } from '../contexts/AuthContext';
import { checkUserPermissionsBulk } from '../api/backend/permissions';
import { usePermissions } from '../hooks/usePermissions';
import apiClient from '../services/apiClient';
import { supabase } from '../lib/supabase/Production/client';
import { hasRole } from '../utils/roleUtils';

const Customers = () => {
  const history = useHistory();
  const { profile, user } = useAuth();
  const { hasPermission, isLoading: isLoadingPermissions } = usePermissions();
  const isAdmin = hasRole(profile?.role, 'admin');
  const [permissions, setPermissions] = useState({
    create: false, // Start as false, update after checking
    update: false,
    read: false,
  });
  const [hasViewPermission, setHasViewPermission] = useState(false); // Start as false
  const [checkingViewPermission, setCheckingViewPermission] = useState(true);
  const [checkingPermissions, setCheckingPermissions] = useState(true); // Track permission checking state
  
  // State
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTickets, setTotalTickets] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [stats, setStats] = useState(null);
  
  // Ticket detail state
  const [ticketMessages, setTicketMessages] = useState([]);
  const [ticketAttachments, setTicketAttachments] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  
  // Create ticket state
  const [createFormData, setCreateFormData] = useState({
    subject: '',
    message: '',
    category: '',
    priority: 'medium',
    attachments: []
  });
  const [creatingTicket, setCreatingTicket] = useState(false);
  
  // Status update state (admin only)
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusUpdateData, setStatusUpdateData] = useState({
    status: '',
    priority: '',
    assigned_to: '',
    internal_notes: ''
  });

  const ticketsPerPage = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Check customer_support.view permission first (required to access the page)
  useEffect(() => {
    if (!user || !profile) {
      setHasViewPermission(false);
      setCheckingViewPermission(false);
      return;
    }

    // Wait for permissions to load before checking
    if (isLoadingPermissions) {
      setCheckingViewPermission(true);
      return;
    }

    // Use permissions hook to check permission (only after permissions are loaded)
    const hasViewPerm = hasPermission('customer_support.view');
    setHasViewPermission(hasViewPerm);
    setCheckingViewPermission(false);
    
    // Redirect if no permission (only after permissions are loaded)
    if (!hasViewPerm) {
      toast.error('You do not have permission to view customer support.');
      setTimeout(() => {
        history.push('/admin/users');
      }, 500);
    }
  }, [user, profile, history, hasPermission, isLoadingPermissions]);

  // Check multiple permissions using the permissions hook (optimized - no API calls needed)
  useEffect(() => {
    // Only check other permissions if user has view permission and permissions are loaded
    if (checkingViewPermission || !hasViewPermission || isLoadingPermissions) {
      return;
    }

    setCheckingPermissions(true);
    
    // Systemadmins have all permissions
    if (profile?.is_systemadmin === true) {
      setPermissions({ create: true, update: true, read: true });
      setCheckingPermissions(false);
      return;
    }

    // Use permissions hook to check all permissions (already fetched, no API calls)
    try {

        // Use permissions hook to check all permissions (already fetched, no API calls)
        setPermissions({
          create: hasPermission('customer_support.create'),
          update: hasPermission('customer_support.update'),
          read: hasPermission('customer_support.read')
        });
    } catch (error) {
      console.error('Error checking customer support permissions:', error);
      setPermissions({ create: false, update: false, read: false });
    } finally {
      setCheckingPermissions(false);
    }
  }, [user, profile, checkingViewPermission, hasViewPermission, isLoadingPermissions, hasPermission]);

  // Fetch tickets (only if user has view permission)
  useEffect(() => {
    // Don't fetch if still checking permission or if user doesn't have permission
    if (checkingViewPermission || !hasViewPermission) {
      return;
    }

    fetchTickets();
    if (isAdmin) {
      fetchStats();
    }
  }, [currentPage, searchQuery, statusFilter, priorityFilter, checkingViewPermission, hasViewPermission, isAdmin]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const filters = {
        page: currentPage,
        limit: ticketsPerPage,
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        priority: priorityFilter !== 'all' ? priorityFilter : undefined
      };
      
      const response = await getTickets(filters);
      setTickets(response.data || []);
      setTotalTickets(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 1);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch tickets');
      toast.error('Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await getTicketStats();
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      const response = await getTicket(ticketId);
      setTicketMessages(response.data.messages || []);
      setTicketAttachments(response.data.attachments || []);
      setSelectedTicket(response.data.ticket);
    } catch (err) {
      toast.error('Failed to load ticket details');
    }
  };

  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [ticketMessages]);

  const handleViewTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
    await fetchTicketDetails(ticket.id);
    
    // Unsubscribe from previous channel if exists
    if (subscriptionRef.current) {
      await supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    
    // Subscribe to real-time updates for this ticket
    const channel = supabase
      .channel(`ticket-${ticket.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticket.id}`
        },
        (payload) => {
          console.log('New message received:', payload.new);
          // Check if message already exists to avoid duplicates
          setTicketMessages(prev => {
            const exists = prev.some(msg => msg.id === payload.new.id);
            if (exists) return prev;
            return [...prev, payload.new];
          });
          // Refresh attachments
          fetchTicketDetails(ticket.id);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${ticket.id}`
        },
        (payload) => {
          console.log('Ticket updated:', payload.new);
          setSelectedTicket(payload.new);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to ticket updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Channel subscription error');
        }
      });
    
    subscriptionRef.current = channel;
  };

  useEffect(() => {
    return () => {
      // Cleanup subscription when component unmounts or ticket changes
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current).then(() => {
          console.log('Channel removed');
        });
        subscriptionRef.current = null;
      }
    };
  }, [selectedTicket?.id]);

  // Cleanup subscription when modal closes
  useEffect(() => {
    if (!showTicketModal && subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current).then(() => {
        console.log('Channel removed on modal close');
      });
      subscriptionRef.current = null;
    }
  }, [showTicketModal]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (ticketId = null, messageId = null, clearFiles = false) => {
    if (selectedFiles.length === 0) return [];
    
    setUploadingFiles(true);
    const uploadedAttachments = [];
    
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        if (ticketId) formData.append('ticket_id', ticketId);
        if (messageId) formData.append('message_id', messageId);
        
        const response = await apiClient.customerSupport.uploadAttachment(formData);
        uploadedAttachments.push(response.data);
      }
      // Only clear files if explicitly requested (for backward compatibility)
      if (clearFiles) {
        setSelectedFiles([]);
      }
      return uploadedAttachments;
    } catch (err) {
      toast.error('Failed to upload files');
      throw err;
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleSendMessage = async () => {
    // Check permission before sending message
    if (!permissions.read) {
      toast.error('You do not have permission to send messages.');
      return;
    }

    // Validate: must have either message or files
    if (!newMessage.trim() && selectedFiles.length === 0) {
      toast.error('Please add a message or attach a file');
      return;
    }

    if (!selectedTicket) return;

    setSendingMessage(true);
    try {
      // Upload files first if any
      let attachments = [];
      if (selectedFiles.length > 0) {
        attachments = await uploadFiles(selectedTicket.id, null, false);
      }
      
      // Send message (can be empty if attachments exist)
      await addMessage(selectedTicket.id, {
        message: newMessage.trim() || '', // Allow empty message if files exist
        is_internal: false,
        attachments: attachments
      });

      setNewMessage('');
      setSelectedFiles([]);
      await fetchTicketDetails(selectedTicket.id);
      await fetchTickets();
      toast.success(attachments.length > 0 ? 'Files sent successfully' : 'Message sent successfully');
    } catch (err) {
      console.error('Error sending message:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Failed to send message';
      toast.error(errorMessage);
    } finally {
      setSendingMessage(false);
      setUploadingFiles(false);
    }
  };

  const handleCreateTicket = async () => {
    // Check permission before creating
    if (!permissions.create) {
      toast.error('You do not have permission to create tickets.');
      setShowCreateModal(false);
      return;
    }

    if (!createFormData.subject.trim() || !createFormData.message.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    setCreatingTicket(true);
    try {
      // Upload files first
      const attachments = await uploadFiles();
      
      const ticketData = {
        ...createFormData,
        attachments: attachments
      };

      const response = await createTicket(ticketData);
      toast.success('Support ticket created successfully');
      setShowCreateModal(false);
      setCreateFormData({
        subject: '',
        message: '',
        category: '',
        priority: 'medium',
        attachments: []
      });
      setSelectedFiles([]);
      await fetchTickets();
      if (isAdmin) await fetchStats();
    } catch (err) {
      toast.error('Failed to create ticket');
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedTicket) return;

    // Check permission before updating status
    if (!permissions.update) {
      toast.error('You do not have permission to update ticket status.');
      return;
    }

    setUpdatingStatus(true);
    try {
      await updateTicketStatus(selectedTicket.id, statusUpdateData);
      toast.success('Ticket updated successfully');
      await fetchTicketDetails(selectedTicket.id);
      await fetchTickets();
      if (isAdmin) await fetchStats();
    } catch (err) {
      toast.error('Failed to update ticket');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#007bff',
      in_progress: '#ffc107',
      resolved: '#28a745',
      closed: '#6c757d',
      pending: '#17a2b8'
    };
    return colors[status] || '#6c757d';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#6c757d',
      medium: '#007bff',
      high: '#ffc107',
      urgent: '#dc3545'
    };
    return colors[priority] || '#6c757d';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Show loading while checking permission
  if (checkingViewPermission) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '85vh',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div className="spinner-border text-primary" role="status">
            <span className="sr-only">Loading...</span>
          </div>
          <p>Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Show access denied if no permission
  if (!hasViewPermission) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '85vh',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <h3>Access Denied</h3>
          <p>You do not have permission to view customer support.</p>
          <button
            onClick={() => history.push('/admin/users')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#74317e',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#2c3e50', margin: 0 }}>
            Customer Support
          </h1>
          {stats && (
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '14px', color: '#6c757d' }}>
              <span>Total: {stats.total}</span>
              <span>Open: {stats.open}</span>
              <span>In Progress: {stats.in_progress}</span>
              <span>Unread: {stats.unread_messages}</span>
            </div>
          )}
        </div>
        {!checkingPermissions && permissions.create && (
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              backgroundColor: '#8a3b9a',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '600',
              fontSize: '14px'
            }}
          >
            <Plus size={18} />
            New Ticket
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '16px', 
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '300px' }}>
          <Search 
            size={18} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: '#6c757d'
            }} 
          />
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px 12px 40px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none'
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
          <option value="pending">Pending</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* Tickets Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading tickets...</p>
        </div>
      ) : error ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '40px',
          backgroundColor: '#fee',
          borderRadius: '8px',
          color: '#c33'
        }}>
          <p>{error}</p>
        </div>
      ) : tickets.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <MessageSquare size={48} color="#6c757d" style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', color: '#6c757d', margin: 0 }}>
            {searchQuery ? 'No tickets found matching your search.' : 'No support tickets yet.'}
          </p>
        </div>
      ) : (
        <>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Ticket #</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Subject</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>User</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Priority</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>Created</th>
                  <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#495057' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket, index) => (
                  <tr 
                    key={ticket.id}
                    style={{ 
                      borderBottom: '1px solid #dee2e6',
                      transition: 'background-color 0.2s',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                    onClick={() => handleViewTicket(ticket)}
                  >
                    <td style={{ padding: '12px', color: '#212529', fontWeight: '600' }}>
                      {ticket.ticket_number}
                    </td>
                    <td style={{ padding: '12px', color: '#212529' }}>
                      {ticket.subject}
                    </td>
                    <td style={{ padding: '12px', color: '#6c757d' }}>
                      {ticket.user_name || ticket.user_email}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: getStatusColor(ticket.status) + '20',
                        color: getStatusColor(ticket.status)
                      }}>
                        {ticket.status?.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: getPriorityColor(ticket.priority) + '20',
                        color: getPriorityColor(ticket.priority)
                      }}>
                        {ticket.priority?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#6c757d', fontSize: '13px' }}>
                      {formatDate(ticket.created_at)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewTicket(ticket);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: '#8a3b9a'
                        }}
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '24px',
              padding: '16px',
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div style={{ color: '#6c757d', fontSize: '14px' }}>
                Showing {((currentPage - 1) * ticketsPerPage) + 1} to {Math.min(currentPage * ticketsPerPage, totalTickets)} of {totalTickets} tickets
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    backgroundColor: currentPage === 1 ? '#f8f9fa' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: currentPage === 1 ? '#adb5bd' : '#495057'
                  }}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>
                <span style={{ padding: '0 12px', color: '#495057', fontSize: '14px' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    backgroundColor: currentPage === totalPages ? '#f8f9fa' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: currentPage === totalPages ? '#adb5bd' : '#495057'
                  }}
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>Create Support Ticket</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateFormData({
                    subject: '',
                    message: '',
                    category: '',
                    priority: 'medium',
                    attachments: []
                  });
                  setSelectedFiles([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6c757d'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                Subject *
              </label>
              <input
                type="text"
                value={createFormData.subject}
                onChange={(e) => setCreateFormData({ ...createFormData, subject: e.target.value })}
                placeholder="Enter ticket subject"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                Message *
              </label>
              <textarea
                value={createFormData.message}
                onChange={(e) => setCreateFormData({ ...createFormData, message: e.target.value })}
                placeholder="Describe your issue..."
                rows={6}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  Category
                </label>
                <input
                  type="text"
                  value={createFormData.category}
                  onChange={(e) => setCreateFormData({ ...createFormData, category: e.target.value })}
                  placeholder="e.g., Technical, Billing"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                  Priority
                </label>
                <select
                  value={createFormData.priority}
                  onChange={(e) => setCreateFormData({ ...createFormData, priority: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#495057' }}>
                Attachments
              </label>
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                style={{ marginBottom: '8px' }}
              />
              {selectedFiles.length > 0 && (
                <div style={{ marginTop: '8px' }}>
                  {selectedFiles.map((file, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px',
                      marginBottom: '4px'
                    }}>
                      <span style={{ fontSize: '13px', color: '#495057' }}>{file.name}</span>
                      <button
                        onClick={() => removeFile(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: '#dc3545'
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateFormData({
                    subject: '',
                    message: '',
                    category: '',
                    priority: 'medium',
                    attachments: []
                  });
                  setSelectedFiles([]);
                }}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTicket}
                disabled={creatingTicket || uploadingFiles}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '8px',
                  backgroundColor: '#8a3b9a',
                  color: 'white',
                  cursor: creatingTicket || uploadingFiles ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  opacity: creatingTicket || uploadingFiles ? 0.6 : 1
                }}
              >
                {creatingTicket || uploadingFiles ? 'Creating...' : 'Create Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ticket Detail Modal */}
      {showTicketModal && selectedTicket && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            width: '90%',
            maxWidth: '800px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
                    {selectedTicket.ticket_number}
                  </h2>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: getStatusColor(selectedTicket.status) + '20',
                    color: getStatusColor(selectedTicket.status)
                  }}>
                    {selectedTicket.status?.replace('_', ' ').toUpperCase()}
                  </span>
                  <span style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: getPriorityColor(selectedTicket.priority) + '20',
                    color: getPriorityColor(selectedTicket.priority)
                  }}>
                    {selectedTicket.priority?.toUpperCase()}
                  </span>
                </div>
                <h3 style={{ margin: '8px 0', fontSize: '18px', fontWeight: '600', color: '#495057' }}>
                  {selectedTicket.subject}
                </h3>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6c757d', marginTop: '8px' }}>
                  <span>From: {selectedTicket.user_name || selectedTicket.user_email}</span>
                  <span>Created: {formatDate(selectedTicket.created_at)}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowTicketModal(false);
                  setSelectedTicket(null);
                  setTicketMessages([]);
                  setTicketAttachments([]);
                  setNewMessage('');
                  setSelectedFiles([]);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6c757d'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Admin Status Update */}
            {isAdmin && (
              <div style={{
                padding: '16px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>Update Ticket</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600' }}>Status</label>
                    <select
                      value={statusUpdateData.status || selectedTicket.status}
                      onChange={(e) => setStatusUpdateData({ ...statusUpdateData, status: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: '600' }}>Priority</label>
                    <select
                      value={statusUpdateData.priority || selectedTicket.priority}
                      onChange={(e) => setStatusUpdateData({ ...statusUpdateData, priority: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '13px'
                      }}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={handleUpdateStatus}
                  disabled={updatingStatus}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: '#8a3b9a',
                    color: 'white',
                    cursor: updatingStatus ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    fontWeight: '600',
                    opacity: updatingStatus ? 0.6 : 1
                  }}
                >
                  {updatingStatus ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            )}

            {/* Messages - Chat Style */}
            <div style={{ 
              flex: 1, 
              marginBottom: '16px', 
              maxHeight: '500px', 
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '12px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {ticketMessages.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px', 
                  color: '#6c757d',
                  fontSize: '14px'
                }}>
                  No messages yet. Start the conversation...
                </div>
              ) : (
                ticketMessages.map((message) => {
                  // Check if message is from current user based on email comparison
                  const currentUserEmail = profile?.email || user?.email;
                  const isCurrentUser = message.sender_email === currentUserEmail;
                  const messageAttachments = ticketAttachments.filter(a => a.message_id === message.id);
                  
                  return (
                    <div
                      key={message.id}
                      style={{
                        display: 'flex',
                        justifyContent: isCurrentUser ? 'flex-end' : 'flex-start',
                        marginBottom: '4px'
                      }}
                    >
                      <div style={{
                        maxWidth: '70%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isCurrentUser ? 'flex-end' : 'flex-start'
                      }}>
                        <div style={{
                          padding: '8px 12px',
                          borderRadius: '12px',
                          backgroundColor: isCurrentUser ? '#8a3b9a' : '#ffffff',
                          color: isCurrentUser ? '#ffffff' : '#212529',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          wordWrap: 'break-word',
                          fontSize: '14px',
                          lineHeight: '1.4'
                        }}>
                          {!isCurrentUser && (
                            <div style={{ 
                              fontSize: '11px', 
                              fontWeight: '600', 
                              marginBottom: '4px',
                              color: '#6c757d'
                            }}>
                              {message.sender_name || message.sender_email}
                            </div>
                          )}
                          {/* Show message text - hide placeholder if attachments exist */}
                          {message.message && 
                           !(message.message === '(File attachment)' && messageAttachments.length > 0) && (
                            <div style={{ 
                              whiteSpace: 'pre-wrap', 
                              marginBottom: messageAttachments.length > 0 ? '8px' : '0',
                              fontStyle: message.message === '(File attachment)' ? 'italic' : 'normal',
                              color: message.message === '(File attachment)' 
                                ? (isCurrentUser ? 'rgba(255,255,255,0.8)' : '#6c757d')
                                : undefined
                            }}>
                              {message.message === '(File attachment)' ? 'File attachment' : message.message}
                            </div>
                          )}
                          {messageAttachments.length > 0 && (
                            <div style={{ 
                              display: 'flex', 
                              flexDirection: 'column',
                              gap: '4px',
                              marginTop: '8px',
                              paddingTop: '8px',
                              borderTop: `1px solid ${isCurrentUser ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.1)'}`
                            }}>
                              {messageAttachments.map((attachment) => {
                                // Use file_url if available (from upload response), otherwise construct from file_path
                                const fileUrl = attachment.file_url || 
                                  (attachment.file_path?.startsWith('http') 
                                    ? attachment.file_path 
                                    : `${process.env.REACT_APP_SUPABASE_URL_PRODUCTION}/storage/v1/object/public/support-attachments/${attachment.file_path}`);
                                
                                return (
                                  <a
                                    key={attachment.id}
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    download={attachment.file_name}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      padding: '6px 10px',
                                      backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.2)' : '#f0f0f0',
                                      borderRadius: '6px',
                                      textDecoration: 'none',
                                      color: isCurrentUser ? '#ffffff' : '#495057',
                                      fontSize: '12px',
                                      transition: 'background-color 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = isCurrentUser ? 'rgba(255,255,255,0.3)' : '#e0e0e0';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = isCurrentUser ? 'rgba(255,255,255,0.2)' : '#f0f0f0';
                                    }}
                                  >
                                    <FileText size={14} />
                                    <span style={{ 
                                      maxWidth: '200px', 
                                      overflow: 'hidden', 
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {attachment.file_name}
                                    </span>
                                    <Download size={12} />
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div style={{
                          fontSize: '10px',
                          color: '#6c757d',
                          marginTop: '4px',
                          padding: '0 4px'
                        }}>
                          {formatDate(message.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Section - Compact Chat Input */}
            <div style={{
              padding: '12px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e0e0e0'
            }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedFiles.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {selectedFiles.map((file, index) => (
                        <div key={index} style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          backgroundColor: '#f0f0f0',
                          borderRadius: '6px',
                          fontSize: '11px',
                          border: '1px solid #ddd'
                        }}>
                          <FileText size={10} />
                          <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.name}
                          </span>
                          <button
                            onClick={() => removeFile(index)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              color: '#dc3545',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (newMessage.trim() || selectedFiles.length > 0) {
                          handleSendMessage();
                        }
                      }
                    }}
                    placeholder={selectedFiles.length > 0 ? "Add a message (optional)..." : "Type your message or attach a file..."}
                    rows={2}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '20px',
                      fontSize: '14px',
                      resize: 'none',
                      fontFamily: 'inherit',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#8a3b9a'}
                    onBlur={(e) => e.target.style.borderColor = '#ddd'}
                  />
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    id="file-input-ticket"
                  />
                  <label
                    htmlFor="file-input-ticket"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '10px',
                      backgroundColor: '#f8f9fa',
                      border: '1px solid #ddd',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                  >
                    <Paperclip size={18} color="#6c757d" />
                  </label>
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage || uploadingFiles || (!newMessage.trim() && selectedFiles.length === 0)}
                    style={{
                      padding: '10px 20px',
                      border: 'none',
                      borderRadius: '20px',
                      backgroundColor: '#8a3b9a',
                      color: 'white',
                      cursor: sendingMessage || uploadingFiles || (!newMessage.trim() && selectedFiles.length === 0) ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px',
                      opacity: sendingMessage || uploadingFiles || (!newMessage.trim() && selectedFiles.length === 0) ? 0.6 : 1,
                      transition: 'opacity 0.2s'
                    }}
                  >
                    <Send size={16} />
                    {sendingMessage || uploadingFiles ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
