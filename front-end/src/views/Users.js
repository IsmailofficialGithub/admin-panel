import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { MoreVertical, Edit, Trash2, Key, ChevronLeft, ChevronRight, UserPlus, Search, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
// ✅ Using backend API instead of direct Supabase calls
import { 
  getAdminUsers, 
  updateUserRole, 
  resetUserPassword, 
  createUser, 
  deleteUser,
  updateUserAccountStatus
} from '../api/backend';
import UpdateUserModal from '../components/ui/UpdateUserModel';
import CreateUserModal from '../components/ui/createUserModel';
import ForgetPasswordConfirmPopup from '../components/ui/forgetPasswordComformPopup';
import DeleteModal from '../components/ui/deleteModel';

const User = () => {
  const history = useHistory();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showResetPopup, setShowResetPopup] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUserData, setDeleteUserData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdateData, setStatusUpdateData] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const usersPerPage = 20;

  // Debounce search input
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 1500);

    return () => clearTimeout(debounceTimer);
  }, [searchInput]);

  // Fetch users from database with search
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const result = await getAdminUsers({ search: searchQuery });
        
        if (result?.error) {
          setError(result.error);
          console.error('❌ Error fetching users:', result.error);
        } else {
          setUsers(result || []);
          setCurrentPage(1);
        }
      } catch (err) {
        setError(err.message);
        console.error('❌ Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [searchQuery]);

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  const handleAction = (action, userId, userName) => {
    setOpenDropdown(null);
    
    if (action === 'View Details') {
      history.push(`/admin/users/${userId}`);
    } else if (action === 'Update') {
      const user = users.find(u => (u.id || u.user_id) === userId);
      if (user) {
        setSelectedUser({
          id: userId,
          user_id: userId,
          name: user.name || user.full_name || user.username,
          full_name: user.name || user.full_name || user.username,
          email: user.email,
          role: user.role,
          country: user.country,
          city: user.city,
          phone: user.phone,
          createdAt: user.created_at
        });
        setIsModalOpen(true);
      }
    } else if (action === 'Reset Password') {
      setResetUser({ id: userId, name: userName });
      setShowResetPopup(true);
    } else if (action === 'Delete') {
      setDeleteUserData({ id: userId, name: userName });
      setShowDeleteModal(true);
    } else if (action === 'Deactivate Account') {
      const user = users.find(u => (u.id || u.user_id) === userId);
      if (user) {
        // Prevent deactivating admin
        if (user.role === 'admin') {
          toast.error('Cannot deactivate admin account');
          return;
        }
        setStatusUpdateData({ id: userId, name: userName, currentStatus: user.account_status || 'active', role: user.role });
        setShowStatusModal(true);
      }
    } else {
      toast(`${action} action clicked for user: ${userName}`);
    }
  };

  const handleUpdateUser = async (updatedUser) => {
    try {
      // Call API to update user with all fields including country, city, and phone
      const result = await updateUserRole(
        updatedUser.id, 
        {
          full_name: updatedUser.full_name,
          role: updatedUser.role,
          country: updatedUser.country,
          city: updatedUser.city,
          phone: updatedUser.phone
        }
      );
      
      if (result.error) {
        toast.error(`Error updating user: ${result.error}`);
        console.error('Update error:', result.error);
        return;
      }
      
      // Update the user in the local state
      setUsers(prevUsers =>
        prevUsers.map(user => {
          const userId = user.id || user.user_id;
          if (userId === updatedUser.id) {
            return {
              ...user,
              name: updatedUser.full_name,
              full_name: updatedUser.full_name,
              email: updatedUser.email,
              role: updatedUser.role,
              country: updatedUser.country,
              city: updatedUser.city,
              phone: updatedUser.phone
            };
          }
          return user;
        })
      );
      
      toast.success('User updated successfully!');
      
      // Close modal
      setIsModalOpen(false);
      setSelectedUser(null);
    } catch (err) {
      console.error('Error updating user:', err);
      toast.error('Failed to update user. Please try again.');
    }
  };

  const handleConfirmReset = async () => {
    try {
      if (!resetUser) {
        console.error('❌ No resetUser found');
        return;
      }
      
      // Call API to reset user password
      const result = await resetUserPassword(resetUser.id);
      
      if (result.error) {
        toast.error(`Error resetting password: ${result.error}`);
        console.error('❌ Reset password error:', result.error);
        return;
      }
      
      // Show success message
      toast.success(`Password reset successfully! An email has been sent to ${result.email || 'the user'} with the new password.`, {
        duration: 5000,
      });
      
      // Close popup
      setShowResetPopup(false);
      setResetUser(null);
    } catch (err) {
      console.error('❌ Error resetting password:', err);
      toast.error('Failed to reset password. Please try again.');
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      // Call API to create user
      const result = await createUser(userData);
      
      if (result.error) {
        return { error: result.error };
      }
      
      // Add new user to the local state
      const newUser = {
        id: result.user.id,
        user_id: result.user.id,
        full_name: result.user.full_name,
        name: result.user.full_name,
        email: result.user.email,
        role: result.user.role,
        created_at: new Date().toISOString()
      };
      
      setUsers(prevUsers => [newUser, ...prevUsers]);
      
      return { success: true };
    } catch (err) {
      console.error('Error creating user:', err);
      return { error: 'Failed to create user. Please try again.' };
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      if (!statusUpdateData) return;

      setIsUpdatingStatus(true);
      const result = await updateUserAccountStatus(statusUpdateData.id, newStatus);
      
      if (result.error) {
        toast.error(result.error);
        setIsUpdatingStatus(false);
        return;
      }

      // Update user in local state
      setUsers(prevUsers =>
        prevUsers.map(user => {
          const userId = user.id || user.user_id;
          if (userId === statusUpdateData.id) {
            return {
              ...user,
              account_status: newStatus
            };
          }
          return user;
        })
      );

      toast.success(`Account ${newStatus === 'deactive' ? 'deactivated' : 'activated'} successfully!`);
      setShowStatusModal(false);
      setStatusUpdateData(null);
      setIsUpdatingStatus(false);
    } catch (err) {
      console.error('Error updating account status:', err);
      toast.error('Failed to update account status. Please try again.');
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      if (!deleteUserData) return;

      setIsDeleting(true);

      // Call API to delete user
      const result = await deleteUser(deleteUserData.id);
      
      if (result.error) {
        toast.error(`Error deleting user: ${result.error}`);
        console.error('Delete user error:', result.error);
        setIsDeleting(false);
        return;
      }
      
      // Remove user from the local state
      setUsers(prevUsers => 
        prevUsers.filter(user => {
          const userId = user.id || user.user_id;
          return userId !== deleteUserData.id;
        })
      );
      
      toast.success('User deleted successfully!');
      
      // Close modal
      setShowDeleteModal(false);
      setDeleteUserData(null);
      setIsDeleting(false);
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user. Please try again.');
      setIsDeleting(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      Admin: '#dc3545',
      Editor: '#ffc107',
      User: '#74317e',
      Viewer: '#6c757d'
    };
    return colors[role] || '#6c757d';
  };

  const toggleDropdown = (userId) => {
    setOpenDropdown(openDropdown === userId ? null : userId);
  };

  // Get unique user ID
  const getUserId = (user) => user.id || user.user_id;

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
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
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <h4 style={{ margin: '0 0 8px 0', color: '#333', fontWeight: '600', fontSize: '20px' }}>
                  User Management
                </h4>
                <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                  Manage your users and their permissions
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                title="Create New User"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '12px',
                  backgroundColor: '#74317e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(116,49,126,0.2)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#5a2460';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(116,49,126,0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#74317e';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(116,49,126,0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <UserPlus size={20} />
              </button>
            </div>

            {/* Search Row */}
            <div style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center'
            }}>
              {/* Search Bar */}
              <div style={{ flex: '1 1 300px', minWidth: '200px' }}>
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
                    onChange={(e) => setSearchInput(e.target.value)}
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
                <p>Loading users...</p>
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
                <h5 style={{ color: '#dc3545', margin: '0 0 8px 0' }}>Error Loading Users</h5>
                <p style={{ color: '#666', margin: 0 }}>
                  {typeof error === 'string' ? error : 'Failed to load users. Please try again.'}
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
                <h5 style={{ margin: '0 0 8px 0' }}>No Users Found</h5>
                <p style={{ margin: 0 }}>There are no admin users to display.</p>
              </div>
            </div>
          )}

          {/* Table - Scrollable */}
          {!loading && !error && users.length > 0 && (
            <div style={{ 
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
                      {user.name || user.full_name || user.username || <span style={{ color: '#999', fontStyle: 'italic' }}>No name</span>}
                    </td>
                    <td style={{ padding: '15px 24px', color: '#666', fontSize: '14px' }}>
                      {user.email || <span style={{ color: '#999', fontStyle: 'italic' }}>No email</span>}
                    </td>
                    <td style={{ padding: '15px 24px' }}>
                      <span style={{
                        backgroundColor: getRoleBadgeColor(user.role),
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'inline-block',
                        textTransform: 'capitalize'
                      }}>
                        {user.role || 'user'}
                      </span>
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
                            onClick={() => handleAction('View Details', userId, user.name || user.full_name)}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              border: 'none',
                              backgroundColor: 'transparent',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '14px',
                              color: '#74317e',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Eye size={16} />
                            View Details
                          </button>
                          <div style={{ 
                            height: '1px', 
                            backgroundColor: '#e0e0e0', 
                            margin: '4px 0' 
                          }} />
                          <button
                            onClick={() => handleAction('Update', userId, user.name || user.full_name)}
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
                            onClick={() => handleAction('Reset Password', userId, user.name || user.full_name)}
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
                          <button
                            onClick={() => handleAction('Deactivate Account', userId, user.name || user.full_name)}
                            disabled={user.role === 'admin'}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              border: 'none',
                              backgroundColor: 'transparent',
                              textAlign: 'left',
                              cursor: user.role === 'admin' ? 'not-allowed' : 'pointer',
                              fontSize: '14px',
                              color: user.role === 'admin' ? '#999' : '#ffc107',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'background-color 0.2s',
                              opacity: user.role === 'admin' ? 0.5 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (user.role !== 'admin') {
                                e.currentTarget.style.backgroundColor = '#fffbf0';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <UserPlus size={16} />
                            {user.account_status === 'deactive' ? 'Activate Account' : 'Deactivate Account'}
                          </button>
                          <div style={{ 
                            height: '1px', 
                            backgroundColor: '#e0e0e0', 
                            margin: '4px 0' 
                          }} />
                          <button
                            onClick={() => handleAction('Delete', userId, user.name || user.full_name)}
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
              Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, users.length)} of {users.length} users
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
                    backgroundColor: currentPage === index + 1 ? '#74317e' : 'white',
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

      {/* Update User Modal */}
      <UpdateUserModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onUpdate={handleUpdateUser}
      />

      {/* Reset Password Confirmation Popup */}
      <ForgetPasswordConfirmPopup
        isOpen={showResetPopup}
        onClose={() => {
          setShowResetPopup(false);
          setResetUser(null);
        }}
        onConfirm={handleConfirmReset}
        userName={resetUser?.name}
      />

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateUser}
      />

      {/* Delete User Modal */}
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

      {/* Status Update Modal */}
      {showStatusModal && statusUpdateData && (
        <>
          <div
            onClick={() => {
              if (!isUpdatingStatus) {
                setShowStatusModal(false);
                setStatusUpdateData(null);
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
                Update Account Status
              </h3>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
                Select new status for <strong>{statusUpdateData.name}</strong>
              </p>
              {statusUpdateData.currentStatus && (
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#999' }}>
                  Current status: <span style={{ 
                    color: '#74317e', 
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}>{statusUpdateData.currentStatus.replace('_', ' ')}</span>
                </p>
              )}
            </div>
            <div style={{ padding: '16px' }}>
              <div style={{ marginBottom: '16px' }}>
                <button
                  onClick={() => handleStatusUpdate('active')}
                  disabled={isUpdatingStatus || statusUpdateData.currentStatus === 'active'}
                  style={{
                    width: '100%',
                    padding: '16px',
                    marginBottom: '8px',
                    border: '2px solid #28a745',
                    borderRadius: '8px',
                    backgroundColor: statusUpdateData.currentStatus === 'active' ? '#28a745' : 'white',
                    color: statusUpdateData.currentStatus === 'active' ? 'white' : '#28a745',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: isUpdatingStatus || statusUpdateData.currentStatus === 'active' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isUpdatingStatus || statusUpdateData.currentStatus === 'active' ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isUpdatingStatus && statusUpdateData.currentStatus !== 'active') {
                      e.currentTarget.style.backgroundColor = '#28a745';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (statusUpdateData.currentStatus !== 'active') {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.color = '#28a745';
                    }
                  }}
                >
                  <UserPlus size={18} />
                  Active
                </button>
              </div>

              <div>
                <button
                  onClick={() => handleStatusUpdate('deactive')}
                  disabled={isUpdatingStatus || statusUpdateData.currentStatus === 'deactive'}
                  style={{
                    width: '100%',
                    padding: '16px',
                    marginBottom: '8px',
                    border: '2px solid #ffc107',
                    borderRadius: '8px',
                    backgroundColor: statusUpdateData.currentStatus === 'deactive' ? '#ffc107' : 'white',
                    color: statusUpdateData.currentStatus === 'deactive' ? 'white' : '#ffc107',
                    fontSize: '15px',
                    fontWeight: '500',
                    cursor: isUpdatingStatus || statusUpdateData.currentStatus === 'deactive' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    opacity: isUpdatingStatus || statusUpdateData.currentStatus === 'deactive' ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isUpdatingStatus && statusUpdateData.currentStatus !== 'deactive') {
                      e.currentTarget.style.backgroundColor = '#ffc107';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (statusUpdateData.currentStatus !== 'deactive') {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.color = '#ffc107';
                    }
                  }}
                >
                  <UserPlus size={18} />
                  Deactive
                </button>
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
                  if (!isUpdatingStatus) {
                    setShowStatusModal(false);
                    setStatusUpdateData(null);
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
            </div>
          </div>
        </>
      )}
    </div>
    </>
  );
};

export default User;