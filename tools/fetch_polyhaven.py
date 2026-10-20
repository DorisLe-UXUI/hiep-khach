"""Tải asset CC0 từ Poly Haven vào public/assets/.

Chạy:  python3 -I tools/fetch_polyhaven.py
Model -> glTF 1k, texture -> PBR jpg 1k (diff, nor_gl, rough, ao), HDRI -> .hdr 2k.
Tải lại an toàn: file nào có rồi thì bỏ qua.
"""
import json
import os
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "assets")
API = "https://api.polyhaven.com/files/"
UA = {"User-Agent": "hiep-khach-asset-fetch/1.0"}

MODELS = [
    # nội thất / khách điếm
    "chinese_armchair", "chinese_cabinet", "chinese_chandelier", "chinese_commode",
    "chinese_console_table", "chinese_screen_panels", "chinese_sofa", "chinese_stool",
    "chinese_tea_table", "tea_set_01", "antique_ceramic_vase_01", "ceramic_vase_01",
    "ceramic_vase_03", "jug_01", "wooden_bowl_01", "wooden_bowl_02", "brass_pot_01",
    "wooden_lantern_01", "Lantern_01", "lantern_chandelier_01", "wooden_candlestick",
    "round_wooden_table_01", "folding_wooden_stool", "wooden_stool_01", "wooden_stool_02",
    "wine_barrel_01", "wooden_barrels_01", "Barrel_01", "wooden_bucket_01", "wooden_bucket_02",
    "wooden_crate_01", "wooden_crate_02", "wicker_basket_01", "wicker_basket_02",
    "treasure_chest", "stone_fire_pit", "fishermans_hat", "spinning_wheel_01",
    "wooden_picnic_table", "painted_wooden_bench", "wooden_ladder",
    # binh khí
    "antique_katana_01", "katana_stand_01", "wooden_handle_saber", "hatchet", "wooden_axe",
    "machete",
    # thiên nhiên
    "fir_tree_01", "fir_sapling", "tree_small_02",
    "jacaranda_tree", "island_tree_02", "dead_tree_trunk", "dead_tree_trunk_02",
    "tree_stump_01", "tree_stump_02", "shrub_01", "shrub_02", "shrub_03", "shrub_04", "fern_02",
    "grass_medium_01", "grass_medium_02", "grass_bermuda_01", "nettle_plant", "moss_01",
    "boulder_01", "rock_07", "rock_09", "rock_moss_set_01", "rock_moss_set_02",
    "rock_face_01", "rock_face_02", "mountainside", "stone_01", "namaqualand_boulder_02",
    "namaqualand_boulder_04", "root_cluster_01", "pine_roots", "dry_branches_medium_01",
    "bark_debris_01", "modular_wooden_pier", "horse_statue_01",
]

TEXTURES = [
    # địa hình
    "forest_ground_04", "forest_leaves_02", "leafy_grass", "grass_path_2", "rocky_trail",
    "brown_mud_leaves_01", "stony_dirt_path", "mossy_rock", "rock_face_03",
    # kiến trúc
    "clay_roof_tiles_02", "grey_roof_tiles", "ceramic_roof_01", "dark_wooden_planks",
    "weathered_brown_planks", "japanese_cedar_planks", "hinoki_planks", "wood_planks",
    "clay_plaster", "white_plaster_rough_01", "worn_mossy_plasterwall", "japanese_stone_wall",
    "mossy_stone_wall", "stone_tiles", "grey_stone_path", "mossy_cobblestone", "bamboo_wall",
    "red_plaster_weathered", "thatch_roof_angled",
]

HDRIS = [
    "kloofendal_misty_morning_puresky", "misty_pines", "kloofendal_28d_misty_puresky",
    "lakeside_dawn", "sunset_forest", "lakeside_night", "table_mountain_1_puresky",
]

TEX_MAPS = {"Diffuse": "diff", "nor_gl": "nor", "Rough": "rough", "AO": "ao"}


def get_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
        return json.load(r)


def download(url, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return 0
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = dest + ".part"
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r, open(tmp, "wb") as f:
        want = int(r.headers.get("Content-Length") or 0)
        while chunk := r.read(1 << 16):
            f.write(chunk)
    if want and os.path.getsize(tmp) != want:
        raise IOError(f"tải thiếu {os.path.getsize(tmp)}/{want} byte")
    os.replace(tmp, dest)
    return os.path.getsize(dest)


def pick(d, *res):
    for r in res:
        if r in d:
            return d[r]
    return None


def fetch_model(name):
    files = get_json(API + name)
    g = pick(files["gltf"], "1k", "2k")["gltf"]
    base = os.path.join(ROOT, "..", "..", "vendor_dl", "polyhaven", "models", name)
    n = download(g["url"], os.path.join(base, name + ".gltf"))
    for rel, inc in g.get("include", {}).items():
        n += download(inc["url"], os.path.join(base, rel))
    return n


def fetch_texture(name):
    files = get_json(API + name)
    n = 0
    for key, short in TEX_MAPS.items():
        if key not in files:
            continue
        f = pick(files[key], "1k", "2k")["jpg"]
        n += download(f["url"], os.path.join(ROOT, "textures", name, f"{short}.jpg"))
    return n


def fetch_hdri(name):
    files = get_json(API + name)
    f = pick(files["hdri"], "2k", "1k")["hdr"]
    return download(f["url"], os.path.join(ROOT, "hdri", name + ".hdr"))


def run(kind, fn, names):
    def one(name):
        try:
            return name, fn(name), None
        except Exception as e:  # noqa: BLE001 - báo lỗi từng asset, không dừng cả mẻ
            return name, 0, e

    total = 0
    with ThreadPoolExecutor(6) as ex:
        for name, n, err in ex.map(one, names):
            total += n
            print(f"[{kind}] {name}: " + (f"LỖI {err}" if err else f"{n/1e6:.1f} MB"), flush=True)
    return total


if __name__ == "__main__":
    only = set(sys.argv[1:])
    total = 0
    if not only or "hdri" in only:
        total += run("hdri", fetch_hdri, HDRIS)
    if not only or "textures" in only:
        total += run("tex", fetch_texture, TEXTURES)
    if not only or "models" in only:
        total += run("model", fetch_model, MODELS)
    print(f"Xong: {total/1e6:.0f} MB mới tải")
