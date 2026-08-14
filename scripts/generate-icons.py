from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "icons"


def build(size: int, maskable: bool = False) -> Image.Image:
    image = Image.new("RGB", (size, size), "#315c87")
    draw = ImageDraw.Draw(image)
    scale = size / 512
    pad = int((102 if maskable else 72) * scale)
    draw.ellipse((pad, pad, size - pad, size - pad), outline="#dceafb", width=max(4, int(24 * scale)))
    center = size // 2
    width = max(5, int(28 * scale))
    draw.line((center, int(128 * scale), center, center), fill="white", width=width)
    draw.line((center, center, int(344 * scale), int(307 * scale)), fill="white", width=width)
    radius = max(4, int(20 * scale))
    draw.ellipse((center - radius, center - radius, center + radius, center + radius), fill="white")
    draw.line((int(126 * scale), int(379 * scale), int(386 * scale), int(379 * scale)), fill="#8fc4d7", width=max(4, int(18 * scale)))
    return image


OUT.mkdir(parents=True, exist_ok=True)
build(192).save(OUT / "icon-192.png", optimize=True)
build(512).save(OUT / "icon-512.png", optimize=True)
build(512, maskable=True).save(OUT / "icon-maskable.png", optimize=True)
