#!/usr/bin/env python3
"""
oval_logo.py — Oval badge logo with envelope-warped text.

Outputs PNG (raster) or SVG (vector, for import into Fusion 360 / CAD tools).
The SVG warps the font's bezier curves directly — no raster tracing.

Requirements:
    pip install Pillow numpy fonttools

Usage:
    python oval_logo.py "VOLE"                    # PNG
    python oval_logo.py "VOLE" -o badge.svg       # clean vector SVG
    python oval_logo.py "TURBO" --color "#003087"
    python oval_logo.py "GT" --bg "#111" --color "#FFD700"
"""

import math, os, sys
import click
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FONT_CANDIDATES = [
    "/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreheroscn-bold.otf",
    "/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreheros-bold.otf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/crosextra/Carlito-Bold.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/Library/Fonts/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
    "C:/Windows/Fonts/impact.ttf",
]

def find_font():
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            return p
    return None

def load_pil_font(size):
    path = find_font()
    if path:
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            pass
    print("[warn] No TrueType font found — using bitmap default.")
    return ImageFont.load_default()

def hex_to_rgb(c):
    c = c.lstrip("#")
    if len(c) == 3: c = "".join(ch*2 for ch in c)
    return (int(c[0:2],16), int(c[2:4],16), int(c[4:6],16))


# ── Shared warp geometry ──────────────────────────────────────────────────────

def build_warp_params(width, height, h_margin, v_margin):
    cx, cy = width/2.0, height/2.0
    rx = width  * 0.43
    ry = height * 0.43
    text_rx = rx * (1.0 - h_margin)
    text_ry = ry * (1.0 - v_margin)
    return dict(cx=cx, cy=cy, rx=rx, ry=ry, text_rx=text_rx, text_ry=text_ry)

def warp_xy(sx, sy, norm_x, wp):
    """Map a source point (norm_x in [0,1], norm_y derived from sy) to canvas pixels.

    sx / sy are the RAW source values; norm_x is the precomputed horizontal normalisation.
    sy should already be a normalised y in [0,1] (0 = glyph bottom, 1 = top).
    """
    cx, cy = wp['cx'], wp['cy']
    rx, ry = wp['rx'], wp['ry']
    text_rx, text_ry = wp['text_rx'], wp['text_ry']

    xo = (cx - text_rx) + norm_x * 2.0 * text_rx

    dx_clip = (xo - cx) / rx
    rad     = max(0.0, 1.0 - dx_clip*dx_clip)
    outer_h = ry * math.sqrt(rad)
    half_h  = min(text_ry * math.sqrt(rad), outer_h)

    # norm_y=1 → glyph top → smaller SVG y (upward)
    yo = cy + half_h * (1.0 - 2.0 * sy)
    return (xo, yo)


# ── PNG output (raster warp) ──────────────────────────────────────────────────

def render_flat_text(text, font_size=400):
    font  = load_pil_font(font_size)
    probe = Image.new("L", (1,1))
    bbox  = ImageDraw.Draw(probe).textbbox((0,0), text, font=font)
    tw, th = bbox[2]-bbox[0], bbox[3]-bbox[1]
    pad_x, pad_y = int(tw*0.01), int(th*0.02)
    canvas = Image.new("L", (tw+2*pad_x, th+2*pad_y), 255)
    ImageDraw.Draw(canvas).text((pad_x-bbox[0], pad_y-bbox[1]), text, fill=0, font=font)
    return np.array(canvas, dtype=np.float32)

