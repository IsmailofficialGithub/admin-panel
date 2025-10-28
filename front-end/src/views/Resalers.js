import React, { useState, useEffect } from 'react';
import { MoreVertical, Edit, Trash2, Key, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
// ✅ Using backend API instead of direct Supabase calls
import { 
  getResalers, 
  createResaler, 
  updateResaler, 
  deleteResaler,
  resetResalerPassword
} from '../api/backend';
import CreateResalerModal from '../components/ui/createResalerModel';
import UpdateResalerModal from '../components/ui/updateResalerModel';
import DeleteModal from '../components/ui/deleteModel';

const Resalers = () => {
  console.log('👥 Resalers component rendering...');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedResaler, setSelectedResaler] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteUserData, setDeleteUserData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const usersPerPage = 20;

  // Fetch Resalers from backend API
  useEffect(() => {
    console.log('🔄 Resalers component mounted - Fetching Resalers...');
    const fetchResalers = async () => {
      try {
        setLoading(true);
        console.log('🔄 Calling getResalers API...');
        const result = await getResalers();
        console.log('✅ getResalers result:', result);
        
        if (result?.error) {
          setError(result.error);
          console.error('❌ Error fetching Resalers:', result.error);
        } else {
          setUsers(result || []); // Backend returns array directly
          console.log('✅ Resalers loaded successfully:', result.length, 'Resalers');
        }
      } catch (err) {
        setError(err.message);
        console.error('❌ Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchResalers();
  }, []);

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  const handleAction = async (action, userId, userName) => {
    setOpenDropdown(null);
    
    if (action === 'Update') {
      const resaler = users.find(u => u.user_id === userId);
      if (resaler) {
        setSelectedResaler({
          id: userId,
          user_id: userId,
          full_name: resaler.full_name,
          email: resaler.email,
          phone: resaler.phone,
          created_at: resaler.created_at
        });
        setIsUpdateModalOpen(true);
      }
    } else if (action === 'Delete') {
      setDeleteUserData({ id: userId, name: userName });
      setShowDeleteModal(true);
    } else if (action === 'Reset Password') {
      // Handle reset password
      const loadingToast = toast.loading(`Resetting password for ${userName}...`);
      
      try {
        const result = await resetResalerPassword(userId);
        
        if (result.error) {
          toast.error(`Error: ${result.error}`, { id: loadingToast });
        } else {
          toast.success(`Password reset successfully! Email sent to Resaler.`, { id: loadingToast });
        }
      } catch (error) {
        console.error('Error resetting password:', error);
        toast.error('Failed to reset password. Please try again.', { id: loadingToast });
      }
    } else {
      toast(`${action} action clicked for Resaler: ${userName}`);
    }
  };

  const handleCreateResaler = async (ResalerData) => {
    try {
      // Call backend API to create Resaler
      const result = await createResaler(ResalerData);
      
      if (!result.success) {
        return { error: result.error || 'Failed to create Resaler' };
      }
      
      // Add new Resaler to the local state matching backend structure
      const newResaler = {
        user_id: result.user.id,
        full_name: ResalerData.full_name,
        email: result.user.email,
        phone: ResalerData.phone || null,
        referred_by: null,
        role: 'resaler',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setUsers(prevUsers => [newResaler, ...prevUsers]);
      
      console.log('Resaler created successfully:', result.user);
      
      return { success: true };
    } catch (err) {
      console.error('Error creating Resaler:', err);
      return { error: 'Failed to create Resaler. Please try again.' };
    }
  };

  const handleUpdateResaler = async (updatedResaler) => {
    try {
      // Call API to update Resaler using user_id
      const result = await updateResaler(updatedResaler.user_id, {
        full_name: updatedResaler.full_name,
        phone: updatedResaler.phone
      });
      
      if (result.error) {
        toast.error(`Error updating Resaler: ${result.error}`);
        console.error('Update error:', result.error);
        return;
      }
      
      // Update the Resaler in the local state matching backend structure
      setUsers(prevUsers =>
        prevUsers.map(user => {
          if (user.user_id === updatedResaler.user_id) {
            return {
              ...user,
              full_name: updatedResaler.full_name,
              phone: updatedResaler.phone || null,
              updated_at: new Date().toISOString()
            };
          }
          return user;
        })
      );
      
      toast.success('Resaler updated successfully!');
      console.log('Resaler updated successfully:', result.user);
      
      // Close modal
      setIsUpdateModalOpen(false);
      setSelectedResaler(null);
    } catch (err) {
      console.error('Error updating Resaler:', err);
      toast.error('Failed to update Resaler. Please try again.');
    }
  };

  const handleDeleteUser = async () => {
    try {
      if (!deleteUserData) return;

      setIsDeleting(true);

      // Call backend API to delete Resaler
      const result = await deleteResaler(deleteUserData.id);
      
      if (result.error) {
        toast.error(`Error deleting Resaler: ${result.error}`);
        console.error('Delete Resaler error:', result.error);
        setIsDeleting(false);
        return;
      }
      
      // Remove Resaler from the local state using user_id
      setUsers(prevUsers => 
        prevUsers.filter(user => user.user_id !== deleteUserData.id)
      );
      
      console.log('Resaler deleted successfully:', result);
      toast.success('Resaler deleted successfully!');
      
      // Close modal
      setShowDeleteModal(false);
      setDeleteUserData(null);
      setIsDeleting(false);
    } catch (err) {
      console.error('Error deleting Resaler:', err);
      toast.error('Failed to delete Resaler. Please try again.');
      setIsDeleting(false);
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

  const toggleDropdown = (userId) => {
    setOpenDropdown(openDropdown === userId ? null : userId);
  };

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
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
          }}>
              <div>
            <h4 style={{ margin: '0 0 8px 0', color: '#333', fontWeight: '600', fontSize: '20px' }}>
              Resalers Management
            </h4>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              Manage your Resalers and their permissions
            </p>
          </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                title="Create New Resaler"
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
                  <p>Loading Resalers...</p>
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
                  <h5 style={{ color: '#dc3545', margin: '0 0 8px 0' }}>Error Loading Resalers</h5>
                  <p style={{ color: '#666', margin: 0 }}>
                    {typeof error === 'string' ? error : 'Failed to load Resalers. Please try again.'}
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
                  <h5 style={{ margin: '0 0 8px 0' }}>No Resalers Found</h5>
                  <p style={{ margin: 0 }}>There are no Resalers to display.</p>
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

      {/* Create Resaler Modal */}
      <CreateResalerModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateResaler}
      />

      {/* Update Resaler Modal */}
      <UpdateResalerModal
        isOpen={isUpdateModalOpen}
        onClose={() => {
          setIsUpdateModalOpen(false);
          setSelectedResaler(null);
        }}
        resaler={selectedResaler}
        onUpdate={handleUpdateResaler}
      />

      {/* Delete Resaler Modal */}
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
    </div>
    </>
  );
};

export default Resalers;
