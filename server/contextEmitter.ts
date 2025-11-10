import fs from 'fs';
import path from 'path';

type ContextEvent = {
  event_type: string;
  subject_id?: string;
  related_ids?: string[];
  timestamp: string;
  source: string;
  payload?: any;
};

/**
 * Emit a context event.
 * - If CHITTYCONNECT_BASE_URL and CHITTYCHRONICLE_SERVICE_TOKEN are set, attempts an HTTP POST to
 *   {CHITTYCONNECT_BASE_URL}/v1/contexts/events (best-effort, non-fatal).
 * - Always appends JSONL to reports/context-events.jsonl for local observability.
 */
export async function emitContextEvent(eventType: string, payload: any = {}): Promise<void> {
  const evt: ContextEvent = {
    event_type: eventType,
    timestamp: new Date().toISOString(),
    source: 'chittychronicle',
    ...payload,
  };

  try {
    // Local append for observability
    const reportsDir = path.resolve(process.cwd(), 'reports');
    const filePath = path.join(reportsDir, 'context-events.jsonl');
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.appendFileSync(filePath, JSON.stringify(evt) + '\n');
  } catch {
    // ignore local write errors
  }

  const base = process.env.CHITTYCONNECT_BASE_URL;
  const token = process.env.CHITTYCHRONICLE_SERVICE_TOKEN;
  if (!base || !token) return; // silently skip network if not configured

  try {
    const url = new URL('/v1/contexts/events', base).toString();
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(evt),
    }).catch(() => {});
  } catch {
    // ignore network errors; local log already captured
  }
}