def make_png(text, width=800, height=400, color="#CC0000", bg_color="#FFFFFF",
             h_margin=0.20, v_margin=0.07, stroke=0.030):
    text = text.upper()
    ir,ig,ib = hex_to_rgb(color)
    br,bg_,bb = hex_to_rgb(bg_color)
    wp = build_warp_params(width, height, h_margin, v_margin)
    cx,cy,rx,ry = wp['cx'],wp['cy'],wp['rx'],wp['ry']
    text_rx,text_ry = wp['text_rx'],wp['text_ry']
    stroke_w = max(3, int(width * stroke))

    src = render_flat_text(text)
    src_h, src_w = src.shape

    ys, xs = np.mgrid[0:height, 0:width].astype(np.float32)
    dx_clip = (xs - cx) / rx
    dy_clip = (ys - cy) / ry
    in_oval  = (dx_clip*dx_clip + dy_clip*dy_clip) <= 1.0
    in_text_x = np.abs(xs - cx) <= text_rx

    outer_h  = ry * np.sqrt(np.clip(1.0 - dx_clip*dx_clip, 0.0, None))
    half_h   = np.minimum(text_ry * np.sqrt(np.clip(1.0 - dx_clip*dx_clip, 0.0, None)), outer_h)
    y_top    = cy - half_h
    y_bot    = cy + half_h

    norm_x = (xs - (cx - text_rx)) / (2.0 * text_rx)
    with np.errstate(divide='ignore', invalid='ignore'):
        raw_norm_y = np.where(y_bot > y_top, (ys - y_top) / (y_bot - y_top), -1.0)
    norm_y = np.where(in_oval & in_text_x, raw_norm_y, -1.0)
    valid  = in_oval & in_text_x & (norm_x >= 0) & (norm_x <= 1) & (norm_y >= 0) & (norm_y <= 1)

    fx = norm_x * (src_w - 1)
    fy = norm_y * (src_h - 1)
    x0 = np.clip(np.floor(fx).astype(np.int32), 0, src_w-2)
    y0 = np.clip(np.floor(fy).astype(np.int32), 0, src_h-2)
    x1,y1 = x0+1, y0+1
    tx = (fx - x0).clip(0,1); ty = (fy - y0).clip(0,1)
    sampled = np.where(valid,
        src[y0,x0]*(1-tx)*(1-ty) + src[y0,x1]*tx*(1-ty) +
        src[y1,x0]*(1-tx)*ty     + src[y1,x1]*tx*ty, 255.0)

    # ── Composite in numpy — no PIL drawing, no gap artefacts ────────────────
    # Three zones (outermost wins):
    #   outside outer oval  → background
    #   in ring band        → ink  (solid, pixel-perfect)
    #   inside inner oval   → blended text

    # Outer oval boundary (stroke grows outward from rx, ry)
    dx_outer = (xs - cx) / (rx + stroke_w)
    dy_outer = (ys - cy) / (ry + stroke_w)
    in_outer = (dx_outer*dx_outer + dy_outer*dy_outer) <= 1.0
    in_ring  = in_outer & ~in_oval          # annular ring band

    a    = sampled / 255.0                  # 0 = ink, 1 = background
    # text layer (only applies inside inner oval)
    txt_r = a*br + (1-a)*ir
    txt_g = a*bg_ + (1-a)*ig
    txt_b = a*bb  + (1-a)*ib

    ch_r = np.where(in_ring, ir, np.where(in_oval, txt_r, br))
    ch_g = np.where(in_ring, ig, np.where(in_oval, txt_g, bg_))
    ch_b = np.where(in_ring, ib, np.where(in_oval, txt_b, bb))

    out = np.stack([ch_r, ch_g, ch_b], axis=-1).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGB")



# ── SVG output via potrace (matches PNG quality exactly) ─────────────────────

