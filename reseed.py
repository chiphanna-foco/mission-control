#!/usr/bin/env python3
"""Re-seed mission-control.db with all 30 projects and 16 agents from ~/Downloads/agents 2/"""

import sqlite3
import uuid
import os
import re
from pathlib import Path

DB = Path(__file__).parent / "mission-control.db"
PROJECTS_DIR = Path.home() / "Downloads" / "agents 2" / "projects"
PROJECTS_MD = Path.home() / "Downloads" / "agents 2" / "PROJECTS.md"

# Agent definitions from AGENTS.md (the 16 sub-agents + 2 master agents already in DB)
AGENTS_TO_ADD = [
    ("Keyword Researcher", "Discover high-value keyword opportunities that drive purchase-intent traffic.", "🔍", 0),
    ("WordPress Developer", "Build, maintain, and fix WordPress functionality.", "🔧", 0),
    ("Affiliate Optimizer", "Maximize revenue per visitor by optimizing affiliate link placement and conversion.", "💰", 0),
    ("Analytics Monitor", "Track key metrics, detect anomalies, and report on progress toward $10K/month.", "📊", 0),
    ("Internal Linker", "Build and maintain the internal linking structure.", "🔗", 0),
    ("Product Enricher", "Gather and structure external data about products.", "📦", 0),
    ("Image Generator", "Create editorial-quality images for posts.", "🎨", 0),
    ("VS Page Generator", "Create, manage, and scale the programmatic comparison page system.", "⚔️", 0),
    ("Social Distributor", "Distribute content across Reddit, Pinterest, Quora, and Twitter/X.", "📣", 0),
    ("YouTube Agent", "Optimize the WeTriedIt YouTube channel for growth and SEO.", "📺", 0),
    ("Newsletter Agent", "Build and grow the email newsletter.", "✉️", 0),
    ("Competitive Intel", "Monitor competitors and identify content gaps.", "🕵️", 0),
    ("Content Refresher", "Update existing published content to maintain relevance and ranking.", "♻️", 0),
]

# Map owner names to agent names for task assignment
OWNER_MAP = {
    "seo-analyst": "SEO Analyst",
    "content-writer": "Content Writer",
    "keyword-researcher": "Keyword Researcher",
    "wp-developer": "WordPress Developer",
    "qa-agent": "QA",
    "affiliate-optimizer": "Affiliate Optimizer",
    "analytics-monitor": "Analytics Monitor",
    "internal-linker": "Internal Linker",
    "product-enricher": "Product Enricher",
    "image-generator": "Image Generator",
    "vs-page-generator": "VS Page Generator",
    "social-distributor": "Social Distributor",
    "youtube-agent": "YouTube Agent",
    "newsletter-agent": "Newsletter Agent",
    "competitive-intel": "Competitive Intel",
    "content-refresher": "Content Refresher",
    "cataloger": "Cataloger",
    "seo-auditor": "SEO Auditor",
}

# Priority mapping
PRIORITY_MAP = {
    "P0": "urgent",
    "P1": "high",
    "P2": "normal",
    "P3": "low",
}

# Status mapping
STATUS_MAP = {
    "Not Started": "inbox",
    "In Progress": "in_progress",
    "Partial": "in_progress",
    "Blocked": "inbox",
    "Done": "done",
    "DONE": "done",
}

def parse_projects_md():
    """Parse PROJECTS.md to get project metadata."""
    text = PROJECTS_MD.read_text()
    projects = {}
    # Match table rows like: | P01 | Product Database Build | ...
    for m in re.finditer(r'\|\s*(P\d+)\s*\|\s*(.+?)\s*\|\s*`([^`]+)`\s*\|\s*(.+?)\s*\|\s*(P\d)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|', text):
        pid = m.group(1)
        projects[pid] = {
            "title": m.group(2).strip(),
            "file": m.group(3).strip(),
            "owners": [o.strip() for o in m.group(4).split(",")],
            "priority": m.group(5).strip(),
            "status": m.group(6).strip(),
            "revenue": m.group(7).strip(),
        }
    return projects

