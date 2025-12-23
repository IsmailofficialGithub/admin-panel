import React, { useState, useEffect, useRef } from 'react';
import { Table } from 'react-bootstrap';
import { Bot, Eye, ChevronDown, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import apiClient from '../../services/apiClient';
import { usePermissions } from '../../hooks/usePermissions';
import BotDetailsModal from './BotDetailsModal';

function BotsTab({ consumerId }) {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [vapiAccounts, setVapiAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const dropdownRef = useRef(null);
  const { hasPermission, isSystemAdmin, isLoading: permissionsLoading } = usePermissions();

  const canManageVapiAccounts = isSystemAdmin || hasPermission('genie.vapi_accounts.manage');

  useEffect(() => {
    fetchBots();
    fetchVapiAccounts();
  }, [consumerId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const fetchBots = async () => {
    setLoading(true);
    try {
      const response = await apiClient.genie.getAllBots({ ownerUserId: consumerId });
      if (response?.success) {
        setBots(response.data || []);
        // Set selected account ID from first bot (if all bots have same account)
        if (response.data && response.data.length > 0) {
          const firstBotAccountId = response.data[0].vapi_account_assigned;
          if (firstBotAccountId && response.data.every(bot => bot.vapi_account_assigned === firstBotAccountId)) {
            setSelectedAccountId(firstBotAccountId);
          }
        }
      } else {
        toast.error('Failed to fetch bots');
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
      toast.error('Failed to fetch bots');
    } finally {
      setLoading(false);
    }
  };

  const fetchVapiAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const response = await apiClient.genie.getVapiAccounts();
      console.log('📋 Vapi accounts response:', response);
      if (response?.success) {
        const accounts = response.data || [];
        console.log(`✅ Loaded ${accounts.length} Vapi account(s)`, accounts);
        setVapiAccounts(accounts);
        if (accounts.length === 0) {
          console.warn('⚠️ No Vapi accounts found. Make sure data exists in vapi_accounts table.');
        }
      } else {
        console.error('❌ Failed to fetch Vapi accounts:', response);
        toast.error('Failed to fetch Vapi accounts');
      }
    } catch (error) {
      console.error('❌ Error fetching Vapi accounts:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch Vapi accounts');
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleAssignAccount = async (accountId) => {
    if (!canManageVapiAccounts) {
      toast.error('You do not have permission to assign Vapi accounts');
      return;
    }

    setAssigning(true);
    try {
      const response = await apiClient.genie.assignVapiAccountToBots(consumerId, accountId);
      if (response?.success) {
        setSelectedAccountId(accountId);
        setIsDropdownOpen(false);
        toast.success(response.message || `Successfully assigned Vapi account to ${response.data?.updatedCount || 0} bot(s)`);
        // Refresh bots to get updated data
        await fetchBots();
      } else {
        toast.error('Failed to assign Vapi account');
      }
    } catch (error) {
      console.error('Error assigning Vapi account:', error);
      toast.error(error.response?.data?.message || 'Failed to assign Vapi account');
    } finally {
      setAssigning(false);
    }
  };

  const handleViewBot = (bot) => {
    setSelectedBot(bot);
    setShowModal(true);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
        <p style={{ marginTop: '16px', color: '#6c757d' }}>Loading bots...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Bot Count Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: '0 0 8px 0', fontSize: '14px', opacity: 0.9 }}>Total Genie Agents</p>
            <h2 style={{ margin: 0, fontSize: '36px', fontWeight: '700' }}>{bots.length}</h2>
          </div>
          <div style={{
            width: '60px',
            height: '60px',
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bot size={32} />
          </div>
        </div>
      </div>

      {/* Vapi Account Assignment Dropdown */}
      {bots.length > 0 && !permissionsLoading && canManageVapiAccounts && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontSize: '14px', 
              fontWeight: '500',
              color: '#495057'
            }}>
              Assign Vapi Account to All Bots
            </label>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={assigning || loadingAccounts}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                cursor: assigning || loadingAccounts ? 'not-allowed' : 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                color: '#495057',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                opacity: assigning || loadingAccounts ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!assigning && !loadingAccounts) {
                  e.currentTarget.style.borderColor = '#74317e';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#dee2e6';
              }}
            >
              <span>
                {assigning ? 'Assigning...' : 
                 loadingAccounts ? 'Loading accounts...' :
                 selectedAccountId 
                   ? vapiAccounts.find(acc => acc.id === selectedAccountId)?.Account_name || 'Select account'
                   : 'Select Vapi account'}
              </span>
              <ChevronDown size={20} style={{ 
                transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }} />
            </button>

            {isDropdownOpen && (
              <>
                <div
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999
                  }}
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  backgroundColor: 'white',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  zIndex: 1000,
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                <div
                  onClick={() => {
                    handleAssignAccount(null);
                  }}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    color: '#495057',
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                    borderBottom: '1px solid #f0f0f0'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8f9fa';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  <span>None (Unassign)</span>
                  {selectedAccountId === null && <Check size={16} color="#74317e" />}
                </div>
                {vapiAccounts.map((account) => (
                  <div
                    key={account.id}
                    onClick={() => {
                      handleAssignAccount(account.id);
                    }}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '14px',
                      color: '#495057',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      borderBottom: '1px solid #f0f0f0'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '500' }}>{account.Account_name}</div>
                      {account.Account_description && (
                        <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '2px' }}>
                          {account.Account_description}
                        </div>
                      )}
                    </div>
                    {selectedAccountId === account.id && <Check size={16} color="#74317e" />}
                  </div>
                ))}
                {vapiAccounts.length === 0 && !loadingAccounts && (
                  <div style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    color: '#6c757d',
                    textAlign: 'center'
                  }}>
                    No Vapi accounts available
                  </div>
                )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bots List */}
      {bots.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          backgroundColor: '#f8f9fa',
          borderRadius: '12px',
          border: '1px dashed #dee2e6'
        }}>
          <Bot size={48} color="#adb5bd" style={{ marginBottom: '16px' }} />
          <p style={{ color: '#6c757d', fontSize: '16px', margin: 0 }}>No Genie agents created yet</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <Table striped hover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Goal</th>
                <th>Voice</th>
                <th>Language</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bots.map((bot) => (
                <tr key={bot.id}>
                  <td style={{ fontWeight: '500' }}>{bot.name || '-'}</td>
                  <td>{bot.company_name || '-'}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {bot.goal || '-'}
                  </td>
                  <td>{bot.voice || '-'}</td>
                  <td>{bot.language || '-'}</td>
                  <td>{formatDate(bot.created_at)}</td>
                  <td>
                    <button
                      onClick={() => handleViewBot(bot)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#74317e',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px'
                      }}
                    >
                      <Eye size={16} />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}

      {showModal && selectedBot && (
        <BotDetailsModal
          bot={selectedBot}
          show={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedBot(null);
          }}
        />
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default BotsTab;

