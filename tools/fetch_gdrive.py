"""Tải đệ quy một thư mục Google Drive công khai (chỉ các đuôi cho phép).

Chạy: python3 -I tools/fetch_gdrive.py <folder_id> <thư mục đích> [đuôi,đuôi]
"""
import html
import os
import re
import sys
import urllib.request

UA = {"User-Agent": "Mozilla/5.0"}


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read().decode("utf-8", "replace")


def walk(folder, dest, exts, depth=0):
    page = get(f"https://drive.google.com/embeddedfolderview?id={folder}")
    entries = re.findall(r'href="https://drive.google.com/(drive/folders|file/d)/([\w-]+)[^"]*"[^>]*>.*?class="flip-entry-title">([^<]+)', page, re.S)
    for kind, fid, name in entries:
        name = html.unescape(name).strip()
        if kind == "drive/folders":
            if depth < 4 and name not in ("Blends", "FBX", "OBJ", "Blend"):
                walk(fid, os.path.join(dest, name), exts, depth + 1)
            continue
        if not any(name.lower().endswith(e) for e in exts):
            continue
        out = os.path.join(dest, name)
        if os.path.exists(out):
            continue
        os.makedirs(dest, exist_ok=True)
        url = f"https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t"
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r, open(out + ".part", "wb") as f:
            while chunk := r.read(1 << 16):
                f.write(chunk)
        os.replace(out + ".part", out)
        print(out, os.path.getsize(out) // 1024, "KB", flush=True)


if __name__ == "__main__":
    exts = (sys.argv[3] if len(sys.argv) > 3 else ".gltf,.glb,.bin,.png,.txt").split(",")
    walk(sys.argv[1], sys.argv[2], exts)
