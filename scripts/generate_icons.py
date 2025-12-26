#!/usr/bin/env python3
"""
Generate square app icons without external dependencies.

We keep all logic in the standard library to avoid install steps in
restricted environments. The script draws a simple, branded glyph on
top of a dark gradient background and exports three PNGs used by the
PWA manifest and iOS home screen.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path
from typing import Iterable, Tuple

Color = Tuple[int, int, int, int]


def _png_chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def _write_png(path: Path, size: int, rgba: bytearray) -> None:
    stride = size * 4
    raw = bytearray()
    for y in range(size):
        raw.append(0)  # filter type 0 (None)
        start = y * stride
        raw.extend(rgba[start : start + stride])

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + _png_chunk(b"IHDR", ihdr)
        + _png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + _png_chunk(b"IEND", b"")
    )
    path.write_bytes(png)


def _blend_pixel(data: bytearray, size: int, x: int, y: int, color: Color) -> None:
    if not (0 <= x < size and 0 <= y < size):
        return
    idx = (y * size + x) * 4
    a = color[3] / 255
    for i in range(3):
        base = data[idx + i]
        data[idx + i] = int(round(base * (1 - a) + color[i] * a))
    data[idx + 3] = 255


def _fill_rect(data: bytearray, size: int, x0: int, y0: int, x1: int, y1: int, color: Color) -> None:
    x0, y0 = max(0, int(x0)), max(0, int(y0))
    x1, y1 = min(size, int(x1)), min(size, int(y1))
    if x0 >= x1 or y0 >= y1:
        return

    r, g, b, a = color
    if a == 255:
        for y in range(y0, y1):
            idx = (y * size + x0) * 4
            row_end = idx + (x1 - x0) * 4
            for i in range(idx, row_end, 4):
                data[i] = r
                data[i + 1] = g
                data[i + 2] = b
                data[i + 3] = 255
    else:
        for y in range(y0, y1):
            for x in range(x0, x1):
                _blend_pixel(data, size, x, y, color)


def _stroke_rect(
    data: bytearray, size: int, x0: int, y0: int, x1: int, y1: int, thickness: int, color: Color
) -> None:
    _fill_rect(data, size, x0, y0, x1, y0 + thickness, color)
    _fill_rect(data, size, x0, y1 - thickness, x1, y1, color)
    _fill_rect(data, size, x0, y0, x0 + thickness, y1, color)
    _fill_rect(data, size, x1 - thickness, y0, x1, y1, color)


def _create_background(size: int) -> bytearray:
    data = bytearray(size * size * 4)
    center = size / 2
    for y in range(size):
        for x in range(size):
            dx = (x - center) / center
            dy = (y - center) / center
            dist = (dx * dx + dy * dy) ** 0.5
            vignette = max(0.0, 1.0 - dist)
            shade = 7 + int(26 * vignette)

            glow_line = max(0.0, 1.0 - y / (size * 0.9))
            r = min(255, shade + int(12 * glow_line))
            g = min(255, shade + int(14 * glow_line))
            b = min(255, shade + 20 + int(18 * vignette))

            idx = (y * size + x) * 4
            data[idx] = r
            data[idx + 1] = g
            data[idx + 2] = b
            data[idx + 3] = 255
    return data


def _draw_panel(data: bytearray, size: int) -> None:
    margin = max(4, size // 12)
    panel_color: Color = (16, 23, 36, 255)
    rim_color: Color = (44, 64, 96, 230)
    _fill_rect(data, size, margin, margin, size - margin, size - margin, panel_color)
    _stroke_rect(data, size, margin, margin, size - margin, size - margin, max(2, size // 36), rim_color)

    glow_margin = margin + size // 24
    glow_color: Color = (96, 152, 232, 38)
    _fill_rect(data, size, glow_margin, glow_margin, size - glow_margin, size - glow_margin, glow_color)


def _draw_glyph(data: bytearray, size: int) -> None:
    glyph_size = int(size * 0.5)
    bar = max(2, glyph_size // 7)
    x0 = (size - glyph_size) // 2
    y0 = (size - glyph_size) // 2
    x1 = x0 + glyph_size
    y1 = y0 + glyph_size

    accent: Color = (112, 194, 255, 255)
    shadow: Color = (0, 0, 0, 60)

    _fill_rect(data, size, x0 + bar // 2, y0 + bar // 2, x1 + bar // 2, y1 + bar // 2, shadow)

    _fill_rect(data, size, x0, y0, x0 + bar, y1, accent)  # vertical spine
    _fill_rect(data, size, x0, y0, x1, y0 + bar, accent)  # top bar
    _fill_rect(data, size, x0 + bar, y0 + glyph_size // 2 - bar // 2, x1, y0 + glyph_size // 2 + bar // 2, accent)
    _fill_rect(data, size, x1 - bar, y0 + bar, x1, y0 + glyph_size // 2 + bar // 2, accent)


def build_icon(size: int) -> bytearray:
    data = _create_background(size)
    _draw_panel(data, size)
    _draw_glyph(data, size)
    return data


def export_icons(targets: Iterable[tuple[str, int]]) -> None:
    for path_str, size in targets:
        path = Path(path_str)
        rgba = build_icon(size)
        _write_png(path, size, rgba)
        print(f"Wrote {path} ({size}x{size})")


if __name__ == "__main__":
    export_icons(
        [
            ("public/icon-192.png", 192),
            ("public/icon-512.png", 512),
            ("public/apple-touch-icon.png", 180),
            ("app/apple-icon.png", 512),
        ]
)
