"""Tải gói free (giá 0) từ itch.io qua đúng luồng "No thanks, just take me to the downloads".

Chạy:  python3 -I tools/fetch_itch.py <dev> <slug> <tên file chứa chữ này> <thư mục đích>
Ví dụ: python3 -I tools/fetch_itch.py quaternius universal-base-characters Standard vendor_dl/ubc
"""
import http.cookiejar
import json
import os
import re
import sys
import urllib.parse
import urllib.request

UA = {"User-Agent": "Mozilla/5.0"}
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def req(url, data=None):
    body = urllib.parse.urlencode(data).encode() if data is not None else None
    with opener.open(urllib.request.Request(url, data=body, headers=UA), timeout=120) as r:
        return r.read().decode("utf-8", "replace")


def csrf(html):
    return re.search(r'name="csrf_token" value="([^"]+)"', html).group(1)


def main(dev, slug, want, dest):
    base = f"https://{dev}.itch.io/{slug}"
    page = req(base + "/purchase")
    dl_page_url = json.loads(req(base + "/download_url", {"csrf_token": csrf(page)}))["url"]
    dl_page = req(dl_page_url)
    tok = csrf(dl_page)
    uploads = re.findall(r'data-upload_id="(\d+)".*?title="([^"]+)"', dl_page, re.S)
    os.makedirs(dest, exist_ok=True)
    for uid, name in uploads:
        if want not in name:
            continue
        out = os.path.join(dest, name.replace("[", "_").replace("]", "").replace(" ", "_"))
        if os.path.exists(out):
            print("có rồi:", out)
            continue
        try:
            url = json.loads(req(f"{base}/file/{uid}?source=game_download", {"csrf_token": tok}))["url"]
        except Exception as e:  # noqa: BLE001 - gói trả phí: bỏ qua
            print("bỏ qua (không miễn phí):", name, e)
            continue
        print("tải", name, "->", out, flush=True)
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=600) as r, open(out + ".part", "wb") as f:
            while chunk := r.read(1 << 16):
                f.write(chunk)
        os.replace(out + ".part", out)
        print("xong", os.path.getsize(out) // 1_000_000, "MB", flush=True)


if __name__ == "__main__":
    main(*sys.argv[1:5])
