import React, { useState, useEffect } from 'react';
import { PhoneCall, Download, ChevronLeft, ChevronRight, Eye, MoreVertical } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiClient from '../../services/apiClient';
import CallDetailModal from './CallDetailModal';

function CallsTab({ consumerId }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const limit = 10;

  useEffect(() => {
    fetchCalls();
  }, [consumerId, currentPage]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchCalls = async () => {
    setLoading(true);
    try {
      console.log('📞 Fetching calls for consumer:', consumerId);
      const response = await apiClient.genie.getAllCallsByOwnerId(consumerId, {
        page: currentPage,
        limit
      });
      console.log('📞 Calls response:', response);
      if (response?.data) {
        setCalls(response.data || []);
        setTotalCount(response.total || 0);
        setTotalPages(response.totalPages || 1);
        console.log(`📞 Loaded ${response.data.length} calls for consumer ${consumerId}`);
      } else {
        toast.error('Failed to fetch calls');
      }
    } catch (error) {
      console.error('Error fetching calls:', error);
      toast.error('Failed to fetch calls');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (callId) => {
    setSelectedCallId(callId);
    setShowCallModal(true);
    setOpenDropdown(null);
  };

  const handleDownloadCalls = async () => {
    setDownloading(true);
    try {
      // Fetch all calls for export
      const response = await apiClient.genie.getAllCallsByOwnerId(consumerId, {
        page: 1,
        limit: 10000 // Get all calls
      });

      if (!response?.data || response.data.length === 0) {
        toast.error('No calls to export');
        return;
      }

      // Create CSV content
      const headers = ['Name', 'Phone', 'Call Status', 'Duration', 'Started At', 'Bot Name'];
      const rows = response.data.map(call => [
        call.name || '',
        call.phone || '',
        call.call_status || '',
        formatDuration(call.duration),
        call.started_at ? new Date(call.started_at).toLocaleString() : '',
        call.genie_bots?.name || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `calls-${consumerId}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Calls exported successfully');
    } catch (error) {
      console.error('Error exporting calls:', error);
      toast.error('Failed to export calls');
    } finally {
      setDownloading(false);
    }
  };

  const formatDuration = (decimalMinutes) => {
    if (!decimalMinutes) return '0:00';
    const totalSeconds = Math.round(decimalMinutes * 60);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: '#fef3c7', color: '#92400e' },
      in_progress: { bg: '#dbeafe', color: '#1e40af' },
      completed: { bg: '#dcfce7', color: '#166534' },
      failed: { bg: '#fee2e2', color: '#991b1b' }
    };
    const style = styles[status] || { bg: '#f3f4f6', color: '#374151' };
    return (
      <span style={{
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '500',
        backgroundColor: style.bg,
        color: style.color
      }}>
        {status || '-'}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #74317e',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto'
        }} />
        <p style={{ marginTop: '16px', color: '#6c757d' }}>Loading calls...</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
      {/* Header with Download Button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#333' }}>
            Call Logs ({totalCount})
          </h4>
        </div>
        <button
          onClick={handleDownloadCalls}
          disabled={downloading || totalCount === 0}
          style={{
            padding: '10px 20px',
            backgroundColor: downloading || totalCount === 0 ? '#ccc' : '#74317e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: downloading || totalCount === 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}
        >
          <Download size={18} />
          {downloading ? 'Exporting...' : 'Download CSV'}
        </button>
      </div>

      {/* Calls Table - Responsive */}
      {calls.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          border: '1px dashed #dee2e6'
        }}>
          <PhoneCall size={48} color="#adb5bd" style={{ marginBottom: '16px' }} />
          <p style={{ color: '#6c757d', fontSize: '16px', margin: 0 }}>No calls found</p>
        </div>
      ) : (
        <>
          <div style={{ 
            width: '100%', 
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch'
          }}>
            <div style={{ minWidth: '800px' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                backgroundColor: 'white',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb' }}>Contact</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb' }}>Bot</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb' }}>Duration</th>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb' }}>Started At</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', borderBottom: '2px solid #e5e7eb', width: '50px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.map((call) => (
                    <tr 
                      key={call.id}
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div>
                          <div style={{ fontWeight: '500', color: '#1e293b', fontSize: '14px', marginBottom: '4px' }}>{call.name || '-'}</div>
                          <div style={{ color: '#64748b', fontSize: '13px' }}>{call.phone || '-'}</div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '14px' }}>
                        {call.genie_bots?.name || '-'}
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        {getStatusBadge(call.call_status)}
                      </td>
                      <td style={{ padding: '14px 16px', fontWeight: '500', fontSize: '14px', color: '#1e293b' }}>
                        {formatDuration(call.duration)}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '14px' }}>
                        {formatDate(call.started_at)}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', position: 'relative' }}>
                        <div className="dropdown-container" style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            onClick={() => setOpenDropdown(openDropdown === call.id ? null : call.id)}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: '#f1f5f9',
                              color: '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                          {openDropdown === call.id && (
                            <div style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              marginTop: '8px',
                              backgroundColor: 'white',
                              border: '1px solid #e0e0e0',
                              borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                              zIndex: 100,
                              minWidth: '160px'
                            }}>
                              <button
                                onClick={() => handleViewDetails(call.id)}
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
                                  gap: '8px'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Eye size={16} /> View Details
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '1px solid #e9ecef',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Showing {((currentPage - 1) * limit) + 1} to {Math.min(currentPage * limit, totalCount)} of {totalCount} calls
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: currentPage === 1 ? '#f3f4f6' : 'white',
                    color: currentPage === 1 ? '#9ca3af' : '#374151',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px'
                  }}
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>
                <span style={{ fontSize: '14px', color: '#6c757d', padding: '0 12px' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: currentPage >= totalPages ? '#f3f4f6' : 'white',
                    color: currentPage >= totalPages ? '#9ca3af' : '#374151',
                    cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px'
                  }}
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Call Detail Modal */}
      <CallDetailModal
        callId={selectedCallId}
        isOpen={showCallModal}
        onClose={() => {
          setShowCallModal(false);
          setSelectedCallId(null);
        }}
      />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default CallsTab;