def read_project_file(filename):
    """Read full project description from file."""
    path = PROJECTS_DIR / filename
    if path.exists():
        return path.read_text()
    return None

def main():
    conn = sqlite3.connect(DB)
    c = conn.cursor()
    
    # Get existing agents
    c.execute("SELECT id, name FROM agents")
    existing_agents = {row[1]: row[0] for row in c.fetchall()}
    
    # Add missing agents
    for name, role, emoji, is_master in AGENTS_TO_ADD:
        if name not in existing_agents:
            aid = str(uuid.uuid4())
            c.execute(
                "INSERT INTO agents (id, name, role, avatar_emoji, status, is_master, workspace_id) VALUES (?, ?, ?, ?, 'standby', ?, 'default')",
                (aid, name, role, emoji, is_master)
            )
            existing_agents[name] = aid
            print(f"  + Agent: {name}")
    
    # Get existing tasks
    c.execute("SELECT title FROM tasks")
    existing_tasks = {row[0] for row in c.fetchall()}
    
    # Parse projects
    projects = parse_projects_md()
    print(f"\nFound {len(projects)} projects in PROJECTS.md")
    
    # Also check for P26-P30 which might not be in the table
    for f in sorted(PROJECTS_DIR.glob("P*.md")):
        pid = f.stem.split("-")[0]
        if pid not in projects:
            content = f.read_text()
            title_match = re.search(r'^#\s+\S+\s+—\s+(.+)', content, re.MULTILINE)
            priority_match = re.search(r'\*\*Priority:\*\*\s*(\S+)', content)
            status_match = re.search(r'\*\*Status:\*\*\s*(.+)', content)
            owner_match = re.search(r'\*\*Owner:\*\*\s*(.+)', content)
            
            title = title_match.group(1).strip() if title_match else f.stem
            projects[pid] = {
                "title": title,
                "file": f"projects/{f.name}",
                "owners": [o.strip() for o in owner_match.group(1).split(",")] if owner_match else [],
                "priority": priority_match.group(1).strip() if priority_match else "P2",
                "status": status_match.group(1).strip() if status_match else "Not Started",
                "revenue": "",
            }
    
    print(f"Total projects (including extras): {len(projects)}")
    
    added = 0
    for pid in sorted(projects.keys()):
        p = projects[pid]
        full_title = f"{pid}: {p['title']}"
        
        # Skip if already exists (check both formats)
        if full_title in existing_tasks or p['title'] in existing_tasks:
            print(f"  ~ Skip (exists): {full_title}")
            continue
        
        # Read full description
        fname = os.path.basename(p["file"])
        desc = read_project_file(fname) or p.get("revenue", "")
        
        # Map priority
        priority = PRIORITY_MAP.get(p["priority"], "normal")
        
        # Map status
        status = STATUS_MAP.get(p["status"], "inbox")
        
        # Find first owner agent
        assigned_id = None
        for owner in p["owners"]:
            owner_clean = owner.strip()
            agent_name = OWNER_MAP.get(owner_clean, owner_clean)
            if agent_name in existing_agents:
                assigned_id = existing_agents[agent_name]
                break
        
        # Use Growth Overseer as creator
        creator_id = existing_agents.get("WeTried.it Growth Overseer")
        
        tid = str(uuid.uuid4())
        c.execute(
            """INSERT INTO tasks (id, title, description, status, priority, assigned_agent_id, created_by_agent_id, workspace_id, business_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, 'default', 'default')""",
            (tid, full_title, desc, status, priority, assigned_id, creator_id)
        )
        added += 1
        print(f"  + Task: {full_title} [{status}/{priority}]")
    
    conn.commit()
    
    # Final counts
    c.execute("SELECT count(*) FROM agents")
    agent_count = c.fetchone()[0]
    c.execute("SELECT count(*) FROM tasks")
    task_count = c.fetchone()[0]
    
    print(f"\n✅ Done! Added {added} tasks.")
    print(f"   Total: {agent_count} agents, {task_count} tasks")
    
    conn.close()

if __name__ == "__main__":
    main()
