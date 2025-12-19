import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase/Production/client';
import { useAuth } from './useAuth';

/**
 * Custom hook for Genie real-time updates using Supabase Realtime
 * Subscribes to call_logs, genie_scheduled_calls, and genie_leads tables
 * 
 * @returns {Object} {
 *   isConnected,
 *   connectionError,
 *   lastCallEvent,
 *   lastCampaignEvent,
 *   lastLeadEvent,
 * }
 */
export const useGenieWebSocket = () => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  
  // Event state
  const [lastCallEvent, setLastCallEvent] = useState(null);
  const [lastCampaignEvent, setLastCampaignEvent] = useState(null);
  const [lastLeadEvent, setLastLeadEvent] = useState(null);

  // Callback refs for custom handlers
  const callStartedHandlerRef = useRef(null);
  const callEndedHandlerRef = useRef(null);
  const callStatusHandlerRef = useRef(null);
  const callLeadUpdatedHandlerRef = useRef(null);
  const campaignUpdatedHandlerRef = useRef(null);
  const campaignProgressHandlerRef = useRef(null);
  const leadUpdatedHandlerRef = useRef(null);

  // Channel refs
  const channelsRef = useRef([]);

  // Initialize Supabase Realtime subscriptions
  useEffect(() => {
    if (!user?.id) {
      return;
    }

    console.log('🔌 Initializing Genie Supabase Realtime subscriptions');

    // Subscribe to call_logs changes for this user
    const callLogsChannel = supabase
      .channel('genie-call-logs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_logs',
          filter: `owner_user_id=eq.${user.id}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          const record = newRecord || oldRecord;

          console.log(`📞 Call log ${eventType}:`, record?.id);

          if (eventType === 'INSERT') {
            const eventData = { type: 'started', data: record, timestamp: Date.now() };
            setLastCallEvent(eventData);
            if (callStartedHandlerRef.current) {
              callStartedHandlerRef.current(eventData);
            }
          } else if (eventType === 'UPDATE') {
            // Check if call status changed to completed/failed
            if (newRecord?.call_status === 'completed' || newRecord?.call_status === 'failed') {
              const eventData = { type: 'ended', data: newRecord, timestamp: Date.now() };
              setLastCallEvent(eventData);
              if (callEndedHandlerRef.current) {
                callEndedHandlerRef.current(eventData);
              }
            } else {
              const eventData = { type: 'status', data: newRecord, timestamp: Date.now() };
              setLastCallEvent(eventData);
              if (callStatusHandlerRef.current) {
                callStatusHandlerRef.current(eventData);
              }
            }

            // Check if lead status changed
            if (oldRecord?.is_lead !== newRecord?.is_lead) {
              const eventData = { type: 'lead_updated', data: newRecord, timestamp: Date.now() };
              setLastCallEvent(eventData);
              if (callLeadUpdatedHandlerRef.current) {
                callLeadUpdatedHandlerRef.current(eventData);
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('📞 Call logs channel status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          setIsConnected(false);
          setConnectionError('Connection error. Attempting to reconnect...');
        }
      });

    // Subscribe to genie_scheduled_calls changes for this user
    const campaignsChannel = supabase
      .channel('genie-campaigns')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'genie_scheduled_calls',
          filter: `owner_user_id=eq.${user.id}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          const record = newRecord || oldRecord;

          console.log(`📅 Campaign ${eventType}:`, record?.id);

          const eventData = {
            type: eventType === 'UPDATE' ? 'progress' : 'updated',
            eventType,
            data: {
              ...record,
              progress_percent: record?.contacts_count > 0
                ? Math.round((record?.calls_completed / record?.contacts_count) * 100)
                : 0,
            },
            timestamp: Date.now(),
          };

          setLastCampaignEvent(eventData);
          
          if (eventType === 'UPDATE' && campaignProgressHandlerRef.current) {
            campaignProgressHandlerRef.current(eventData);
          } else if (campaignUpdatedHandlerRef.current) {
            campaignUpdatedHandlerRef.current(eventData);
          }
        }
      )
      .subscribe((status) => {
        console.log('📅 Campaigns channel status:', status);
        // Update connection status based on campaigns channel too
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          setIsConnected(false);
          setConnectionError('Connection error. Attempting to reconnect...');
        }
      });

    // Subscribe to genie_leads changes for this user
    const leadsChannel = supabase
      .channel('genie-leads')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'genie_leads',
          filter: `owner_user_id=eq.${user.id}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;
          const record = newRecord || oldRecord;

          console.log(`🎯 Lead ${eventType}:`, record?.id);

          const eventData = {
            type: 'updated',
            eventType,
            data: record,
            timestamp: Date.now(),
          };

          setLastLeadEvent(eventData);
          if (leadUpdatedHandlerRef.current) {
            leadUpdatedHandlerRef.current(eventData);
          }
        }
      )
      .subscribe((status) => {
        console.log('🎯 Leads channel status:', status);
        // Update connection status based on leads channel too
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          setConnectionError(null);
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED' || status === 'TIMED_OUT') {
          setIsConnected(false);
          setConnectionError('Connection error. Attempting to reconnect...');
        }
      });

    // Store channel refs for cleanup
    channelsRef.current = [callLogsChannel, campaignsChannel, leadsChannel];

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up Genie Supabase Realtime subscriptions');
      channelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = [];
      setIsConnected(false);
    };
  }, [user?.id]);

  // Placeholder functions for API compatibility (not needed with Supabase)
  const joinCampaign = useCallback((campaignId) => {
    console.log('📅 Campaign tracking (Supabase handles this automatically):', campaignId);
  }, []);

  const leaveCampaign = useCallback((campaignId) => {
    console.log('📅 Campaign untracking (Supabase handles this automatically):', campaignId);
  }, []);

  // Register custom event handlers
  const onCallStarted = useCallback((handler) => {
    callStartedHandlerRef.current = handler;
  }, []);

  const onCallEnded = useCallback((handler) => {
    callEndedHandlerRef.current = handler;
  }, []);

  const onCallStatusChange = useCallback((handler) => {
    callStatusHandlerRef.current = handler;
  }, []);

  const onCallLeadUpdated = useCallback((handler) => {
    callLeadUpdatedHandlerRef.current = handler;
  }, []);

  const onCampaignUpdated = useCallback((handler) => {
    campaignUpdatedHandlerRef.current = handler;
  }, []);

  const onCampaignProgress = useCallback((handler) => {
    campaignProgressHandlerRef.current = handler;
  }, []);

  const onLeadUpdated = useCallback((handler) => {
    leadUpdatedHandlerRef.current = handler;
  }, []);

  return {
    isConnected,
    connectionError,
    lastCallEvent,
    lastCampaignEvent,
    lastLeadEvent,
    joinCampaign,
    leaveCampaign,
    onCallStarted,
    onCallEnded,
    onCallStatusChange,
    onCallLeadUpdated,
    onCampaignUpdated,
    onCampaignProgress,
    onLeadUpdated,
  };
};

export default useGenieWebSocket;
