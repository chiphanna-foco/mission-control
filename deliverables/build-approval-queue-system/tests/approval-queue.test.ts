import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import {
  initializeQueue,
  createApprovalItem,
  getPendingItems,
  getApprovalItem,
  approveItem,
  rejectItem,
  getAuditLog,
  getPendingCount,
  getAllItems,
} from '../lib/approval-queue';

// Test setup
const TEST_QUEUE_ROOT = '/tmp/test-approval-queue';
const originalEnv = process.env;

describe('Approval Queue System', () => {
  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_QUEUE_ROOT)) {
      fs.rmSync(TEST_QUEUE_ROOT, { recursive: true });
    }
    fs.mkdirSync(TEST_QUEUE_ROOT, { recursive: true });
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(TEST_QUEUE_ROOT)) {
      fs.rmSync(TEST_QUEUE_ROOT, { recursive: true });
    }
  });

  describe('Queue Initialization', () => {
    it('should create queue directories on first use', () => {
      initializeQueue();
      
      expect(fs.existsSync(path.join(TEST_QUEUE_ROOT, 'pending'))).toBe(true);
      expect(fs.existsSync(path.join(TEST_QUEUE_ROOT, 'approved'))).toBe(true);
      expect(fs.existsSync(path.join(TEST_QUEUE_ROOT, 'rejected'))).toBe(true);
    });

    it('should create audit log file', () => {
      initializeQueue();
      
      expect(fs.existsSync(path.join(TEST_QUEUE_ROOT, 'audit.log'))).toBe(true);
    });
  });

  describe('Create Approval Item', () => {
    beforeEach(() => {
      initializeQueue();
    });

    it('should create an approval item with required fields', () => {
      const request = {
        type: 'email' as const,
        title: 'Test Email',
        preview: 'Test preview',
        content: '<p>Test content</p>',
        source_agent: 'test-agent',
      };

      const item = createApprovalItem(request);

      expect(item.id).toBeDefined();
      expect(item.type).toBe('email');
      expect(item.title).toBe('Test Email');
      expect(item.source_agent).toBe('test-agent');
      expect(item.created_at).toBeDefined();
      expect(item.approved_at).toBeNull();
      expect(item.rejected_at).toBeNull();
    });

    it('should truncate preview to 300 characters', () => {
      const longPreview = 'a'.repeat(500);
      const request = {
        type: 'email' as const,
        title: 'Test',
        preview: longPreview,
        content: 'content',
        source_agent: 'test-agent',
      };

      const item = createApprovalItem(request);

      expect(item.preview.length).toBe(300);
    });

    it('should save item to pending directory', () => {
      const request = {
        type: 'social' as const,
        title: 'Test Post',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      };

      const item = createApprovalItem(request);
      const filePath = path.join(TEST_QUEUE_ROOT, 'pending', `${item.id}.json`);

      expect(fs.existsSync(filePath)).toBe(true);
      const saved = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      expect(saved.id).toBe(item.id);
    });

    it('should log audit entry for creation', () => {
      const request = {
        type: 'blog' as const,
        title: 'Test Blog',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'blog-agent',
      };

      const item = createApprovalItem(request);
      const logs = getAuditLog(item.id);

      expect(logs.length).toBe(1);
      expect(logs[0].action).toBe('created');
      expect(logs[0].actor).toBe('blog-agent');
    });
  });

  describe('Get Pending Items', () => {
    beforeEach(() => {
      initializeQueue();
    });

    it('should return empty list when no items', () => {
      const result = getPendingItems();

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.page).toBe(1);
      expect(result.pages).toBe(0);
    });

    it('should return paginated results', () => {
      for (let i = 0; i < 25; i++) {
        createApprovalItem({
          type: 'email',
          title: `Item ${i}`,
          preview: 'Preview',
          content: 'Content',
          source_agent: 'agent',
        });
      }

      const page1 = getPendingItems(1, 10);
      expect(page1.items.length).toBe(10);
      expect(page1.total).toBe(25);
      expect(page1.pages).toBe(3);

      const page2 = getPendingItems(2, 10);
      expect(page2.items.length).toBe(10);
    });

    it('should sort items by created_at descending', () => {
      const item1 = createApprovalItem({
        type: 'email',
        title: 'Item 1',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));

      const item2 = createApprovalItem({
        type: 'email',
        title: 'Item 2',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      const result = getPendingItems();
      expect(result.items[0].id).toBe(item2.id);
      expect(result.items[1].id).toBe(item1.id);
    });
  });

  describe('Get Approval Item', () => {
    beforeEach(() => {
      initializeQueue();
    });

    it('should find pending item by ID', () => {
      const created = createApprovalItem({
        type: 'email',
        title: 'Test',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      const found = getApprovalItem(created.id);
      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.title).toBe('Test');
    });

    it('should return null for non-existent item', () => {
      const found = getApprovalItem('non-existent-id');
      expect(found).toBeNull();
    });
  });

  describe('Approve Item', () => {
    beforeEach(() => {
      initializeQueue();
    });

    it('should move item from pending to approved', () => {
      const item = createApprovalItem({
        type: 'email',
        title: 'Test',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      const approved = approveItem(item.id, 'reviewer@example.com');

      expect(approved.approved_at).toBeDefined();
      expect(approved.approved_by).toBe('reviewer@example.com');
      expect(approved.rejected_at).toBeNull();

      // Check file was moved
      const pendingPath = path.join(TEST_QUEUE_ROOT, 'pending', `${item.id}.json`);
      const approvedPath = path.join(TEST_QUEUE_ROOT, 'approved', `${item.id}.json`);
      
      expect(fs.existsSync(pendingPath)).toBe(false);
      expect(fs.existsSync(approvedPath)).toBe(true);
    });

    it('should log approval in audit log', () => {
      const item = createApprovalItem({
        type: 'email',
        title: 'Test',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      approveItem(item.id, 'reviewer');
      const logs = getAuditLog(item.id);

      expect(logs.length).toBe(2);
      expect(logs[1].action).toBe('approved');
      expect(logs[1].actor).toBe('reviewer');
    });

    it('should prevent approving already processed item', () => {
      const item = createApprovalItem({
        type: 'email',
        title: 'Test',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      approveItem(item.id, 'reviewer');

      expect(() => {
        approveItem(item.id, 'another-reviewer');
      }).toThrow('already processed');
    });
  });

  describe('Reject Item', () => {
    beforeEach(() => {
      initializeQueue();
    });

    it('should move item from pending to rejected', () => {
      const item = createApprovalItem({
        type: 'email',
        title: 'Test',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      const rejected = rejectItem(item.id, 'reviewer@example.com', 'Too promotional');

      expect(rejected.rejected_at).toBeDefined();
      expect(rejected.rejection_reason).toBe('Too promotional');
      expect(rejected.approved_at).toBeNull();

      // Check file was moved
      const pendingPath = path.join(TEST_QUEUE_ROOT, 'pending', `${item.id}.json`);
      const rejectedPath = path.join(TEST_QUEUE_ROOT, 'rejected', `${item.id}.json`);
      
      expect(fs.existsSync(pendingPath)).toBe(false);
      expect(fs.existsSync(rejectedPath)).toBe(true);
    });

    it('should allow rejection without reason', () => {
      const item = createApprovalItem({
        type: 'email',
        title: 'Test',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      const rejected = rejectItem(item.id, 'reviewer', '');

      expect(rejected.rejection_reason).toBeNull();
    });

    it('should log rejection in audit log', () => {
      const item = createApprovalItem({
        type: 'email',
        title: 'Test',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      rejectItem(item.id, 'reviewer', 'Reason');
      const logs = getAuditLog(item.id);

      expect(logs.length).toBe(2);
      expect(logs[1].action).toBe('rejected');
      expect(logs[1].reason).toBe('Reason');
    });
  });

  describe('Audit Logging', () => {
    beforeEach(() => {
      initializeQueue();
    });

    it('should return logs for specific item', () => {
      const item1 = createApprovalItem({
        type: 'email',
        title: 'Item 1',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      const item2 = createApprovalItem({
        type: 'social',
        title: 'Item 2',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      approveItem(item1.id, 'reviewer');

      const logs1 = getAuditLog(item1.id);
      const logs2 = getAuditLog(item2.id);

      expect(logs1.length).toBe(2);
      expect(logs2.length).toBe(1);
    });

    it('should return all logs when item ID not specified', () => {
      createApprovalItem({
        type: 'email',
        title: 'Item 1',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      createApprovalItem({
        type: 'social',
        title: 'Item 2',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      const allLogs = getAuditLog();
      expect(allLogs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Pending Count', () => {
    beforeEach(() => {
      initializeQueue();
    });

    it('should return count of pending items', () => {
      expect(getPendingCount()).toBe(0);

      createApprovalItem({
        type: 'email',
        title: 'Item 1',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      expect(getPendingCount()).toBe(1);

      createApprovalItem({
        type: 'email',
        title: 'Item 2',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      expect(getPendingCount()).toBe(2);
    });

    it('should not count approved or rejected items', () => {
      const item1 = createApprovalItem({
        type: 'email',
        title: 'Item 1',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      const item2 = createApprovalItem({
        type: 'email',
        title: 'Item 2',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      approveItem(item1.id, 'reviewer');
      expect(getPendingCount()).toBe(1);

      rejectItem(item2.id, 'reviewer', 'reason');
      expect(getPendingCount()).toBe(0);
    });
  });

  describe('Get All Items', () => {
    beforeEach(() => {
      initializeQueue();
    });

    it('should return items from all statuses', () => {
      const item1 = createApprovalItem({
        type: 'email',
        title: 'Item 1',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      const item2 = createApprovalItem({
        type: 'social',
        title: 'Item 2',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      const item3 = createApprovalItem({
        type: 'blog',
        title: 'Item 3',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      approveItem(item1.id, 'reviewer');
      rejectItem(item2.id, 'reviewer', 'reason');

      const all = getAllItems();

      expect(all.length).toBe(3);
      expect(all.map(i => i.id)).toContain(item1.id);
      expect(all.map(i => i.id)).toContain(item2.id);
      expect(all.map(i => i.id)).toContain(item3.id);
    });

    it('should sort by created_at descending', () => {
      const item1 = createApprovalItem({
        type: 'email',
        title: 'Item 1',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      const item2 = createApprovalItem({
        type: 'email',
        title: 'Item 2',
        preview: 'Preview',
        content: 'Content',
        source_agent: 'agent',
      });

      const all = getAllItems();

      expect(all[0].id).toBe(item2.id);
      expect(all[1].id).toBe(item1.id);
    });
  });
});
