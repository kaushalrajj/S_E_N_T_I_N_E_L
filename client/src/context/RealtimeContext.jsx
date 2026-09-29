import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabaseClient, isSupabaseClientConfigured } from '../config/supabase.js';
import { API_BASE_URL } from '../api/apiClient';

const RealtimeContext = createContext(null);

export const useRealtime = () => {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
};

export const RealtimeProvider = ({ children }) => {
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected'
  const [lastEvent, setLastEvent] = useState(null);
  const [liveStats, setLiveStats] = useState(null);
  const [eventLog, setEventLog] = useState([]); // Recent activity for landing page

  const sseRef = useRef(null);
  const channelRef = useRef(null);
  const statsIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isReconnectingRef = useRef(false); // Guard against stacked reconnect timers

  // Fetch live stats from the public stats endpoint
  const fetchLiveStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/realtime/stats`);
      if (res.ok) {
        const data = await res.json();
        setLiveStats(data);
      }
    } catch (_) { /* silent */ }
  }, []);

  // Handle a realtime change event (from either SSE or Supabase)
  const handleChange = useCallback((payload) => {
    setLastEvent(payload);
    setEventLog(prev => [
      { ...payload, id: Date.now() },
      ...prev.slice(0, 19) // Keep last 20 events
    ]);
    // Refresh stats after any mutation
    fetchLiveStats();
  }, [fetchLiveStats]);

  // ------- SSE-based realtime (works in all modes) -------
  const connectSSE = useCallback(() => {
    // Close existing connection before opening a new one
    if (sseRef.current) {
      sseRef.current.close();
      sseRef.current = null;
    }
    isReconnectingRef.current = false;

    const sse = new EventSource(`${API_BASE_URL}/realtime/stream`);
    sseRef.current = sse;

    sse.onopen = () => {
      setConnectionStatus('connected');
      isReconnectingRef.current = false;
    };

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'CONNECTED') {
          setConnectionStatus('connected');
          return;
        }
        handleChange(payload);
      } catch (_) { /* ignore parse errors */ }
    };

    sse.onerror = () => {
      setConnectionStatus('disconnected');
      sse.close();
      sseRef.current = null;

      // Guard: prevent stacking multiple reconnect timeouts
      if (!isReconnectingRef.current) {
        isReconnectingRef.current = true;
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, 4000);
      }
    };
  }, [handleChange]); // handleChange is stable (memoized with stable fetchLiveStats)

  // ------- Supabase Realtime subscriptions (when credentials present) -------
  const connectSupabase = useCallback(() => {
    if (!supabaseClient) return;

    const tables = ['complaints', 'messages', 'assignments', 'marks', 'groups', 'group_members'];
    const channel = supabaseClient.channel('campus-sphere-realtime');

    tables.forEach(table => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          handleChange({
            table,
            eventType: payload.eventType,
            record: payload.new || payload.old,
            timestamp: new Date().toISOString()
          });
        }
      );
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionStatus('connected');
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setConnectionStatus('disconnected');
      }
    });

    channelRef.current = channel;
  }, [handleChange]);

  useEffect(() => {
    // Connect SSE on mount
    connectSSE();

    // Additionally subscribe to Supabase realtime if configured
    if (isSupabaseClientConfigured) {
      connectSupabase();
    }

    // Fetch initial stats
    fetchLiveStats();

    // Poll stats every 30s as a backup
    statsIntervalRef.current = setInterval(fetchLiveStats, 30000);

    return () => {
      // Explicit null-out prevents onerror from triggering a reconnect after unmount
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      clearInterval(statsIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      isReconnectingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RealtimeContext.Provider value={{
      connectionStatus,
      lastEvent,
      liveStats,
      eventLog,
      isSupabaseConfigured: isSupabaseClientConfigured,
      refreshStats: fetchLiveStats
    }}>
      {children}
    </RealtimeContext.Provider>
  );
};
