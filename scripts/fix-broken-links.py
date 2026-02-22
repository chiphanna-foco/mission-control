#!/usr/bin/env python3
"""
Fix broken Lasso affiliate links by updating post content directly.
Replaces broken /recommends/ URLs with Skimlinks-wrapped homepage URLs.

Strategy: For discontinued product links, redirect to brand homepage via Skimlinks.
"""

import json
import os
import re
import subprocess
import sys
import urllib.parse

WP_USER = "triedit"
WP_PASS = os.environ.get("WP_APP_PASSWORD", "")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
BASE = "https://wetried.it/wp-json/wp/v2/posts"
SKIM_BASE = "https://go.skimresources.com?id=126066X1587416&xs=1&url="

def skim_wrap(url):
    """Wrap a URL in Skimlinks tracking."""
    return SKIM_BASE + urllib.parse.quote(url, safe='')

# Mapping: broken /recommends/ slug -> replacement URL
# Chip's instructions:
# - All Allbirds → Skimlinks-wrapped allbirds.com home
# - skimresources-73, skimresources-82 → allbirds.com home (they pointed to discontinued Allbirds products)
# - airline-pants → Skimlinks-wrapped bluffworks.com
# - buck-mason-tees-link → WORKS, leave alone
# - Fix all others same manner (brand homepage via Skimlinks)

FIXES = {
    # Allbirds broken links → allbirds.com homepage
    "/recommends/allbirds-tree-piper/": skim_wrap("https://www.allbirds.com/"),
    "/recommends/allbirds-tree-skippers-reviews-mens-sustainable-boat-shoes-kaikoura-white/": skim_wrap("https://www.allbirds.com/"),
    "/recommends/allbirds-wool-lounger/": skim_wrap("https://www.allbirds.com/"),
    "/recommends/mens-tree-runner-go-blizzard-blizzard-sole/": skim_wrap("https://www.allbirds.com/"),
    "/recommends/mens-wool-runner-2/": skim_wrap("https://www.allbirds.com/"),
    
    # Skimresources that pointed to discontinued Allbirds products → allbirds.com home
    "/recommends/skimresources-73/": skim_wrap("https://www.allbirds.com/"),
    "/recommends/skimresources-82/": skim_wrap("https://www.allbirds.com/"),
    
    # airline-pants → bluffworks.com
    "/recommends/airline-pants/": skim_wrap("https://www.bluffworks.com/"),
    
    # abc-pants-overall (6 posts affected!) → lululemon ABC pants collection
    "/recommends/abc-pants-overall/": skim_wrap("https://shop.lululemon.com/c/men-pants/"),
    
    # Other Lululemon broken links
    "/recommends/lululemon-6/": skim_wrap("https://shop.lululemon.com/"),
    "/recommends/lululemon-comission-shorts/": skim_wrap("https://shop.lululemon.com/c/men-shorts/"),
    "/recommends/commission-shorts/": skim_wrap("https://shop.lululemon.com/c/men-shorts/"),  # if broken
    
    # Skimresources pointing to broken product pages → brand homepages
    "/recommends/skimresources-8/": skim_wrap("https://www.fabletics.com/"),
    "/recommends/skimresources-83/": skim_wrap("https://shop.lululemon.com/"),
    "/recommends/skimresources-167/": skim_wrap("https://www.rhone.com/"),
    
    # Alo Yoga
    "/recommends/alo-airbrush-legging/": skim_wrap("https://www.aloyoga.com/collections/leggings"),
    "/recommends/alo-moto-leggings/": skim_wrap("https://www.aloyoga.com/collections/leggings"),
    
    # Fabletics
    "/recommends/fabletics-sign-up/": skim_wrap("https://www.fabletics.com/"),
    "/recommends/only-pants-fabletics/": skim_wrap("https://www.fabletics.com/"),
    
    # Other brands
    "/recommends/flint-tinder-365-chino-pant/": skim_wrap("https://huckberry.com/store/flint-and-tinder"),
    "/recommends/g4scooter/": skim_wrap("https://www.kugooscooterusa.com/"),
    "/recommends/rhone-commuter-pant-classic/": skim_wrap("https://www.rhone.com/"),
    "/recommends/wolf-shepherd/": skim_wrap("https://www.wolfandshepherd.com/"),
    "/recommends/public-rec-workday-pants-222/": skim_wrap("https://www.publicrec.com/"),
    
    # CRZ Yoga → Amazon
    "/recommends/crz-yoga-men-pants/": "https://www.amazon.com/s?k=CRZ+YOGA+men+pants&tag=wetried-20",
    
    # Aventon Black Friday → just Aventon home
    "/recommends/aventon-black-friday-sale/": skim_wrap("https://www.aventon.com/"),
    
    # Movcan
    "/recommends/movcan-v30pro/": skim_wrap("https://movcan-bike.com/"),
    
    # Rad Power timeouts → homepage
    "/recommends/radrover/": skim_wrap("https://www.radpowerbikes.com/"),
    "/recommends/radpowerbikes-2/": skim_wrap("https://www.radpowerbikes.com/"),
    "/recommends/skimresources-11/": skim_wrap("https://www.radpowerbikes.com/"),  # was likely Rad Power
}

