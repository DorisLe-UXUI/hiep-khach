"""Trích path SVG từ game-icons.net (CC BY 3.0) -> src/ui/gameicons.js"""
import json, os, re, sys
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'vendor_dl', 'gameicons', 'icons-master')
MAP = {
  'sword': 'delapouite/katana', 'dash': 'lorc/spinning-sword', 'palm': 'lorc/magic-palm', 'cloud': 'delapouite/jump-across',
  'roll': 'felbrigg/dodge', 'potion': 'delapouite/health-potion', 'shield': 'lorc/checked-shield', 'scroll': 'lorc/scroll-unfurled',
  'bag': 'lorc/knapsack', 'gear': 'lorc/gears', 'keys': 'delapouite/settings-knobs', 'quill': 'delapouite/scroll-quill',
  'play': 'delapouite/checkered-flag', 'plus': 'delapouite/flag-objective', 'book': 'lorc/open-book', 'map': 'lorc/treasure-map',
  'door': 'delapouite/exit-door', 'heart': 'zeromancer/heart-plus', 'qi': 'delapouite/yin-yang', 'wave': 'lorc/wind-slap',
  'star': 'delapouite/sparkles', 'skull': 'lorc/skull-crossed-bones', 'user': 'delapouite/character', 'lock': 'lorc/padlock',
  'lotus': 'lorc/lotus', 'volume': 'delapouite/speaker', 'eye': 'lorc/magnifying-glass', 'sun': 'badges/sun', 'moon': 'lorc/moon',
  'present': 'delapouite/present', 'calendar': 'delapouite/calendar', 'podium': 'delapouite/podium', 'trophy': 'lorc/trophy',
  'pagoda': 'delapouite/pagoda', 'robe': 'lorc/robe', 'rings': 'lorc/linked-rings', 'hearts': 'skoll/hearts', 'cauldron': 'lorc/cauldron',
  'horse': 'delapouite/horse-head', 'dog': 'delapouite/sitting-dog', 'coins': 'delapouite/two-coins', 'bow': 'delapouite/bow-arrow',
  'spear': 'lorc/spear-hook', 'temple': 'delapouite/temple-gate', 'dragon': 'faithtoken/dragon-head', 'duel': 'lorc/sword-clash',
  'anvil': 'lorc/anvil-impact', 'scales': 'lorc/scales', 'herb': 'lorc/mushroom-gills', 'flask': 'lorc/round-bottom-flask',
  'chest': 'skoll/open-chest', 'crown': 'lorc/crown', 'meditation': 'lorc/meditation', 'sparkles': 'delapouite/sparkles',
  'guards': 'delapouite/guards', 'village': 'delapouite/village', 'tower': 'delapouite/tower-flag', 'fist': 'lorc/punch-blast',
  'hood': 'lorc/hood', 'compass': 'lorc/compass', 'save': 'delapouite/save', 'hourglass': 'lorc/hourglass', 'gift': 'delapouite/present',
  'battle': 'lorc/battle-gear', 'fish': 'delapouite/fishing', 'rod': 'delapouite/fishing-pole', 'ore': 'faithtoken/ore', 'wood': 'delapouite/wood-pile',
  'axe': 'lorc/axe-in-stump', 'mining': 'lorc/mining', 'home': 'delapouite/family-house', 'team': 'delapouite/three-friends', 'baby': 'delapouite/baby-face',
  'swords': 'lorc/crossed-swords', 'gavel': 'lorc/gavel', 'meal': 'delapouite/meal', 'nugget': 'delapouite/gold-nuggets', 'wizard': 'delapouite/wizard-face', 'ancient': 'delapouite/ancient-sword', 'shuriken': 'lorc/shuriken', 'fox': 'lorc/fox-head', 'flower': 'delapouite/flower-emblem',
}
out = {}
for k, rel in MAP.items():
    svg = open(os.path.join(SRC, rel + '.svg')).read()
    paths = re.findall(r'<path[^>]*\sd="([^"]+)"', svg)
    # path đầu tiên thường là nền vuông "M0 0h512v512H0z"
    paths = [p for p in paths if not re.fullmatch(r'M0 0h512v512H0z', p.strip())]
    out[k] = ' '.join(paths)
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'ui', 'gameicons.js')
with open(dst, 'w') as f:
    f.write('// Trích từ game-icons.net (CC BY 3.0: Lorc, Delapouite, Skoll, Felbrigg, Zeromancer, Faithtoken, Badges). Sinh bởi tools/build_icons.py\n')
    f.write('export const GAME_ICONS = ' + json.dumps(out, ensure_ascii=False) + ';\n')
print(len(out), 'icons,', os.path.getsize(dst)//1024, 'KB')
