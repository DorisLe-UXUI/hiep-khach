"""Tìm & tải model CC0 có animation trên poly.pizza (mặc định của Quaternius).

Chạy: python3 -I tools/fetch_polypizza.py <thư mục đích> "Tên 1" "Tên 2" ...
In ra: tên, tác giả, giấy phép; bỏ qua mọi thứ không phải CC0.
"""
import json, os, re, sys, urllib.parse, urllib.request

UA = {"User-Agent": "Mozilla/5.0"}
def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60) as r:
        return r.read()

def meta(mid):
    h = get(f"https://poly.pizza/m/{mid}").decode("utf-8", "replace")
    t = re.search(r'"Title":"([^"]+)"', h); c = re.search(r'"Creator":\{"Username":"([^"]+)"', h)
    l = re.search(r'"Licence":"([^"]+)"', h); a = re.search(r'"Animated":(true|false)', h)
    g = re.search(r'https://static\.poly\.pizza/[a-f0-9-]+\.glb', h)
    return dict(id=mid, title=t and t.group(1), creator=c and c.group(1), lic=l and l.group(1), anim=a and a.group(1) == "true", glb=g and g.group(0))

def main(dest, names, creator="Quaternius", need_anim=True):
    os.makedirs(dest, exist_ok=True)
    got = []
    for name in names:
        q = urllib.parse.quote(f"{name} {creator}")
        h = get(f"https://poly.pizza/search/{q}").decode("utf-8", "replace")
        ids = list(dict.fromkeys(re.findall(r'"/m/([A-Za-z0-9]+)"', h)))[:12]
        hit = None
        for mid in ids:
            m = meta(mid)
            if m["creator"] == creator and (m["lic"] or "").startswith("CC0") and (m["anim"] or not need_anim) and m["title"] and m["title"].lower().replace(" ", "") == name.lower().replace(" ", ""):
                hit = m; break
        if not hit:
            print("KHÔNG THẤY", name); continue
        out = os.path.join(dest, name.replace(" ", "_") + ".glb")
        if not os.path.exists(out):
            open(out, "wb").write(get(hit["glb"]))
        print("OK", name, hit["id"], hit["lic"], os.path.getsize(out) // 1024, "KB")
        got.append(hit)
    json.dump(got, open(os.path.join(dest, "SOURCES.json"), "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
