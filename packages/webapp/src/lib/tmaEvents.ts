/**
 * TMA event emitter -- inserts rows into tma_events table
 * for bot-side confirmation messages.
 *
 * Fire-and-forget: errors are logged but never block the mutation.
 */
import { getInsforge } from '@/lib/insforge';

interface TmaEventPayload {
  [key: string]: unknown;
}

export async function emitTmaEvent(
  telegramId: number,
  eventType: string,
  leadId: number | null,
  payload: TmaEventPayload = {},
): Promise<void> {
  try {
    await getInsforge().database.from('tma_events').insert({
      telegram_id: telegramId,
      event_type: eventType,
      lead_id: leadId,
      payload,
      status: 'pending',
    });
  } catch (err) {
    console.warn('Failed to emit TMA event:', err);
  }
}
