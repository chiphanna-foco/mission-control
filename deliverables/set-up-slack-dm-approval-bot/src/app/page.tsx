export default function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>Slack Approval Bot</h1>
      <p>Mission Control approval request handler</p>
      
      <h2>Status</h2>
      <ul>
        <li>API Server: Running on port 3000</li>
        <li>Events handler: <code>/api/slack/events</code></li>
        <li>Actions handler: <code>/api/slack/actions</code></li>
        <li>Webhook receiver: <code>/api/slack/webhook</code></li>
        <li>Status endpoint: <code>/api/approval-queue/status</code></li>
      </ul>

      <h2>Quick Links</h2>
      <ul>
        <li><a href="/api/approval-queue/status">View Queue Status</a></li>
      </ul>

      <h2>Documentation</h2>
      <ul>
        <li>See <code>README.md</code> for full documentation</li>
        <li>See <code>QUICKSTART.md</code> for 5-minute setup</li>
        <li>See <code>SLACK-SETUP.md</code> for Slack app configuration</li>
        <li>See <code>INTEGRATION.md</code> for Mission Control integration</li>
      </ul>

      <h2>Example Webhook Request</h2>
      <pre style={{
        background: '#f5f5f5',
        padding: '1rem',
        borderRadius: '4px',
        overflow: 'auto',
      }}>
{`curl -X POST http://localhost:3000/api/slack/webhook \\
  -H "Content-Type: application/json" \\
  -d '{
    "type": "new-approval-request",
    "item": {
      "id": "item-123",
      "title": "Review Blog Post",
      "type": "blog",
      "content": "Blog content goes here...",
      "sourceAgent": "blog-generator"
    }
  }'`}
      </pre>

      <footer style={{ marginTop: '3rem', color: '#666', fontSize: '0.9rem' }}>
        <p>Slack Approval Bot v1.0.0 | Built for Mission Control</p>
      </footer>
    </div>
  );
}
