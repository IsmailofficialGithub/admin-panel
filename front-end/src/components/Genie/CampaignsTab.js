import React, { useState, useEffect, useCallback, useRef } from "react";
import { Calendar, Plus, MoreVertical, X, Clock, Globe, Users, CheckCircle, XCircle, Pause, Play, Search } from "lucide-react";
import { getAllCampaigns, cancelCampaign, pauseCampaign, resumeCampaign, getAllBots, getAllContactLists } from "api/backend/genie";
import { usePermissions } from "hooks/usePermissions";
import { useGenieWebSocket } from "hooks/useGenieWebSocket";
import CreateCampaignModal from "./CreateCampaignModal";
import ConfirmationModal from "../ui/ConfirmationModal";
import toast from "react-hot-toast";

function CampaignsTab() {
  const { hasPermission } = usePermissions();
  const { lastCampaignEvent, joinCampaign, leaveCampaign } = useGenieWebSocket();
  
  // State
  const [campaigns, setCampaigns] = useState([]);
  const [bots, setBots] = useState([]);
  const [contactLists, setContactLists] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [campaignSearchInput, setCampaignSearchInput] = useState("");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [consumerSearchInput, setConsumerSearchInput] = useState("");
  const [consumerSearch, setConsumerSearch] = useState("");
  
  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Cancel Confirmation Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRefs = useRef({});

  // Permissions
  const canCreate = hasPermission('genie.campaigns.create');
  const canDelete = hasPermission('genie.campaigns.delete');
  const canUpdate = hasPermission('genie.campaigns.update');

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: 50,
        status: statusFilter || undefined,
        campaignSearch: campaignSearch || undefined,
        consumerSearch: consumerSearch || undefined,
      };

      const response = await getAllCampaigns(params);
      if (response?.error) {
        toast.error(response.error);
        return;
      }

      setCampaigns(response?.data || []);
      
      // Join rooms for active campaigns
      (response?.data || []).forEach(campaign => {
        if (campaign.runtime_call_status || campaign.status === 'running') {
          joinCampaign(campaign.id);
        }
      });
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      toast.error("Failed to fetch campaigns");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, campaignSearch, consumerSearch, joinCampaign]);

  // Fetch supporting data
  const fetchSupportingData = useCallback(async () => {
    try {
      const [botsRes, listsRes] = await Promise.all([
        getAllBots(),
        getAllContactLists(),
      ]);
      
      if (!botsRes?.error) setBots(botsRes?.data || []);
      if (!listsRes?.error) setContactLists(listsRes?.data || []);
    } catch (error) {
      console.error("Error fetching supporting data:", error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSupportingData();
    fetchCampaigns();
    
    return () => {
      campaigns.forEach(c => leaveCampaign(c.id));
    };
  }, []);

  // Debounce campaign search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCampaignSearch(campaignSearchInput);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [campaignSearchInput]);

  // Debounce consumer search
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setConsumerSearch(consumerSearchInput);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [consumerSearchInput]);

  // Fetch campaigns when filters change
  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter, campaignSearch, consumerSearch, fetchCampaigns]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!openDropdown) return;
      
      const dropdownRef = dropdownRefs.current[openDropdown];
      const clickedElement = event.target;
      
      // Check if click is inside the dropdown
      if (dropdownRef && dropdownRef.contains(clickedElement)) {
        return;
      }
      
      // Check if click is on the toggle button (the three dots button)
      const isToggleButton = clickedElement.closest('button')?.querySelector('svg');
      if (isToggleButton) {
        // Check if it's the toggle for the open dropdown
        const buttonParent = clickedElement.closest('div[style*="position: relative"]');
        if (buttonParent && buttonParent.querySelector(`[data-dropdown-id="${openDropdown}"]`)) {
          return; // It's the toggle for this dropdown, don't close
        }
      }
      
      console.log('Click outside dropdown detected, closing');
      setOpenDropdown(null);
    };

    if (openDropdown) {
      // Small delay to avoid immediate closure
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [openDropdown]);

  // Real-time updates
  useEffect(() => {
    if (lastCampaignEvent) {
      const eventData = lastCampaignEvent.data;
      setCampaigns(prev => prev.map(c => {
        if (c.id === eventData?.id) {
          return {
            ...c,
            ...eventData,
            progress_percent: eventData.progress_percent || c.progress_percent,
          };
        }
        return c;
      }));
    }
  }, [lastCampaignEvent]);

  // Open cancel modal
  const openCancelModal = (campaign) => {
    console.log('openCancelModal called', campaign);
    if (!canDelete) {
      toast.error("You don't have permission to cancel campaigns");
      return;
    }
    setSelectedCampaign(campaign);
    setIsCancelModalOpen(true);
    setOpenDropdown(null);
  };

  // Close cancel modal
  const closeCancelModal = () => {
    setIsCancelModalOpen(false);
    setSelectedCampaign(null);
  };

  // Confirm cancel campaign
  const confirmCancelCampaign = async () => {
    if (!selectedCampaign?.id) return;
    
    setCancelLoading(true);
    try {
      const response = await cancelCampaign(selectedCampaign.id);
      if (response?.error) {
        toast.error(response.error);
        return;
      }
      toast.success("Campaign cancelled successfully");
      fetchCampaigns();
      closeCancelModal();
    } catch (error) {
      toast.error("Failed to cancel campaign");
    } finally {
      setCancelLoading(false);
    }
  };

  // Handle pause campaign
  const handlePauseCampaign = async (campaign) => {
    console.log('🔵 handlePauseCampaign called', { campaign, canUpdate });
    if (!canUpdate) {
      toast.error("You don't have permission to pause campaigns");
      return;
    }
    setOpenDropdown(null);
    try {
      console.log('🔵 Calling pauseCampaign API with id:', campaign.id);
      const response = await pauseCampaign(campaign.id);
      console.log('🔵 pauseCampaign response:', response);
      console.log('🔵 response.success:', response?.success, 'type:', typeof response?.success);
      console.log('🔵 response.error:', response?.error);
      console.log('🔵 Full response keys:', response ? Object.keys(response) : 'null');
      
      // Check for success - be more lenient with the check
      const isSuccess = response && (
        response.success === true || 
        response.success === 'true' ||
        (typeof response.success !== 'undefined' && response.success !== false && !response.error)
      );
      
      if (isSuccess) {
        toast.success(response.message || "Campaign paused successfully");
        fetchCampaigns();
      } else if (response?.error) {
        toast.error(response.error);
      } else {
        // Last resort: if response exists and has data, assume success
        if (response && (response.data || response.id)) {
          console.log('🔵 Response has data/id, treating as success');
          toast.success("Campaign paused successfully");
          fetchCampaigns();
        } else {
          console.error('🔵 Unexpected response structure:', response);
          toast.error(response?.message || "Failed to pause campaign");
        }
      }
    } catch (error) {
      console.error('❌ Error in handlePauseCampaign:', error);
      toast.error("Failed to pause campaign");
    }
  };

  // Handle resume campaign
  const handleResumeCampaign = async (campaign) => {
    console.log('🟢 handleResumeCampaign called', { campaign, canUpdate });
    if (!canUpdate) {
      toast.error("You don't have permission to resume campaigns");
      return;
    }
    setOpenDropdown(null);
    try {
      console.log('🟢 Calling resumeCampaign API with id:', campaign.id);
      const response = await resumeCampaign(campaign.id);
      console.log('🟢 resumeCampaign response:', response);
      console.log('🟢 response.success:', response?.success, 'type:', typeof response?.success);
      console.log('🟢 response.error:', response?.error);
      console.log('🟢 Full response keys:', response ? Object.keys(response) : 'null');
      
      // Check for success - be more lenient with the check
      // Response should have success: true from the API
      const isSuccess = response && (
        response.success === true || 
        response.success === 'true' ||
        (typeof response.success !== 'undefined' && response.success !== false && !response.error)
      );
      
      if (isSuccess) {
        toast.success(response.message || "Campaign resumed successfully");
        fetchCampaigns();
      } else if (response?.error) {
        toast.error(response.error);
      } else {
        // Last resort: if response exists and has data, assume success
        if (response && (response.data || response.id)) {
          console.log('🟢 Response has data/id, treating as success');
          toast.success("Campaign resumed successfully");
          fetchCampaigns();
        } else {
          console.error('🟢 Unexpected response structure:', response);
          toast.error(response?.message || "Failed to resume campaign");
        }
      }
    } catch (error) {
      console.error('❌ Error in handleResumeCampaign:', error);
      toast.error("Failed to resume campaign");
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status config
  const getStatusConfig = (status, isRunning) => {
    if (isRunning) {
      return { color: '#22c55e', bg: '#dcfce7', label: 'Running', pulse: true };
    }
    const map = {
      completed: { color: '#8b5cf6', bg: '#ede9fe', label: 'Completed' },
      in_progress: { color: '#22c55e', bg: '#dcfce7', label: 'In Progress' },
      paused: { color: '#f59e0b', bg: '#fef3c7', label: 'Paused' },
      scheduled: { color: '#3b82f6', bg: '#dbeafe', label: 'Scheduled' },
      running: { color: '#22c55e', bg: '#dcfce7', label: 'Running' },
      cancelled: { color: '#6b7280', bg: '#f3f4f6', label: 'Cancelled' },
      failed: { color: '#ef4444', bg: '#fee2e2', label: 'Failed' },
    };
    return map[status] || { color: '#6b7280', bg: '#f3f4f6', label: status };
  };

  // Handle campaign created
  const handleCampaignCreated = () => {
    setShowCreateModal(false);
    fetchCampaigns();
  };

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
        gap: '16px'
      }}>
        <div>
          <h5 style={{ margin: '0 0 4px 0', fontWeight: '600', fontSize: '18px', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} style={{ color: '#74317e' }} />
            Campaigns
          </h5>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Manage your automated call campaigns
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', minWidth: '200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            {campaignSearchInput && (
              <X 
                size={16} 
                onClick={() => setCampaignSearchInput('')}
                style={{ 
                  position: 'absolute', 
                  right: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: '#9ca3af',
                  cursor: 'pointer'
                }} 
              />
            )}
            <input
              type="text"
              placeholder="Search campaigns..."
              value={campaignSearchInput}
              onChange={(e) => setCampaignSearchInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                paddingRight: campaignSearchInput ? '36px' : '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ position: 'relative', minWidth: '200px' }}>
            <Users size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            {consumerSearchInput && (
              <X 
                size={16} 
                onClick={() => setConsumerSearchInput('')}
                style={{ 
                  position: 'absolute', 
                  right: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: '#9ca3af',
                  cursor: 'pointer'
                }} 
              />
            )}
            <input
              type="text"
              placeholder="Search consumer name/email..."
              value={consumerSearchInput}
              onChange={(e) => setConsumerSearchInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                paddingRight: consumerSearchInput ? '36px' : '12px',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: 'white',
              cursor: 'pointer',
              minWidth: '130px'
            }}
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="paused">Paused</option>
          </select>
          {canCreate && (
            <button 
              onClick={() => setShowCreateModal(true)}
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={16} />
              New Campaign
            </button>
          )}
        </div>
      </div>

      {/* Campaigns Grid */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid #f1f5f9', borderTopColor: '#74317e', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ marginTop: '16px', color: '#64748b', fontSize: '14px' }}>Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: '#94a3b8'
          }}>
            <Calendar size={32} />
            </div>
          <h5 style={{ margin: '0 0 8px 0', color: '#1e293b', fontWeight: '600' }}>No campaigns found</h5>
          <p style={{ margin: '0 0 20px 0', color: '#64748b', fontSize: '14px' }}>Schedule your first campaign to start automating calls</p>
            {canCreate && (
            <button 
                onClick={() => setShowCreateModal(true)}
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
                }}
              >
                Create Your First Campaign
            </button>
            )}
          </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {campaigns.map((campaign) => {
            const isRunning = campaign.runtime_call_status || campaign.status === 'running' || campaign.status === 'in_progress';
            const progress = campaign.progress_percent || 0;
            const statusConfig = getStatusConfig(campaign.status, isRunning);
            
            return (
              <div
                key={campaign.id}
                style={{
                  backgroundColor: 'white',
                  border: isRunning ? '2px solid #22c55e' : '1px solid #e5e7eb',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                {/* Card Header */}
                <div style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                    <h6 style={{ margin: '0 0 4px 0', fontWeight: '600', fontSize: '15px', color: '#1e293b' }}>
                        {campaign.genie_bots?.name || "Unknown Agent"}
                      </h6>
                    <small style={{ color: '#64748b', fontSize: '13px', display: 'block', marginBottom: '4px' }}>
                        {campaign.genie_contact_lists?.name || "Unknown List"}
                      </small>
                    {campaign.consumer_name && (
                      <small style={{ color: '#74317e', fontSize: '12px', fontWeight: '500', display: 'block' }}>
                        Owner: {campaign.consumer_name}
                      </small>
                    )}
                    </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                          background: statusConfig.bg,
                          color: statusConfig.color,
                          padding: '4px 10px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                      gap: '6px'
                    }}>
                        {statusConfig.pulse && (
                        <span style={{ 
                          width: '8px', 
                          height: '8px', 
                              borderRadius: '50%', 
                              background: statusConfig.color,
                              animation: 'pulse 1.5s infinite'
                        }} />
                        )}
                        {statusConfig.label}
                      </span>
                      {campaign.status !== 'completed' && campaign.status !== 'cancelled' && (canDelete || canUpdate) && (
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDropdown(openDropdown === campaign.id ? null : campaign.id);
                          }}
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
                            cursor: 'pointer'
                          }}
                        >
                          <MoreVertical size={16} />
                        </button>
                        {openDropdown === campaign.id && (
                          <div 
                            ref={(el) => {
                              if (el) {
                                dropdownRefs.current[campaign.id] = el;
                              } else {
                                delete dropdownRefs.current[campaign.id];
                              }
                            }}
                            data-dropdown-id={campaign.id}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                            style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            marginTop: '4px',
                            backgroundColor: 'white',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            zIndex: 1000,
                            minWidth: '160px'
                          }}>
                            {campaign.status === 'paused' && canUpdate && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  console.log('🟢 Resume button clicked', { campaign, e });
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleResumeCampaign(campaign);
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                style={{
                                  width: '100%',
                                  padding: '10px 16px',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  color: '#22c55e',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dcfce7'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Play size={16} /> Resume
                              </button>
                            )}
                            {(campaign.status === 'in_progress' || campaign.status === 'running' || isRunning) && canUpdate && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  console.log('🟡 Pause button clicked', { campaign, e });
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handlePauseCampaign(campaign);
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                style={{
                                  width: '100%',
                                  padding: '10px 16px',
                                  border: 'none',
                                  backgroundColor: 'transparent',
                                  textAlign: 'left',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  color: '#f59e0b',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef3c7'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                              >
                                <Pause size={16} /> Pause
                              </button>
                            )}
                            {canDelete && (
                              <>
                                {(campaign.status === 'paused' || campaign.status === 'in_progress' || campaign.status === 'running' || isRunning) && (
                                  <div style={{ height: '1px', backgroundColor: '#e0e0e0', margin: '4px 0' }} />
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    console.log('🔴 Cancel button clicked', { campaign, e });
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openCancelModal(campaign);
                                  }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }}
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
                                    gap: '8px'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                  <X size={16} /> Cancel
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div style={{ padding: '16px' }}>
                  {/* Progress */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <small style={{ color: '#64748b', fontSize: '13px' }}>Progress</small>
                      <small style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>{progress}%</small>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        borderRadius: '4px',
                        background: isRunning ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        width: `${progress}%`,
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{campaign.contacts_count || 0}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Contacts</div>
                      </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#22c55e' }}>{campaign.calls_completed || 0}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Completed</div>
                    </div>
                    <div style={{ textAlign: 'center', flex: 1 }}>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#ef4444' }}>{campaign.calls_failed || 0}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Failed</div>
                      </div>
                    </div>

                    {/* Schedule Info */}
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
                    <small style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      <Clock size={14} />
                        {formatDate(campaign.scheduled_at)}
                      </small>
                      {campaign.tz && (
                      <small style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '13px' }}>
                        <Globe size={14} />
                          {campaign.tz}
                        </small>
                      )}
                    </div>
                  </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CreateCampaignModal
          show={showCreateModal}
          onHide={() => setShowCreateModal(false)}
          onSuccess={handleCampaignCreated}
          bots={bots}
          contactLists={contactLists}
        />
      )}

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={isCancelModalOpen}
        onClose={closeCancelModal}
        onConfirm={confirmCancelCampaign}
        title="Cancel Campaign"
        message="Are you sure you want to cancel this campaign?"
        warningText="This action cannot be undone and any scheduled calls will be stopped."
        itemName={selectedCampaign?.genie_bots?.name || "Campaign"}
        itemId={selectedCampaign?.id}
        consequences={[
          "Stop all scheduled calls",
          "Mark campaign as cancelled",
          "Cannot be restarted"
        ]}
        confirmText="Yes, Cancel Campaign"
        cancelText="No, Keep It"
        variant="danger"
        isLoading={cancelLoading}
        loadingText="Cancelling..."
      />


      {/* Animation styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default CampaignsTab;
