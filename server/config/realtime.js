import { EventEmitter } from 'events';

class RealtimeBus extends EventEmitter {}

export const realtimeBus = new RealtimeBus();

// Max listeners to avoid Node warnings with many SSE clients
realtimeBus.setMaxListeners(100);

/**
 * Broadcast an event to all connected realtime clients (SSE)
 * @param {string} table - Table name e.g. 'complaints', 'messages', 'assignments', 'marks', 'groups'
 * @param {'INSERT' | 'UPDATE' | 'DELETE'} eventType - Type of mutation
 * @param {object} record - The mutated record or details
 */
export const broadcastEvent = (table, eventType, record) => {
  const payload = {
    table,
    eventType,
    record,
    timestamp: new Date().toISOString()
  };

  try {
    realtimeBus.emit('change', payload);
  } catch (err) {
    console.error('Error emitting realtime change event:', err);
  }
};
