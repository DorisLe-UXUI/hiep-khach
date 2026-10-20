"""In thông tin glb: mesh, xương, animation (tên + thời lượng)."""
import json, struct, sys
for p in sys.argv[1:]:
    b = open(p, 'rb').read()
    n = struct.unpack_from('<I', b, 12)[0]
    j = json.loads(b[20:20+n])
    print('==', p)
    print('meshes:', [m.get('name') for m in j.get('meshes', [])])
    print('materials:', [m.get('name') for m in j.get('materials', [])])
    sk = j.get('skins', [])
    if sk:
        print('bones', len(sk[0]['joints']), [j['nodes'][i]['name'] for i in sk[0]['joints']][:70])
    anims = []
    for a in j.get('animations', []):
        acc = j['accessors'][a['samplers'][0]['input']]
        anims.append(f"{a.get('name')}({acc.get('max',[0])[0]:.2f}s)")
    print('anims', len(anims), anims)
