-- Import 113 tasks from local Mac mini database (/.clawdbot/state/mission-control.db)
INSERT OR REPLACE INTO tasks (id, title, description, status, priority, assigned_agent_id, created_by_agent_id, workspace_id, business_id, due_date, created_at, updated_at, is_priority_today, priority_rank, priority_note, snoozed_until, snooze_count)
VALUES
('qM-Ns5Z9hzSSTpkDMaYKc', 'Choose secure remote access solution (Tailscale vs JumpCloud vs other)', 'Phase: Phase 0: Security & Infrastructure (Before Mac Arrives)
Owner: Chip', 'inbox', 'critical', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.503Z', '2026-02-05T05:13:40.503Z', 0, NULL, NULL, NULL, 0),
('csFgxriRZQ9s3ppQmuDkE', 'Document all API keys and credentials for migration', 'Phase: Phase 0: Security & Infrastructure (Before Mac Arrives)
Owner: Clawdbot', 'in_progress', 'critical', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.504Z', '2026-02-05T05:13:40.504Z', 0, NULL, NULL, NULL, 0),
('99xSDavhRXNcwlulrehxf', 'Audit current access permissions and create least-privilege plan', 'Phase: Phase 0: Security & Infrastructure (Before Mac Arrives)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.504Z', '2026-02-05T05:13:40.504Z', 0, NULL, NULL, NULL, 0),
('mQZNaj8QWm-Zwvtdk_3DS', 'Set up password manager (1Password family?)', 'Phase: Phase 0: Security & Infrastructure (Before Mac Arrives)
Owner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.504Z', '2026-02-05T05:13:40.504Z', 0, NULL, NULL, NULL, 0),
('HYN6wKgREdcKieIEKg7lJ', 'Unbox and physical setup', 'Phase: Phase 1: Mac Mini Hardware Setup (Day 1)
Owner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.504Z', '2026-02-05T05:13:40.504Z', 0, NULL, NULL, NULL, 0),
('rzq41VJbZA9OeT-PXqrCc', 'Install macOS and create admin account', 'Phase: Phase 1: Mac Mini Hardware Setup (Day 1)
Owner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.504Z', '2026-02-05T05:13:40.504Z', 0, NULL, NULL, NULL, 0),
('lpbxpoKTjO767CEpWZ6lx', 'Enable FileVault (full disk encryption)', 'Phase: Phase 1: Mac Mini Hardware Setup (Day 1)
Owner: Chip', 'inbox', 'critical', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.504Z', '2026-02-05T05:13:40.504Z', 0, NULL, NULL, NULL, 0),
('v9gGpxmgG5uBrOBojCHMu', 'Enable Firewall', 'Phase: Phase 1: Mac Mini Hardware Setup (Day 1)
Owner: Chip', 'inbox', 'critical', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('jFlQlKit7y__c3ZiySxUq', 'Disable unnecessary sharing services', 'Phase: Phase 1: Mac Mini Hardware Setup (Day 1)
Owner: Chip', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('jyzaNz1AP1BafUAGR7gua', 'Install Xcode Command Line Tools', 'Phase: Phase 1: Mac Mini Hardware Setup (Day 1)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('GzJhwdqdXuy9rkKh3W-3S', 'Install Homebrew', 'Phase: Phase 1: Mac Mini Hardware Setup (Day 1)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('Hih7eNQCv0y2qX4Od6f8X', 'Install Node.js (via nvm or Homebrew)', 'Phase: Phase 2: Development Environment (Day 1-2)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('L_5pXzj6XkBy7Hh-9FW-G', 'Install Python 3.x', 'Phase: Phase 2: Development Environment (Day 1-2)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('CUPU3oqk17L9GegMO9gI4', 'Install Bun (for OpenClaw)', 'Phase: Phase 2: Development Environment (Day 1-2)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('DsE1zZQHpfONm74XuPErB', 'Clone claude/skills/clawd repo', 'Phase: Phase 2: Development Environment (Day 1-2)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('0PDNyW1T_Gjmj96pzwbDe', 'Set up Git with SSH keys', 'Phase: Phase 2: Development Environment (Day 1-2)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('SMG5oXCwfFq5Ud5iKB-Tn', 'Install VS Code and sync settings', 'Phase: Phase 2: Development Environment (Day 1-2)
Owner: Clawdbot', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('stYd-b-e2cqTJLz2m-Zkp', 'Install database tools (SQLite, etc.)', 'Phase: Phase 2: Development Environment (Day 1-2)
Owner: Clawdbot', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('kP_aARESsXyQKysG-ETJu', 'Install OpenClaw globally via npm', 'Phase: Phase 3: OpenClaw / Clawdbot Setup (Day 2)
Owner: Clawdbot', 'inbox', 'critical', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('ld2kkHPjBXMocQyiB3qo1', 'Restore OpenClaw config from backup', 'Phase: Phase 3: OpenClaw / Clawdbot Setup (Day 2)
Owner: Clawdbot', 'inbox', 'critical', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('9HKvPy_vMSFX8hxhHV0wo', 'Migrate API keys (Motion, Slack, WordPress, etc.)', 'Phase: Phase 3: OpenClaw / Clawdbot Setup (Day 2)
Owner: Chip + Clawdbot', 'inbox', 'critical', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('zo3Fb8QLrYaNeE0Jlq43r', 'Test all channel integrations (Slack, iMessage)', 'Phase: Phase 3: OpenClaw / Clawdbot Setup (Day 2)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('k0Zynh_xHAa6PUFOSf249', 'Set up LM Studio with GLM-4.7-Flash and Gemma-3-4b', 'Phase: Phase 3: OpenClaw / Clawdbot Setup (Day 2)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('VG4lRZH0P7N8mrsIugrDQ', 'Verify all skills are installed and working', 'Phase: Phase 3: OpenClaw / Clawdbot Setup (Day 2)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('I6YWBoO-rI_BQCI3zvF-j', 'Set up local web server for Mission Control dashboard', 'Phase: Phase 4: Mission Control Dashboard (Day 2-3)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('XVDr6lzQgqB9qW6dkkT2L', 'Create secure tunnel (Tailscale serve)', 'Phase: Phase 4: Mission Control Dashboard (Day 2-3)
Owner: Chip', 'inbox', 'critical', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('5TdxrJ6cK3uIBcAcY2R8L', 'Build progress visualization', 'Phase: Phase 4: Mission Control Dashboard (Day 2-3)
Owner: Clawdbot', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('t7fwkKUYcgjqpGKy9uA1t', 'Build "Needs Review" queue UI', 'Phase: Phase 4: Mission Control Dashboard (Day 2-3)
Owner: Clawdbot', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.505Z', '2026-02-05T05:13:40.505Z', 0, NULL, NULL, NULL, 0),
('5kZfrS-NHQN8zPS-k44zS', 'Build comment system', 'Phase: Phase 4: Mission Control Dashboard (Day 2-3)
Owner: Clawdbot', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('Pi5iiaKtqa8poGNwsTBB-', 'Set up automated reminders', 'Phase: Phase 4: Mission Control Dashboard (Day 2-3)
Owner: Clawdbot', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('qzheP0AUDzckmF5WweZpL', 'Migrate wetried.it automation scripts', 'Phase: Phase 5: Project Migration (Day 3-4)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('-JHp7Al6mYC0E2Rrwt0Iy', 'Migrate Hannitizer Next.js project', 'Phase: Phase 5: Project Migration (Day 3-4)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('_LSTV6CrcMv_BybjYKmTT', 'Migrate GameBuzz content', 'Phase: Phase 5: Project Migration (Day 3-4)
Owner: Clawdbot', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('hzWrfJ6JbeqvBjmYe8LUI', 'Verify all cron jobs are set up', 'Phase: Phase 5: Project Migration (Day 3-4)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('md463Q81UmBjgWZu398sa', 'Test full end-to-end workflows', 'Phase: Phase 5: Project Migration (Day 3-4)
Owner: Chip + Clawdbot', 'inbox', 'critical', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('j5GOEWt6Ucf7_on5pGrHO', 'Enable automatic security updates', 'Phase: Phase 6: Security Hardening (Day 4-5)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('oWNXkmY1lqf-fVHO8bYUx', 'Set up backup strategy (Time Machine + cloud)', 'Phase: Phase 6: Security Hardening (Day 4-5)
Owner: Chip', 'inbox', 'critical', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('iMAnnseVlkKJZENaEuOqK', 'Document all access credentials in password manager', 'Phase: Phase 6: Security Hardening (Day 4-5)
Owner: Chip', 'inbox', 'critical', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('244KWQfFEyXJLYdmDZSvR', 'Disable SSH if not needed, or harden SSH config', 'Phase: Phase 6: Security Hardening (Day 4-5)
Owner: Clawdbot', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('DpZ5PpUBjLJueP2Zdxae2', 'Review all API key permissions', 'Phase: Phase 6: Security Hardening (Day 4-5)
Owner: Clawdbot', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('5jpi-bkqeiOjwVy4u8pXu', 'Set up fail2ban for intrusion detection', 'Phase: Phase 6: Security Hardening (Day 4-5)
Owner: Clawdbot', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('w36fHR8I1ovI6cHyxuxxn', 'Create system architecture diagram', 'Phase: Phase 7: Documentation & Handoff (Day 5-7)
Owner: Clawdbot', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('s3NLUOyH5c1841c6sJX92', 'Document all running services', 'Phase: Phase 7: Documentation & Handoff (Day 5-7)
Owner: Clawdbot', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('uaPZSv0OYc2TqKUp1gtQt', 'Create "In Case of Emergency" contact list', 'Phase: Phase 7: Documentation & Handoff (Day 5-7)
Owner: Clawdbot', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('5TyGCOwJxiaDYkLoIazWq', 'Test remote access from another device', 'Phase: Phase 7: Documentation & Handoff (Day 5-7)
Owner: Chip', 'inbox', 'critical', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.506Z', '2026-02-05T05:13:40.506Z', 0, NULL, NULL, NULL, 0),
('6nyxf_6NM0WYJogLTkVCy', 'Sign off on completion', 'Phase: Phase 7: Documentation & Handoff (Day 5-7)
Owner: Chip', 'inbox', 'critical', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:13:40.507Z', '2026-02-05T05:13:40.507Z', 0, NULL, NULL, NULL, 0),
('IspLI9mmHy-BNF4z1nHak', 'Migration Kickoff', 'Set up the new M4 Mac Mini and begin migration process', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.761Z', '2026-02-05T05:43:14.761Z', 0, NULL, NULL, NULL, 0),
('RndlYVs1Jz1Ci3PUdhbYG', 'Install current versions of all applications', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('AlSi1i9TaawjG-u5X-TYa', 'Fresh install of Cursor, configure synced settings', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('PlgygcYIq2PP7i_AtkD1_', 'Set up Focus with keyword configs per Focus Agent', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('JsNYR4uWL9gHwPMr_KURb', 'Sign in to all apps and sync settings', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('U-RKcUY8EM_vqPn1jAW6l', 'Set up Second Home', 'Home lab setup with secondary configuration', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('CXXXRQNZSfSSGtcJDbKU3', 'Update MacOS after migration', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('_1MasPcXvh0rMQ7rv7t7N', 'Set up a separate content marketing agent', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('xW452hkvMv0qfbHvZkFMR', 'Test this new agent with a sample project', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('9eD_H7MYt8GGPnCtprQ7r', 'Monitor Mac Mini performance after migration', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('shMcBjcI7ja-7BYrICfqn', 'Design content marketing plan (strategic)', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('uKT3qYY2ePKgXc93Y5eXq', 'Design content marketing plan (tactical)', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('ZcXYGmw9mgfzEY4hIjPnC', 'Identify top 2-3 pain points', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('kzY96eM3lF3eZJpHiK77Z', 'Define ideal customer profile', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('iGcCQO2Wo4WVYkTbASk2y', 'Pick 2025 Blog Topics (Q1-Q2 initially)', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('Pa2LTu7bcy-AULxOhEeHv', 'Create Blog Outline Template', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.763Z', '2026-02-05T05:43:14.763Z', 0, NULL, NULL, NULL, 0),
('Sen9_ldIScjymHxAtzWxm', 'Draft first blog post (SEO + AI-assisted)', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.764Z', '2026-02-05T05:43:14.764Z', 0, NULL, NULL, NULL, 0),
('3bHkEGE-gO8oXUWMSApUh', 'Create simple Ashby-style recruiting agent system prompt', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.764Z', '2026-02-05T05:43:14.764Z', 0, NULL, NULL, NULL, 0),
('IjA9T60WjYdM510n8yoCj', 'Test recruiting agent with 3 mock scenarios', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.764Z', '2026-02-05T05:43:14.764Z', 0, NULL, NULL, NULL, 0),
('zLL0jcs8iZEvTjqhiu2K6', 'Document agent behavior and iteration ideas', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.764Z', '2026-02-05T05:43:14.764Z', 0, NULL, NULL, NULL, 0),
('Bio3gTdH4DPzMUYE7U8mW', 'Configure Time Machine backup', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.764Z', '2026-02-05T05:43:14.764Z', 0, NULL, NULL, NULL, 0),
('HXX-xQVP5dpZFAFF225gl', 'Verify SSH keys and GitHub access', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.764Z', '2026-02-05T05:43:14.764Z', 0, NULL, NULL, NULL, 0),
('SvBEpLgSwkxPKiY1-A_b3', 'Set up development environment (Node, Bun, Python)', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.764Z', '2026-02-05T05:43:14.764Z', 0, NULL, NULL, NULL, 0),
('ymViG5KF0gHlPXZ1l6L1_', 'Transfer active project files', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.764Z', '2026-02-05T05:43:14.764Z', 0, NULL, NULL, NULL, 0),
('c1uaK5sLg52I4NcxfESPY', 'Archive old machine after verification', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:43:14.764Z', '2026-02-05T05:43:14.764Z', 0, NULL, NULL, NULL, 0),
('w4tJLP5tFOkfb17gFfNKu', 'Migration Kickoff', 'Set up the new M4 Mac Mini and begin migration process', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.534Z', '2026-02-05T05:49:08.534Z', 0, NULL, NULL, NULL, 0),
('Y9mXcEnl62Q9ubb0KuAsH', 'Install current versions of all applications', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.534Z', '2026-02-05T05:49:08.534Z', 0, NULL, NULL, NULL, 0),
('ZGnyx1fZJMu98OlnroCdK', 'Fresh install of Cursor, configure synced settings', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.534Z', '2026-02-05T05:49:08.534Z', 0, NULL, NULL, NULL, 0),
('_0fG2zGG9Yv6qfM7yRL4q', 'Set up Focus with keyword configs per Focus Agent', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.534Z', '2026-02-05T05:49:08.534Z', 0, NULL, NULL, NULL, 0),
('0GZqDH_NsLaJm5tDWPOZz', 'Sign in to all apps and sync settings', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.534Z', '2026-02-05T05:49:08.534Z', 0, NULL, NULL, NULL, 0),
('72helVAD-gDmBiew0yxwm', 'Set up Second Home', 'Home lab setup with secondary configuration', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.534Z', '2026-02-05T05:49:08.534Z', 0, NULL, NULL, NULL, 0),
('07HQH92EiXVBIv-Zsb5Fb', 'Update MacOS after migration', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.534Z', '2026-02-05T05:49:08.534Z', 0, NULL, NULL, NULL, 0),
('254973gJH6Ee9re9OYIl1', 'Set up a separate content marketing agent', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.534Z', '2026-02-05T05:49:08.534Z', 0, NULL, NULL, NULL, 0),
('FKGWVY9HVWFYiElIecsbi', 'Test this new agent with a sample project', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.534Z', '2026-02-05T05:49:08.534Z', 0, NULL, NULL, NULL, 0),
('Myod9v7VZFkgoiWtpTWGq', 'Monitor Mac Mini performance after migration', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.534Z', '2026-02-05T05:49:08.534Z', 0, NULL, NULL, NULL, 0),
('3kJFY6_KZ7DoskgD162Fv', 'Design content marketing plan (strategic)', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.534Z', '2026-02-05T05:49:08.534Z', 0, NULL, NULL, NULL, 0),
('lQ9DirPEtSAvsVEGbenU1', 'Design content marketing plan (tactical)', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.534Z', '2026-02-05T05:49:08.534Z', 0, NULL, NULL, NULL, 0),
('Qdidc0kd1jwUFGHq3O6y8', 'Identify top 2-3 pain points', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.534Z', '2026-02-05T05:49:08.534Z', 0, NULL, NULL, NULL, 0),
('D6sXZ-XR256KjVqWj52DU', 'Define ideal customer profile', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.535Z', '2026-02-05T05:49:08.535Z', 0, NULL, NULL, NULL, 0),
('UkF68tFidksnzBxhUWwtV', 'Pick 2025 Blog Topics (Q1-Q2 initially)', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.535Z', '2026-02-05T05:49:08.535Z', 0, NULL, NULL, NULL, 0),
('wB1aNYSPaybjzhPCirPz7', 'Create Blog Outline Template', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.535Z', '2026-02-05T05:49:08.535Z', 0, NULL, NULL, NULL, 0),
('32_OEo12pElxfeOvTznG7', 'Draft first blog post (SEO + AI-assisted)', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.536Z', '2026-02-05T05:49:08.536Z', 0, NULL, NULL, NULL, 0),
('0TzlbAlyw5fIC0NBPQBym', 'Create simple Ashby-style recruiting agent system prompt', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.536Z', '2026-02-05T05:49:08.536Z', 0, NULL, NULL, NULL, 0),
('f_PBH10vuHXe2zd0s_DjB', 'Test recruiting agent with 3 mock scenarios', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.536Z', '2026-02-05T05:49:08.536Z', 0, NULL, NULL, NULL, 0),
('2Ns7kXZeGX08Gz30agV7K', 'Document agent behavior and iteration ideas', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.536Z', '2026-02-05T05:49:08.536Z', 0, NULL, NULL, NULL, 0),
('Cq2HoRX0kKAVLmcNbHu2p', 'Configure Time Machine backup', '', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.536Z', '2026-02-05T05:49:08.536Z', 0, NULL, NULL, NULL, 0),
('N8zTASiWW3wZRO9YCfXZW', 'Verify SSH keys and GitHub access', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.536Z', '2026-02-05T05:49:08.536Z', 0, NULL, NULL, NULL, 0),
('_lav_vL0oYnEf6MxuLNOt', 'Set up development environment (Node, Bun, Python)', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.536Z', '2026-02-05T05:49:08.536Z', 0, NULL, NULL, NULL, 0),
('LnB1QOqCDjdoKeZ4_74Wz', 'Transfer active project files', '', 'inbox', 'high', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.536Z', '2026-02-05T05:49:08.536Z', 0, NULL, NULL, NULL, 0),
('GgvpsGv-3ggXe9y5ATI8e', 'Archive old machine after verification', '', 'inbox', 'low', NULL, NULL, 'default', 'default', NULL, '2026-02-05T05:49:08.536Z', '2026-02-05T05:49:08.536Z', 0, NULL, NULL, NULL, 0),
('vs-himiway-c1-movcan-v30', 'Review VS Page: Himiway C1 vs Movcan V30 Pro Max', 'https://wetried.it/?p=35311 - Draft comparison page awaiting review. Check content accuracy and affiliate links.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-himiway-c1-rad-power', 'Review VS Page: Himiway C1 vs Rad Power', 'https://wetried.it/?p=35312 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-himiway-c1-aventon', 'Review VS Page: Himiway C1 vs Aventon', 'https://wetried.it/?p=35313 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-himiway-c1-haoqi', 'Review VS Page: Himiway C1 vs HAOQI Cheetah', 'https://wetried.it/?p=35314 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-movcan-rad-power', 'Review VS Page: Movcan vs Rad Power', 'https://wetried.it/?p=35315 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-movcan-aventon', 'Review VS Page: Movcan vs Aventon', 'https://wetried.it/?p=35316 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-movcan-haoqi', 'Review VS Page: Movcan vs HAOQI Cheetah', 'https://wetried.it/?p=35317 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-rad-aventon', 'Review VS Page: Rad Power vs Aventon', 'https://wetried.it/?p=35318 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-rad-haoqi', 'Review VS Page: Rad Power vs HAOQI Cheetah', 'https://wetried.it/?p=35319 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-aventon-haoqi', 'Review VS Page: Aventon vs HAOQI Cheetah', 'https://wetried.it/?p=35320 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-wolf-amberjack', 'Review VS Page: Wolf & Shepherd vs Amberjack', 'https://wetried.it/?p=35324 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-wolf-kizik', 'Review VS Page: Wolf & Shepherd vs Kizik', 'https://wetried.it/?p=35325 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-wolf-heydude', 'Review VS Page: Wolf & Shepherd vs Hey Dude', 'https://wetried.it/?p=35326 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-amberjack-kizik', 'Review VS Page: Amberjack vs Kizik', 'https://wetried.it/?p=35327 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-amberjack-heydude', 'Review VS Page: Amberjack vs Hey Dude', 'https://wetried.it/?p=35328 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-kizik-heydude', 'Review VS Page: Kizik vs Hey Dude', 'https://wetried.it/?p=35329 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0),
('vs-public-rec-revtown', 'Review VS Page: Public Rec vs Revtown', 'https://wetried.it/?p=35330 - Draft comparison page awaiting review.', 'inbox', 'medium', NULL, NULL, 'default', 'default', NULL, '2026-02-06T04:39:43.000Z', '2026-02-06T04:39:43.000Z', 0, NULL, NULL, NULL, 0);