def make_svg_traced(text, width=800, height=400, color="#CC0000", bg_color="#FFFFFF",
                    h_margin=0.20, v_margin=0.07, stroke=0.030, scale=4):
    """
    Generate SVG by:
      1. Rendering the PNG at `scale`× resolution (default 4×) for quality
      2. Thresholding ink pixels to a 1-bit bitmap
      3. Running potrace to convert to clean cubic-bezier paths
      4. Rescaling the paths to the target canvas and wrapping in SVG

    The result matches the pixel-level envelope-warp quality of the PNG exactly,
    making it suitable for import into Fusion 360 or any CAD tool.

    Requires: potrace (apt install potrace / brew install potrace)
    """
    import subprocess, tempfile, re

    if not _potrace_available():
        raise RuntimeError(
            "potrace not found. Install it:\n"
            "  Linux:  sudo apt install potrace\n"
            "  macOS:  brew install potrace\n"
            "  Win:    https://potrace.sourceforge.net"
        )

    kw = dict(h_margin=h_margin, v_margin=v_margin, stroke=stroke)

    # ── 1. Render at scale× ───────────────────────────────────────────────────
    hi_w, hi_h = width * scale, height * scale
    img = make_png(text, width=hi_w, height=hi_h, color=color, bg_color=bg_color, **kw)
    arr = np.array(img)

    # ── 2. Threshold: red ink → black (0), everything else → white (255) ─────
    ir, ig, ib = hex_to_rgb(color)
    # Ink pixels are close to the ink colour; bg pixels are close to bg_color
    # Use euclidean distance in RGB space for robustness
    dist_ink = ((arr[:,:,0].astype(float)-ir)**2
              + (arr[:,:,1].astype(float)-ig)**2
              + (arr[:,:,2].astype(float)-ib)**2)
    dist_bg  = ((arr[:,:,0].astype(float)-hex_to_rgb(bg_color)[0])**2
              + (arr[:,:,1].astype(float)-hex_to_rgb(bg_color)[1])**2
              + (arr[:,:,2].astype(float)-hex_to_rgb(bg_color)[2])**2)
    ink_mask = dist_ink < dist_bg

    from PIL import Image as _Image
    bw = _Image.fromarray(np.where(ink_mask, 0, 255).astype(np.uint8), 'L').convert('1')

    # ── 3. Run potrace ────────────────────────────────────────────────────────
    with tempfile.TemporaryDirectory() as tmp:
        bmp_path = os.path.join(tmp, 'in.bmp')
        svg_path = os.path.join(tmp, 'out.svg')
        bw.save(bmp_path)

        result = subprocess.run(
            ['potrace', bmp_path, '--svg',
             '--turdsize', '4',          # ignore specks < 4px²
             '--alphamax',  '1.0',       # corner rounding (1=max smooth)
             '--opttolerance', '0.3',    # bezier optimisation tolerance
             '-o', svg_path],
            capture_output=True, text=True
        )
        if result.returncode != 0:
            raise RuntimeError(f"potrace failed: {result.stderr}")

        raw = open(svg_path).read()

    # ── 4. Extract paths and rescale to target canvas ─────────────────────────
    # potrace emits: transform="translate(0,H*scale) scale(0.1,-0.1)"
    # Our input is (width*scale) × (height*scale) at 0.1pt/px
    # Combined scale to canvas: 0.1 / scale  (x), flip y → translate(0, height)
    path_ds = re.findall(r'<path d="([^"]+)"', raw)

    sc = 0.1 / scale           # coordinate scale: potrace units → canvas pixels
    ty = float(height)         # y translation for flip

    # Build SVG with the paths wrapped in the rescaling transform
    bg_r, bg_g, bg_b = hex_to_rgb(bg_color)
    bg_hex = f"#{bg_r:02x}{bg_g:02x}{bg_b:02x}"
    hex_color_norm = color if color.startswith('#') else f"#{color}"

    path_elements = "\n    ".join(f'<path d="{d}"/>' for d in path_ds)

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="{width}" height="{height}" viewBox="0 0 {width} {height}">

  <rect width="{width}" height="{height}" fill="{bg_hex}"/>

  <!-- Traced paths: potrace cubic beziers rescaled from {hi_w}×{hi_h} bitmap -->
  <g transform="translate(0,{ty}) scale({sc:.6f},{-sc:.6f})"
     fill="{hex_color_norm}">
    {path_elements}
  </g>

