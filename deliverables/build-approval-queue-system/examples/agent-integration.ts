/**
 * Example: Integrating the Approval Queue System with Agents
 *
 * This file demonstrates how to integrate approval workflows into your agents.
 */

// Example 1: Email Newsletter Agent
// ===================================

interface EmailApprovalRequest {
  recipientList: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  metadata?: Record<string, unknown>;
}

async function submitEmailForApproval(request: EmailApprovalRequest) {
  const htmlPreview = request.htmlContent
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .substring(0, 300);

  const response = await fetch('http://localhost:3000/api/approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'email',
      title: `Email: ${request.subject}`,
      preview: htmlPreview,
      content: request.htmlContent,
      source_agent: 'newsletter-generator',
      metadata: {
        recipient_list: request.recipientList,
        subject: request.subject,
        ...request.metadata,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit for approval: ${response.statusText}`);
  }

  const item = await response.json();
  console.log(`[Newsletter Agent] Submitted for approval: ${item.id}`);
  return item.id;
}

async function waitForEmailApproval(itemId: string, timeoutMinutes = 30) {
  const startTime = Date.now();
  const timeout = timeoutMinutes * 60 * 1000;

  while (Date.now() - startTime < timeout) {
    const response = await fetch(`http://localhost:3000/api/approvals/${itemId}`);
    const item = await response.json();

    if (item.approved_at) {
      console.log(`[Newsletter Agent] Email approved by ${item.approved_by}`);
      return { approved: true, item };
    }

    if (item.rejected_at) {
      console.log(`[Newsletter Agent] Email rejected: ${item.rejection_reason}`);
      return { approved: false, reason: item.rejection_reason };
    }

    // Wait 30 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 30000));
  }

  throw new Error(`Approval timeout after ${timeoutMinutes} minutes`);
}

async function sendApprovedEmail(
  itemId: string,
  request: EmailApprovalRequest,
  emailServiceToken: string
) {
  const response = await fetch(`http://localhost:3000/api/approvals/${itemId}`);
  const item = await response.json();

  if (!item.approved_at) {
    throw new Error('Item has not been approved');
  }

  // Now send the actual email
  const sendResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${emailServiceToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: request.recipientList }],
        },
      ],
      from: { email: 'newsletters@example.com' },
      subject: request.subject,
      html: request.htmlContent,
      text: request.textContent,
    }),
  });

  if (!sendResponse.ok) {
    throw new Error(`Failed to send email: ${sendResponse.statusText}`);
  }

  console.log(`[Newsletter Agent] Email sent successfully`);
}

// Usage:
async function newsletterAgentWorkflow() {
  try {
    // Step 1: Generate newsletter content
    const htmlContent = `
      <h1>Weekly Newsletter - Week 10</h1>
      <p>This week's top bedsheet comparisons...</p>
    `;

    // Step 2: Submit for approval
    const approvalId = await submitEmailForApproval({
      recipientList: 'subscribers@example.com',
      subject: 'Weekly Newsletter - Week 10',
      htmlContent,
      textContent: 'Plain text version...',
      metadata: { week: 10, year: 2026 },
    });

    // Step 3: Wait for approval (with timeout)
    const approvalResult = await waitForEmailApproval(approvalId, 30);

    if (!approvalResult.approved) {
      console.log('Newsletter rejected, not sending');
      return;
    }

    // Step 4: Send the approved email
    await sendApprovedEmail(approvalId, {
      recipientList: 'subscribers@example.com',
      subject: 'Weekly Newsletter - Week 10',
      htmlContent,
      textContent: 'Plain text version...',
    }, process.env.SENDGRID_TOKEN!);
  } catch (error) {
    console.error('[Newsletter Agent] Error:', error);
  }
}

// Example 2: Social Media Agent
// =============================

interface SocialApprovalRequest {
  platform: 'twitter' | 'linkedin' | 'instagram';
  caption: string;
  imageUrl?: string;
  tags?: string[];
}

