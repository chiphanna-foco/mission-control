import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface ApprovalItem {
  id: string;
  type: 'email' | 'social' | 'blog' | 'content';
  title: string;
  preview: string; // max 300 chars
  content: string; // full markdown/html
  source_agent: string;
  created_at: string; // ISO timestamp
  metadata: Record<string, unknown>;
  approved_at: string | null;
  approved_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  executed_at: string | null;
}

export interface ApprovalItemRequest {
  type: 'email' | 'social' | 'blog' | 'content';
  title: string;
  preview: string;
  content: string;
  source_agent: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  item_id: string;
  action: 'created' | 'approved' | 'rejected';
  actor: string;
  reason?: string;
  timestamp: string;
}

// Constants
const QUEUE_ROOT = '/data/approval-queue';
const PENDING_DIR = path.join(QUEUE_ROOT, 'pending');
const APPROVED_DIR = path.join(QUEUE_ROOT, 'approved');
const REJECTED_DIR = path.join(QUEUE_ROOT, 'rejected');
const AUDIT_LOG_FILE = path.join(QUEUE_ROOT, 'audit.log');

// Initialize directories
export function initializeQueue(): void {
  [QUEUE_ROOT, PENDING_DIR, APPROVED_DIR, REJECTED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Initialize audit log if doesn't exist
  if (!fs.existsSync(AUDIT_LOG_FILE)) {
    fs.writeFileSync(AUDIT_LOG_FILE, '');
  }
}

// Create a new approval item
export function createApprovalItem(request: ApprovalItemRequest): ApprovalItem {
  const item: ApprovalItem = {
    id: uuidv4(),
    type: request.type,
    title: request.title,
    preview: request.preview.substring(0, 300), // Enforce max length
    content: request.content,
    source_agent: request.source_agent,
    created_at: new Date().toISOString(),
    metadata: request.metadata || {},
    approved_at: null,
    approved_by: null,
    rejected_at: null,
    rejection_reason: null,
    executed_at: null,
  };

  saveItem(item, 'pending');
  logAuditEntry({
    id: uuidv4(),
    item_id: item.id,
    action: 'created',
    actor: request.source_agent,
    timestamp: new Date().toISOString(),
  });

  return item;
}

// Get all pending items with pagination
export function getPendingItems(page: number = 1, limit: number = 10): { items: ApprovalItem[]; total: number; page: number; pages: number } {
  initializeQueue();
  
  const files = fs.readdirSync(PENDING_DIR).filter(f => f.endsWith('.json'));
  const total = files.length;
  const pages = Math.ceil(total / limit);
  
  const items = files
    .sort() // Ensure consistent order
    .slice((page - 1) * limit, page * limit)
    .map(file => {
      const content = fs.readFileSync(path.join(PENDING_DIR, file), 'utf-8');
      return JSON.parse(content) as ApprovalItem;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return { items, total, page, pages };
}

// Get a single approval item by ID
export function getApprovalItem(id: string): ApprovalItem | null {
  initializeQueue();
  
  // Check all directories
  for (const dir of [PENDING_DIR, APPROVED_DIR, REJECTED_DIR]) {
    const filePath = path.join(dir, `${id}.json`);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as ApprovalItem;
    }
  }
  
  return null;
}

// Approve an item
export function approveItem(id: string, approvedBy: string): ApprovalItem {
  initializeQueue();
  
  const item = getApprovalItem(id);
  if (!item) {
    throw new Error(`Approval item not found: ${id}`);
  }

  if (item.approved_at !== null || item.rejected_at !== null) {
    throw new Error(`Item already processed: ${id}`);
  }

  item.approved_at = new Date().toISOString();
  item.approved_by = approvedBy;

  // Move from pending to approved
  fs.unlinkSync(path.join(PENDING_DIR, `${id}.json`));
  saveItem(item, 'approved');

  logAuditEntry({
    id: uuidv4(),
    item_id: id,
    action: 'approved',
    actor: approvedBy,
    timestamp: new Date().toISOString(),
  });

  return item;
}

// Reject an item
export function rejectItem(id: string, rejectedBy: string, reason: string = ''): ApprovalItem {
  initializeQueue();
  
  const item = getApprovalItem(id);
  if (!item) {
    throw new Error(`Approval item not found: ${id}`);
  }

  if (item.approved_at !== null || item.rejected_at !== null) {
    throw new Error(`Item already processed: ${id}`);
  }

  item.rejected_at = new Date().toISOString();
  item.rejection_reason = reason || null;

  // Move from pending to rejected
  fs.unlinkSync(path.join(PENDING_DIR, `${id}.json`));
  saveItem(item, 'rejected');

  logAuditEntry({
    id: uuidv4(),
    item_id: id,
    action: 'rejected',
    actor: rejectedBy,
    reason,
    timestamp: new Date().toISOString(),
  });

  return item;
}

// Get audit log entries
export function getAuditLog(itemId?: string): AuditLog[] {
  initializeQueue();
  
  const content = fs.readFileSync(AUDIT_LOG_FILE, 'utf-8');
  if (!content.trim()) return [];

  const logs = content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line) as AuditLog);

  if (itemId) {
    return logs.filter(log => log.item_id === itemId);
  }

  return logs;
}

// Helper: Save item to disk
function saveItem(item: ApprovalItem, status: 'pending' | 'approved' | 'rejected'): void {
  const dir = status === 'pending' ? PENDING_DIR : status === 'approved' ? APPROVED_DIR : REJECTED_DIR;
  const filePath = path.join(dir, `${item.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(item, null, 2));
}

// Helper: Log audit entry
function logAuditEntry(log: AuditLog): void {
  fs.appendFileSync(AUDIT_LOG_FILE, JSON.stringify(log) + '\n');
}

// Get pending count for dashboard
export function getPendingCount(): number {
  initializeQueue();
  return fs.readdirSync(PENDING_DIR).filter(f => f.endsWith('.json')).length;
}

// Get all items across all statuses
export function getAllItems(): ApprovalItem[] {
  initializeQueue();
  const items: ApprovalItem[] = [];

  [PENDING_DIR, APPROVED_DIR, REJECTED_DIR].forEach(dir => {
    fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .forEach(file => {
        const content = fs.readFileSync(path.join(dir, file), 'utf-8');
        items.push(JSON.parse(content) as ApprovalItem);
      });
  });

  return items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