</svg>"""
    return svg


def _potrace_available():
    import shutil
    return shutil.which('potrace') is not None


def make_svg(text, width=800, height=400, color="#CC0000", bg_color="#FFFFFF",
             h_margin=0.20, v_margin=0.07, stroke=0.030):
    """
    Warp the font's bezier control points directly and emit clean SVG paths.
    Each letter and the oval ring are separate <path> elements — ideal for
    importing into Fusion 360 or any CAD tool.
    """
    try:
        from fontTools.ttLib import TTFont
        from fontTools.pens.recordingPen import RecordingPen
    except ImportError:
        sys.exit("fonttools not installed.  Run: pip install fonttools")

    font_path = find_font()
    if not font_path:
        sys.exit("No TrueType font found — add one to FONT_CANDIDATES.")

    text = text.upper()
    wp   = build_warp_params(width, height, h_margin, v_margin)
    cx,cy,rx,ry = wp['cx'],wp['cy'],wp['rx'],wp['ry']
    text_rx = wp['text_rx']
    stroke_w = max(4.0, width * stroke)
    hex_color = color

    # ── Font metrics ──────────────────────────────────────────────────────────
    tt       = TTFont(font_path)
    cmap     = tt.getBestCmap()
    gs       = tt.getGlyphSet()
    hmtx     = tt['hmtx']

    # ── Layout: accumulate advance widths ────────────────────────────────────
    x_cursor = 0
    glyph_list = []
    for ch in text:
        code = ord(ch)
        if code not in cmap:
            print(f"[warn] character '{ch}' not in font — skipped")
            continue
        gname = cmap[code]
        aw, _lsb = hmtx[gname]
        glyph_list.append({'char': ch, 'gname': gname, 'x_off': x_cursor})
        x_cursor += aw
    total_adv = x_cursor

    # ── Actual glyph bounding box (not font-wide metrics) ────────────────────
    # Using [descender, ascender] leaves a large empty descender band at the
    # bottom for all-caps text.  Instead scan the real outline y-coords.
    all_y = []
    for g in glyph_list:
        pen = RecordingPen()
        gs[g['gname']].draw(pen)
        for op, args in pen.value:
            for pt in args:
                all_y.append(pt[1])
    glyph_min_y = min(all_y)
    glyph_max_y = max(all_y)
    glyph_range = glyph_max_y - glyph_min_y

    # ── Warp helpers for this text layout ────────────────────────────────────
    def warp_pt(sx, sy):
        """sx in [0, total_adv], sy in [glyph_min_y, glyph_max_y]  →  canvas px."""
        norm_x = sx / total_adv
        norm_y = (sy - glyph_min_y) / glyph_range   # 0=actual bottom, 1=actual top
        return warp_xy(sx, norm_y, norm_x, wp)

    def pts_to_svg(ops, x_off):
        """Convert RecordingPen ops for one glyph to an SVG path d string."""
        parts = []
        for op, args in ops:
            if op == 'moveTo':
                (x,y), = args
                px,py = warp_pt(x + x_off, y)
                parts.append(f"M {px:.3f} {py:.3f}")
            elif op == 'lineTo':
                (x,y), = args
                px,py = warp_pt(x + x_off, y)
                parts.append(f"L {px:.3f} {py:.3f}")
            elif op == 'curveTo':
                # cubic bezier: three control points
                coords = []
                for (x,y) in args:
                    px,py = warp_pt(x + x_off, y)
                    coords.append(f"{px:.3f} {py:.3f}")
                parts.append("C " + " ".join(coords))
            elif op == 'qCurveTo':
                # quadratic (TrueType) — convert to cubic
                pts = list(args)
                # implied on-curves between consecutive off-curves
                while len(pts) > 2:
                    q0_prev = pts[0]
                    q1      = pts[0]
                    q2      = ((pts[0][0]+pts[1][0])/2, (pts[0][1]+pts[1][1])/2)
                    # cubic from last moveTo/lineTo → handle recursively
                    pts = pts[1:]
                # Final segment
                if len(pts) == 2:
                    (qx1,qy1),(qx2,qy2) = pts
                    # last on-curve is implicit from prior op — approximate as cubic
                    p1x,p1y = warp_pt(qx1 + x_off, qy1)
                    p2x,p2y = warp_pt(qx2 + x_off, qy2)
                    parts.append(f"Q {p1x:.3f} {p1y:.3f} {p2x:.3f} {p2y:.3f}")
            elif op in ('closePath', 'endPath'):
                parts.append("Z")
        return " ".join(parts)

    # ── Build SVG path data for each glyph ───────────────────────────────────
    letter_paths = []
    for g in glyph_list:
        pen = RecordingPen()
        gs[g['gname']].draw(pen)
        d = pts_to_svg(pen.value, g['x_off'])
        if d.strip():
            letter_paths.append(d)

    # ── Oval ring as SVG ellipse (hairline or stroke, for CAD sketch) ─────────
    # Two concentric ellipses as a ring path for clean CAD import
    # Outer ellipse clockwise, inner ellipse counter-clockwise
    sw = stroke_w
    def ellipse_path(ex, ey, erx, ery, clockwise=True):
        """
        Full-ellipse SVG path split at the TOP and BOTTOM points.

        Splitting at left/right (the horizontal midpoints) creates antipodal
        arcs that are degenerate (both semicircles are equal length), which
        some renderers handle incorrectly, producing white rendering artefacts.
        Splitting at top/bottom avoids this entirely.
        """
        sweep = 1 if clockwise else 0
        top_x, top_y = ex,        ey - ery   # topmost point
        bot_x, bot_y = ex,        ey + ery   # bottommost point
        return (
            f"M {top_x:.3f},{top_y:.3f} "
            f"A {erx:.3f},{ery:.3f} 0 0 {sweep} {bot_x:.3f},{bot_y:.3f} "
            f"A {erx:.3f},{ery:.3f} 0 0 {sweep} {top_x:.3f},{top_y:.3f} Z"
        )

    # Stroke grows OUTWARD so the inner boundary (and text zone) stays constant.
    # outer = rx + sw  (expands beyond the text boundary)
    # inner = rx       (fixed edge that letters sit against)
    oval_outer = ellipse_path(cx, cy, rx + sw, ry + sw, clockwise=True)
    oval_inner = ellipse_path(cx, cy, rx,      ry,      clockwise=False)
    oval_ring  = oval_outer + " " + oval_inner

    # ── Compose SVG ──────────────────────────────────────────────────────────
    bg_r, bg_g, bg_b = hex_to_rgb(bg_color)
    bg_hex = f"#{bg_r:02x}{bg_g:02x}{bg_b:02x}"

    letter_d = " ".join(letter_paths)

    svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     width="{width}" height="{height}"
     viewBox="0 0 {width} {height}">

  <!-- Background -->
  <rect width="{width}" height="{height}" fill="{bg_hex}"/>

  <!-- Oval ring -->
  <path fill="{hex_color}" fill-rule="evenodd" d="{oval_ring}"/>

  <!-- Letters (each glyph is a separate sub-path; fill-rule handles holes e.g. O) -->
  <path fill="{hex_color}" fill-rule="evenodd" d="{letter_d}"/>

</svg>"""
    return svg


