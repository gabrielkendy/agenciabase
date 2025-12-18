import { supabase } from '../../config/database.js';
import { logger } from '../../utils/logger.js';

interface RealtimeEvent {
  channel: string;
  event: string;
  payload: any;
}

type EventCallback = (payload: any) => void;

// Store active subscriptions
const subscriptions: Map<string, any> = new Map();

export const realtimeService = {
  /**
   * Broadcast an event to a channel
   */
  async broadcast(
    channel: string,
    event: string,
    payload: any
  ): Promise<boolean> {
    try {
      const channelInstance = supabase.channel(channel);

      await channelInstance.send({
        type: 'broadcast',
        event,
        payload,
      });

      logger.debug('Broadcast sent', { channel, event });
      return true;
    } catch (error) {
      logger.error('Broadcast failed:', error);
      return false;
    }
  },

  /**
   * Subscribe to a channel
   */
  subscribe(
    channel: string,
    event: string,
    callback: EventCallback
  ): () => void {
    const channelInstance = supabase
      .channel(channel)
      .on('broadcast', { event }, ({ payload }) => {
        callback(payload);
      })
      .subscribe();

    subscriptions.set(`${channel}:${event}`, channelInstance);

    logger.debug('Subscribed to channel', { channel, event });

    // Return unsubscribe function
    return () => {
      this.unsubscribe(channel, event);
    };
  },

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string, event?: string): Promise<void> {
    const key = event ? `${channel}:${event}` : channel;

    for (const [subKey, instance] of subscriptions.entries()) {
      if (subKey.startsWith(key)) {
        await supabase.removeChannel(instance);
        subscriptions.delete(subKey);
        logger.debug('Unsubscribed from channel', { key: subKey });
      }
    }
  },

  /**
   * Subscribe to database changes
   */
  subscribeToTable(
    table: string,
    events: Array<'INSERT' | 'UPDATE' | 'DELETE'>,
    callback: EventCallback,
    filter?: string
  ): () => void {
    const channel = supabase.channel(`table:${table}`);

    for (const event of events) {
      const config: any = {
        event,
        schema: 'public',
        table,
      };

      if (filter) {
        config.filter = filter;
      }

      channel.on('postgres_changes', config, callback);
    }

    channel.subscribe();
    subscriptions.set(`table:${table}`, channel);

    logger.debug('Subscribed to table changes', { table, events });

    return () => {
      this.unsubscribe(`table:${table}`);
    };
  },

  /**
   * Notify organization members of an event
   */
  async notifyOrganization(
    organizationId: string,
    event: string,
    payload: any
  ): Promise<boolean> {
    return this.broadcast(`org:${organizationId}`, event, payload);
  },

  /**
   * Notify a specific user
   */
  async notifyUser(
    userId: string,
    event: string,
    payload: any
  ): Promise<boolean> {
    return this.broadcast(`user:${userId}`, event, payload);
  },

  /**
   * Notify about job status change
   */
  async notifyJobUpdate(
    organizationId: string,
    jobId: string,
    status: string,
    result?: any
  ): Promise<boolean> {
    return this.notifyOrganization(organizationId, 'job:update', {
      jobId,
      status,
      result,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Notify about credit balance change
   */
  async notifyCreditsUpdate(
    organizationId: string,
    balance: number,
    change: number,
    reason: string
  ): Promise<boolean> {
    return this.notifyOrganization(organizationId, 'credits:update', {
      balance,
      change,
      reason,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Notify about new generation
   */
  async notifyNewGeneration(
    organizationId: string,
    userId: string,
    generation: {
      id: string;
      type: string;
      outputUrl: string;
      thumbnail?: string;
    }
  ): Promise<boolean> {
    return this.notifyOrganization(organizationId, 'generation:new', {
      ...generation,
      userId,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Get presence in a channel
   */
  async getPresence(channel: string): Promise<Array<{ id: string; online_at: string }>> {
    const channelInstance = supabase.channel(channel);

    return new Promise((resolve) => {
      channelInstance
        .on('presence', { event: 'sync' }, () => {
          const state = channelInstance.presenceState();
          const users = Object.values(state).flat() as unknown as Array<{ id: string; online_at: string }>;
          resolve(users);
        })
        .subscribe();

      // Timeout after 5 seconds
      setTimeout(() => resolve([]), 5000);
    });
  },

  /**
   * Track user presence
   */
  async trackPresence(
    channel: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<() => Promise<void>> {
    const channelInstance = supabase.channel(channel, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    await channelInstance.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channelInstance.track({
          id: userId,
          online_at: new Date().toISOString(),
          ...metadata,
        });
      }
    });

    subscriptions.set(`presence:${channel}:${userId}`, channelInstance);

    // Return untrack function
    return async () => {
      await channelInstance.untrack();
      await supabase.removeChannel(channelInstance);
      subscriptions.delete(`presence:${channel}:${userId}`);
    };
  },

  /**
   * Cleanup all subscriptions
   */
  async cleanup(): Promise<void> {
    for (const [key, instance] of subscriptions.entries()) {
      await supabase.removeChannel(instance);
      logger.debug('Cleaned up subscription', { key });
    }
    subscriptions.clear();
  },
};

export default realtimeService;
