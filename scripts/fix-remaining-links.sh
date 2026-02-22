#!/bin/bash
source ~/.zshrc 2>/dev/null

SKIM="https://go.skimresources.com?id=126066X1587416&xs=1&url="

fix_slug() {
  local slug="$1"
  local replacement="$2"
  
  # Search for posts containing this slug (with timeout)
  local posts=$(curl -s --max-time 30 \
    "https://wetried.it/wp-json/wp/v2/posts?per_page=100&status=publish,draft&search=$slug" \
    -u "triedit:$WP_APP_PASSWORD" \
    -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")
  
  echo "$posts" | python3 -c "
import json, sys, os, subprocess, tempfile

posts = json.load(sys.stdin)
slug = '$slug'
replacement = '''$replacement'''

for post in posts:
    pid = post['id']
    title = post.get('title',{}).get('rendered','')[:50]
    content = post.get('content',{}).get('rendered','')
    
    patterns = [
        f'https://wetried.it/recommends/{slug}/',
        f'https://wetried.it/recommends/{slug}',
        f'/recommends/{slug}/',
        f'/recommends/{slug}',
    ]
    
    fix_count = 0
    for pat in patterns:
        if pat in content:
            c = content.count(pat)
            content = content.replace(pat, replacement)
            fix_count += c
    
    if fix_count > 0:
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump({'content': content}, f)
            tmpfile = f.name
        
        result = subprocess.run([
            'curl', '-s', '--max-time', '60', '-X', 'POST',
            f'https://wetried.it/wp-json/wp/v2/posts/{pid}',
            '-u', f'triedit:{os.environ[\"WP_APP_PASSWORD\"]}',
            '-H', 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            '-H', 'Content-Type: application/json',
            '-d', f'@{tmpfile}'
        ], capture_output=True, text=True, timeout=90)
        
        os.unlink(tmpfile)
        
        try:
            resp = json.loads(result.stdout)
            if 'id' in resp:
                print(f'  ✅ {pid}|{title}|{slug}|{fix_count} links')
            else:
                print(f'  ❌ {pid}|{title}|{slug}|API error')
        except:
            print(f'  ⏱️ {pid}|{title}|{slug}|timeout (will retry)')
" 2>/dev/null
}

echo "=== Fixing remaining broken links ==="
echo ""

echo "--- abc-pants-overall → lululemon pants ---"
fix_slug "abc-pants-overall" "${SKIM}https%3A%2F%2Fshop.lululemon.com%2Fc%2Fmen-pants%2F"

echo "--- lululemon-6 → lululemon home ---"
fix_slug "lululemon-6" "${SKIM}https%3A%2F%2Fshop.lululemon.com%2F"

echo "--- lululemon-comission-shorts → lululemon shorts ---"
fix_slug "lululemon-comission-shorts" "${SKIM}https%3A%2F%2Fshop.lululemon.com%2Fc%2Fmen-shorts%2F"

echo "--- skimresources-83 → lululemon ---"
fix_slug "skimresources-83" "${SKIM}https%3A%2F%2Fshop.lululemon.com%2F"

echo "--- skimresources-167 → rhone ---"
fix_slug "skimresources-167" "${SKIM}https%3A%2F%2Fwww.rhone.com%2F"

echo "--- fabletics-sign-up → fabletics ---"
fix_slug "fabletics-sign-up" "${SKIM}https%3A%2F%2Fwww.fabletics.com%2F"

echo "--- only-pants-fabletics → fabletics ---"
fix_slug "only-pants-fabletics" "${SKIM}https%3A%2F%2Fwww.fabletics.com%2F"

echo "--- flint-tinder-365-chino-pant → huckberry ---"
fix_slug "flint-tinder-365-chino-pant" "${SKIM}https%3A%2F%2Fhuckberry.com%2Fstore%2Fflint-and-tinder"

echo "--- wolf-shepherd → wolfandshepherd ---"
fix_slug "wolf-shepherd" "${SKIM}https%3A%2F%2Fwww.wolfandshepherd.com%2F"

echo "--- public-rec-workday-pants-222 → publicrec ---"
fix_slug "public-rec-workday-pants-222" "${SKIM}https%3A%2F%2Fwww.publicrec.com%2F"

echo "--- g4scooter → kugoo ---"
fix_slug "g4scooter" "${SKIM}https%3A%2F%2Fwww.kugooscooterusa.com%2F"

echo "--- movcan-v30pro → movcan ---"
fix_slug "movcan-v30pro" "${SKIM}https%3A%2F%2Fmovcan-bike.com%2F"

echo "--- aventon-black-friday-sale → aventon ---"
fix_slug "aventon-black-friday-sale" "${SKIM}https%3A%2F%2Fwww.aventon.com%2F"

echo "--- crz-yoga-men-pants → amazon ---"
fix_slug "crz-yoga-men-pants" "https://www.amazon.com/s?k=CRZ+YOGA+men+pants&tag=wetried-20"

echo "--- radrover → radpowerbikes ---"
fix_slug "radrover" "${SKIM}https%3A%2F%2Fwww.radpowerbikes.com%2F"

echo "--- radpowerbikes-2 → radpowerbikes ---"
fix_slug "radpowerbikes-2" "${SKIM}https%3A%2F%2Fwww.radpowerbikes.com%2F"

echo "--- skimresources-11 → radpowerbikes ---"
fix_slug "skimresources-11" "${SKIM}https%3A%2F%2Fwww.radpowerbikes.com%2F"

echo "--- retry: post 1259 allbirds-wool-lounger ---"
fix_slug "allbirds-wool-lounger" "${SKIM}https%3A%2F%2Fwww.allbirds.com%2F"

echo ""
echo "=== ALL DONE ==="