# ── CLI ───────────────────────────────────────────────────────────────────────

@click.command(context_settings={"help_option_names": ["-h", "--help"]})
@click.argument("text")
@click.option("-o", "--output",   default="",    show_default=False,
              help="Output path (.png or .svg). Defaults to <text>.png")
@click.option("--width",          default=800,   show_default=True,  type=int,
              help="Canvas width in pixels.")
@click.option("--height",         default=400,   show_default=True,  type=int,
              help="Canvas height in pixels.")
@click.option("--color",          default="#CC0000", show_default=True,
              help="Ink colour for oval ring and letters.")
@click.option("--bg",             default="#FFFFFF",  show_default=True,
              help="Background fill colour.")
@click.option("--h-margin",       default=0.20,  show_default=True,  type=float,
              help="White space between text zone and oval tips (0–0.5).")
@click.option("--v-margin",       default=0.07,  show_default=True,  type=float,
              help="Vertical breathing room inside the oval (0–0.3).")
@click.option("--stroke",         default=0.030, show_default=True,  type=float,
              help="Oval ring thickness as a fraction of width (24 px at 800 px).")
@click.option("--bezier",         is_flag=True,  default=False,
              help="SVG: warp font bezier curves directly (faster, no potrace needed).")
@click.option("--scale",          default=4,     show_default=True,  type=int,
              help="SVG trace: render at this multiple before tracing (default 4×).")
def main(text, output, width, height, color, bg, h_margin, v_margin, stroke, bezier, scale):
    """Generate an oval badge logo with envelope-warped text.

    TEXT is the word or phrase to render (e.g. "VOLE", "D&D", "TURBO").
    Output format is inferred from the file extension: .svg for vector
    (recommended for CAD / Fusion 360), .png for raster.

    SVG output uses potrace by default (matches PNG quality exactly).
    Use --bezier for a faster alternative that warps font curves directly.

    \b
    Examples:
      oval-logo VOLE
      oval-logo VOLE -o vole.svg
      oval-logo VOLE -o vole.svg --bezier
      oval-logo "D&D" --color "#003087" -o dnd.svg
      oval-logo TURBO --stroke 0.040 --width 1200 --height 600 -o turbo.svg
    """
    safe   = text.replace(" ", "_").lower()
    output = output or f"{safe}.png"
    kw = dict(width=width, height=height, color=color, bg_color=bg,
              h_margin=h_margin, v_margin=v_margin, stroke=stroke)

    click.echo(f'Rendering "{text}" → {output}')

    if output.lower().endswith(".svg"):
        if bezier:
            svg = make_svg(text, **kw)
        else:
            if not _potrace_available():
                click.echo("potrace not found — falling back to bezier mode. "
                           "Install potrace for better quality.", err=True)
                svg = make_svg(text, **kw)
            else:
                svg = make_svg_traced(text, scale=scale, **kw)
        with open(output, "w", encoding="utf-8") as f:
            f.write(svg)
    else:
        make_png(text, **kw).save(output)

    click.echo(f"Saved → {output}")


if __name__ == "__main__":
    main()
