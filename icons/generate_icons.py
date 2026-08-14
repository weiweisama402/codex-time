"""Generate PWA icons (192/512 PNG) with a clock motif."""
import math
import os

from PIL import Image, ImageDraw


HERE = os.path.dirname(os.path.abspath(__file__))


def hand(deg, length, cx, cy):
    a = math.radians(deg)
    x = cx + length * math.sin(a)
    y = cy - length * math.cos(a)
    return (cx, cy, x, y)


for size in (192, 512):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = int(size * 0.22)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=(59, 130, 246, 255))

    cx = cy = size / 2
    rad = size * 0.30
    lw = max(3, size // 30)
    d.ellipse(
        [cx - rad, cy - rad, cx + rad, cy + rad],
        outline=(255, 255, 255, 255),
        width=lw,
    )
    d.line(hand(300, rad * 0.5, cx, cy), fill=(255, 255, 255, 255), width=lw)
    d.line(hand(60, rad * 0.75, cx, cy), fill=(255, 255, 255, 255), width=lw)

    dot = max(4, size // 24)
    d.ellipse([cx - dot, cy - dot, cx + dot, cy + dot], fill=(255, 255, 255, 255))
    img.save(os.path.join(HERE, f"icon-{size}.png"))

print("icons generated")