async function submitSocialPostForApproval(request: SocialApprovalRequest) {
  const response = await fetch('http://localhost:3000/api/approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'social',
      title: `${request.platform.toUpperCase()} Post`,
      preview: request.caption.substring(0, 300),
      content: request.caption,
      source_agent: 'social-media-agent',
      metadata: {
        platform: request.platform,
        imageUrl: request.imageUrl,
        tags: request.tags,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit for approval: ${response.statusText}`);
  }

  const item = await response.json();
  return item.id;
}

async function postApprovedSocialContent(
  itemId: string,
  request: SocialApprovalRequest
) {
  // Fetch the approved item to verify
  const response = await fetch(`http://localhost:3000/api/approvals/${itemId}`);
  const item = await response.json();

  if (!item.approved_at) {
    throw new Error('Item has not been approved');
  }

  // Post to social media
  const postResponse = await fetch(`/api/social/${request.platform}/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      caption: request.caption,
      imageUrl: request.imageUrl,
      tags: request.tags,
    }),
  });

  if (!postResponse.ok) {
    throw new Error(`Failed to post: ${postResponse.statusText}`);
  }

  console.log(`Posted to ${request.platform}`);
}

// Usage:
async function socialMediaAgentWorkflow() {
  const approvalId = await submitSocialPostForApproval({
    platform: 'twitter',
    caption: 'Hot take: These bedsheets are actually worth the hype 🛏️',
    tags: ['bedsheets', 'review', 'home'],
  });

  // Wait for approval
  const startTime = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes

  while (Date.now() - startTime < timeout) {
    const response = await fetch(`http://localhost:3000/api/approvals/${approvalId}`);
    const item = await response.json();

    if (item.approved_at) {
      await postApprovedSocialContent(approvalId, {
        platform: 'twitter',
        caption: 'Hot take: These bedsheets are actually worth the hype 🛏️',
        tags: ['bedsheets', 'review', 'home'],
      });
      break;
    }

    if (item.rejected_at) {
      console.log(`Post rejected: ${item.rejection_reason}`);
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 30000));
  }
}

// Example 3: Blog Publishing Agent
// ================================

interface BlogApprovalRequest {
  title: string;
  slug: string;
  htmlContent: string;
  excerpt: string;
  featuredImageUrl?: string;
  category: string;
  tags?: string[];
}

async function submitBlogPostForApproval(request: BlogApprovalRequest) {
  const response = await fetch('http://localhost:3000/api/approvals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'blog',
      title: `Blog: ${request.title}`,
      preview: request.excerpt,
      content: request.htmlContent,
      source_agent: 'blog-publishing-agent',
      metadata: {
        slug: request.slug,
        category: request.category,
        tags: request.tags,
        featuredImageUrl: request.featuredImageUrl,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit for approval: ${response.statusText}`);
  }

  const item = await response.json();
  return item.id;
}

async function publishApprovedBlogPost(
  itemId: string,
  request: BlogApprovalRequest
) {
  const response = await fetch(`http://localhost:3000/api/approvals/${itemId}`);
  const item = await response.json();

  if (!item.approved_at) {
    throw new Error('Item has not been approved');
  }

  // Publish to blog platform (e.g., WordPress via REST API)
  const publishResponse = await fetch('https://blog.example.com/wp-json/wp/v2/posts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WORDPRESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: request.title,
      slug: request.slug,
      content: request.htmlContent,
      excerpt: request.excerpt,
      categories: [request.category],
      tags: request.tags,
      status: 'publish',
    }),
  });

  if (!publishResponse.ok) {
    throw new Error(`Failed to publish: ${publishResponse.statusText}`);
  }

  const published = await publishResponse.json();
  console.log(`Blog post published: ${published.link}`);
}

// Usage:
async function blogPublishingAgentWorkflow() {
  const approvalId = await submitBlogPostForApproval({
    title: 'The Ultimate Bedsheet Comparison Guide 2026',
    slug: 'bedsheet-comparison-2026',
    htmlContent: '<h1>The Ultimate Bedsheet Comparison Guide</h1><p>Full article...</p>',
    excerpt: 'We compare the top 10 bedsheet brands of 2026...',
    category: 'Guides',
    tags: ['bedsheets', 'comparison', 'shopping'],
  });

  // Simple polling for approval
  let approved = false;

  for (let i = 0; i < 120; i++) { // Check for 60 minutes (30-second intervals)
    const response = await fetch(`http://localhost:3000/api/approvals/${approvalId}`);
    const item = await response.json();

    if (item.approved_at) {
      approved = true;
      break;
    }

    if (item.rejected_at) {
      console.log(`Post rejected: ${item.rejection_reason}`);
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 30000));
  }

  if (approved) {
    await publishApprovedBlogPost(approvalId, {
      title: 'The Ultimate Bedsheet Comparison Guide 2026',
      slug: 'bedsheet-comparison-2026',
      htmlContent: '<h1>The Ultimate Bedsheet Comparison Guide</h1><p>Full article...</p>',
      excerpt: 'We compare the top 10 bedsheet brands of 2026...',
      category: 'Guides',
      tags: ['bedsheets', 'comparison', 'shopping'],
    });
  }
}

