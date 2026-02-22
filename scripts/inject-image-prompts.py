#!/usr/bin/env python3
"""
Inject sample image generation prompts below H2 headers in VS page drafts.
Prompts are styled as italic paragraphs for easy copy/paste into image gen tools.
"""

import json
import os
import re
import subprocess
import sys
import html

# VS page post IDs
POST_IDS = list(range(35467, 35506, 2))  # 35467 to 35505, odds only

WP_USER = "triedit"
WP_PASS = os.environ.get("WP_APP_PASSWORD", "")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"
BASE = "https://wetried.it/wp-json/wp/v2/posts"

def get_post(post_id):
    """Fetch a post from WP REST API."""
    result = subprocess.run(
        ["curl", "-s", f"{BASE}/{post_id}",
         "-u", f"{WP_USER}:{WP_PASS}",
         "-H", f"User-Agent: {UA}"],
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

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

def generate_prompt_for_header(title, header_text):
    """Generate a contextual image prompt based on the header and post title."""
    # Extract the two brands from the title
    title_clean = html.unescape(title).replace("\u2019", "'").replace("\u201c", '"').replace("\u201d", '"')
    header_clean = html.unescape(header_text).strip()
    
    # Try to extract brand names from title (X vs Y pattern)
    vs_match = re.match(r'^(.+?)\s+vs\.?\s+(.+?):', title_clean, re.IGNORECASE)
    brand_a = vs_match.group(1).strip() if vs_match else "Product A"
    brand_b = vs_match.group(2).strip() if vs_match else "Product B"
    
    header_lower = header_clean.lower()
    
    # Skip certain headers that don't need images
    skip_patterns = ['side-by-side comparison', 'faq', 'frequently asked', 'final verdict', 
                     'quick verdict', 'the bottom line', 'specs', 'pricing']
    if any(p in header_lower for p in skip_patterns):
        return None
    
    # Generate contextual prompts based on header content
    if any(w in header_lower for w in ['comfort', 'cushion', 'feel', 'fit']):
        return f"Flat lay product photo comparing {brand_a} and {brand_b}, focus on cushioning and interior comfort details, soft natural lighting on white marble surface, editorial product photography style"
    
    if any(w in header_lower for w in ['material', 'quality', 'build', 'construction', 'durability']):
        return f"Close-up macro photography showing material texture and construction details of {brand_a} and {brand_b} side by side, studio lighting revealing fabric weave and stitching quality"
    
    if any(w in header_lower for w in ['style', 'look', 'design', 'aesthetic', 'fashion']):
        return f"Lifestyle editorial photo of {brand_a} and {brand_b} styled in an outfit context, modern urban setting, natural daylight, fashion magazine aesthetic"
    
    if any(w in header_lower for w in ['price', 'value', 'cost', 'worth', 'budget']):
        return f"Clean product comparison layout of {brand_a} and {brand_b} with minimalist styling, price tag aesthetic, white background, sharp commercial photography"
    
    if any(w in header_lower for w in ['story', 'history', 'brand', 'philosophy', 'about']):
        return f"Brand identity flat lay for {brand_a} showing product with packaging and brand elements, moody editorial lighting, lifestyle photography"
    
    if any(w in header_lower for w in ['experience', 'journey', 'honest', 'review', 'testing', 'test']):
        return f"Candid lifestyle photo of someone testing {brand_a} and {brand_b} in real-world setting, authentic and unposed, natural lighting, relatable product review aesthetic"
    
    if any(w in header_lower for w in ['waterproof', 'weather', 'rain', 'outdoor']):
        return f"Dynamic product photo of {brand_a} and {brand_b} in wet/rainy conditions, water droplets visible on surface, moody atmospheric lighting, outdoor adventure aesthetic"
    
    if any(w in header_lower for w in ['cook', 'kitchen', 'pan', 'pot', 'food']):
        return f"Overhead kitchen scene with {brand_a} and {brand_b} cookware on marble countertop, fresh ingredients around, warm natural light from window, food blog photography style"
    
    if any(w in header_lower for w in ['bike', 'ride', 'e-bike', 'cycling']):
        return f"Side-by-side photo of {brand_a} and {brand_b} e-bikes on scenic trail path, golden hour lighting, adventure lifestyle photography"
    
    if any(w in header_lower for w in ['scent', 'fragrance', 'smell', 'aroma', 'diffuser']):
        return f"Cozy lifestyle scene with {brand_a} and {brand_b} smart diffusers in modern living room, soft bokeh lighting, hygge aesthetic with plants and candles"
    
    if any(w in header_lower for w in ['winner', 'pick', 'recommend', 'best', 'who should']):
        return f"Hero product shot of {brand_a} and {brand_b} in dramatic split-frame composition, one side warm-toned one side cool-toned, editorial comparison graphic style"
    
    if any(w in header_lower for w in ['category', 'breakdown', 'detail', 'deep dive']):
        return f"Detailed product anatomy flat lay of {brand_a} and {brand_b} with callout-style composition, clean white background, technical product photography"
    
    # Default / generic fallback
    return f"Editorial product comparison photo of {brand_a} and {brand_b}, clean modern styling on neutral background, professional studio lighting, lifestyle product review aesthetic"


def inject_prompts(post_id):
    """Fetch post, inject image prompts below H2s, update post."""
    post = get_post(post_id)
    title = post.get("title", {}).get("rendered", "")
    content = post.get("content", {}).get("rendered", "")
    
    if not content:
        print(f"  ⏭️ {post_id}: no content")
        return False
    
    # Find all H2 tags and inject prompts after them
    h2_pattern = re.compile(r'(<h2[^>]*>)(.*?)(</h2>)', re.DOTALL)
    
    modifications = 0
    
    def replacer(match):
        nonlocal modifications
        full_h2 = match.group(0)
        header_text = re.sub(r'<[^>]+>', '', match.group(2))  # strip inner HTML
        
        prompt = generate_prompt_for_header(title, header_text)
        if not prompt:
            return full_h2
        
        # Create the italic prompt paragraph
        prompt_html = f'\n\n<p><em>🖼️ Image prompt: {prompt}</em></p>\n'
        modifications += 1
        return full_h2 + prompt_html
    
    new_content = h2_pattern.sub(replacer, content)
    
    if modifications == 0:
        print(f"  ⏭️ {post_id}: no headers matched")
        return False
    
    # Update the post
    result = update_post(post_id, new_content)
    title_clean = html.unescape(title)[:60]
    print(f"  ✅ {post_id}: {title_clean} — {modifications} prompts added")
    return True


if __name__ == "__main__":
    if not WP_PASS:
        print("ERROR: WP_APP_PASSWORD not set")
        sys.exit(1)
    
    print(f"Injecting image prompts into {len(POST_IDS)} VS pages...\n")
    
    updated = 0
    for pid in POST_IDS:
        try:
            if inject_prompts(pid):
                updated += 1
        except Exception as e:
            print(f"  ❌ {pid}: {e}")
    
    print(f"\nDone: {updated}/{len(POST_IDS)} posts updated")
