// hooks/useRealtimeChannel.ts
// Reusable Supabase Realtime subscription hook with automatic cleanup.

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/services/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeChannelOptions {
  /** Unique channel name — include the userId to scope it per-user */
  channelName: string;
  /** Supabase table to subscribe to */
  table: string;
  /** Optional row-level filter, e.g. "vendor_id=eq.abc123" */
  filter?: string;
  /** Schema — defaults to 'public' */
  schema?: string;
  /** Postgres event types to listen for */
  events?: ('INSERT' | 'UPDATE' | 'DELETE' | '*')[];
  /** Callback fired on any matching event */
  onEvent: (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE';
    new: Record<string, any>;
    old: Record<string, any>;
  }) => void;
  /** Set to false to disable the subscription (e.g. while user is unauthenticated) */
  enabled?: boolean;
}

interface UseRealtimeChannelReturn {
  isConnected: boolean;
  reconnect: () => void;
}

export function useRealtimeChannel({
  channelName,
  table,
  filter,
  schema = 'public',
  events = ['*'],
  onEvent,
  enabled = true,
}: UseRealtimeChannelOptions): UseRealtimeChannelReturn {
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onEventRef = useRef(onEvent);

  // Keep the callback ref fresh without re-subscribing
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const subscribe = () => {
    if (!enabled) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase.channel(channelName);

    for (const event of events) {
      channel.on(
        'postgres_changes' as any,
        {
          event,
          schema,
          table,
          ...(filter ? { filter } : {}),
        },
        (payload: any) => {
          onEventRef.current({
            eventType: payload.eventType,
            new: payload.new ?? {},
            old: payload.old ?? {},
          });
        }
      );
    }

    channel.subscribe((status) => {
      setIsConnected(status === 'SUBSCRIBED');
    });

    channelRef.current = channel;
  };

  useEffect(() => {
    subscribe();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName, table, filter, schema, enabled]);

  return { isConnected, reconnect: subscribe };
}