// Example 4: Batch Approval with Error Handling
// ==============================================

interface BatchApprovalOptions {
  items: Array<{
    type: 'email' | 'social' | 'blog' | 'content';
    title: string;
    preview: string;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
  timeoutMinutes?: number;
  retryCount?: number;
}

async function submitBatchForApproval(items: BatchApprovalOptions['items']) {
  const approvalIds: string[] = [];

  for (const item of items) {
    const response = await fetch('http://localhost:3000/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...item,
        source_agent: 'batch-agent',
      }),
    });

    if (!response.ok) {
      console.error(`Failed to submit item "${item.title}"`);
      continue;
    }

    const created = await response.json();
    approvalIds.push(created.id);
  }

  return approvalIds;
}

async function waitForBatchApproval(
  itemIds: string[],
  options: Partial<BatchApprovalOptions> = {}
) {
  const { timeoutMinutes = 60, retryCount = 3 } = options;
  const results = {
    approved: [] as string[],
    rejected: [] as Array<{ id: string; reason: string }>,
    pending: [] as string[],
  };

  const startTime = Date.now();
  const timeout = timeoutMinutes * 60 * 1000;

  while (Date.now() - startTime < timeout) {
    for (const itemId of itemIds) {
      if (
        results.approved.includes(itemId) ||
        results.rejected.some(r => r.id === itemId)
      ) {
        continue; // Already processed
      }

      const response = await fetch(`http://localhost:3000/api/approvals/${itemId}`);
      const item = await response.json();

      if (item.approved_at) {
        results.approved.push(itemId);
      } else if (item.rejected_at) {
        results.rejected.push({
          id: itemId,
          reason: item.rejection_reason || 'No reason provided',
        });
      } else {
        if (!results.pending.includes(itemId)) {
          results.pending.push(itemId);
        }
      }
    }

    if (results.pending.length === 0) {
      break; // All items processed
    }

    await new Promise(resolve => setTimeout(resolve, 30000));
  }

  return results;
}

// Usage:
async function batchApprovalWorkflow() {
  const items = [
    {
      type: 'email' as const,
      title: 'Newsletter Week 10',
      preview: 'Weekly bedsheet news...',
      content: '<h1>Newsletter</h1><p>Full content...</p>',
    },
    {
      type: 'social' as const,
      title: 'Twitter Post',
      preview: 'Check out our latest review!',
      content: 'Full tweet content...',
    },
    {
      type: 'blog' as const,
      title: 'Blog: Best Bedsheets 2026',
      preview: 'The top 10 bedsheets...',
      content: '<h1>Best Bedsheets 2026</h1><p>Full article...</p>',
    },
  ];

  // Submit all items
  const approvalIds = await submitBatchForApproval(items);
  console.log(`Submitted ${approvalIds.length} items for approval`);

  // Wait for all approvals
  const results = await waitForBatchApproval(approvalIds, {
    timeoutMinutes: 60,
  });

  console.log(`
    ✅ Approved: ${results.approved.length}
    ❌ Rejected: ${results.rejected.length}
    ⏳ Pending: ${results.pending.length}
  `);

  // Process approved items
  for (const id of results.approved) {
    console.log(`Processing approved item: ${id}`);
    // ... execute the action
  }

  // Handle rejected items
  for (const { id, reason } of results.rejected) {
    console.log(`Item ${id} rejected: ${reason}`);
    // ... notify agent or log for review
  }
}

// Export for use in other modules
export {
  submitEmailForApproval,
  waitForEmailApproval,
  submitSocialPostForApproval,
  submitBlogPostForApproval,
  submitBatchForApproval,
  waitForBatchApproval,
};
