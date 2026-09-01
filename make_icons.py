"""Cute Magie-Turm Icons: pastell Lila Turm mit Stern, girly."""
from PIL import Image, ImageDraw

def make_icon(size, path):
    s = size
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Hintergrund: runde Ecken, Verlauf simulieren mit Banden
    r = int(s * 0.18)
    d.rounded_rectangle([0, 0, s, s], radius=r, fill=(155, 135, 245))  # Lila
    # oberer heller Himmel
    d.rounded_rectangle([0, 0, s, int(s*0.45)], radius=r, fill=(120, 100, 220))
    d.rectangle([0, int(s*0.25), s, int(s*0.45)], fill=(120, 100, 220))
    # Mond
    mr = int(s * 0.09)
    mx, my = int(s * 0.78), int(s * 0.16)
    d.ellipse([mx-mr, my-mr, mx+mr, my+mr], fill=(255, 240, 200))
    d.ellipse([mx-mr*0.75+mr*0.5, my-mr, mx+mr*1.25, my+mr], fill=(120, 100, 220))
    # kleine Hintergrundssterne
    for (sx, sy, ss) in [(0.15,0.12,0.02),(0.35,0.08,0.015),(0.55,0.15,0.018),(0.25,0.25,0.012)]:
        sr = int(s*ss)
        d.ellipse([s*sx-sr, s*sy-sr, s*sx+sr, s*sy+sr], fill=(255,255,255))
    # Wiese
    d.rounded_rectangle([0, int(s*0.8), s, s], radius=r, fill=(140, 210, 120))
    d.rectangle([0, int(s*0.8), s, int(s*0.9)], fill=(140, 210, 120))
    # Turm: Schaft
    tw = int(s * 0.3)
    tx0, tx1 = (s - tw)//2, (s + tw)//2
    ty0, ty1 = int(s*0.32), int(s*0.82)
    d.rounded_rectangle([tx0, ty0, tx1, ty1], radius=int(s*0.03), fill=(245, 238, 255), outline=(120, 90, 200), width=max(2, s//128))
    # Fenster
    fr = int(s*0.045)
    d.ellipse([s//2-fr, int(s*0.45)-fr, s//2+fr, int(s*0.45)+fr], fill=(255, 220, 120))
    d.ellipse([s//2-fr, int(s*0.6)-fr, s//2+fr, int(s*0.6)+fr], fill=(255, 220, 120))
    # Dach
    d.polygon([(tx0 - int(s*0.05), ty0), (tx1 + int(s*0.05), ty0), (s//2, int(s*0.14))], fill=(199, 125, 255), outline=(120, 90, 200))
    # Fahne + Stern
    pole_x = s//2
    d.line([pole_x, int(s*0.14), pole_x, int(s*0.08)], fill=(120, 90, 200), width=max(2, s//100))
    star_r = int(s*0.045)
    sx, sy = pole_x + int(s*0.05), int(s*0.085)
    import math
    pts = []
    for i in range(10):
        ang = -math.pi/2 + i * math.pi/5
        rad = star_r if i % 2 == 0 else star_r*0.45
        pts.append((sx + rad*math.cos(ang), sy + rad*math.sin(ang)))
    d.polygon(pts, fill=(255, 210, 60))
    # Zauberer-Emoji-Anmutung: kleiner Hut über Turm-Basis? Nein - Wichtel-Hut links unten weglassen, clean halten.
    img.save(path)
    print(path, img.size)

make_icon(192, 'icon-192.png')
make_icon(512, 'icon-512.png')
