import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import { Phone, RefreshCw, Search, Eye, Trash2, X, Edit2, BarChart3, Calendar, Plus, Clock, Users, Play, Pause, Download, Filter, CheckCircle, XCircle, AlertCircle, TrendingUp, DollarSign } from "lucide-react";
import { inboundApi } from "../api/backend/inbound";
import apiClient from "../services/apiClient";
import { getConsumers } from "../api/backend/consumers";
import { usePermissions } from "hooks/usePermissions";
import toast from "react-hot-toast";

function InboundGenie() {
  const history = useHistory();
  const { hasPermission } = usePermissions();
  const [activeTab, setActiveTab] = useState('numbers'); // 'numbers', 'calls', 'schedules', 'agents'
  const [inboundNumbers, setInboundNumbers] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [inboundAgents, setInboundAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Statistics state
  const [statistics, setStatistics] = useState({
    totalNumbers: 0,
    activeNumbers: 0,
    totalCalls: 0,
    answeredCalls: 0,
    totalAgents: 0,
    activeAgents: 0,
    totalSchedules: 0,
    activeSchedules: 0
  });
  
  // Advanced filters
  const [filters, setFilters] = useState({
    status: 'all',
    provider: 'all',
    dateRange: 'all',
    agentId: 'all'
  });
  
  // Track which tabs have been loaded to avoid refetching on tab switch
  const [loadedTabs, setLoadedTabs] = useState({
    numbers: false,
    calls: false,
    schedules: false,
    agents: false
  });
  
  // Modal states
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [selectedCall, setSelectedCall] = useState(null);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showAgentEditModal, setShowAgentEditModal] = useState(false);
  const [showAgentCreateModal, setShowAgentCreateModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Number calls and analytics
  const [numberCalls, setNumberCalls] = useState([]);
  const [numberAnalytics, setNumberAnalytics] = useState([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [numberModalTab, setNumberModalTab] = useState('details');
  
  // Available agents for assignment
  const [availableAgents, setAvailableAgents] = useState([]);
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  
  // Users for agent assignment
  const [users, setUsers] = useState([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserDisplay, setSelectedUserDisplay] = useState('');
  
  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [audioElement, setAudioElement] = useState(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  
  // Edit/Create form state for numbers
  const [formData, setFormData] = useState({
    phone_number: '',
    country_code: '+1',
    phone_label: '',
    call_forwarding_number: '',
    provider: 'twilio',
    status: 'active',
    assigned_to_agent_id: '',
    sms_enabled: false,
    twilio_account_sid: '',
    twilio_auth_token: '',
    vonage_api_key: '',
    vonage_api_secret: '',
    telnyx_api_key: ''
  });

  // Edit/Create form state for agents
  const [agentFormData, setAgentFormData] = useState({
    name: '',
    user_id: '',
    company_name: '',
    website_url: '',
    goal: '',
    background: '',
    welcome_message: '',
    instruction_voice: '',
    script: '',
    voice: 'aura-helena-en',
    tone: 'professional',
    model: 'gpt-4o',
    background_noise: 'office',
    language: 'en-US',
    agent_type: '',
    tool: '',
    timezone: '',
    phone_provider: '',
    phone_number: '',
    phone_label: '',
    twilio_sid: '',
    twilio_auth_token: '',
    sms_enabled: false,
    vonage_api_key: '',
    vonage_api_secret: '',
    telnyx_api_key: '',
    status: 'active',
    vapi_id: '',
    vapi_account_assigned: '',
    account_in_use: false,
    voice_provider: 'deepgram',
    execution_mode: 'production',
    temperature: '',
    confidence: 0.8,
    verbosity: 0.7,
    fallback_number: '',
    fallback_enabled: false,
    knowledge_base_id: '',
    metadata: {}
  });

  // Check permissions
  const canView = hasPermission('genie.view') || hasPermission('genie.inbound.view');
  const canDelete = hasPermission('genie.inbound.delete');
  const canEdit = hasPermission('genie.inbound.edit') || hasPermission('genie.inbound.update');
  const canCreate = hasPermission('genie.inbound.create');

  // Fetch inbound numbers
  const fetchInboundNumbers = async (force = false) => {
    // Don't fetch if already loaded and not forcing a refresh
    if (!force && loadedTabs.numbers && inboundNumbers.length > 0) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await inboundApi.getNumbers({ page: 1, limit: 50 });
      
      if (response.success && response.data) {
        // API returns paginated response: { success: true, data: [...], total, page, limit, ... }
        const numbers = Array.isArray(response.data) ? response.data : response.data;
        setInboundNumbers(numbers);
        setLoadedTabs(prev => ({ ...prev, numbers: true }));
      } else {
        setInboundNumbers([]);
        setLoadedTabs(prev => ({ ...prev, numbers: true }));
      }
    } catch (error) {
      console.error('Error fetching inbound numbers:', error);
      toast.error(error.message || 'Failed to load inbound numbers');
      setInboundNumbers([]);
      setLoadedTabs(prev => ({ ...prev, numbers: true }));
    } finally {
      setLoading(false);
    }
  };

  // Fetch call history
  const fetchCallHistory = async (force = false) => {
    // Don't fetch if already loaded and not forcing a refresh
    if (!force && loadedTabs.calls && callHistory.length > 0) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await inboundApi.getCallHistory({ page: 1, limit: 50 });
      
      if (response.success && response.data) {
        // API returns paginated response: { success: true, data: [...], total, page, limit, ... }
        const calls = Array.isArray(response.data) ? response.data : response.data;
        setCallHistory(calls);
        setLoadedTabs(prev => ({ ...prev, calls: true }));
      } else {
        setCallHistory([]);
        setLoadedTabs(prev => ({ ...prev, calls: true }));
      }
    } catch (error) {
      console.error('Error fetching call history:', error);
      toast.error(error.message || 'Failed to load call history');
      setCallHistory([]);
      setLoadedTabs(prev => ({ ...prev, calls: true }));
    } finally {
      setLoading(false);
    }
  };

  // Fetch schedules
  const fetchSchedules = async (force = false) => {
    // Don't fetch if already loaded and not forcing a refresh
    if (!force && loadedTabs.schedules && schedules.length > 0) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await inboundApi.getSchedules({ page: 1, limit: 50 });
      
      if (response.success && response.data) {
        // API returns paginated response: { success: true, data: [...], total, page, limit, ... }
        const schedulesData = Array.isArray(response.data) ? response.data : response.data;
        setSchedules(schedulesData);
        setLoadedTabs(prev => ({ ...prev, schedules: true }));
      } else {
        setSchedules([]);
        setLoadedTabs(prev => ({ ...prev, schedules: true }));
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error(error.message || 'Failed to load schedules');
      setSchedules([]);
      setLoadedTabs(prev => ({ ...prev, schedules: true }));
    } finally {
      setLoading(false);
    }
  };


  // Fetch available agents
  const fetchAvailableAgents = async (force = false) => {
    // Don't fetch if already loaded and not forcing a refresh
    if (!force && agentsLoaded) {
      return;
    }
    
    try {
      const response = await inboundApi.getAvailableAgents();
      if (response.success && response.data) {
        setAvailableAgents(response.data);
        setAgentsLoaded(true);
      } else {
        setAvailableAgents([]);
        setAgentsLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setAvailableAgents([]);
      setAgentsLoaded(true);
    }
  };

  // Fetch number calls
  const fetchNumberCalls = async (numberId) => {
    try {
      setLoadingCalls(true);
      const response = await inboundApi.getCallsByNumberId(numberId, { page: 1, limit: 50 });
      
      console.log('Number calls API response:', response);
      
      // API returns paginated response: { success: true, data: [...], total, page, limit, ... }
      // axios interceptor already unwraps response.data, so response is the actual API response
      if (response) {
        // Check if response has data property (paginated response)
        const calls = response.data && Array.isArray(response.data) 
          ? response.data 
          : Array.isArray(response) 
            ? response 
            : [];
        
        console.log('Extracted calls:', calls, 'Total:', response.total || calls.length);
        setNumberCalls(calls);
      } else {
        console.log('No response received');
        setNumberCalls([]);
      }
    } catch (error) {
      console.error('Error fetching number calls:', error);
      toast.error(error.message || 'Failed to load calls');
      setNumberCalls([]);
    } finally {
      setLoadingCalls(false);
    }
  };

  // Fetch number analytics
  const fetchNumberAnalytics = async (numberId) => {
    try {
      setLoadingAnalytics(true);
      const response = await inboundApi.getAnalyticsByNumberId(numberId, { page: 1, limit: 30 });
      
      console.log('Number analytics API response:', response);
      
      // API returns paginated response: { success: true, data: [...], total, page, limit, ... }
      // axios interceptor already unwraps response.data, so response is the actual API response
      if (response) {
        // Check if response has data property (paginated response)
        const analyticsData = response.data && Array.isArray(response.data) 
          ? response.data 
          : Array.isArray(response) 
            ? response 
            : [];
        
        console.log('Extracted analytics:', analyticsData, 'Total:', response.total || analyticsData.length);
        setNumberAnalytics(analyticsData);
      } else {
        console.log('No response received for analytics');
        setNumberAnalytics([]);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error(error.message || 'Failed to load analytics');
      setNumberAnalytics([]);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fetch users for agent assignment
  const fetchUsers = async (force = false) => {
    if (!force && usersLoaded && users.length > 0) {
      return;
    }
    
    try {
      const response = await apiClient.users.getAll('?page=1&limit=1000');
      console.log('Users API response:', response);
      
      // Handle paginated response - axios interceptor unwraps response.data
      if (response) {
        const usersList = response.data && Array.isArray(response.data) 
          ? response.data 
          : Array.isArray(response) 
            ? response 
            : response.data?.data || [];
        
        console.log('Fetched users:', usersList.length, 'Sample:', usersList[0]);
        setUsers(usersList);
        setUsersLoaded(true);
      } else {
        setUsers([]);
        setUsersLoaded(true);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setUsersLoaded(true);
    }
  };

  // Debounce user search - only trigger when 2+ characters
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (userSearchTerm.trim().length >= 2) {
        setDebouncedUserSearch(userSearchTerm.trim());
      } else {
        setDebouncedUserSearch('');
        setFilteredUsers([]);
        setShowUserSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [userSearchTerm]);

  // Fetch consumers from API when search term is 2+ characters
  useEffect(() => {
    const searchConsumers = async () => {
      if (!debouncedUserSearch || debouncedUserSearch.length < 2) {
        setFilteredUsers([]);
        setShowUserSuggestions(false);
        return;
      }

      setLoadingUsers(true);
      try {
        const result = await getConsumers({ search: debouncedUserSearch });
        console.log('Consumer search response:', result);
        
        // Handle different response structures
        let consumersList = [];
        if (result && !result.error) {
          if (Array.isArray(result)) {
            consumersList = result;
          } else if (result.data && Array.isArray(result.data)) {
            consumersList = result.data;
          } else if (result.success && Array.isArray(result.data)) {
            consumersList = result.data;
          }
        }
        
        // Map consumers to user format for display
        const mappedUsers = consumersList.map(consumer => ({
          user_id: consumer.user_id || consumer.id,
          id: consumer.user_id || consumer.id,
          full_name: consumer.full_name || consumer.name,
          email: consumer.email
        }));
        
        setFilteredUsers(mappedUsers);
        // Automatically show suggestions if results found
        if (mappedUsers.length > 0) {
          setShowUserSuggestions(true);
        } else {
          setShowUserSuggestions(false);
        }
      } catch (err) {
        console.error('Error searching consumers:', err);
        toast.error('Failed to search consumers');
        setFilteredUsers([]);
        setShowUserSuggestions(false);
      } finally {
        setLoadingUsers(false);
      }
    };

    searchConsumers();
  }, [debouncedUserSearch]);

  // Close user suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserSuggestions && !event.target.closest('.user-search-container')) {
        setShowUserSuggestions(false);
      }
    };

    if (showUserSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserSuggestions]);

  // Update selected user display when agentFormData.user_id changes
  useEffect(() => {
    if (agentFormData.user_id) {
      const user = users.find(u => (u.user_id || u.id) === agentFormData.user_id) ||
                   filteredUsers.find(u => (u.user_id || u.id) === agentFormData.user_id);
      if (user) {
        setSelectedUserDisplay(`${user.full_name || user.email || ''} ${user.email ? `(${user.email})` : ''}`.trim());
      } else {
        setSelectedUserDisplay('');
      }
    } else {
      setSelectedUserDisplay('');
    }
  }, [agentFormData.user_id, users, filteredUsers]);

  // Cleanup audio element on unmount
  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.currentTime = 0;
        setAudioProgress(0);
        setAudioCurrentTime(0);
        setAudioDuration(0);
      }
    };
  }, [audioElement]);

  // Fetch inbound agents
  const fetchInboundAgents = async (force = false) => {
    if (!force && loadedTabs.agents && inboundAgents.length > 0) {
      return;
    }
    
    try {
      setLoading(true);
      // Increase limit to fetch all agents (or use a high limit)
      const response = await inboundApi.getAgents({ page: 1, limit: 1000 });
      
      console.log('Inbound agents API response:', response);
      
      // API returns paginated response: { success: true, data: [...], total, page, limit, ... }
      // axios interceptor already unwraps response.data, so response is the actual API response
      if (response) {
        // Check if response has data property (paginated response)
        const agents = response.data && Array.isArray(response.data) 
          ? response.data 
          : Array.isArray(response) 
            ? response 
            : [];
        
        console.log('Extracted agents:', agents, 'Total:', response.total || agents.length);
        setInboundAgents(agents);
        setLoadedTabs(prev => ({ ...prev, agents: true }));
      } else {
        console.log('No response received for agents');
        setInboundAgents([]);
        setLoadedTabs(prev => ({ ...prev, agents: true }));
      }
    } catch (error) {
      console.error('Error fetching inbound agents:', error);
      toast.error(error.message || 'Failed to load inbound agents');
      setInboundAgents([]);
      setLoadedTabs(prev => ({ ...prev, agents: true }));
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  useEffect(() => {
    const stats = {
      totalNumbers: inboundNumbers.length,
      activeNumbers: inboundNumbers.filter(n => n.status === 'active').length,
      totalCalls: callHistory.length,
      answeredCalls: callHistory.filter(c => c.call_status === 'answered' || c.call_status === 'completed').length,
      totalAgents: inboundAgents.length,
      activeAgents: inboundAgents.filter(a => a.status === 'active').length,
      totalSchedules: schedules.length,
      activeSchedules: schedules.filter(s => s.is_active).length
    };
    setStatistics(stats);
  }, [inboundNumbers, callHistory, inboundAgents, schedules]);

  useEffect(() => {
    if (activeTab === 'numbers') {
      fetchInboundNumbers();
      fetchAvailableAgents();
    } else if (activeTab === 'calls') {
      fetchCallHistory();
    } else if (activeTab === 'schedules') {
      fetchSchedules();
    } else if (activeTab === 'agents') {
      fetchInboundAgents();
      fetchUsers();
    }
  }, [activeTab]);

  // View number details
  const handleViewNumber = async (number) => {
    setSelectedNumber(number);
    setShowNumberModal(true);
    setNumberModalTab('details');
    await fetchNumberCalls(number.id);
    await fetchNumberAnalytics(number.id);
  };

  // Open edit modal
  const handleEditNumber = (number) => {
    setFormData({
      phone_number: number.phone_number || '',
      country_code: number.country_code || '+1',
      phone_label: number.phone_label || '',
      call_forwarding_number: number.call_forwarding_number || '',
      provider: number.provider || 'twilio',
      status: number.status || 'active',
      assigned_to_agent_id: number.assigned_to_agent_id || '',
      sms_enabled: number.sms_enabled || false,
      twilio_account_sid: number.twilio_account_sid || '',
      twilio_auth_token: number.twilio_auth_token || '',
      vonage_api_key: number.vonage_api_key || '',
      vonage_api_secret: number.vonage_api_secret || '',
      telnyx_api_key: number.telnyx_api_key || ''
    });
    setSelectedNumber(number);
    setShowEditModal(true);
  };

  // Open create modal
  const handleCreateNumber = () => {
    setFormData({
      phone_number: '',
      country_code: '+1',
      phone_label: '',
      call_forwarding_number: '',
      provider: 'twilio',
      status: 'pending',
      assigned_to_agent_id: '',
      sms_enabled: false,
      twilio_account_sid: '',
      twilio_auth_token: '',
      vonage_api_key: '',
      vonage_api_secret: '',
      telnyx_api_key: ''
    });
    setSelectedNumber(null);
    setShowCreateModal(true);
  };

  // Save number (create or update)
  const handleSaveNumber = async () => {
    setSaving(true);
    try {
      const saveData = {
        ...formData,
        updated_at: new Date().toISOString()
      };

      if (selectedNumber) {
        // Update
        const response = await inboundApi.updateNumber(selectedNumber.id, saveData);
        if (response.success) {
          toast.success('Inbound number updated successfully');
          setShowEditModal(false);
          
          // Update selected number if modal is open
          if (showNumberModal && response.data) {
            setSelectedNumber(response.data);
          }
        }
      } else {
        // Create
        const response = await inboundApi.createNumber(saveData);
        if (response.success) {
          toast.success('Inbound number created successfully');
          setShowCreateModal(false);
        }
      }

      await fetchInboundNumbers(true);
    } catch (error) {
      console.error('Error saving number:', error);
      toast.error(error.message || `Failed to ${selectedNumber ? 'update' : 'create'} inbound number`);
    } finally {
      setSaving(false);
    }
  };

  // Delete number
  const handleDeleteClick = (item, type) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete");
      return;
    }
    setItemToDelete(item);
    setDeleteType(type);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete?.id) return;

    setDeleting(true);
    try {
      if (deleteType === 'number') {
        const response = await inboundApi.deleteNumber(itemToDelete.id);
        if (response.success) {
          toast.success('Number deleted successfully');
          await fetchInboundNumbers(true);
        }
      } else if (deleteType === 'call') {
        // Note: Delete for calls not implemented in API yet
        toast.error('Delete for calls is not yet implemented');
        setDeleting(false);
        return;
      } else {
        // Note: Delete for schedules not implemented in API yet
        toast.error('Delete for schedules is not yet implemented');
        setDeleting(false);
        return;
      }

      setShowDeleteModal(false);
      setItemToDelete(null);
      setDeleteType(null);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(error.message || `Failed to delete ${deleteType}`);
    } finally {
      setDeleting(false);
    }
  };

  // Agent handlers
  const handleViewAgent = (agent) => {
    setSelectedAgent(agent);
    setShowAgentModal(true);
  };

  const handleEditAgent = async (agent) => {
    // Fetch users if not loaded to get user display name
    if (!usersLoaded) {
      await fetchUsers(true);
    }
    
    // Find user to set display name
    const user = users.find(u => (u.user_id || u.id) === agent.user_id);
    const userDisplay = user ? `${user.full_name || user.email || ''} ${user.email ? `(${user.email})` : ''}`.trim() : '';
    
    setAgentFormData({
      name: agent.name || '',
      user_id: agent.user_id || '',
      company_name: agent.company_name || '',
      website_url: agent.website_url || '',
      goal: agent.goal || '',
      background: agent.background || '',
      welcome_message: agent.welcome_message || '',
      instruction_voice: agent.instruction_voice || '',
      script: agent.script || '',
      voice: agent.voice || 'aura-helena-en',
      tone: agent.tone || 'professional',
      model: agent.model || 'gpt-4o',
      background_noise: agent.background_noise || 'office',
      language: agent.language || 'en-US',
      agent_type: agent.agent_type || '',
      tool: agent.tool || '',
      timezone: agent.timezone || '',
      phone_provider: agent.phone_provider || '',
      phone_number: agent.phone_number || '',
      phone_label: agent.phone_label || '',
      twilio_sid: agent.twilio_sid || '',
      twilio_auth_token: agent.twilio_auth_token || '',
      sms_enabled: agent.sms_enabled || false,
      vonage_api_key: agent.vonage_api_key || '',
      vonage_api_secret: agent.vonage_api_secret || '',
      telnyx_api_key: agent.telnyx_api_key || '',
      status: agent.status || 'active',
      vapi_id: agent.vapi_id || '',
      vapi_account_assigned: agent.vapi_account_assigned || '',
      account_in_use: agent.account_in_use || false,
      voice_provider: agent.voice_provider || 'deepgram',
      execution_mode: agent.execution_mode || 'production',
      temperature: agent.temperature || '',
      confidence: agent.confidence || 0.8,
      verbosity: agent.verbosity || 0.7,
      fallback_number: agent.fallback_number || '',
      fallback_enabled: agent.fallback_enabled || false,
      knowledge_base_id: agent.knowledge_base_id || '',
      metadata: agent.metadata || {}
    });
    setSelectedAgent(agent);
    setSelectedUserDisplay(userDisplay);
    setUserSearchTerm('');
    setShowUserSuggestions(false);
    setShowAgentEditModal(true);
  };

  const handleCreateAgent = () => {
    setAgentFormData({
      name: '',
      user_id: '',
      company_name: '',
      website_url: '',
      goal: '',
      background: '',
      welcome_message: '',
      instruction_voice: '',
      script: '',
      voice: 'aura-helena-en',
      tone: 'professional',
      model: 'gpt-4o',
      background_noise: 'office',
      language: 'en-US',
      agent_type: '',
      tool: '',
      timezone: '',
      phone_provider: '',
      phone_number: '',
      phone_label: '',
      twilio_sid: '',
      twilio_auth_token: '',
      sms_enabled: false,
      vonage_api_key: '',
      vonage_api_secret: '',
      telnyx_api_key: '',
      status: 'active',
      vapi_id: '',
      vapi_account_assigned: '',
      account_in_use: false,
      voice_provider: 'deepgram',
      execution_mode: 'production',
      temperature: '',
      confidence: 0.8,
      verbosity: 0.7,
      fallback_number: '',
      fallback_enabled: false,
      knowledge_base_id: '',
      metadata: {}
    });
    setSelectedAgent(null);
    setSelectedUserDisplay('');
    setUserSearchTerm('');
    setShowUserSuggestions(false);
    setShowAgentCreateModal(true);
  };

  const handleSaveAgent = async () => {
    setSaving(true);
    try {
      const saveData = {
        ...agentFormData,
        updated_at: new Date().toISOString()
      };

      // Remove empty strings and convert to null
      Object.keys(saveData).forEach(key => {
        if (saveData[key] === '') {
          saveData[key] = null;
        }
      });

      if (selectedAgent) {
        // Update
        const response = await inboundApi.updateAgent(selectedAgent.id, saveData);
        if (response.success) {
          toast.success('Agent updated successfully');
          setShowAgentEditModal(false);
          await fetchInboundAgents(true);
        }
      } else {
        // Create
        const response = await inboundApi.createAgent(saveData);
        if (response.success) {
          toast.success('Agent created successfully');
          setShowAgentCreateModal(false);
          await fetchInboundAgents(true);
        }
      }
    } catch (error) {
      console.error('Error saving agent:', error);
      toast.error(error.message || `Failed to ${selectedAgent ? 'update' : 'create'} agent`);
    } finally {
      setSaving(false);
    }
  };

  // Close call modal only (keeps number modal open)
  const closeCallModal = () => {
    // Stop any playing audio
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setAudioElement(null);
      setPlayingAudioId(null);
      setAudioProgress(0);
      setAudioCurrentTime(0);
      setAudioDuration(0);
    }
    setShowCallModal(false);
    setSelectedCall(null);
  };

  // Close modals
  const closeModals = () => {
    // Stop any playing audio
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
      setAudioElement(null);
      setPlayingAudioId(null);
      setAudioProgress(0);
      setAudioCurrentTime(0);
      setAudioDuration(0);
    }
    setShowNumberModal(false);
    setShowCallModal(false);
    setShowDeleteModal(false);
    setShowEditModal(false);
    setShowCreateModal(false);
    setShowAgentModal(false);
    setShowAgentEditModal(false);
    setShowAgentCreateModal(false);
    setSelectedNumber(null);
    setSelectedCall(null);
    setSelectedSchedule(null);
    setSelectedAgent(null);
    setItemToDelete(null);
    setDeleteType(null);
    setNumberCalls([]);
    setNumberAnalytics([]);
  };

  // Filter functions
  const filteredNumbers = inboundNumbers.filter(num => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      num.phone_number?.toLowerCase().includes(query) ||
      num.phone_label?.toLowerCase().includes(query) ||
      num.provider?.toLowerCase().includes(query) ||
      num.status?.toLowerCase().includes(query)
    );
  });

  const filteredCalls = callHistory.filter(call => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!(
        call.caller_number?.toLowerCase().includes(query) ||
        call.called_number?.toLowerCase().includes(query) ||
        call.call_status?.toLowerCase().includes(query) ||
        call.inbound_numbers?.phone_number?.toLowerCase().includes(query)
      )) {
        return false;
      }
    }
    
    // Status filter
    if (filters.status !== 'all') {
      if (filters.status === 'answered' && call.call_status !== 'answered' && call.call_status !== 'completed') {
        return false;
      } else if (filters.status !== 'answered' && call.call_status !== filters.status) {
        return false;
      }
    }
    
    return true;
  });

  // Audio playback handler
  const handlePlayRecording = (recordingUrl, callId) => {
    if (playingAudioId === callId && audioElement) {
      // Pause current audio
      audioElement.pause();
      setPlayingAudioId(null);
    } else {
      // Stop any currently playing audio
      if (audioElement && playingAudioId !== callId) {
        audioElement.pause();
        audioElement.currentTime = 0;
      }
      
      // Use existing audio element if it's the same recording, otherwise create new one
      let audio = audioElement;
      if (!audio || playingAudioId !== callId) {
        audio = new Audio(recordingUrl);
        
        // Set up event listeners
        audio.addEventListener('loadedmetadata', () => {
          setAudioDuration(audio.duration);
        });
        
        audio.addEventListener('timeupdate', () => {
          if (audio.duration) {
            setAudioCurrentTime(audio.currentTime);
            setAudioProgress((audio.currentTime / audio.duration) * 100);
          }
        });
        
        audio.addEventListener('ended', () => {
          setPlayingAudioId(null);
          setAudioProgress(0);
          setAudioCurrentTime(0);
        });
        
        audio.addEventListener('error', () => {
          toast.error('Failed to play recording');
          setPlayingAudioId(null);
          setAudioElement(null);
          setAudioProgress(0);
          setAudioCurrentTime(0);
          setAudioDuration(0);
        });
        
        setAudioElement(audio);
      }
      
      // Load metadata if not already loaded
      if (audio.readyState >= 1) {
        setAudioDuration(audio.duration);
      }
      
      audio.play();
      setPlayingAudioId(callId);
    }
  };

  // Handle progress bar click (scrub)
  const handleProgressClick = (e, audioElement) => {
    if (!audioElement || !audioDuration) return;
    
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * audioDuration;
    
    audioElement.currentTime = newTime;
    setAudioCurrentTime(newTime);
    setAudioProgress(percentage * 100);
  };

  // Format time helper
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredAgents = inboundAgents.filter(agent => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      agent.name?.toLowerCase().includes(query) ||
      agent.company_name?.toLowerCase().includes(query) ||
      agent.phone_number?.toLowerCase().includes(query) ||
      agent.status?.toLowerCase().includes(query) ||
      agent.agent_type?.toLowerCase().includes(query)
    );
  });

  if (!canView) {
    return (
      <div style={{
        backgroundColor: '#f8f9fa',
        minHeight: '100vh',
        padding: '20px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}>
        <div style={{
          maxWidth: '500px',
          margin: '60px auto',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px'
          }}>
            <span style={{ fontSize: '32px', color: '#dc3545' }}>🔒</span>
          </div>
          <h4 style={{ margin: '0 0 12px 0', color: '#333', fontWeight: '600' }}>Access Denied</h4>
          <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>You don't have permission to view Inbound Genie.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      minHeight: '100vh',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <h3 style={{
              margin: '0 0 8px 0',
              color: '#333',
              fontWeight: '600',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Phone size={24} style={{ color: '#74317e' }} />
              Inbound Genie
            </h3>
            <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
              Manage inbound phone numbers, call history, schedules, and agents
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {canCreate && activeTab === 'numbers' && (
              <button
                onClick={handleCreateNumber}
                style={{
                  padding: '12px 24px',
                  background: '#74317e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                <Plus size={18} />
                Add Number
              </button>
            )}
            {canCreate && activeTab === 'agents' && (
              <button
                onClick={handleCreateAgent}
                style={{
                  padding: '12px 24px',
                  background: '#74317e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                <Plus size={18} />
                Add Agent
              </button>
            )}
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            borderLeft: '4px solid #74317e'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>Total Numbers</span>
              <Phone size={20} color="#74317e" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#74317e' }}>{statistics.totalNumbers}</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              {statistics.activeNumbers} active
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            borderLeft: '4px solid #28a745'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>Total Calls</span>
              <Phone size={20} color="#28a745" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#28a745' }}>{statistics.totalCalls}</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              {statistics.answeredCalls} answered
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            borderLeft: '4px solid #17a2b8'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>Total Agents</span>
              <Users size={20} color="#17a2b8" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#17a2b8' }}>{statistics.totalAgents}</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              {statistics.activeAgents} active
            </div>
          </div>
          
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            borderLeft: '4px solid #ffc107'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '14px', color: '#666', fontWeight: '500' }}>Schedules</span>
              <Calendar size={20} color="#ffc107" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffc107' }}>{statistics.totalSchedules}</div>
            <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
              {statistics.activeSchedules} active
            </div>
          </div>
        </div>

        {/* Main Content with Tabs */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          overflow: 'hidden'
        }}>
          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #f0f0f0',
            backgroundColor: '#fafafa'
          }}>
            <button
              onClick={() => setActiveTab('numbers')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 24px',
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '14px',
                fontWeight: activeTab === 'numbers' ? '600' : '400',
                color: activeTab === 'numbers' ? '#74317e' : '#666',
                cursor: 'pointer',
                borderBottom: activeTab === 'numbers' ? '2px solid #74317e' : '2px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.2s'
              }}
            >
              <Phone size={16} />
              Numbers
              {inboundNumbers.length > 0 && (
                <span style={{
                  backgroundColor: activeTab === 'numbers' ? '#74317e' : '#e5e7eb',
                  color: activeTab === 'numbers' ? 'white' : '#666',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {inboundNumbers.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('calls')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 24px',
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '14px',
                fontWeight: activeTab === 'calls' ? '600' : '400',
                color: activeTab === 'calls' ? '#74317e' : '#666',
                cursor: 'pointer',
                borderBottom: activeTab === 'calls' ? '2px solid #74317e' : '2px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.2s'
              }}
            >
              <Clock size={16} />
              Call History
              {callHistory.length > 0 && (
                <span style={{
                  backgroundColor: activeTab === 'calls' ? '#74317e' : '#e5e7eb',
                  color: activeTab === 'calls' ? 'white' : '#666',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {callHistory.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('schedules')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 24px',
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '14px',
                fontWeight: activeTab === 'schedules' ? '600' : '400',
                color: activeTab === 'schedules' ? '#74317e' : '#666',
                cursor: 'pointer',
                borderBottom: activeTab === 'schedules' ? '2px solid #74317e' : '2px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.2s'
              }}
            >
              <Calendar size={16} />
              Schedules
              {schedules.length > 0 && (
                <span style={{
                  backgroundColor: activeTab === 'schedules' ? '#74317e' : '#e5e7eb',
                  color: activeTab === 'schedules' ? 'white' : '#666',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {schedules.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('agents')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 24px',
                border: 'none',
                backgroundColor: 'transparent',
                fontSize: '14px',
                fontWeight: activeTab === 'agents' ? '600' : '400',
                color: activeTab === 'agents' ? '#74317e' : '#666',
                cursor: 'pointer',
                borderBottom: activeTab === 'agents' ? '2px solid #74317e' : '2px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.2s'
              }}
            >
              <Users size={16} />
              Agents
              {inboundAgents.length > 0 && (
                <span style={{
                  backgroundColor: activeTab === 'agents' ? '#74317e' : '#e5e7eb',
                  color: activeTab === 'agents' ? 'white' : '#666',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  {inboundAgents.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div style={{ padding: '24px' }}>
            {/* Search Bar and Controls */}
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: '#999'
                  }} 
                />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 40px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
              
              {/* Advanced Filters */}
              {activeTab === 'numbers' && (
                <>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <select
                    value={filters.provider}
                    onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
                    style={{
                      padding: '10px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="all">All Providers</option>
                    <option value="twilio">Twilio</option>
                    <option value="vonage">Vonage</option>
                    <option value="telnyx">Telnyx</option>
                  </select>
                </>
              )}
              
              {activeTab === 'calls' && (
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="answered">Answered</option>
                  <option value="completed">Completed</option>
                  <option value="missed">Missed</option>
                  <option value="forwarded">Forwarded</option>
                </select>
              )}
              
              {/* Export Button */}
              {(activeTab === 'numbers' || activeTab === 'calls' || activeTab === 'agents') && (
                <button
                  onClick={() => {
                    const data = activeTab === 'numbers' ? filteredNumbers : 
                                activeTab === 'calls' ? filteredCalls : 
                                filteredAgents;
                    exportToCSV(data, activeTab);
                  }}
                  style={{
                    padding: '10px 20px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: '500'
                  }}
                  title="Export to CSV"
                >
                  <Download size={16} />
                  Export
                </button>
              )}
              
              <button
                onClick={() => {
                  if (activeTab === 'numbers') fetchInboundNumbers(true);
                  else if (activeTab === 'calls') fetchCallHistory(true);
                  else if (activeTab === 'schedules') fetchSchedules(true);
                  else if (activeTab === 'agents') fetchInboundAgents(true);
                }}
                style={{
                  padding: '10px 20px',
                  background: '#74317e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: '500'
                }}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            {/* Numbers Tab */}
            {activeTab === 'numbers' && (
              <div>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Loading numbers...</p>
                  </div>
                ) : filteredNumbers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>No inbound numbers found</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Phone Number</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Label</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Provider</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Health</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Webhook</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Agent</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Created</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredNumbers.map((number) => (
                          <tr key={number.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '12px', fontWeight: '500' }}>{number.phone_number}</td>
                            <td style={{ padding: '12px' }}>{number.phone_label || '-'}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                padding: '4px 8px',
                                background: '#17a2b8',
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>
                                {number.provider}
                              </span>
                            </td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                padding: '4px 8px',
                                background: number.status === 'active' ? '#28a745' :
                                           number.status === 'inactive' ? '#6c757d' :
                                           number.status === 'error' ? '#dc3545' :
                                           '#ffc107',
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>
                                {number.status}
                              </span>
                            </td>
                            <td style={{ padding: '12px' }}>
                              {number.health_status && (
                                <span style={{
                                  padding: '4px 8px',
                                  background: number.health_status === 'healthy' ? '#28a745' :
                                             number.health_status === 'unhealthy' ? '#dc3545' :
                                             '#ffc107',
                                  color: 'white',
                                  borderRadius: '4px',
                                  fontSize: '12px'
                                }}>
                                  {number.health_status}
                                </span>
                              )}
                              {!number.health_status && <span style={{ color: '#999', fontSize: '12px' }}>Unknown</span>}
                            </td>
                            <td style={{ padding: '12px' }}>
                              {number.webhook_status && (
                                <span style={{
                                  padding: '4px 8px',
                                  background: number.webhook_status === 'active' ? '#28a745' :
                                             number.webhook_status === 'failed' ? '#dc3545' :
                                             '#ffc107',
                                  color: 'white',
                                  borderRadius: '4px',
                                  fontSize: '12px'
                                }}>
                                  {number.webhook_status}
                                </span>
                              )}
                              {!number.webhook_status && <span style={{ color: '#999', fontSize: '12px' }}>Unknown</span>}
                            </td>
                            <td style={{ padding: '12px' }}>{number.voice_agents?.name || '-'}</td>
                            <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                              {new Date(number.created_at).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '12px' }}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleViewNumber(number)}
                                  style={{
                                    padding: '6px 12px',
                                    background: '#17a2b8',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '12px'
                                  }}
                                  title="View Details"
                                >
                                  <Eye size={14} />
                                  View
                                </button>
                                {canEdit && (
                                  <button
                                    onClick={() => handleEditNumber(number)}
                                    style={{
                                      padding: '6px 12px',
                                      background: '#74317e',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '12px'
                                    }}
                                    title="Edit Number"
                                  >
                                    <Edit2 size={14} />
                                    Edit
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteClick(number, 'number')}
                                    style={{
                                      padding: '6px 12px',
                                      background: '#dc3545',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      fontSize: '12px'
                                    }}
                                    title="Delete Number"
                                  >
                                    <Trash2 size={14} />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Call History Tab */}
            {activeTab === 'calls' && (
              <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Loading call history...</p>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>No call history found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Caller</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Called Number</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Duration</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Agent</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCalls.map((call) => (
                    <tr key={call.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>{call.caller_number || '-'}</td>
                      <td style={{ padding: '12px' }}>{call.inbound_numbers?.phone_number || call.called_number || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          background: call.call_status === 'answered' || call.call_status === 'completed' ? '#28a745' :
                                     call.call_status === 'missed' ? '#dc3545' :
                                     call.call_status === 'forwarded' ? '#17a2b8' :
                                     '#ffc107',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {call.call_status || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{call.call_duration ? `${Math.floor(call.call_duration / 60)}m ${Math.floor(call.call_duration % 60)}s` : '-'}</td>
                      <td style={{ padding: '12px' }}>{call.voice_agents?.name || '-'}</td>
                      <td style={{ padding: '12px' }}>{call.call_start_time ? new Date(call.call_start_time).toLocaleString() : '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <button
                          onClick={() => {
                            setSelectedCall(call);
                            setShowCallModal(true);
                          }}
                          style={{
                            padding: '6px 12px',
                            background: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px'
                          }}
                          title="View Details"
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

            {/* Schedules Tab */}
            {activeTab === 'schedules' && (
              <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Loading schedules...</p>
            </div>
          ) : schedules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>No schedules found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Schedule Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Number</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Agent</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Timezone</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((schedule) => (
                    <tr key={schedule.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px' }}>{schedule.schedule_name}</td>
                      <td style={{ padding: '12px' }}>{schedule.inbound_numbers?.phone_number || '-'}</td>
                      <td style={{ padding: '12px' }}>{schedule.voice_agents?.name || '-'}</td>
                      <td style={{ padding: '12px' }}>{schedule.timezone || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          background: schedule.is_active ? '#28a745' : '#6c757d',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {schedule.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{new Date(schedule.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

            {/* Agents Tab */}
            {activeTab === 'agents' && (
              <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>Loading agents...</p>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p>No inbound agents found</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Company</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Type</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Phone</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Voice</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Model</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>User Email</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Created</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAgents.map((agent) => {
                    return (
                      <tr key={agent.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px', fontWeight: '500' }}>{agent.name}</td>
                        <td style={{ padding: '12px' }}>{agent.company_name || '-'}</td>
                        <td style={{ padding: '12px' }}>
                          {agent.agent_type && (
                            <span style={{
                              padding: '4px 8px',
                              background: '#17a2b8',
                              color: 'white',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}>
                              {agent.agent_type}
                            </span>
                          )}
                          {!agent.agent_type && <span style={{ color: '#999', fontSize: '12px' }}>-</span>}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            background: agent.status === 'active' ? '#28a745' :
                                       agent.status === 'inactive' ? '#6c757d' :
                                       agent.status === 'testing' ? '#ffc107' :
                                       agent.status === 'draft' ? '#6c757d' :
                                       '#dc3545',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}>
                            {agent.status || 'inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '12px' }}>{agent.phone_number || '-'}</td>
                        <td style={{ padding: '12px', fontSize: '12px' }}>
                          {agent.voice ? (
                            <span style={{
                              padding: '4px 8px',
                              background: '#e5e7eb',
                              color: '#333',
                              borderRadius: '4px',
                              fontSize: '11px'
                            }}>
                              {agent.voice}
                            </span>
                          ) : '-'}
                        </td>
                        <td style={{ padding: '12px', fontSize: '12px' }}>{agent.model || 'gpt-4o'}</td>
                        <td style={{ padding: '12px', fontSize: '12px' }}>
                          {agent.user_email ? (
                            <span title={agent.user_full_name || agent.user_id || ''}>
                              {agent.user_email}
                            </span>
                          ) : agent.user_full_name ? (
                            <span style={{ color: '#666' }} title={agent.user_id || ''}>
                              {agent.user_full_name}
                            </span>
                          ) : agent.user_id ? (
                            <span style={{ color: '#999', fontSize: '11px' }} title={agent.user_id}>
                              {agent.user_id.substring(0, 8)}...
                            </span>
                          ) : (
                            <span style={{ color: '#999' }}>-</span>
                          )}
                        </td>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#666' }}>
                          {new Date(agent.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleViewAgent(agent)}
                              style={{
                                padding: '6px 12px',
                                background: '#17a2b8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px'
                              }}
                              title="View Details"
                            >
                              <Eye size={14} />
                              View
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => handleEditAgent(agent)}
                                style={{
                                  padding: '6px 12px',
                                  background: '#74317e',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px'
                                }}
                                title="Edit Agent"
                              >
                                <Edit2 size={14} />
                                Edit
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteClick(agent, 'agent')}
                                style={{
                                  padding: '6px 12px',
                                  background: '#dc3545',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px'
                                }}
                                title="Delete Agent"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Number Detail Modal - Similar to OutboundGenie but for inbound numbers */}
      {showNumberModal && selectedNumber && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={closeModals}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '900px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{selectedNumber.phone_number} - Details</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {canEdit && (
                  <button
                    onClick={() => {
                      setShowNumberModal(false);
                      handleEditNumber(selectedNumber);
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#74317e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                )}
                <button
                  onClick={closeModals}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '24px',
                    color: '#666'
                  }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
              <button
                onClick={() => setNumberModalTab('details')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: numberModalTab === 'details' ? '#74317e' : 'transparent',
                  color: numberModalTab === 'details' ? 'white' : '#666',
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  fontWeight: numberModalTab === 'details' ? '600' : '400'
                }}
              >
                Details
              </button>
              <button
                onClick={() => setNumberModalTab('calls')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: numberModalTab === 'calls' ? '#74317e' : 'transparent',
                  color: numberModalTab === 'calls' ? 'white' : '#666',
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  fontWeight: numberModalTab === 'calls' ? '600' : '400',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Phone size={16} />
                Calls ({numberCalls.length})
              </button>
              <button
                onClick={() => setNumberModalTab('analytics')}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  background: numberModalTab === 'analytics' ? '#74317e' : 'transparent',
                  color: numberModalTab === 'analytics' ? 'white' : '#666',
                  cursor: 'pointer',
                  borderRadius: '6px 6px 0 0',
                  fontWeight: numberModalTab === 'analytics' ? '600' : '400',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <BarChart3 size={16} />
                Analytics
              </button>
            </div>

            {/* Details Tab */}
            {numberModalTab === 'details' && (
              <div style={{ display: 'grid', gap: '16px' }}>
                <div><strong>Phone Number:</strong> {selectedNumber.phone_number}</div>
                <div><strong>Country Code:</strong> {selectedNumber.country_code}</div>
                <div><strong>Label:</strong> {selectedNumber.phone_label || '-'}</div>
                <div><strong>Provider:</strong> {selectedNumber.provider}</div>
                <div><strong>Status:</strong> {selectedNumber.status}</div>
                <div><strong>Health Status:</strong> {selectedNumber.health_status || '-'}</div>
                <div><strong>Webhook Status:</strong> {selectedNumber.webhook_status || '-'}</div>
                <div><strong>Assigned Agent:</strong> {selectedNumber.voice_agents?.name || '-'}</div>
                <div><strong>Call Forwarding:</strong> {selectedNumber.call_forwarding_number || '-'}</div>
                <div><strong>SMS Enabled:</strong> {selectedNumber.sms_enabled ? 'Yes' : 'No'}</div>
                <div><strong>Created:</strong> {new Date(selectedNumber.created_at).toLocaleString()}</div>
                {selectedNumber.updated_at && (
                  <div><strong>Updated:</strong> {new Date(selectedNumber.updated_at).toLocaleString()}</div>
                )}
              </div>
            )}

            {/* Calls Tab */}
            {numberModalTab === 'calls' && (
              <div>
                {loadingCalls ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Loading calls...</p>
                  </div>
                ) : numberCalls.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>No calls found for this number</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Caller</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Duration</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {numberCalls.map((call) => (
                          <tr key={call.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '12px' }}>{call.caller_number || '-'}</td>
                            <td style={{ padding: '12px' }}>
                              <span style={{
                                padding: '4px 8px',
                                background: call.call_status === 'answered' || call.call_status === 'completed' ? '#28a745' :
                                          call.call_status === 'missed' ? '#dc3545' :
                                          '#ffc107',
                                color: 'white',
                                borderRadius: '4px',
                                fontSize: '12px'
                              }}>
                                {call.call_status || '-'}
                              </span>
                            </td>
                            <td style={{ padding: '12px' }}>{call.call_duration ? `${Math.floor(call.call_duration / 60)}m ${Math.floor(call.call_duration % 60)}s` : '-'}</td>
                            <td style={{ padding: '12px' }}>{call.call_start_time ? new Date(call.call_start_time).toLocaleString() : '-'}</td>
                            <td style={{ padding: '12px' }}>
                              <button
                                onClick={() => {
                                  setSelectedCall(call);
                                  setShowCallModal(true);
                                }}
                                style={{
                                  padding: '6px 12px',
                                  background: '#17a2b8',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '12px'
                                }}
                                title="View Details"
                              >
                                <Eye size={14} />
                                View
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Analytics Tab */}
            {numberModalTab === 'analytics' && (
              <div>
                {loadingAnalytics ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>Loading analytics...</p>
                  </div>
                ) : !Array.isArray(numberAnalytics) || numberAnalytics.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <p>No analytics data available</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Total Calls</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Answered</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Missed</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Avg Duration</th>
                          <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Total Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.isArray(numberAnalytics) && numberAnalytics.map((item) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '12px' }}>{new Date(item.date).toLocaleDateString()}</td>
                            <td style={{ padding: '12px' }}>{item.total_calls || 0}</td>
                            <td style={{ padding: '12px' }}>{item.answered_calls || 0}</td>
                            <td style={{ padding: '12px' }}>{item.missed_calls || 0}</td>
                            <td style={{ padding: '12px' }}>{item.average_duration_seconds ? `${Math.floor(item.average_duration_seconds)}s` : '-'}</td>
                            <td style={{ padding: '12px' }}>${item.total_cost ? item.total_cost.toFixed(2) : '0.00'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Number Modal */}
      {(showCreateModal || showEditModal) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={closeModals}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '700px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{selectedNumber ? 'Edit' : 'Create'} Inbound Number</h3>
              <button
                onClick={closeModals}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: '#666'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              {/* Phone Number */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Phone Number *</label>
                <input
                  type="text"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="+1234567890"
                />
              </div>

              {/* Country Code */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Country Code</label>
                <input
                  type="text"
                  value={formData.country_code}
                  onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="+1"
                />
              </div>

              {/* Phone Label */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Phone Label</label>
                <input
                  type="text"
                  value={formData.phone_label}
                  onChange={(e) => setFormData({ ...formData, phone_label: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="Main Office Line"
                />
              </div>

              {/* Provider */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Provider *</label>
                <select
                  value={formData.provider}
                  onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="twilio">Twilio - Leading cloud communications platform</option>
                  <option value="vonage">Vonage - Global cloud communications</option>
                  <option value="telnyx">Telnyx - Programmable communications</option>
                  <option value="callhippo">CallHippo - Business phone system</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="active">Active - Number is receiving calls</option>
                  <option value="inactive">Inactive - Number is not receiving calls</option>
                  <option value="pending">Pending - Number is being activated</option>
                  <option value="activating">Activating - Number is being activated</option>
                  <option value="suspended">Suspended - Number is suspended</option>
                  <option value="error">Error - Number has an error</option>
                </select>
              </div>

              {/* Assigned Agent */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Assigned Agent</label>
                <select
                  value={formData.assigned_to_agent_id}
                  onChange={(e) => setFormData({ ...formData, assigned_to_agent_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">None</option>
                  {availableAgents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name} {agent.company_name ? `(${agent.company_name})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Call Forwarding */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Call Forwarding Number</label>
                <input
                  type="text"
                  value={formData.call_forwarding_number}
                  onChange={(e) => setFormData({ ...formData, call_forwarding_number: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="+1234567890"
                />
              </div>

              {/* SMS Enabled */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.sms_enabled}
                    onChange={(e) => setFormData({ ...formData, sms_enabled: e.target.checked })}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: '600' }}>SMS Enabled</span>
                </label>
              </div>

              {/* Provider-specific fields */}
              {formData.provider === 'twilio' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Twilio Account SID</label>
                    <input
                      type="text"
                      value={formData.twilio_account_sid}
                      onChange={(e) => setFormData({ ...formData, twilio_account_sid: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      placeholder="AC..."
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Twilio Auth Token</label>
                    <input
                      type="password"
                      value={formData.twilio_auth_token}
                      onChange={(e) => setFormData({ ...formData, twilio_auth_token: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      placeholder="Enter auth token"
                    />
                  </div>
                </>
              )}

              {formData.provider === 'vonage' && (
                <>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Vonage API Key</label>
                    <input
                      type="text"
                      value={formData.vonage_api_key}
                      onChange={(e) => setFormData({ ...formData, vonage_api_key: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      placeholder="Enter API key"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Vonage API Secret</label>
                    <input
                      type="password"
                      value={formData.vonage_api_secret}
                      onChange={(e) => setFormData({ ...formData, vonage_api_secret: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      placeholder="Enter API secret"
                    />
                  </div>
                </>
              )}

              {formData.provider === 'telnyx' && (
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Telnyx API Key</label>
                  <input
                    type="password"
                    value={formData.telnyx_api_key}
                    onChange={(e) => setFormData({ ...formData, telnyx_api_key: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                    placeholder="Enter API key"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  onClick={closeModals}
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveNumber}
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    background: '#74317e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {saving ? 'Saving...' : selectedNumber ? 'Update' : 'Create'}
                  {saving && <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Call Detail Modal */}
      {showCallModal && selectedCall && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001
        }} onClick={closeCallModal}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Call Details</h3>
              <button
                onClick={closeCallModal}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: '#666'
                }}
              >
                <X size={24} />
              </button>
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div><strong>Caller:</strong> {selectedCall.caller_number || '-'}</div>
              <div><strong>Called Number:</strong> {selectedCall.inbound_numbers?.phone_number || selectedCall.called_number || '-'}</div>
              <div><strong>Status:</strong> {selectedCall.call_status || '-'}</div>
              <div><strong>Duration:</strong> {selectedCall.call_duration ? `${Math.floor(selectedCall.call_duration / 60)}m ${Math.floor(selectedCall.call_duration % 60)}s` : '-'}</div>
              <div><strong>Agent:</strong> {selectedCall.voice_agents?.name || '-'}</div>
              <div><strong>Provider:</strong> {selectedCall.provider || '-'}</div>
              {selectedCall.user_id && (
                <div><strong>User ID:</strong> {selectedCall.user_id}</div>
              )}
              {selectedCall.call_start_time && (
                <div><strong>Start Time:</strong> {new Date(selectedCall.call_start_time).toLocaleString()}</div>
              )}
              {selectedCall.call_answered_time && (
                <div><strong>Answered:</strong> {new Date(selectedCall.call_answered_time).toLocaleString()}</div>
              )}
              {selectedCall.call_end_time && (
                <div><strong>End Time:</strong> {new Date(selectedCall.call_end_time).toLocaleString()}</div>
              )}
              {selectedCall.recording_url && (
                <div>
                  <strong>Recording:</strong>
                  <div style={{ marginTop: '12px' }}>
                    {/* Audio Player Controls */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <button
                        onClick={() => handlePlayRecording(selectedCall.recording_url, selectedCall.id)}
                        style={{
                          padding: '8px 16px',
                          background: playingAudioId === selectedCall.id ? '#dc3545' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '14px',
                          minWidth: '80px',
                          justifyContent: 'center'
                        }}
                      >
                        {playingAudioId === selectedCall.id ? <Pause size={16} /> : <Play size={16} />}
                        {playingAudioId === selectedCall.id ? 'Pause' : 'Play'}
                      </button>
                      <span style={{ fontSize: '12px', color: '#666', minWidth: '80px' }}>
                        {formatTime(audioCurrentTime)} / {formatTime(audioDuration)}
                      </span>
                      <a 
                        href={selectedCall.recording_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          padding: '8px 16px',
                          background: '#17a2b8',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '4px',
                          fontSize: '14px',
                          marginLeft: 'auto'
                        }}
                      >
                        Download
                      </a>
                    </div>
                    
                    {/* Progress Bar */}
                    <div
                      onClick={(e) => {
                        if (audioElement && audioDuration) {
                          handleProgressClick(e, audioElement);
                        } else if (selectedCall.recording_url) {
                          // If audio not loaded yet, load it first
                          handlePlayRecording(selectedCall.recording_url, selectedCall.id);
                          setTimeout(() => {
                            if (audioElement) {
                              handleProgressClick(e, audioElement);
                            }
                          }, 100);
                        }
                      }}
                      style={{
                        width: '100%',
                        height: '8px',
                        background: '#e5e7eb',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        position: 'relative',
                        marginTop: '8px'
                      }}
                    >
                      <div
                        style={{
                          width: `${audioProgress}%`,
                          height: '100%',
                          background: playingAudioId === selectedCall.id ? '#28a745' : '#17a2b8',
                          borderRadius: '4px',
                          transition: playingAudioId === selectedCall.id ? 'width 0.1s linear' : 'none'
                        }}
                      />
                      {audioProgress > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            left: `${audioProgress}%`,
                            top: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '16px',
                            height: '16px',
                            background: playingAudioId === selectedCall.id ? '#28a745' : '#17a2b8',
                            borderRadius: '50%',
                            border: '2px solid white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}
              {selectedCall.transcript && (
                <div>
                  <strong>Transcript:</strong>
                  <div style={{
                    marginTop: '8px',
                    padding: '12px',
                    background: '#f8f9fa',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordWrap: 'break-word',
                    lineHeight: '1.6'
                  }}>
                    {(() => {
                      // Format transcript with each speaker on a new line
                      const transcript = selectedCall.transcript || '';
                      // Split by "AI:" or "User:" and format each line
                      const formatted = transcript
                        .replace(/\b(AI|User):\s*/gi, '\n$1: ') // Add newline before each speaker label
                        .replace(/^\n/, '') // Remove leading newline
                        .trim();
                      return formatted;
                    })()}
                  </div>
                </div>
              )}
              {selectedCall.call_cost && (
                <div><strong>Cost:</strong> ${selectedCall.call_cost.toFixed(2)}</div>
              )}
              {selectedCall.call_quality_score && (
                <div><strong>Quality Score:</strong> {selectedCall.call_quality_score}/10</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && itemToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={closeModals}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '16px' }}>Confirm Delete</h3>
            <p style={{ marginBottom: '24px', color: '#666' }}>
              Are you sure you want to delete this {deleteType}? This action cannot be undone.
            </p>
            {deleteType === 'number' && (
              <p style={{ marginBottom: '24px', fontWeight: '600' }}>
                Number: {itemToDelete.phone_number}
              </p>
            )}
            {deleteType === 'call' && (
              <p style={{ marginBottom: '24px', fontWeight: '600' }}>
                Call ID: {itemToDelete.id}
              </p>
            )}
            {deleteType === 'agent' && (
              <p style={{ marginBottom: '24px', fontWeight: '600' }}>
                Agent: {itemToDelete.name}
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={closeModals}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                style={{
                  padding: '10px 20px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {deleting ? 'Deleting...' : 'Delete'}
                {deleting && <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent View Modal */}
      {showAgentModal && selectedAgent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={closeModals}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{selectedAgent.name} - Details</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {canEdit && (
                  <button
                    onClick={() => {
                      setShowAgentModal(false);
                      handleEditAgent(selectedAgent);
                    }}
                    style={{
                      padding: '8px 16px',
                      background: '#74317e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '14px'
                    }}
                  >
                    <Edit2 size={16} />
                    Edit
                  </button>
                )}
                <button
                  onClick={closeModals}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '24px',
                    color: '#666'
                  }}
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div><strong>Name:</strong> {selectedAgent.name}</div>
              <div><strong>Company:</strong> {selectedAgent.company_name || '-'}</div>
              <div><strong>Status:</strong> {selectedAgent.status}</div>
              <div><strong>Agent Type:</strong> {selectedAgent.agent_type || '-'}</div>
              <div><strong>Model:</strong> {selectedAgent.model || '-'}</div>
              <div><strong>Voice:</strong> {selectedAgent.voice || '-'}</div>
              <div><strong>Tone:</strong> {selectedAgent.tone || '-'}</div>
              <div><strong>Language:</strong> {selectedAgent.language || '-'}</div>
              <div><strong>Phone Number:</strong> {selectedAgent.phone_number || '-'}</div>
              <div><strong>Phone Provider:</strong> {selectedAgent.phone_provider || '-'}</div>
              <div><strong>Execution Mode:</strong> {selectedAgent.execution_mode || '-'}</div>
              {selectedAgent.goal && <div><strong>Goal:</strong> {selectedAgent.goal}</div>}
              {selectedAgent.welcome_message && <div><strong>Welcome Message:</strong> {selectedAgent.welcome_message}</div>}
              <div><strong>Created:</strong> {new Date(selectedAgent.created_at).toLocaleString()}</div>
              {selectedAgent.updated_at && (
                <div><strong>Updated:</strong> {new Date(selectedAgent.updated_at).toLocaleString()}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Agent Create/Edit Modal */}
      {(showAgentCreateModal || showAgentEditModal) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={closeModals}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>{selectedAgent ? 'Edit' : 'Create'} Inbound Agent</h3>
              <button
                onClick={closeModals}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '24px',
                  color: '#666'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
              {/* Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Name *</label>
                <input
                  type="text"
                  value={agentFormData.name}
                  onChange={(e) => setAgentFormData({ ...agentFormData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="Agent Name"
                />
              </div>

              {/* User Assignment */}
              <div className="user-search-container" style={{ position: 'relative' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Assign to Consumer *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={userSearchTerm || selectedUserDisplay}
                    onChange={(e) => {
                      const value = e.target.value;
                      setUserSearchTerm(value);
                      if (!value) {
                        setAgentFormData({ ...agentFormData, user_id: '' });
                        setSelectedUserDisplay('');
                      }
                      setShowUserSuggestions(true);
                    }}
                    onFocus={() => {
                      if (filteredUsers.length > 0 || userSearchTerm.length >= 2) {
                        setShowUserSuggestions(true);
                      }
                    }}
                    placeholder="Type at least 2 letters to search consumers..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      fontSize: '14px'
                    }}
                  />
                  {loadingUsers && (
                    <div style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#999'
                    }}>
                      <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    </div>
                  )}
                </div>
                
                {/* User Suggestions Dropdown */}
                {showUserSuggestions && filteredUsers.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    marginTop: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }}>
                    {filteredUsers.map(user => (
                      <div
                        key={user.user_id || user.id}
                        onClick={() => {
                          setAgentFormData({ ...agentFormData, user_id: user.user_id || user.id });
                          setSelectedUserDisplay(`${user.full_name || user.email || ''} ${user.email ? `(${user.email})` : ''}`.trim());
                          setUserSearchTerm('');
                          setShowUserSuggestions(false);
                        }}
                        style={{
                          padding: '12px',
                          cursor: 'pointer',
                          borderBottom: '1px solid #f0f0f0',
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.background = 'white'}
                      >
                        <div style={{ fontWeight: '500' }}>{user.full_name || 'No Name'}</div>
                        {user.email && (
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>{user.email}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {showUserSuggestions && !loadingUsers && userSearchTerm.length >= 2 && filteredUsers.length === 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    marginTop: '4px',
                    padding: '12px',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    color: '#666',
                    fontSize: '14px'
                  }}>
                    No users found
                  </div>
                )}
              </div>

              {/* Company Name */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Company Name</label>
                <input
                  type="text"
                  value={agentFormData.company_name}
                  onChange={(e) => setAgentFormData({ ...agentFormData, company_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="Company Name"
                />
              </div>

              {/* Agent Type */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Agent Type</label>
                <select
                  value={agentFormData.agent_type}
                  onChange={(e) => setAgentFormData({ ...agentFormData, agent_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="">Select Type</option>
                  <option value="sales">Sales - For sales and lead generation</option>
                  <option value="support">Support - For customer support</option>
                  <option value="booking">Booking - For appointment scheduling</option>
                  <option value="general">General - General purpose agent</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Status</label>
                <select
                  value={agentFormData.status}
                  onChange={(e) => setAgentFormData({ ...agentFormData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="active">Active - Agent is operational</option>
                  <option value="inactive">Inactive - Agent is disabled</option>
                  <option value="testing">Testing - Agent is in testing mode</option>
                  <option value="draft">Draft - Agent is being configured</option>
                  <option value="archived">Archived - Agent is archived</option>
                </select>
              </div>

              {/* Model */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>AI Model</label>
                <select
                  value={agentFormData.model}
                  onChange={(e) => setAgentFormData({ ...agentFormData, model: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="gpt-4o">GPT-4o - Latest and most capable</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo - Fast and efficient</option>
                  <option value="gpt-4">GPT-4 - High quality responses</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo - Cost-effective</option>
                </select>
              </div>

              {/* Voice */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Voice</label>
                <input
                  type="text"
                  value={agentFormData.voice}
                  onChange={(e) => setAgentFormData({ ...agentFormData, voice: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                  placeholder="aura-helena-en"
                />
              </div>

              {/* Tone */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Tone</label>
                <select
                  value={agentFormData.tone}
                  onChange={(e) => setAgentFormData({ ...agentFormData, tone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="professional">Professional - Formal and business-like</option>
                  <option value="friendly">Friendly - Warm and approachable</option>
                  <option value="casual">Casual - Relaxed and informal</option>
                  <option value="empathetic">Empathetic - Understanding and caring</option>
                </select>
              </div>

              {/* Language */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Language</label>
                <select
                  value={agentFormData.language}
                  onChange={(e) => setAgentFormData({ ...agentFormData, language: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="es-ES">Spanish</option>
                  <option value="fr-FR">French</option>
                  <option value="de-DE">German</option>
                  <option value="it-IT">Italian</option>
                </select>
              </div>

              {/* Goal */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Goal</label>
                <textarea
                  value={agentFormData.goal}
                  onChange={(e) => setAgentFormData({ ...agentFormData, goal: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    minHeight: '80px'
                  }}
                  placeholder="Agent's primary goal or objective"
                />
              </div>

              {/* Welcome Message */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Welcome Message</label>
                <textarea
                  value={agentFormData.welcome_message}
                  onChange={(e) => setAgentFormData({ ...agentFormData, welcome_message: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '14px',
                    minHeight: '80px'
                  }}
                  placeholder="Initial message when call starts"
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button
                  onClick={closeModals}
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAgent}
                  disabled={saving}
                  style={{
                    padding: '10px 20px',
                    background: '#74317e',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {saving ? 'Saving...' : selectedAgent ? 'Update' : 'Create'}
                  {saving && <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InboundGenie;
