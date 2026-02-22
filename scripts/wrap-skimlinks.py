#!/usr/bin/env python3
"""Wrap all outgoing brand links in Skimlinks for specified posts."""

import json, os, re, subprocess, sys, urllib.parse

WP_USER = "triedit"
WP_PASS = os.environ.get("WP_APP_PASSWORD", "")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
BASE = "https://wetried.it/wp-json/wp/v2/posts"
SKIM = "https://go.skimresources.com?id=126066X1587416&xs=1&url="

# Domains that should be Skimlinks-wrapped
WRAP_DOMAINS = [
    "ride1up.com",
    "aventon.com",
    "radpowerbikes.com",
    "bluffworks.com",
    "allbirds.com",
]

def skim_wrap(url):
    return SKIM + urllib.parse.quote(url, safe='')

def get_post(post_id):
    result = subprocess.run(
        ["curl", "-s", f"{BASE}/{post_id}",
         "-u", f"{WP_USER}:{WP_PASS}",
         "-H", f"User-Agent: {UA}"],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

def update_post(post_id, content):
    import tempfile
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump({"content": content}, f)
        tmpfile = f.name
    
    result = subprocess.run(
        ["curl", "-s", "--max-time", "60", "-X", "POST", f"{BASE}/{post_id}",
         "-u", f"{WP_USER}:{WP_PASS}",
         "-H", f"User-Agent: {UA}",
         "-H", "Content-Type: application/json",
         "-d", f"@{tmpfile}"],
        capture_output=True, text=True
    )
    os.unlink(tmpfile)
    return json.loads(result.stdout)

def should_wrap(url):
    """Check if URL is an external brand link that needs wrapping."""
    if "skimresources.com" in url:
        return False  # already wrapped
    if "wetried.it" in url:
        return False  # internal
    for domain in WRAP_DOMAINS:
        if domain in url:
            return True
    return False

def wrap_links_in_content(content):
    """Find all href links and wrap external brand links in Skimlinks."""
    fixes = 0
    
    def replace_href(match):
        nonlocal fixes
        url = match.group(1)
        if should_wrap(url):
            fixes += 1
            return f'href="{skim_wrap(url)}"'
        return match.group(0)
    
    new_content = re.sub(r'href="(https?://[^"]+)"', replace_href, content)
    return new_content, fixes

if __name__ == "__main__":
    post_ids = [int(x) for x in sys.argv[1:]]
    if not post_ids:
        print("Usage: wrap-skimlinks.py <post_id> [post_id ...]")
        sys.exit(1)
    
    for pid in post_ids:
        post = get_post(pid)
        title = post.get("title", {}).get("rendered", "")[:50]
        content = post.get("content", {}).get("rendered", "")
        
        new_content, fixes = wrap_links_in_content(content)
        
        if fixes > 0:
            result = update_post(pid, new_content)
            if "id" in result:
                print(f"✅ Post {pid} ({title}) — {fixes} links wrapped in Skimlinks")
            else:
                print(f"❌ Post {pid} — API error: {str(result)[:200]}")
        else:
            print(f"⏭️ Post {pid} ({title}) — no unwrapped links found")
