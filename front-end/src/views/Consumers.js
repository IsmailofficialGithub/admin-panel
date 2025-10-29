import React, { useState, useEffect } from 'react';
import { MoreVertical, Edit, Trash2, Key, ChevronLeft, ChevronRight, UserPlus, CheckCircle, Search, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
// ✅ Using backend API instead of direct Supabase calls
import { 
  getConsumers, 
  createConsumer, 
  updateConsumer, 
  deleteConsumer,
  resetConsumerPassword,
  updateConsumerAccountStatus
} from '../api/backend';
import CreateConsumerModal from '../components/ui/createConsumerModel';
import UpdateConsumerModal from '../components/ui/updateConsumerModel';
import DeleteModal from '../components/ui/deleteModel';

const Consumers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedConsumer, setSelectedConsumer] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUserData, setDeleteUserData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [statusUpdateData, setStatusUpdateData] = useState(null);
  const [showStatusConfirmModal, setShowStatusConfirmModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [extendDays, setExtendDays] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const usersPerPage = 20;

  // Debounce search input
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 1500); // 2 seconds delay

    return () => clearTimeout(debounceTimer);
  }, [searchInput]);

  // Fetch consumers from backend API with filters
  useEffect(() => {
    const fetchConsumers = async () => {
      try {
        setLoading(true);
        const result = await getConsumers({
          account_status: accountStatusFilter,
          search: searchQuery
        });
        
        if (result?.error) {
          setError(result.error);
          console.error('❌ Error fetching consumers:', result.error);
        } else {
          setUsers(result || []); // Backend returns array directly
          setCurrentPage(1); // Reset to first page when filters change
        }
      } catch (err) {
        setError(err.message);
        console.error('❌ Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConsumers();
  }, [accountStatusFilter, searchQuery]);

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  const handleAction = async (action, userId, userName) => {
    setOpenDropdown(null);
    
    if (action === 'Update') {
      const consumer = users.find(u => u.user_id === userId);
      if (consumer) {
        setSelectedConsumer({
          id: userId,
          user_id: userId,
          full_name: consumer.full_name,
          email: consumer.email,
          phone: consumer.phone,
          country: consumer.country,
          city: consumer.city,
          trial_expiry: consumer.trial_expiry,
          trial_expiry_date: consumer.trial_expiry,
          created_at: consumer.created_at
        });
        setIsUpdateModalOpen(true);
      }
    } else if (action === 'Delete') {
      setDeleteUserData({ id: userId, name: userName });
      setShowDeleteModal(true);
    } else if (action === 'Update Status') {
      const consumer = users.find(u => u.user_id === userId);
      if (consumer) {
        setStatusUpdateData({ id: userId, name: userName, currentStatus: consumer.account_status });
        setShowStatusDropdown(true);
      }
    } else if (action === 'Reset Password') {
      // Handle reset password
      const loadingToast = toast.loading(`Resetting password for ${userName}...`);
      
      try {
        const result = await resetConsumerPassword(userId);
        
        if (result.error) {
          toast.error(`Error: ${result.error}`, { id: loadingToast });
        } else {
          toast.success(`Password reset successfully! Email sent to consumer.`, { id: loadingToast });
        }
      } catch (error) {
        console.error('Error resetting password:', error);
        toast.error('Failed to reset password. Please try again.', { id: loadingToast });
      }
    } else {
      toast(`${action} action clicked for consumer: ${userName}`);
    }
  };

  const handleCreateConsumer = async (consumerData) => {
    try {
      // Call backend API to create consumer
      const result = await createConsumer(consumerData);
      
      if (!result.success) {
        return { error: result.error || 'Failed to create consumer' };
      }
      
      // Add new consumer to the local state matching backend structure
      const newConsumer = {
        user_id: result.user.id,
        full_name: consumerData.full_name,
        email: result.user.email,
        phone: consumerData.phone || null,
        trial_expiry: consumerData.trial_expiry_date || null,
        referred_by: null,
        role: 'consumer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setUsers(prevUsers => [newConsumer, ...prevUsers]);
      
      return { success: true };
    } catch (err) {
      console.error('Error creating consumer:', err);
      return { error: 'Failed to create consumer. Please try again.' };
    }
  };

  const handleUpdateConsumer = async (updatedConsumer) => {
    try {
      // Call API to update consumer using user_id
      const result = await updateConsumer(updatedConsumer.user_id, {
        full_name: updatedConsumer.full_name,
        phone: updatedConsumer.phone,
        trial_expiry_date: updatedConsumer.trial_expiry_date
      });
      
      if (result.error) {
        toast.error(`Error updating consumer: ${result.error}`);
        console.error('Update error:', result.error);
        return;
      }
      
      // Update the consumer in the local state matching backend structure
      setUsers(prevUsers =>
        prevUsers.map(user => {
          if (user.user_id === updatedConsumer.user_id) {
            return {
              ...user,
              full_name: updatedConsumer.full_name,
              phone: updatedConsumer.phone || null,
              trial_expiry: updatedConsumer.trial_expiry_date || null,
              updated_at: new Date().toISOString()
            };
          }
          return user;
        })
      );
      
      toast.success('Consumer updated successfully!');
      
      // Close modal
      setIsUpdateModalOpen(false);
      setSelectedConsumer(null);
    } catch (err) {
      console.error('Error updating consumer:', err);
      toast.error('Failed to update consumer. Please try again.');
    }
  };

  const handleDeleteUser = async () => {
    try {
      if (!deleteUserData) return;

      setIsDeleting(true);

      // Call backend API to delete consumer
      const result = await deleteConsumer(deleteUserData.id);
      
      if (result.error) {
        toast.error(`Error deleting consumer: ${result.error}`);
        console.error('Delete consumer error:', result.error);
        setIsDeleting(false);
        return;
      }
      
      // Remove consumer from the local state using user_id
      setUsers(prevUsers => 
        prevUsers.filter(user => user.user_id !== deleteUserData.id)
      );
      
      toast.success('Consumer deleted successfully!');
      
      // Close modal
      setShowDeleteModal(false);
      setDeleteUserData(null);
      setIsDeleting(false);
    } catch (err) {
      console.error('Error deleting consumer:', err);
      toast.error('Failed to delete consumer. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleStatusSelect = (status) => {
    setSelectedStatus(status);
    setShowStatusDropdown(false);
    setExtendDays('');
    setShowStatusConfirmModal(true);
  };

  const handleConfirmStatusUpdate = async () => {
    try {
      if (!statusUpdateData || !selectedStatus) return;

      setIsUpdatingStatus(true);

      // Calculate trial_expiry_date if extend days is selected
      let trialExpiryDate = null;
      if (extendDays && parseInt(extendDays) > 0) {
        const days = parseInt(extendDays);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);
        trialExpiryDate = expiryDate.toISOString();
      }

      // Call backend API to update account status with optional trial_expiry_date
      const result = await updateConsumerAccountStatus(statusUpdateData.id, selectedStatus, trialExpiryDate);
      
      if (result.error) {
        toast.error(`Error updating status: ${result.error}`);
        console.error('Update status error:', result.error);
        setIsUpdatingStatus(false);
        return;
      }
      
      // Update consumer status and trial_expiry in the local state
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.user_id === statusUpdateData.id) {
            return {
              ...user,
              account_status: selectedStatus,
              // Update trial_expiry from backend response
              trial_expiry: result.data?.trial_expiry || user.trial_expiry
            };
          }
          return user;
        })
      );
      
      // Show appropriate success message based on status
      let successMessage = `Account status updated to ${selectedStatus}!`;
      if (selectedStatus === 'expired_subscription') {
        successMessage = 'Account marked as expired!';
      } else if (selectedStatus === 'active') {
        if (extendDays) {
          successMessage = `Account activated and trial extended by ${extendDays} day(s)!`;
        } else {
          successMessage = 'Account activated and trial extended!';
        }
      }
      
      toast.success(successMessage);
      
      // Close modal
      setShowStatusConfirmModal(false);
      setStatusUpdateData(null);
      setSelectedStatus('');
      setExtendDays('');
      setIsUpdatingStatus(false);
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status. Please try again.');
      setIsUpdatingStatus(false);
    }
  };

  // Get unique user ID - backend returns user_id directly
  const getUserId = (user) => user.user_id;

  const getRoleBadgeColor = (role) => {
    const colors = {
      Admin: '#dc3545',
      Editor: '#ffc107',
      User: '#007bff',
      Viewer: '#6c757d'
    };
    return colors[role] || '#6c757d';
  };

  // Get account status badge style
  const getAccountStatusStyle = (status) => {
    if (!status) {
      return {
        backgroundColor: '#f8f9fa',
        color: '#6c757d',
        text: 'No Status'
      };
    }

    const styles = {
      active: {
        backgroundColor: '#d4edda',
        color: '#28a745',
        text: 'Active'
      },
      deactive: {
        backgroundColor: '#fff3cd',
        color: '#ffc107',
        text: 'Deactive'
      },
      expired_subscription: {
        backgroundColor: '#f8d7da',
        color: '#dc3545',
        text: 'Expired'
      }
    };

    return styles[status] || {
      backgroundColor: '#f8f9fa',
      color: '#6c757d',
      text: status
    };
  };

  const toggleDropdown = (userId) => {
    setOpenDropdown(openDropdown === userId ? null : userId);
  };

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
    // Debounce will automatically trigger search after 2 seconds
  };

  const handleFilterChange = (status) => {
    setAccountStatusFilter(status);
  };

  const handleClearFilters = () => {
    setAccountStatusFilter('all');
    setSearchQuery('');
    setSearchInput('');
  };

  // Calculate trial status
  const getTrialStatus = (trial_expiry) => {
    if (!trial_expiry) {
      return { text: 'No Trial', color: '#6c757d', bgColor: '#f8f9fa' };
    }

    const now = new Date();
    const expiryDate = new Date(trial_expiry);
    const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) {
      return { 
        text: `Expired ${Math.abs(daysLeft)} days ago`, 
        color: '#dc3545', 
        bgColor: '#f8d7da' 
      };
    } else if (daysLeft === 0) {
      return { text: 'Expires Today', color: '#ffc107', bgColor: '#fff3cd' };
    } else if (daysLeft <= 3) {
      return { 
        text: `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`, 
        color: '#fd7e14', 
        bgColor: '#ffe5d0' 
      };
    } else if (daysLeft <= 7) {
      return { 
        text: `${daysLeft} days left`, 
        color: '#ffc107', 
        bgColor: '#fff3cd' 
      };
    } else {
      return { 
        text: `${daysLeft} days left`, 
        color: '#28a745', 
        bgColor: '#d4edda' 
      };
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @media (max-width: 768px) {
            .consumer-table-wrapper {
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
            }
            
            .consumer-header-actions {
              flex-direction: column;
              align-items: stretch !important;
            }
            
            .consumer-filters {
              flex-direction: column;
            }
            
            .consumer-search,
            .consumer-filter {
              flex: 1 1 100% !important;
              min-width: 100% !important;
            }
          }
          
          @media (max-width: 480px) {
            .consumer-pagination {
              flex-direction: column;
              gap: 12px;
            }
            
            .consumer-pagination-buttons {
              width: 100%;
              justify-content: center;
            }
          }
        `}
      </style>
    <div style={{ 
      backgroundColor: '#f8f9fa', 
      height: '100vh',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ 
        maxWidth: '1400px', 
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 40px)'
      }}>
        <div style={{ 
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}>
          {/* Header - Fixed */}
          <div style={{ 
            padding: '20px 24px',
            borderBottom: '2px solid #f0f0f0',
            flexShrink: 0
          }}>
            {/* Title and Create Button Row */}
            <div className="consumer-header-actions" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: '#333', fontWeight: '600', fontSize: '20px' }}>
                  Consumers Management
                </h4>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                  Manage your consumers and their permissions
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                title="Create New Consumer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(0,123,255,0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0056b3';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,123,255,0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#007bff';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,123,255,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <UserPlus size={20} />
              </button>
            </div>

            {/* Filters and Search Row */}
            <div className="consumer-filters" style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              {/* Search Bar */}
              <div className="consumer-search" style={{ flex: '1 1 300px', minWidth: '200px' }}>
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#9ca3af'
                  }}>
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name or email... "
                    value={searchInput}
                    onChange={handleSearchChange}
                    style={{
                      width: '100%',
                      padding: '10px 100px 10px 40px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#3b82f6';
                      e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  {searchInput && searchInput !== searchQuery && (
                    <div style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '12px',
                      color: '#9ca3af',
                      fontStyle: 'italic'
                    }}>
                      Searching...
                    </div>
                  )}
                </div>
              </div>

              {/* Status Filter Dropdown */}
              <div className="consumer-filter" style={{ position: 'relative', flex: '0 1 200px', minWidth: '180px' }}>
                <div style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9ca3af',
                  pointerEvents: 'none',
                  zIndex: 1
                }}>
                  <Filter size={18} />
                </div>
                <select
                  value={accountStatusFilter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'all 0.2s',
                    boxSizing: 'border-box',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="deactive">Deactive</option>
                  <option value="expired_subscription">Expired</option>
                </select>
              </div>

              {/* Clear Filters Button */}
              {(accountStatusFilter !== 'all' || searchQuery !== '') && (
                <button
                  onClick={handleClearFilters}
                  style={{
                    padding: '10px 16px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#666',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
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
                  Clear Filters
                </button>
              )}

              {/* Results Count */}
              <div style={{
                padding: '10px 16px',
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#666',
                fontWeight: '500',
                whiteSpace: 'nowrap'
              }}>
                {users.length} {users.length === 1 ? 'result' : 'results'}
              </div>
            </div>
          </div>

            {/* Loading State */}
            {loading && (
              <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                color: '#666',
                fontSize: '16px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    border: '4px solid #f3f3f3',
                    borderTop: '4px solid #007bff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }} />
                  <p>Loading consumers...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {!loading && error && (
              <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px'
              }}>
                <div style={{
                  backgroundColor: '#fff5f5',
                  border: '1px solid #dc3545',
                  borderRadius: '8px',
                  padding: '20px',
                  maxWidth: '500px',
                  textAlign: 'center'
                }}>
                  <h5 style={{ color: '#dc3545', margin: '0 0 8px 0' }}>Error Loading Consumers</h5>
                  <p style={{ color: '#666', margin: 0 }}>
                    {typeof error === 'string' ? error : 'Failed to load consumers. Please try again.'}
                  </p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && users.length === 0 && (
              <div style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px'
              }}>
                <div style={{ textAlign: 'center', color: '#666' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
                  <h5 style={{ margin: '0 0 8px 0' }}>No Consumers Found</h5>
                  <p style={{ margin: 0 }}>There are no consumers to display.</p>
                </div>
              </div>
            )}

          {/* Table - Scrollable */}
            {!loading && !error && users.length > 0 && (
          <div className="consumer-table-wrapper" style={{ 
            overflowY: 'auto',
            overflowX: 'auto',
            flex: 1
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              minWidth: '800px'
            }}>
              <thead style={{ 
                backgroundColor: '#fafafa',
                position: 'sticky',
                top: 0,
                zIndex: 10
              }}>
                <tr>
                  <th style={{ 
                    padding: '15px 24px', 
                    textAlign: 'left',
                    color: '#555', 
                    fontWeight: '600', 
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>ID</th>
                  <th style={{ 
                    padding: '15px 24px', 
                    textAlign: 'left',
                    color: '#555', 
                    fontWeight: '600', 
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>NAME</th>
                  <th style={{ 
                    padding: '15px 24px', 
                    textAlign: 'left',
                    color: '#555', 
                    fontWeight: '600', 
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>EMAIL</th>
                  <th style={{ 
                    padding: '15px 24px', 
                    textAlign: 'left',
                    color: '#555', 
                    fontWeight: '600', 
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>ROLE</th>
                  <th style={{ 
                    padding: '15px 24px', 
                    textAlign: 'left',
                    color: '#555', 
                    fontWeight: '600', 
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>ACCOUNT STATUS</th>
                  <th style={{ 
                    padding: '15px 24px', 
                    textAlign: 'left',
                    color: '#555', 
                    fontWeight: '600', 
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>TRIAL STATUS</th>
                  <th style={{ 
                    padding: '15px 24px', 
                    textAlign: 'left',
                    color: '#555', 
                    fontWeight: '600', 
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>CREATED AT</th>
                  <th style={{ 
                    padding: '15px 24px', 
                    textAlign: 'center',
                    color: '#555', 
                    fontWeight: '600', 
                    fontSize: '13px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user, index) => {
                  const userId = getUserId(user);
                  return (
                  <tr 
                    key={userId || index}
                    style={{ 
                      borderBottom: '1px solid #f0f0f0',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '15px 24px', color: '#666', fontSize: '14px', fontFamily: 'monospace' }}>
                      {userId?.toString().slice(0, 8) || '-'}
                    </td>
                    <td style={{ padding: '15px 24px', color: '#333', fontSize: '14px', fontWeight: '500' }}>
                      {user.full_name || <span style={{ color: '#999', fontStyle: 'italic' }}>No name</span>}
                    </td>
                    <td style={{ padding: '15px 24px', color: '#666', fontSize: '14px' }}>
                      {user.email || <span style={{ color: '#999', fontStyle: 'italic' }}>No email</span>}
                    </td>
                    <td style={{ padding: '15px 24px' }}>
                      <span style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'inline-block',
                        textTransform: 'capitalize'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '15px 24px' }}>
                      {(() => {
                        const accountStatus = getAccountStatusStyle(user.account_status);
                        return (
                          <span style={{
                            backgroundColor: accountStatus.backgroundColor,
                            color: accountStatus.color,
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'inline-block',
                            border: `1px solid ${accountStatus.color}20`
                          }}>
                            {accountStatus.text}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '15px 24px' }}>
                      {(() => {
                        const trialStatus = getTrialStatus(user.trial_expiry);
                        return (
                          <span style={{
                            backgroundColor: trialStatus.bgColor,
                            color: trialStatus.color,
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500',
                            display: 'inline-block',
                            border: `1px solid ${trialStatus.color}20`
                          }}>
                            {trialStatus.text}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '15px 24px', color: '#666', fontSize: '14px' }}>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      }) : '-'}
                    </td>
                    <td style={{ padding: '15px 24px', textAlign: 'center', position: 'relative' }}>
                      <button
                        onClick={() => toggleDropdown(userId)}
                        style={{
                          backgroundColor: 'white',
                          border: '1px solid #e0e0e0',
                          borderRadius: '6px',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          color: '#666',
                          display: 'inline-flex',
                          alignItems: 'center',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                          e.currentTarget.style.borderColor = '#ccc';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.borderColor = '#e0e0e0';
                        }}
                      >
                        <MoreVertical size={18} />
                      </button>
                      
                      {openDropdown === userId && (
                        <div style={{
                          position: 'absolute',
                          right: '24px',
                          top: '100%',
                          backgroundColor: 'white',
                          border: '1px solid #e0e0e0',
                          borderRadius: '6px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 1000,
                          minWidth: '180px',
                          marginTop: '4px'
                        }}>
                          <button
                            onClick={() => handleAction('Update', userId, user.full_name)}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              border: 'none',
                              backgroundColor: 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#333',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Edit size={16} />
                            Update
                          </button>
                          <button
                            onClick={() => handleAction('Update Status', userId, user.full_name)}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              border: 'none',
                              backgroundColor: 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#333',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <CheckCircle size={16} />
                            Update Status
                          </button>
                          <button
                            onClick={() => handleAction('Reset Password', userId, user.full_name)}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              border: 'none',
                              backgroundColor: 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#333',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Key size={16} />
                            Reset Password
                          </button>
                          <div style={{ 
                            height: '1px', 
                            backgroundColor: '#e0e0e0', 
                            margin: '4px 0' 
                          }} />
                          <button
                            onClick={() => handleAction('Delete', userId, user.full_name)}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              border: 'none',
                              backgroundColor: 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#dc3545',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fff5f5'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          )}

          {/* Footer with Pagination - Fixed */}
          {!loading && !error && users.length > 0 && (
          <div className="consumer-pagination" style={{ 
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
              Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, users.length)} of {users.length} users
            </div>
            
            <div className="consumer-pagination-buttons" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
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
                  fontWeight: '500'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              
              {[...Array(totalPages)].map((_, index) => (
                <button
                  key={index + 1}
                  onClick={() => paginate(index + 1)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    backgroundColor: currentPage === index + 1 ? '#007bff' : 'white',
                    color: currentPage === index + 1 ? 'white' : '#333',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    minWidth: '40px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (currentPage !== index + 1) {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentPage !== index + 1) {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  {index + 1}
                </button>
              ))}
              
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
                  fontWeight: '500'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
      
      {/* Backdrop for closing dropdown */}
      {openDropdown && (
        <div
          onClick={() => setOpenDropdown(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
        />
      )}

      {/* Create Consumer Modal */}
      <CreateConsumerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateConsumer}
      />

      {/* Update Consumer Modal */}
      <UpdateConsumerModal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setSelectedConsumer(null);
        }}
        consumer={selectedConsumer}
        onUpdate={handleUpdateConsumer}
      />

      {/* Delete Consumer Modal */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          if (!isDeleting) {
            setShowDeleteModal(false);
            setDeleteUserData(null);
          }
        }}
        onConfirm={handleDeleteUser}
        userName={deleteUserData?.name}
        userId={deleteUserData?.id}
        isDeleting={isDeleting}
      />

      {/* Status Dropdown Modal */}
      {showStatusDropdown && statusUpdateData && (
        <>
          <div
            onClick={() => {
              setShowStatusDropdown(false);
              setStatusUpdateData(null);
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            zIndex: 9999,
            minWidth: '400px',
            maxWidth: '500px'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e0e0e0'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#333' }}>
                Update Account Status
              </h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
                Select new status for <strong>{statusUpdateData.name}</strong>
              </p>
              {statusUpdateData.currentStatus && (
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#999' }}>
                  Current status: <span style={{ 
                    color: '#007bff', 
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}>{statusUpdateData.currentStatus.replace('_', ' ')}</span>
                </p>
              )}
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => handleStatusSelect('active')}
                  style={{
                    width: '100%',
                    padding: '16px',
                    marginBottom: '8px',
                    border: '2px solid #28a745',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#28a745',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#28a745';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = '#28a745';
                  }}
                >
                  <CheckCircle size={18} />
                  Active
                </button>
                <p style={{ margin: '0 0 16px 8px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                  Trial will be extended by 30 days
                </p>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => handleStatusSelect('deactive')}
                  style={{
                    width: '100%',
                    padding: '16px',
                    marginBottom: '8px',
                    border: '2px solid #ffc107',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#ffc107',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffc107';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = '#ffc107';
                  }}
                >
                  <CheckCircle size={18} />
                  Deactive
                </button>
                <p style={{ margin: '0 0 16px 8px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                  Trial date will remain unchanged
                </p>
              </div>

              <div>
                <button
                  onClick={() => handleStatusSelect('expired_subscription')}
                  style={{
                    width: '100%',
                    padding: '16px',
                    marginBottom: '8px',
                    border: '2px solid #dc3545',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#dc3545',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#dc3545';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.color = '#dc3545';
                  }}
                >
                  <CheckCircle size={18} />
                  Expired Subscription
                </button>
                <p style={{ margin: '0 0 0 8px', fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
                  Trial will be set to today (expired)
                </p>
              </div>
            </div>
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowStatusDropdown(false);
                  setStatusUpdateData(null);
                }}
                style={{
                  padding: '10px 24px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#666',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* Status Confirmation Modal */}
      {showStatusConfirmModal && statusUpdateData && selectedStatus && (
        <>
          <div
            onClick={() => {
              if (!isUpdatingStatus) {
                setShowStatusConfirmModal(false);
                setStatusUpdateData(null);
                setSelectedStatus('');
                setExtendDays('');
              }
            }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 9998,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          />
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            zIndex: 9999,
            minWidth: '400px',
            maxWidth: '500px'
          }}>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e0e0e0'
            }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#333' }}>
                Confirm Status Update
              </h3>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '15px', color: '#666', lineHeight: '1.6' }}>
                Are you sure you want to update the account status for <strong>{statusUpdateData.name}</strong> to{' '}
                <span style={{ 
                  color: selectedStatus === 'active' ? '#28a745' : selectedStatus === 'deactive' ? '#ffc107' : '#dc3545',
                  fontWeight: '600',
                  textTransform: 'capitalize'
                }}>
                  {selectedStatus.replace('_', ' ')}
                </span>?
              </p>

              {/* Show extend trial dropdown if trial expires within 2 days or less */}
              {(() => {
                const consumer = users.find(u => u.user_id === statusUpdateData.id);
                if (!consumer || !consumer.trial_expiry) return null;

                const trialExpiry = new Date(consumer.trial_expiry);
                const now = new Date();
                const daysRemaining = Math.ceil((trialExpiry - now) / (1000 * 60 * 60 * 24));

                if (daysRemaining <= 2) {
                  return (
                    <div style={{
                      backgroundColor: '#fff3cd',
                      border: '1px solid #ffc107',
                      borderRadius: '8px',
                      padding: '16px',
                      marginTop: '16px'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#856404',
                        marginBottom: '8px'
                      }}>
                        ⚠️ Trial expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
                      </div>
                      <label style={{
                        display: 'block',
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#666',
                        marginBottom: '8px'
                      }}>
                        Extend trial by:
                      </label>
                      <select
                        value={extendDays}
                        onChange={(e) => setExtendDays(e.target.value)}
                        disabled={isUpdatingStatus}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                          outline: 'none',
                          cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                          backgroundColor: 'white',
                          color: extendDays ? '#374151' : '#9ca3af'
                        }}
                      >
                        <option value="">Don't extend</option>
                        <option value="1">1 Day</option>
                        <option value="2">2 Days</option>
                        <option value="3">3 Days</option>
                      </select>
                      {extendDays && (
                        <p style={{
                          marginTop: '8px',
                          marginBottom: 0,
                          fontSize: '12px',
                          color: '#666'
                        }}>
                          ℹ️ New expiry: {(() => {
                            const newExpiry = new Date();
                            newExpiry.setDate(newExpiry.getDate() + parseInt(extendDays));
                            return newExpiry.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            });
                          })()}
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  if (!isUpdatingStatus) {
                    setShowStatusConfirmModal(false);
                    setStatusUpdateData(null);
                    setSelectedStatus('');
                    setExtendDays('');
                  }
                }}
                disabled={isUpdatingStatus}
                style={{
                  padding: '10px 24px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#666',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                  opacity: isUpdatingStatus ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatusUpdate}
                disabled={isUpdatingStatus}
                style={{
                  padding: '10px 24px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isUpdatingStatus ? 'not-allowed' : 'pointer',
                  opacity: isUpdatingStatus ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isUpdatingStatus ? (
                  <>
                    <div style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid white',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Updating...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
};

export default Consumers;