def get_all_posts_with_broken_links():
    """Find all posts containing any of the broken link slugs."""
    # Search broadly - get all posts, then filter
    all_posts = []
    page = 1
    while True:
        result = subprocess.run(
            ["curl", "-s", f"{BASE}?per_page=100&page={page}&status=publish,draft",
             "-u", f"{WP_USER}:{WP_PASS}",
             "-H", f"User-Agent: {UA}"],
            capture_output=True, text=True
        )
        try:
            posts = json.loads(result.stdout)
            if not posts or isinstance(posts, dict):
                break
            all_posts.extend(posts)
            if len(posts) < 100:
                break
            page += 1
        except json.JSONDecodeError:
            break
    return all_posts

def fix_post(post_id, title, content):
    """Replace broken links in post content. Returns (new_content, fix_count)."""
    fixes_applied = 0
    new_content = content
    
    for broken_path, replacement_url in FIXES.items():
        # Match both with and without trailing slash, and full URLs
        patterns = [
            f"https://wetried.it{broken_path}",
            f"https://wetried.it{broken_path.rstrip('/')}",
            f"http://wetried.it{broken_path}",
            broken_path,
            broken_path.rstrip('/'),
        ]
        
        for pattern in patterns:
            if pattern in new_content:
                count = new_content.count(pattern)
                new_content = new_content.replace(pattern, replacement_url)
                fixes_applied += count
    
    return new_content, fixes_applied

def update_post(post_id, content):
    """Update post content via WP REST API."""
    result = subprocess.run(
        ["curl", "-s", "-X", "POST", f"{BASE}/{post_id}",
         "-u", f"{WP_USER}:{WP_PASS}",
         "-H", f"User-Agent: {UA}",
         "-H", "Content-Type: application/json",
         "-d", json.dumps({"content": content})],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

if __name__ == "__main__":
    if not WP_PASS:
        print("ERROR: WP_APP_PASSWORD not set")
        sys.exit(1)
    
    print(f"Scanning all posts for {len(FIXES)} broken link patterns...\n")
    
    # Get all posts
    print("Fetching posts from WordPress...")
    all_posts = get_all_posts_with_broken_links()
    print(f"Fetched {len(all_posts)} posts\n")
    
    total_fixes = 0
    posts_fixed = 0
    
    for post in all_posts:
        post_id = post['id']
        title = post.get('title', {}).get('rendered', 'Unknown')[:60]
        content = post.get('content', {}).get('rendered', '')
        
        if not content:
            continue
        
        new_content, fix_count = fix_post(post_id, title, content)
        
        if fix_count > 0:
            # Update the post
            try:
                update_post(post_id, new_content)
                print(f"  ✅ {post_id}: {title} — {fix_count} links fixed")
                total_fixes += fix_count
                posts_fixed += 1
            except Exception as e:
                print(f"  ❌ {post_id}: {title} — ERROR: {e}")
    
    print(f"\nDone: {total_fixes} links fixed across {posts_fixed} posts")
