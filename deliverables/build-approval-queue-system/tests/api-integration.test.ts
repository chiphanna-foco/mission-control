import { describe, it, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { GET as getApprovals, POST as postApprovals } from '../api/approvals/route';
import { GET as getApprovalById } from '../api/approvals/[id]/route';
import { POST as postApprove } from '../api/approvals/[id]/approve/route';
import { POST as postReject } from '../api/approvals/[id]/reject/route';

describe('Approval Queue API Integration', () => {
  beforeEach(() => {
    // Initialize queue before each test
    const { initializeQueue } = require('../lib/approval-queue');
    initializeQueue();
  });

  describe('POST /api/approvals', () => {
    it('should create a new approval item', async () => {
      const request = new NextRequest('http://localhost:3000/api/approvals', {
        method: 'POST',
        body: JSON.stringify({
          type: 'email',
          title: 'Test Email',
          preview: 'Test preview',
          content: '<p>Test content</p>',
          source_agent: 'test-agent',
          metadata: { test: true },
        }),
      });

      const response = await postApprovals(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.id).toBeDefined();
      expect(data.type).toBe('email');
      expect(data.title).toBe('Test Email');
    });

    it('should reject request without required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/approvals', {
        method: 'POST',
        body: JSON.stringify({
          type: 'email',
          // Missing title, content, source_agent
        }),
      });

      const response = await postApprovals(request);
      expect(response.status).toBe(400);
    });

    it('should reject invalid type', async () => {
      const request = new NextRequest('http://localhost:3000/api/approvals', {
        method: 'POST',
        body: JSON.stringify({
          type: 'invalid-type',
          title: 'Test',
          preview: 'Preview',
          content: 'Content',
          source_agent: 'agent',
        }),
      });

      const response = await postApprovals(request);
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/approvals', () => {
    it('should return empty list initially', async () => {
      const request = new NextRequest('http://localhost:3000/api/approvals?page=1&limit=10');
      const response = await getApprovals(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.items).toEqual([]);
      expect(data.total).toBe(0);
    });

    it('should return paginated results', async () => {
      // Create multiple items
      for (let i = 0; i < 15; i++) {
        const request = new NextRequest('http://localhost:3000/api/approvals', {
          method: 'POST',
          body: JSON.stringify({
            type: 'email',
            title: `Item ${i}`,
            preview: 'Preview',
            content: 'Content',
            source_agent: 'agent',
          }),
        });
        await postApprovals(request);
      }

      const request = new NextRequest('http://localhost:3000/api/approvals?page=1&limit=10');
      const response = await getApprovals(request);
      const data = await response.json();

      expect(data.items.length).toBe(10);
      expect(data.total).toBe(15);
      expect(data.pages).toBe(2);
    });
  });

  describe('GET /api/approvals/:id', () => {
    it('should return approval item with audit log', async () => {
      // Create an item
      const createRequest = new NextRequest('http://localhost:3000/api/approvals', {
        method: 'POST',
        body: JSON.stringify({
          type: 'social',
          title: 'Test Post',
          preview: 'Preview',
          content: 'Content',
          source_agent: 'agent',
        }),
      });

      const createResponse = await postApprovals(createRequest);
      const createdItem = await createResponse.json();

      // Get the item
      const getRequest = new NextRequest(`http://localhost:3000/api/approvals/${createdItem.id}`);
      const getResponse = await getApprovalById(getRequest, {
        params: Promise.resolve({ id: createdItem.id }),
      });

      const data = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(data.id).toBe(createdItem.id);
      expect(data.auditLog).toBeDefined();
      expect(data.auditLog.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent item', async () => {
      const request = new NextRequest('http://localhost:3000/api/approvals/non-existent');
      const response = await getApprovalById(request, {
        params: Promise.resolve({ id: 'non-existent' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/approvals/:id/approve', () => {
    it('should approve an item', async () => {
      // Create an item
      const createRequest = new NextRequest('http://localhost:3000/api/approvals', {
        method: 'POST',
        body: JSON.stringify({
          type: 'email',
          title: 'Test Email',
          preview: 'Preview',
          content: 'Content',
          source_agent: 'agent',
        }),
      });

      const createResponse = await postApprovals(createRequest);
      const item = await createResponse.json();

      // Approve it
      const approveRequest = new NextRequest(
        `http://localhost:3000/api/approvals/${item.id}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({ approvedBy: 'reviewer@example.com' }),
        }
      );

      const approveResponse = await postApprove(approveRequest, {
        params: Promise.resolve({ id: item.id }),
      });

      const approved = await approveResponse.json();

      expect(approveResponse.status).toBe(200);
      expect(approved.approved_at).toBeDefined();
      expect(approved.approved_by).toBe('reviewer@example.com');
      expect(approved.rejected_at).toBeNull();
    });

    it('should prevent approving already processed item', async () => {
      // Create and approve an item
      const createRequest = new NextRequest('http://localhost:3000/api/approvals', {
        method: 'POST',
        body: JSON.stringify({
          type: 'email',
          title: 'Test',
          preview: 'Preview',
          content: 'Content',
          source_agent: 'agent',
        }),
      });

      const createResponse = await postApprovals(createRequest);
      const item = await createResponse.json();

      // First approval
      const approveRequest1 = new NextRequest(
        `http://localhost:3000/api/approvals/${item.id}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({ approvedBy: 'reviewer' }),
        }
      );
      await postApprove(approveRequest1, { params: Promise.resolve({ id: item.id }) });

      // Second approval should fail
      const approveRequest2 = new NextRequest(
        `http://localhost:3000/api/approvals/${item.id}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({ approvedBy: 'another-reviewer' }),
        }
      );

      const approveResponse2 = await postApprove(approveRequest2, {
        params: Promise.resolve({ id: item.id }),
      });

      expect(approveResponse2.status).toBe(400);
    });
  });

  describe('POST /api/approvals/:id/reject', () => {
    it('should reject an item', async () => {
      // Create an item
      const createRequest = new NextRequest('http://localhost:3000/api/approvals', {
        method: 'POST',
        body: JSON.stringify({
          type: 'email',
          title: 'Test Email',
          preview: 'Preview',
          content: 'Content',
          source_agent: 'agent',
        }),
      });

      const createResponse = await postApprovals(createRequest);
      const item = await createResponse.json();

      // Reject it
      const rejectRequest = new NextRequest(
        `http://localhost:3000/api/approvals/${item.id}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({
            rejectedBy: 'reviewer@example.com',
            reason: 'Too promotional',
          }),
        }
      );

      const rejectResponse = await postReject(rejectRequest, {
        params: Promise.resolve({ id: item.id }),
      });

      const rejected = await rejectResponse.json();

      expect(rejectResponse.status).toBe(200);
      expect(rejected.rejected_at).toBeDefined();
      expect(rejected.rejection_reason).toBe('Too promotional');
      expect(rejected.approved_at).toBeNull();
    });

    it('should reject without reason', async () => {
      // Create an item
      const createRequest = new NextRequest('http://localhost:3000/api/approvals', {
        method: 'POST',
        body: JSON.stringify({
          type: 'email',
          title: 'Test',
          preview: 'Preview',
          content: 'Content',
          source_agent: 'agent',
        }),
      });

      const createResponse = await postApprovals(createRequest);
      const item = await createResponse.json();

      // Reject without reason
      const rejectRequest = new NextRequest(
        `http://localhost:3000/api/approvals/${item.id}/reject`,
        {
          method: 'POST',
          body: JSON.stringify({ rejectedBy: 'reviewer' }),
        }
      );

      const rejectResponse = await postReject(rejectRequest, {
        params: Promise.resolve({ id: item.id }),
      });

      const rejected = await rejectResponse.json();

      expect(rejectResponse.status).toBe(200);
      expect(rejected.rejection_reason).toBeNull();
    });
  });

  describe('Approval Workflow', () => {
    it('should complete full approval workflow', async () => {
      // 1. Create item
      const createRequest = new NextRequest('http://localhost:3000/api/approvals', {
        method: 'POST',
        body: JSON.stringify({
          type: 'blog',
          title: 'Weekly Blog Post',
          preview: 'This week we discuss...',
          content: '<h1>Weekly Blog</h1><p>Full article...</p>',
          source_agent: 'blog-writer-agent',
          metadata: { category: 'bedsheets', week: 10 },
        }),
      });

      const createResponse = await postApprovals(createRequest);
      expect(createResponse.status).toBe(201);
      const item = await createResponse.json();

      // 2. Verify item is pending
      const listRequest = new NextRequest('http://localhost:3000/api/approvals');
      const listResponse = await getApprovals(listRequest);
      const listData = await listResponse.json();
      expect(listData.total).toBe(1);

      // 3. Get item details
      const detailRequest = new NextRequest(`http://localhost:3000/api/approvals/${item.id}`);
      const detailResponse = await getApprovalById(detailRequest, {
        params: Promise.resolve({ id: item.id }),
      });
      const detail = await detailResponse.json();
      expect(detail.auditLog.length).toBe(1);
      expect(detail.auditLog[0].action).toBe('created');

      // 4. Approve item
      const approveRequest = new NextRequest(
        `http://localhost:3000/api/approvals/${item.id}/approve`,
        {
          method: 'POST',
          body: JSON.stringify({ approvedBy: 'content-reviewer' }),
        }
      );
      const approveResponse = await postApprove(approveRequest, {
        params: Promise.resolve({ id: item.id }),
      });
      expect(approveResponse.status).toBe(200);
      const approved = await approveResponse.json();

      // 5. Verify approval
      const finalDetailRequest = new NextRequest(
        `http://localhost:3000/api/approvals/${item.id}`
      );
      const finalDetailResponse = await getApprovalById(finalDetailRequest, {
        params: Promise.resolve({ id: item.id }),
      });
      const finalDetail = await finalDetailResponse.json();
      expect(finalDetail.approved_at).toBeDefined();
      expect(finalDetail.approved_by).toBe('content-reviewer');
      expect(finalDetail.auditLog.length).toBe(2);
      expect(finalDetail.auditLog[1].action).toBe('approved');
    });
  });
});
