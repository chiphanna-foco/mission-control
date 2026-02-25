export function isTaskCandidate(text: string): boolean {
  const normalized = (text || '').toLowerCase();
  const triggers = ['blocked', 'failed', 'error', 'need fix', 'wordpress draft issue'];
  return triggers.some((t) => normalized.includes(t));
}

export function buildTaskTitleFromText(text: string): string {
  const cleaned = (text || '')
    .replace(/\s+/g, ' ')
    .replace(/[\r\n]+/g, ' ')
    .trim();

  if (!cleaned) return 'Follow up from conversation';
  const short = cleaned.length > 80 ? `${cleaned.slice(0, 77)}...` : cleaned;
  return `Conversation follow-up: ${short}`;
}
