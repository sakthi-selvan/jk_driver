#!/usr/bin/env python3
"""Generate JK Taxi Driver brand assets for Expo / Play Store / App Store."""
from __future__ import annotations

import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, "assets", "images")
PLAY = os.path.join(ROOT, "playstore-assets")

BRAND_BLUE = (11, 58, 138)  # #0B3A8A
YELLOW = (255, 200, 0)


def try_font(size: int) -> ImageFont.ImageFont:
    for path in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def load_logo() -> Image.Image:
    logo = Image.open(os.path.join(BASE, "jk_taxi_logo.png")).convert("RGBA")
    bbox = logo.getbbox()
    return logo.crop(bbox) if bbox else logo


def fit_logo(logo: Image.Image, target_w: int, target_h: int, pad_ratio: float = 0.12) -> Image.Image:
    max_w = int(target_w * (1 - 2 * pad_ratio))
    max_h = int(target_h * (1 - 2 * pad_ratio))
    lw, lh = logo.size
    scale = min(max_w / lw, max_h / lh)
    nw, nh = max(1, int(lw * scale)), max(1, int(lh * scale))
    return logo.resize((nw, nh), Image.Resampling.LANCZOS)


def draw_driver_badge(canvas: Image.Image, y_frac: float = 0.82) -> Image.Image:
    draw = ImageDraw.Draw(canvas)
    font = try_font(max(28, canvas.width // 18))
    text = "DRIVER"
    tb = draw.textbbox((0, 0), text, font=font)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    pad_x, pad_y = 28, 12
    bw, bh = tw + pad_x * 2, th + pad_y * 2
    bx = (canvas.width - bw) // 2
    by = min(int(canvas.height * y_frac) - bh // 2, canvas.height - bh - 24)
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=bh // 2, fill=YELLOW)
    draw.text((bx + (bw - tw) // 2 - tb[0], by + (bh - th) // 2 - tb[1]), text, font=font, fill=BRAND_BLUE)
    return canvas


def to_white(img: Image.Image) -> Image.Image:
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a > 20:
                px[x, y] = (255, 255, 255, a)
    return out


def main() -> None:
    os.makedirs(PLAY, exist_ok=True)
    logo = load_logo()

    # App icon
    icon = Image.new("RGBA", (1024, 1024), (*BRAND_BLUE, 255))
    fitted = fit_logo(logo, 1024, 1024, pad_ratio=0.18)
    layer = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    x = (1024 - fitted.width) // 2
    y = max(80, int(1024 * 0.28) - fitted.height // 2)
    layer.alpha_composite(fitted, (x, y))
    icon = Image.alpha_composite(icon, layer)
    icon = draw_driver_badge(icon, y_frac=0.78)
    icon.convert("RGB").save(os.path.join(BASE, "icon.png"), optimize=True)

    # Adaptive foreground
    fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    fitted = fit_logo(logo, 680, int(680 * 0.55), pad_ratio=0.02)
    layer = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    x = (1024 - fitted.width) // 2
    y = int(1024 * 0.38) - fitted.height // 2
    layer.alpha_composite(fitted, (x, y))
    fg = Image.alpha_composite(fg, layer)
    fg = draw_driver_badge(fg, y_frac=0.72)
    fg.save(os.path.join(BASE, "android-icon-foreground.png"), optimize=True)

    Image.new("RGB", (1024, 1024), BRAND_BLUE).save(
        os.path.join(BASE, "android-icon-background.png"), optimize=True
    )

    # Monochrome
    mono = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    white = to_white(fitted)
    layer = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    layer.alpha_composite(white, (x, y))
    mono = Image.alpha_composite(mono, layer)
    draw = ImageDraw.Draw(mono)
    font = try_font(max(28, 1024 // 18))
    text = "DRIVER"
    tb = draw.textbbox((0, 0), text, font=font)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    pad_x, pad_y = 28, 12
    bw, bh = tw + pad_x * 2, th + pad_y * 2
    bx = (1024 - bw) // 2
    by = int(1024 * 0.72) - bh // 2
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=bh // 2, fill=(255, 255, 255, 255))
    mono.save(os.path.join(BASE, "android-icon-monochrome.png"), optimize=True)

    # Splash icon
    splash_icon = Image.new("RGBA", (1024, 1024), (*BRAND_BLUE, 255))
    fitted = fit_logo(logo, 1024, 1024, pad_ratio=0.22)
    layer = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    layer.alpha_composite(fitted, ((1024 - fitted.width) // 2, (1024 - fitted.height) // 2 - 20))
    splash_icon = Image.alpha_composite(splash_icon, layer)
    splash_icon = draw_driver_badge(splash_icon, y_frac=0.80)
    splash_icon.save(os.path.join(BASE, "splash-icon.png"), optimize=True)

    # Full splash
    sw, sh = 1284, 2778
    splash = Image.new("RGBA", (sw, sh), (*BRAND_BLUE, 255))
    fitted = fit_logo(logo, int(sw * 0.78), int(sh * 0.22), pad_ratio=0.0)
    layer = Image.new("RGBA", (sw, sh), (0, 0, 0, 0))
    layer.alpha_composite(fitted, ((sw - fitted.width) // 2, int(sh * 0.38) - fitted.height // 2))
    splash = Image.alpha_composite(splash, layer)
    splash = draw_driver_badge(splash, y_frac=0.52)
    splash.convert("RGB").save(os.path.join(BASE, "splash.png"), optimize=True)

    # Favicons
    for size, name in ((48, "favicon.png"), (192, "favicon-192.png")):
        icon.resize((size, size), Image.Resampling.LANCZOS).convert("RGB").save(
            os.path.join(BASE, name), optimize=True
        )

    # Notification icon
    notif = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    small = to_white(fit_logo(logo, 96, 96, pad_ratio=0.15))
    notif.alpha_composite(small, ((96 - small.width) // 2, (96 - small.height) // 2))
    notif.save(os.path.join(BASE, "notification-icon.png"), optimize=True)

    # Header logo for in-app login
    header = Image.new("RGBA", (1024, 520), (0, 0, 0, 0))
    fitted = fit_logo(logo, 960, 380, pad_ratio=0.0)
    header.alpha_composite(fitted, ((1024 - fitted.width) // 2, 20))
    draw = ImageDraw.Draw(header)
    font = try_font(34)
    text = "DRIVER"
    tb = draw.textbbox((0, 0), text, font=font)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    pad_x, pad_y = 22, 8
    bw, bh = tw + pad_x * 2, th + pad_y * 2
    bx = (1024 - bw) // 2
    by = 430
    draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=bh // 2, fill=(*YELLOW, 255))
    draw.text((bx + pad_x - tb[0], by + pad_y - tb[1]), text, font=font, fill=(*BRAND_BLUE, 255))
    header.save(os.path.join(BASE, "jk_taxi_driver_logo.png"), optimize=True)

    # Play Store
    icon.convert("RGB").save(os.path.join(PLAY, "icon.png"), optimize=True)
    feat = Image.new("RGBA", (1024, 500), (*BRAND_BLUE, 255))
    fitted = fit_logo(logo, 720, 280, pad_ratio=0.0)
    layer = Image.new("RGBA", (1024, 500), (0, 0, 0, 0))
    layer.alpha_composite(fitted, ((1024 - fitted.width) // 2, 90))
    feat = Image.alpha_composite(feat, layer)
    draw = ImageDraw.Draw(feat)
    font = try_font(36)
    text = "JK TAXI DRIVER"
    tb = draw.textbbox((0, 0), text, font=font)
    tw = tb[2] - tb[0]
    draw.text(((1024 - tw) // 2 - tb[0], 380 - tb[1]), text, font=font, fill=YELLOW)
    feat.convert("RGB").save(os.path.join(PLAY, "feature-graphic.png"), optimize=True)

    print("Generated driver brand assets in", BASE)
    print("Play Store assets in", PLAY)


if __name__ == "__main__":
    main()
