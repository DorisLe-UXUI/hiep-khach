"""Lồng tiếng tiếng Anh cho toàn bộ thoại bằng Kokoro-82M (chạy trên máy, Apache-2.0).

Chạy bằng Python của bộ TTS trong ~/ai:
  HF_HOME=~/ai/.hf HF_HUB_OFFLINE=1 ~/ai/tts/en.venv/bin/python -I tools/voice_gen.py lines.json en.json
Ra: public/assets/voice/<khoá>.mp3 và src/story/voice.js (bảng khoá → file, phụ đề tiếng Anh).
Khoá = FNV-1a 32 bit của câu tiếng Việt gốc (giống hàm voiceKey trong game).
"""
import json, os, re, subprocess, sys, tempfile
import numpy as np
import soundfile as sf
from huggingface_hub import snapshot_download
from mlx_audio.tts.utils import load_model

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public/assets/voice")
FF = os.path.join(ROOT, "node_modules/ffmpeg-static/ffmpeg")
MODEL = "mlx-community/Kokoro-82M-bf16"

VOICE = {
    "narrator": "bm_fable", "maiden": "bf_emma", "keeper": "am_santa", "doba": "am_fenrir", "villain": "bm_george",
    "hanbang": "bf_isabella", "guard": "bm_lewis", "villager": "am_eric", "captive": "af_jessica",
    "merchant": "am_puck", "smith": "am_onyx", "apothecary": "af_kore", "auctioneer": "am_echo", "trainer": "am_adam",
    "mentor": "bm_daniel", "herald": "am_michael", "fisher": "am_echo", "matchmaker": "af_sarah", "steward": "am_eric",
}
HERO = {"m": "am_liam", "f": "af_nova"}
NARRATE = {32, 36, 49, 50, 65, 79, 81}  # câu tả cảnh: người dẫn truyện đọc


def fnv(s: str) -> str:
    h = 0x811C9DC5
    b = s.encode("utf-16-le")
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def main():
    lines = json.load(open(sys.argv[1]))
    en = json.load(open(sys.argv[2]))
    model = load_model(MODEL)
    vdir = os.path.join(snapshot_download(MODEL, local_files_only=True), "voices")
    table = {}
    for i, l in enumerate(lines):
        t = en.get(str(i))
        if not t or not t.strip(".… !"):
            continue
        key = fnv(l["vi"])
        sp = "narrator" if i in NARRATE else l["sp"]
        jobs = [("m", HERO["m"]), ("f", HERO["f"])] if sp == "hero" else [("", VOICE.get(sp, "am_eric"))]
        entry = {"en": t, "sp": sp}
        for suf, voice in jobs:
            name = f"{key}{('_' + suf) if suf else ''}"
            mp3 = os.path.join(OUT, name + ".mp3")
            if not os.path.exists(mp3):
                gen = model.generate(text=t, voice=os.path.join(vdir, voice + ".safetensors"), speed=1.0, lang_code=voice[0])
                audio = np.concatenate([np.asarray(r.audio) for r in gen])
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                    sf.write(f.name, audio, model.sample_rate)
                    subprocess.run([FF, "-v", "error", "-y", "-i", f.name, "-ac", "1", "-b:a", "48k", mp3], check=True)
                    os.unlink(f.name)
            entry[suf or "v"] = name
        table[key] = entry
        print(i, sp, name, flush=True)
    js = "/** Lồng tiếng tiếng Anh (Kokoro, tạo bằng tools/voice_gen.py). Khoá = voiceKey(câu tiếng Việt gốc). */\nexport const VOICE_LINES = " + json.dumps(table, ensure_ascii=False, indent=0) + ";\n"
    open(os.path.join(ROOT, "src/story/voice.js"), "w").write(js)
    print("xong", len(table), "câu")


main()
