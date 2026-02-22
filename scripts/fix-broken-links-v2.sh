#!/bin/bash
# Fix broken Lasso affiliate links across wetried.it
# Searches for posts containing each broken slug, then replaces in content

source ~/.zshrc 2>/dev/null

SKIM="https://go.skimresources.com?id=126066X1587416\&xs=1\&url="

# Declare fixes: broken_slug|replacement_url
declare -a FIXES=(
  # Allbirds → allbirds.com homepage
  "allbirds-tree-piper|${SKIM}https%3A%2F%2Fwww.allbirds.com%2F"
  "allbirds-tree-skippers-reviews-mens-sustainable-boat-shoes-kaikoura-white|${SKIM}https%3A%2F%2Fwww.allbirds.com%2F"
  "allbirds-wool-lounger|${SKIM}https%3A%2F%2Fwww.allbirds.com%2F"
  "mens-tree-runner-go-blizzard-blizzard-sole|${SKIM}https%3A%2F%2Fwww.allbirds.com%2F"
  "mens-wool-runner-2|${SKIM}https%3A%2F%2Fwww.allbirds.com%2F"
  "skimresources-73|${SKIM}https%3A%2F%2Fwww.allbirds.com%2F"
  "skimresources-82|${SKIM}https%3A%2F%2Fwww.allbirds.com%2F"
  # Bluffworks
  "airline-pants|${SKIM}https%3A%2F%2Fwww.bluffworks.com%2F"
  # Lululemon
  "abc-pants-overall|${SKIM}https%3A%2F%2Fshop.lululemon.com%2Fc%2Fmen-pants%2F"
  "lululemon-6|${SKIM}https%3A%2F%2Fshop.lululemon.com%2F"
  "lululemon-comission-shorts|${SKIM}https%3A%2F%2Fshop.lululemon.com%2Fc%2Fmen-shorts%2F"
  "skimresources-83|${SKIM}https%3A%2F%2Fshop.lululemon.com%2F"
  # Fabletics
  "fabletics-sign-up|${SKIM}https%3A%2F%2Fwww.fabletics.com%2F"
  "only-pants-fabletics|${SKIM}https%3A%2F%2Fwww.fabletics.com%2F"
  "skimresources-8|${SKIM}https%3A%2F%2Fwww.fabletics.com%2F"
  # Alo Yoga
  "alo-airbrush-legging|${SKIM}https%3A%2F%2Fwww.aloyoga.com%2Fcollections%2Fleggings"
  "alo-moto-leggings|${SKIM}https%3A%2F%2Fwww.aloyoga.com%2Fcollections%2Fleggings"
  # Rhone
  "rhone-commuter-pant-classic|${SKIM}https%3A%2F%2Fwww.rhone.com%2F"
  "skimresources-167|${SKIM}https%3A%2F%2Fwww.rhone.com%2F"
  # Other brands
  "flint-tinder-365-chino-pant|${SKIM}https%3A%2F%2Fhuckberry.com%2Fstore%2Fflint-and-tinder"
  "wolf-shepherd|${SKIM}https%3A%2F%2Fwww.wolfandshepherd.com%2F"
  "public-rec-workday-pants-222|${SKIM}https%3A%2F%2Fwww.publicrec.com%2F"
  "g4scooter|${SKIM}https%3A%2F%2Fwww.kugooscooterusa.com%2F"
  "movcan-v30pro|${SKIM}https%3A%2F%2Fmovcan-bike.com%2F"
  "aventon-black-friday-sale|${SKIM}https%3A%2F%2Fwww.aventon.com%2F"
  "crz-yoga-men-pants|https://www.amazon.com/s?k=CRZ+YOGA+men+pants&tag=wetried-20"
  # Rad Power
  "radrover|${SKIM}https%3A%2F%2Fwww.radpowerbikes.com%2F"
  "radpowerbikes-2|${SKIM}https%3A%2F%2Fwww.radpowerbikes.com%2F"
  "skimresources-11|${SKIM}https%3A%2F%2Fwww.radpowerbikes.com%2F"
)

TOTAL_FIXES=0
TOTAL_POSTS=0

for entry in "${FIXES[@]}"; do
  slug="${entry%%|*}"
  replacement="${entry#*|}"
  
  # Search for posts containing this slug
  encoded_slug=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$slug'))")
  
  # Search published + draft posts
  posts=$(curl -s "https://wetried.it/wp-json/wp/v2/posts?per_page=100&status=publish,draft&search=$encoded_slug" \
    -u "triedit:$WP_APP_PASSWORD" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
  
  count=$(echo "$posts" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d) if isinstance(d,list) else 0)" 2>/dev/null)
  
  if [ "$count" = "0" ] || [ -z "$count" ]; then
    continue
  fi
  
  # Process each post
  echo "$posts" | python3 -c "
import json, sys, re

posts = json.load(sys.stdin)
slug = '$slug'
replacement = '$replacement'

for post in posts:
    pid = post['id']
    title = post.get('title',{}).get('rendered','')[:50]
    content = post.get('content',{}).get('rendered','')
    
    # Check if content actually contains this slug
    pattern_full = f'https://wetried.it/recommends/{slug}/'
    pattern_no_slash = f'https://wetried.it/recommends/{slug}'
    pattern_rel = f'/recommends/{slug}/'
    pattern_rel_no = f'/recommends/{slug}'
    
    fix_count = 0
    for pat in [pattern_full, pattern_no_slash, pattern_rel, pattern_rel_no]:
        if pat in content:
            c = content.count(pat)
            content = content.replace(pat, replacement)
            fix_count += c
    
    if fix_count > 0:
        print(f'FIX|{pid}|{title}|{slug}|{fix_count}')
        # Output content to temp file for update
        import tempfile, subprocess, os
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump({'content': content}, f)
            tmpfile = f.name
        
        result = subprocess.run([
            'curl', '-s', '-X', 'POST', f'https://wetried.it/wp-json/wp/v2/posts/{pid}',
            '-u', f'triedit:{os.environ[\"WP_APP_PASSWORD\"]}',
            '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            '-H', 'Content-Type: application/json',
            '-d', f'@{tmpfile}'
        ], capture_output=True, text=True)
        
        os.unlink(tmpfile)
        
        try:
            resp = json.loads(result.stdout)
            if 'id' in resp:
                print(f'  ✅ Updated post {pid}')
            else:
                print(f'  ❌ Failed: {result.stdout[:200]}')
        except:
            print(f'  ❌ Failed: {result.stdout[:200]}')
" 2>/dev/null
  
done

echo ""
echo "Done!"
