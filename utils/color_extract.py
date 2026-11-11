import requests
from io import BytesIO
from collections import Counter
from PIL import Image
import colorsys

FALLBACK_COLOR = '#8B7355'

RICH_DARKS = [
    (58, 36, 48),   # plum
    (32, 48, 60),   # navy
    (48, 36, 28),   # espresso
    (36, 52, 44),   # forest
    (60, 32, 32),   # mahogany
    (44, 40, 56),   # slate purple
]


def _score_color(r, g, b, count, max_count):
    _, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    freq = count / max_count
    brightness_bonus = 0.2 if 0.15 < v < 0.85 else 0
    return s * 0.5 + freq * 0.3 + brightness_bonus


def _ensure_visible(r, g, b):
    """If the color is too dark or too gray, boost it into a usable range."""
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)

    if v < 0.18:
        idx = int(h * len(RICH_DARKS)) % len(RICH_DARKS)
        return RICH_DARKS[idx]

    if v < 0.3:
        v = 0.3
    if s < 0.08 and v < 0.5:
        s = 0.15

    nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
    return (int(nr * 255), int(ng * 255), int(nb * 255))


def _lighten(r, g, b):
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    v = min(v + 0.15, 1.0)
    nr, ng, nb = colorsys.hsv_to_rgb(h, s, v)
    return (int(nr * 255), int(ng * 255), int(nb * 255))


def extract_dominant_color(image_url):
    try:
        resp = requests.get(image_url, timeout=8)
        resp.raise_for_status()
    except requests.RequestException:
        return FALLBACK_COLOR

    try:
        img = Image.open(BytesIO(resp.content)).convert('RGB')
        w, h = img.size

        # Sample left 25% and a center strip for better coverage
        left = img.crop((0, int(h * 0.05), max(1, int(w * 0.25)), int(h * 0.95)))
        center = img.crop((int(w * 0.35), int(h * 0.2), int(w * 0.65), int(h * 0.8)))

        left = left.resize((12, 60))
        center = center.resize((8, 40))
        pixels = list(left.getdata()) + list(center.getdata())

        quantized = [(r // 20 * 20, g // 20 * 20, b // 20 * 20) for r, g, b in pixels]
        filtered = [
            (r, g, b) for r, g, b in quantized
            if not (r > 230 and g > 230 and b > 230)
        ]
        if not filtered:
            filtered = quantized
        if not filtered:
            return FALLBACK_COLOR

        counts = Counter(filtered)
        top = counts.most_common(8)
        max_count = top[0][1]

        best_color = max(top, key=lambda c: _score_color(*c[0], c[1], max_count))[0]
        r, g, b = _ensure_visible(*best_color)
        r, g, b = _lighten(r, g, b)
        return '#{:02x}{:02x}{:02x}'.format(r, g, b)
    except Exception:
        return FALLBACK_COLOR
