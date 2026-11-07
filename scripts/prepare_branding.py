"""Prepare the supplied Apolo4 PNG artwork for the app and Windows installer.

Requires Pillow only when regenerating these derived files. The build itself
uses the committed outputs and does not need Pillow.
"""

from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "branding"
PUBLIC = ROOT / "public" / "branding"
BUILD = ROOT / "build"


def trimmed_rgba(filename: str) -> Image.Image:
    image = Image.open(SOURCE / filename).convert("RGBA")
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds:
        image = image.crop(bounds)
    return image


def contain(image: Image.Image, size: tuple[int, int], padding: int = 0) -> Image.Image:
    width, height = size
    available = (width - padding * 2, height - padding * 2)
    image.thumbnail(available, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.alpha_composite(image, ((width - image.width) // 2, (height - image.height) // 2))
    return canvas


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    BUILD.mkdir(parents=True, exist_ok=True)

    wordmark = trimmed_rgba("nombre-apolo.png")
    wordmark.save(PUBLIC / "nombre-apolo.png", optimize=True)

    horizontal = trimmed_rgba("logo2-apolo.png")
    horizontal.save(PUBLIC / "logo2-apolo.png", optimize=True)

    stacked = trimmed_rgba("logo-apolo.png")
    stacked.save(PUBLIC / "logo-apolo.png", optimize=True)

    favicon = trimmed_rgba("favicon-apolo.png")
    favicon.save(PUBLIC / "favicon-apolo.png", optimize=True)
    icon_canvas = contain(favicon.copy(), (256, 256), padding=10)
    icon_sizes = [(size, size) for size in (16, 24, 32, 48, 64, 128, 256)]
    icon_canvas.save(BUILD / "icon.ico", format="ICO", sizes=icon_sizes)
    (ROOT / "electron" / "assets").mkdir(parents=True, exist_ok=True)
    icon_canvas.save(ROOT / "electron" / "assets" / "icon.ico", format="ICO", sizes=icon_sizes)

    sidebar = Image.new("RGB", (164, 314), (12, 14, 13))
    sidebar_logo = contain(stacked.copy(), (148, 278), padding=8)
    sidebar_rgba = Image.new("RGBA", sidebar.size, (12, 14, 13, 255))
    sidebar_rgba.alpha_composite(sidebar_logo, ((164 - sidebar_logo.width) // 2, (314 - sidebar_logo.height) // 2))
    sidebar.paste(sidebar_rgba.convert("RGB"))
    sidebar.save(BUILD / "installer-sidebar.bmp")
    sidebar.save(BUILD / "uninstaller-sidebar.bmp")


if __name__ == "__main__":
    main()
