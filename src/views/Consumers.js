import React, { useState } from 'react';
import { MoreVertical, Edit, Trash2, Key, ChevronLeft, ChevronRight } from 'lucide-react';

const Consumers = () => {
  const [users] = useState([
    { id: 1, name: 'John Doe', email: 'john.doe@example.com', role: 'Admin', createdAt: '2024-01-15' },
    { id: 2, name: 'Jane Smith', email: null, role: 'User', createdAt: '2024-02-20' },
    { id: 3, name: 'Mike Johnson', email: 'mike.j@example.com', role: 'Editor', createdAt: '2024-03-10' },
    { id: 4, name: 'Sarah Williams', email: 'sarah.w@example.com', role: 'User', createdAt: '2024-03-25' },
    { id: 5, name: 'Tom Brown', email: null, role: 'Viewer', createdAt: '2024-04-05' },
    { id: 6, name: 'Emily Davis', email: 'emily.d@example.com', role: 'Admin', createdAt: '2024-04-12' },
    { id: 7, name: 'Chris Wilson', email: 'chris.w@example.com', role: 'Editor', createdAt: '2024-05-01' },
    { id: 8, name: 'Lisa Anderson', email: null, role: 'User', createdAt: '2024-05-15' },
    { id: 9, name: 'David Martinez', email: 'david.m@example.com', role: 'User', createdAt: '2024-06-01' },
    { id: 10, name: 'Anna Taylor', email: 'anna.t@example.com', role: 'Viewer', createdAt: '2024-06-10' },
    { id: 1, name: 'John Doe', email: 'john.doe@example.com', role: 'Admin', createdAt: '2024-01-15' },
    { id: 2, name: 'Jane Smith', email: null, role: 'User', createdAt: '2024-02-20' },
    { id: 3, name: 'Mike Johnson', email: 'mike.j@example.com', role: 'Editor', createdAt: '2024-03-10' },
    { id: 4, name: 'Sarah Williams', email: 'sarah.w@example.com', role: 'User', createdAt: '2024-03-25' },
    { id: 5, name: 'Tom Brown', email: null, role: 'Viewer', createdAt: '2024-04-05' },
    { id: 6, name: 'Emily Davis', email: 'emily.d@example.com', role: 'Admin', createdAt: '2024-04-12' },
    { id: 7, name: 'Chris Wilson', email: 'chris.w@example.com', role: 'Editor', createdAt: '2024-05-01' },
    { id: 8, name: 'Lisa Anderson', email: null, role: 'User', createdAt: '2024-05-15' },
    { id: 9, name: 'David Martinez', email: 'david.m@example.com', role: 'User', createdAt: '2024-06-01' },
    { id: 10, name: 'Anna Taylor', email: 'anna.t@example.com', role: 'Viewer', createdAt: '2024-06-10' },
    { id: 1, name: 'John Doe', email: 'john.doe@example.com', role: 'Admin', createdAt: '2024-01-15' },
    { id: 2, name: 'Jane Smith', email: null, role: 'User', createdAt: '2024-02-20' },
    { id: 3, name: 'Mike Johnson', email: 'mike.j@example.com', role: 'Editor', createdAt: '2024-03-10' },
    { id: 4, name: 'Sarah Williams', email: 'sarah.w@example.com', role: 'User', createdAt: '2024-03-25' },
    { id: 5, name: 'Tom Brown', email: null, role: 'Viewer', createdAt: '2024-04-05' },
    { id: 6, name: 'Emily Davis', email: 'emily.d@example.com', role: 'Admin', createdAt: '2024-04-12' },
    { id: 7, name: 'Chris Wilson', email: 'chris.w@example.com', role: 'Editor', createdAt: '2024-05-01' },
    { id: 8, name: 'Lisa Anderson', email: null, role: 'User', createdAt: '2024-05-15' },
    { id: 9, name: 'David Martinez', email: 'david.m@example.com', role: 'User', createdAt: '2024-06-01' },
    { id: 10, name: 'Anna Taylor', email: 'anna.t@example.com', role: 'Viewer', createdAt: '2024-06-10' },
  ]);

  const [currentPage, setCurrentPage] = useState(1);
  const [openDropdown, setOpenDropdown] = useState(null);
  const usersPerPage = 20;

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  const handleAction = (action, userId, userName) => {
    alert(`${action} action clicked for user: ${userName} (ID: ${userId})`);
    setOpenDropdown(null);
  };

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
            <h4 style={{ margin: '0 0 8px 0', color: '#333', fontWeight: '600', fontSize: '20px' }}>
              Consumers Management
            </h4>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              Manage your consumers and their permissions
            </p>
          </div>

          {/* Table - Scrollable */}
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
                {currentUsers.map((user) => (
                  <tr 
                    key={user.id}
                    style={{ 
                      borderBottom: '1px solid #f0f0f0',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '15px 24px', color: '#666', fontSize: '14px' }}>
                      {user.id}
                    </td>
                    <td style={{ padding: '15px 24px', color: '#333', fontSize: '14px', fontWeight: '500' }}>
                      {user.name}
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
                        display: 'inline-block'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '15px 24px', color: '#666', fontSize: '14px' }}>
                      {new Date(user.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td style={{ padding: '15px 24px', textAlign: 'center', position: 'relative' }}>
                      <button
                        onClick={() => toggleDropdown(user.id)}
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
                      
                      {openDropdown === user.id && (
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
                            onClick={() => handleAction('Update', user.id, user.name)}
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
                            onClick={() => handleAction('Reset Password', user.id, user.name)}
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
                            onClick={() => handleAction('Delete', user.id, user.name)}
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
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer with Pagination - Fixed */}
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
    </div>
  );
};

export default Consumers;