#!/usr/bin/env python3
"""
SIH 2026 — Presentation Generator (V3 — Clean Professional)
=============================================================
Clean, professional 6-slide PPTX. No emojis, no decorative strips,
reduced text density, sharp visual hierarchy.

Team: GeoVoxel The coders | PS: SIH26011
"""

import sys
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_PATH = PROJECT_ROOT / "SIH2026-IDEA-Presentation-Format.pptx"
OUTPUT_PPTX = PROJECT_ROOT / "SIH2026_GeoVoxel_SIH26011.pptx"
PROTOTYPE_IMG = PROJECT_ROOT / "outputs" / "presentation_assets" / "prototype_cropped.png"

# ── Color Palette ──
SLATE_900 = RGBColor(15, 23, 42)
SLATE_800 = RGBColor(30, 41, 59)
SLATE_700 = RGBColor(51, 65, 85)
SLATE_600 = RGBColor(71, 85, 105)
SLATE_400 = RGBColor(148, 163, 184)
SLATE_200 = RGBColor(226, 232, 240)
SLATE_50  = RGBColor(248, 250, 252)

SKY_600   = RGBColor(2, 132, 199)
SKY_500   = RGBColor(14, 165, 233)
SKY_400   = RGBColor(56, 189, 248)
SKY_950   = RGBColor(8, 47, 73)

EMERALD_600 = RGBColor(5, 150, 105)
EMERALD_500 = RGBColor(16, 185, 129)
EMERALD_400 = RGBColor(52, 211, 153)
EMERALD_300 = RGBColor(110, 231, 183)
EMERALD_950 = RGBColor(6, 78, 59)

INDIGO_600 = RGBColor(79, 70, 229)
INDIGO_500 = RGBColor(99, 102, 241)
INDIGO_400 = RGBColor(129, 140, 248)
INDIGO_300 = RGBColor(165, 180, 252)
INDIGO_950 = RGBColor(30, 27, 75)
INDIGO_900 = RGBColor(49, 46, 129)

AMBER_500 = RGBColor(245, 158, 11)
AMBER_400 = RGBColor(251, 191, 36)
AMBER_950 = RGBColor(69, 26, 3)

ROSE_600  = RGBColor(225, 29, 72)
ROSE_500  = RGBColor(244, 63, 94)
ROSE_950  = RGBColor(76, 5, 25)

VIOLET_500 = RGBColor(139, 92, 246)
VIOLET_950 = RGBColor(46, 16, 101)

CYAN_400  = RGBColor(34, 211, 238)

WHITE = RGBColor(255, 255, 255)
CARD_BG = SLATE_50
CARD_BORDER = RGBColor(203, 213, 225)


# ── Helpers ──

def add_shape(slide, stype, left, top, w, h, fill, border=None, bw=Pt(1.2)):
    s = slide.shapes.add_shape(stype, left, top, w, h)
    s.fill.solid()
    s.fill.fore_color.rgb = fill
    if border:
        s.line.color.rgb = border
        s.line.width = bw
    else:
        s.line.fill.background()
    return s


def run(para, text, size=Pt(10), bold=False, color=SLATE_800, italic=False):
    r = para.add_run()
    r.text = text
    r.font.name = "Arial"
    r.font.size = size
    r.font.bold = bold
    r.font.italic = italic
    r.font.color.rgb = color
    return r


def tf_setup(shape, ml=0.2, mr=0.2, mt=0.15, mb=0.1):
    tf = shape.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(ml)
    tf.margin_right = Inches(mr)
    tf.margin_top = Inches(mt)
    tf.margin_bottom = Inches(mb)
    return tf


def metric_badge(slide, left, top, w, h, number, label, bg, accent):
    card = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, left, top, w, h, bg, accent, Pt(1.5))
    tf = card.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = Inches(0.06)
    tf.margin_right = Inches(0.06)
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run(p, number, size=Pt(22), bold=True, color=WHITE)
    p2 = tf.add_paragraph()
    p2.alignment = PP_ALIGN.CENTER
    run(p2, label, size=Pt(7.5), color=accent)


def style_header(slide, title):
    for s in slide.shapes:
        if "Oval" in s.name and s.has_text_frame:
            s.left, s.top, s.width, s.height = Inches(0.45), Inches(0.2), Inches(1.55), Inches(0.85)
            s.fill.solid()
            s.fill.fore_color.rgb = INDIGO_900
            s.line.color.rgb = INDIGO_500
            s.line.width = Pt(1.5)
            s.text_frame.clear()
            s.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
            s.text_frame.margin_left = Inches(0.05)
            s.text_frame.margin_right = Inches(0.05)
            p = s.text_frame.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER
            run(p, "GeoVoxel", size=Pt(12), bold=True, color=WHITE)
            p2 = s.text_frame.add_paragraph()
            p2.alignment = PP_ALIGN.CENTER
            run(p2, "The coders", size=Pt(8.5), color=INDIGO_300)
        elif s.name == "Title 1" and s.has_text_frame:
            s.left, s.top, s.width, s.height = Inches(2.15), Inches(0.18), Inches(8.1), Inches(0.95)
            s.text_frame.clear()
            s.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = s.text_frame.paragraphs[0]
            p.alignment = PP_ALIGN.LEFT
            run(p, title, size=Pt(21), bold=True, color=SLATE_900)


def kill_placeholder(slide, name="TextBox 8"):
    for s in list(slide.shapes):
        if s.name == name:
            slide.shapes._spTree.remove(s._element)


# ═══════════════════════════════════════════════════════════════
# SLIDES
# ═══════════════════════════════════════════════════════════════

def slide_1_title(prs):
    slide = prs.slides[0]
    for s in slide.shapes:
        if s.name == "TextBox 9" and s.has_text_frame:
            tf = s.text_frame
            tf.clear()
            tf.paragraphs[0].text = ""
            for label, value, vc, bold in [
                ("Problem Statement ID – ", "SIH26011", SKY_600, True),
                ("Problem Statement Title – ", "3D ULPIN (Bhu-Aadhaar) Generation, Vertical Cadastre & 3D Building Visualization Digital Twin", SLATE_900, True),
                ("Theme – ", "Smart Automation / Geospatial Technology / Smart Cities", SLATE_800, False),
                ("PS Category – ", "Software", SLATE_800, False),
                ("Team Name (Registered on portal) – ", "GeoVoxel The coders", INDIGO_600, True),
            ]:
                p = tf.add_paragraph()
                p.space_after = Pt(14)
                run(p, label, size=Pt(17), bold=True, color=SLATE_800)
                run(p, value, size=Pt(17), bold=bold, color=vc)


def slide_2_solution(prs):
    slide = prs.slides[1]
    style_header(slide, "GEO-CADASTRE 3D: Autonomous 3D ULPIN & Vertical Cadastre Digital Twin")
    kill_placeholder(slide)

    # ── Left: Solution Text ──
    card = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                     Inches(0.55), Inches(1.3), Inches(6.8), Inches(5.2), CARD_BG, CARD_BORDER)
    tf = tf_setup(card, ml=0.22, mt=0.16)

    sections = [
        ("Proposed Solution", SKY_600, [
            "Autonomous geospatial pipeline generating India's first 3D vertical cadastre from open-source satellite and survey data.",
            "60 FPS WebGL digital twin with real-time building inspection, floor isolation, and solar analysis.",
        ]),
        ("Technical Approach", INDIGO_600, [
            "Tier 1 — Unit-Level: Parses RERA blueprints into individual flat parcels with carpet area, facing, and Z-coordinates.",
            "Tier 2 — Floor-Level: Automated slicing via DSM-DEM height estimation with zero-discrepancy normalization.",
        ]),
        ("Problem Addressed", EMERALD_600, [
            "Replaces ambiguous 2D survey numbers with unique 3D spatial identities for every apartment unit.",
            "ISO 19152 LADM + OGC CityGML compliant legal 3D parcels (Z-min, Z-max MSL).",
        ]),
        ("Innovation", ROSE_600, [
            "Zero-Discrepancy Floor Slab Engine: cumulative height error = 0.00m across 4,641 buildings.",
            "Client-side 60 FPS rendering of 22,761 volumetric parcels — no server GPU required.",
        ]),
    ]

    for idx, (header, color, bullets) in enumerate(sections):
        hp = tf.add_paragraph() if idx > 0 or tf.paragraphs[0].text else tf.paragraphs[0]
        hp.space_before = Pt(7) if idx > 0 else Pt(0)
        hp.space_after = Pt(3)
        run(hp, header, size=Pt(11.5), bold=True, color=color)
        for bp in bullets:
            p = tf.add_paragraph()
            p.space_after = Pt(3)
            run(p, "  " + bp, size=Pt(9), color=SLATE_800)

    # ── Right: Cadastre Hierarchy ──

    # 2D Root
    box_2d = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                       Inches(7.6), Inches(1.3), Inches(5.15), Inches(1.25), SKY_950, SKY_500, Pt(2.0))
    tf2d = box_2d.text_frame
    tf2d.word_wrap = True
    tf2d.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf2d.margin_left = Inches(0.12)
    p = tf2d.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run(p, "GOVERNMENT 2D BHU-AADHAAR (ULPIN)", size=Pt(9.5), bold=True, color=SKY_400)
    p2 = tf2d.add_paragraph()
    p2.alignment = PP_ALIGN.CENTER
    run(p2, "3621050103VUWK", size=Pt(15), bold=True, color=WHITE)
    run(p2, "  14-Digit DoLR Standard", size=Pt(9), color=SLATE_400)
    p3 = tf2d.add_paragraph()
    p3.alignment = PP_ALIGN.CENTER
    run(p3, "State 36 | District 21 | Mandal 05 | Village 0103 | Survey 83/1", size=Pt(7.8), color=SLATE_400)

    # Tier 1: Unit-Level (Left)
    box_t1 = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                       Inches(7.6), Inches(2.72), Inches(2.5), Inches(3.78), EMERALD_950, EMERALD_500, Pt(1.5))
    tf1 = tf_setup(box_t1, ml=0.1, mr=0.1, mt=0.12)
    p = tf1.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run(p, "TIER 1: UNIT 3D ULPIN", size=Pt(9.5), bold=True, color=EMERALD_400)
    ps = tf1.add_paragraph()
    ps.alignment = PP_ALIGN.CENTER
    ps.space_after = Pt(4)
    run(ps, "Sanctioned RERA Blueprints", size=Pt(7.5), color=EMERALD_300)

    for code, desc in [
        ("-FL32-U3201", "4BHK Luxury | 318 m\u00b2 | East"),
        ("-FL32-U3202", "3BHK Premium | 241 m\u00b2 | West"),
        ("-FL32-U3203", "3BHK Premium | 241 m\u00b2 | North"),
        ("-FL32-ULOBBY", "Common Area | Lift & Fire | 85 m\u00b2"),
    ]:
        pu = tf1.add_paragraph()
        pu.space_before = Pt(4)
        run(pu, code, size=Pt(7.8), bold=True, color=WHITE)
        pd = tf1.add_paragraph()
        run(pd, "  " + desc, size=Pt(7), color=EMERALD_300)

    # Tier 2: Floor-Level (Right)
    box_t2 = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                       Inches(10.25), Inches(2.72), Inches(2.5), Inches(3.78), INDIGO_950, INDIGO_500, Pt(1.5))
    tf2 = tf_setup(box_t2, ml=0.1, mr=0.1, mt=0.12)
    p = tf2.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run(p, "TIER 2: FLOOR 3D ULPIN", size=Pt(9.5), bold=True, color=INDIGO_400)
    ps2 = tf2.add_paragraph()
    ps2.alignment = PP_ALIGN.CENTER
    ps2.space_after = Pt(4)
    run(ps2, "Automated Height Slicing", size=Pt(7.5), color=INDIGO_300)

    for code, desc in [
        ("-FL32", "Floor 32 | Z: 691.01 \u2013 694.00m MSL"),
        ("-FL15", "Floor 15 | Z: 639.75 \u2013 642.75m MSL"),
        ("-FL08", "Floor 8 | Z: 618.34 \u2013 621.34m MSL"),
        ("-FL00", "Ground | Z: 594.00 \u2013 598.34m MSL"),
    ]:
        pf = tf2.add_paragraph()
        pf.space_before = Pt(4)
        run(pf, code, size=Pt(7.8), bold=True, color=WHITE)
        pd = tf2.add_paragraph()
        run(pd, "  " + desc, size=Pt(7), color=INDIGO_300)


def slide_3_technical(prs):
    slide = prs.slides[2]
    style_header(slide, "TECHNICAL APPROACH & PIPELINE ARCHITECTURE")
    kill_placeholder(slide)

    stages = [
        ("STAGE 1: DATA INGESTION", SKY_500, SKY_950, [
            "OpenStreetMap (Overpass QL)", "Copernicus GLO-30 DSM", "SRTM GL1 DEM (OpenTopo)",
            "ISRO Bhuvan OGC Geoportal", "TS-RERA & Dharani Land DB",
        ]),
        ("STAGE 2: HEIGHT ENGINE", INDIGO_500, INDIGO_950, [
            "Landmark / RERA Registry", "DSM-DEM Zonal Statistics", "Annular Buffer Sampling",
            "Morphological Typology", "Cluster Spatial Propagation",
        ]),
        ("STAGE 3: 3D CADASTRE", EMERALD_500, EMERALD_950, [
            "14-Digit Bhu-Aadhaar (NIC)", "Unit ULPIN (-FLxx-Uyyyy)", "Floor ULPIN (-FLxx)",
            "Zero-Discrepancy Normalizer", "ISO 19152 / CityGML 3.0",
        ]),
        ("STAGE 4: DIGITAL TWIN", AMBER_500, AMBER_950, [
            "Next.js 16 + Three.js r185", "60 FPS BatchedMesh / LOD", "Interactive Floor Isolation",
            "Solar & Flood Simulation", "238 km Road Network",
        ]),
    ]

    sw, sh = Inches(2.95), Inches(2.35)
    gap = Inches(0.15)
    sx, sy = Inches(0.55), Inches(1.25)

    for i, (title, accent, bg, items) in enumerate(stages):
        bx = sx + i * (sw + gap)
        add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, bx, sy, sw, sh, bg, accent, Pt(1.8))

        # Header banner
        banner = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                           bx + Inches(0.06), sy + Inches(0.06), sw - Inches(0.12), Inches(0.42), accent)
        tf_b = banner.text_frame
        tf_b.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf_b.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        run(p, title, size=Pt(9), bold=True, color=WHITE)

        # Body
        tb = slide.shapes.add_textbox(bx + Inches(0.08), sy + Inches(0.54), sw - Inches(0.16), sh - Inches(0.6))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.06)
        tf.margin_top = Inches(0.04)
        for j, item in enumerate(items):
            p = tf.add_paragraph() if j > 0 else tf.paragraphs[0]
            p.space_after = Pt(3)
            run(p, item, size=Pt(8.5), color=SLATE_200)

        # Arrow
        if i < 3:
            ax = bx + sw + Inches(0.02)
            ay = sy + sh / 2 - Inches(0.02)
            add_shape(slide, MSO_SHAPE.RIGHT_ARROW, ax, ay, gap - Inches(0.04), Inches(0.14), SKY_400)

    # ── Metric Badges ──
    by = Inches(3.72)
    bh = Inches(0.58)
    metrics = [
        ("4,641", "Buildings", SKY_950, SKY_400),
        ("22,761", "3D Parcels", EMERALD_950, EMERALD_400),
        ("238 km", "Roads", INDIGO_950, INDIGO_400),
        ("12.5s", "Execution", AMBER_950, AMBER_400),
        ("60 FPS", "Rendering", VIOLET_950, VIOLET_500),
    ]
    total_w = Inches(12.46)
    bgap = Inches(0.12)
    bw = (total_w - (len(metrics) - 1) * bgap) / len(metrics)
    for i, (num, label, bg, accent) in enumerate(metrics):
        metric_badge(slide, Inches(0.55) + i * (bw + bgap), by, bw, bh, num, label, bg, accent)

    # ── Bottom: Tech + Methodology ──
    cy = Inches(4.42)
    ch = Inches(2.08)

    # Left: Technologies
    card_t = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.55), cy, Inches(6.1), ch, CARD_BG, CARD_BORDER)
    tf_t = tf_setup(card_t, ml=0.2, mt=0.12)
    p = tf_t.paragraphs[0]
    p.space_after = Pt(4)
    run(p, "Technologies & Frameworks", size=Pt(11), bold=True, color=SKY_600)
    for cat, desc in [
        ("Geospatial", "Python 3.10+, GDAL, Rasterio, Shapely, GeoPandas, PyProj, SciPy k-d trees."),
        ("Remote Sensing", "Copernicus GLO-30 DSM, SRTM GL1 DEM, ISRO Bhuvan WFS/WMS, OSM Overpass QL."),
        ("3D Platform", "Next.js 16 (Turbopack), React 19, Three.js r185, React Three Fiber, WebGL 2.0."),
    ]:
        pi = tf_t.add_paragraph()
        pi.space_after = Pt(2.5)
        run(pi, f"{cat}: ", size=Pt(9), bold=True, color=SLATE_900)
        run(pi, desc, size=Pt(8.5), color=SLATE_600)

    # Right: Methodology
    card_m = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.85), cy, Inches(6.16), ch, CARD_BG, CARD_BORDER)
    tf_m = tf_setup(card_m, ml=0.2, mt=0.12)
    p = tf_m.paragraphs[0]
    p.space_after = Pt(4)
    run(p, "Methodology & Implementation", size=Pt(11), bold=True, color=EMERALD_600)
    for cat, desc in [
        ("1. Ingestion", "Bounding box clipping, UTM reprojection, OSM vector extraction, Bhuvan validation."),
        ("2. Height", "DSM-DEM zonal diff + annular buffer terrain sampling + typology heuristics."),
        ("3. Cadastre", "14-digit ULPIN, zero-discrepancy floor normalization, dual-tier volumetric parcels."),
        ("4. Digital Twin", "Instanced rendering of 4,641 buildings + 238 km roads; interactive inspection."),
    ]:
        pi = tf_m.add_paragraph()
        pi.space_after = Pt(2)
        run(pi, f"{cat}: ", size=Pt(9), bold=True, color=SLATE_900)
        run(pi, desc, size=Pt(8.5), color=SLATE_600)


def slide_4_feasibility(prs):
    slide = prs.slides[3]
    style_header(slide, "FEASIBILITY AND VIABILITY ANALYSIS")
    kill_placeholder(slide)

    columns = [
        ("Feasibility Analysis", SKY_600, [
            ("Data", "100% open sovereign data — Copernicus DEM, SRTM, ISRO Bhuvan, OSM. Zero licensing fees."),
            ("Operations", "Entire 9 km\u00b2 urban sector processed in 12.5 seconds on commodity hardware."),
            ("Technical", "Built on ISO 19152 LADM, OGC CityGML, 14-digit DoLR ULPIN standards."),
            ("Deployment", "Client-side WebGL at 60 FPS in any browser — no GPUs or native installs."),
        ]),
        ("Challenges & Risks", ROSE_600, [
            ("Raster Noise", "30m DSM/DEM data has height distortion in dense high-rise clusters."),
            ("Missing Plans", "95%+ of municipal buildings lack digitized floor plans for unit mapping."),
            ("Browser Limits", "Simultaneous volumetric rendering can exhaust WebGL memory."),
            ("Elevation Drift", "Rounding errors cause cumulative drift between slices and rooftops."),
        ]),
        ("Mitigation Strategies", EMERALD_600, [
            ("5-Tier Fallback", "Annular terrain buffering + morphological typology + landmark registries."),
            ("Dual-Mode", "Floor-level slicing as default; upgrades to unit-level when blueprints exist."),
            ("On-Demand LOD", "Only selected building is volumetrically extruded; others stay as batched mesh."),
            ("Normalizer", "Enforces cumulative height = building height with 0.00m error tolerance."),
        ]),
    ]

    cw, ch = Inches(3.95), Inches(5.2)
    cgap = Inches(0.18)
    cx0, cy = Inches(0.55), Inches(1.3)

    for i, (title, color, items) in enumerate(columns):
        cx = cx0 + i * (cw + cgap)
        card = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, cx, cy, cw, ch, CARD_BG, CARD_BORDER)

        tf = tf_setup(card, ml=0.18, mr=0.18, mt=0.2)
        p = tf.paragraphs[0]
        p.space_after = Pt(10)
        run(p, title, size=Pt(12.5), bold=True, color=color)

        for item_title, item_desc in items:
            pi = tf.add_paragraph()
            pi.space_after = Pt(8)
            run(pi, f"{item_title}: ", size=Pt(9.5), bold=True, color=color)
            run(pi, item_desc, size=Pt(9), color=SLATE_600)


def slide_5_impact(prs):
    slide = prs.slides[4]
    style_header(slide, "IMPACT AND MULTI-SECTOR BENEFITS")
    kill_placeholder(slide)

    # Left: Stakeholder Impact
    card_l = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                       Inches(0.55), Inches(1.3), Inches(6.05), Inches(5.2), CARD_BG, CARD_BORDER)
    tf_l = tf_setup(card_l, ml=0.22, mt=0.18)
    p = tf_l.paragraphs[0]
    p.space_after = Pt(8)
    run(p, "Potential Impact on Target Audience", size=Pt(12.5), bold=True, color=SKY_600)

    for title, desc in [
        ("Dept. of Land Resources & Survey of India",
         "Blueprint to transition 2D Bhu-Aadhaar into a national 3D cadastral framework."),
        ("Urban Local Bodies (GHMC / Smart City)",
         "15\u201325% higher property tax via detection of unassessed floors and FAR violations."),
        ("Homebuyers & Citizens",
         "Undisputed legal title to specific vertical airspace, replacing UDS agreements."),
        ("Banks & Mortgage Lenders",
         "Instant 3D collateral verification; eliminates fraudulent multi-mortgaging."),
    ]:
        pi = tf_l.add_paragraph()
        pi.space_after = Pt(8)
        run(pi, title, size=Pt(9.5), bold=True, color=SLATE_900)
        pd = tf_l.add_paragraph()
        pd.space_after = Pt(4)
        run(pd, desc, size=Pt(9), color=SLATE_600)

    # Right: Benefits
    card_r = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                       Inches(6.85), Inches(1.3), Inches(6.16), Inches(5.2), CARD_BG, CARD_BORDER)
    tf_r = tf_setup(card_r, ml=0.22, mt=0.18)
    p = tf_r.paragraphs[0]
    p.space_after = Pt(8)
    run(p, "Benefits (Social, Economic, Environmental)", size=Pt(12.5), bold=True, color=EMERALD_600)

    for title, desc in [
        ("Economic",
         "Eliminates land litigation costs; accelerates bank loan approvals from weeks to minutes."),
        ("Social & Governance",
         "100% transparency in vertical ownership; prevents double-selling scams."),
        ("Disaster Management",
         "Floor-level flood simulation identifies submerged levels for precision rescue."),
        ("Environmental",
         "3D solar shadow analysis enables rooftop PV capacity estimation and heat island mitigation."),
    ]:
        pi = tf_r.add_paragraph()
        pi.space_after = Pt(8)
        run(pi, title, size=Pt(9.5), bold=True, color=EMERALD_500)
        pd = tf_r.add_paragraph()
        pd.space_after = Pt(4)
        run(pd, desc, size=Pt(9), color=SLATE_600)


def slide_6_references(prs):
    slide = prs.slides[5]
    style_header(slide, "RESEARCH, REFERENCES & WORKING PROTOTYPE")
    kill_placeholder(slide)

    # Left: References
    card_ref = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                         Inches(0.55), Inches(1.3), Inches(6.8), Inches(5.2), CARD_BG, CARD_BORDER)
    tf = tf_setup(card_ref, ml=0.22, mt=0.18)
    p = tf.paragraphs[0]
    p.space_after = Pt(6)
    run(p, "Research & Reference Work", size=Pt(12.5), bold=True, color=SKY_600)

    for title, desc in [
        ("DoLR / NIC Guidelines",
         "ULPIN / Bhu-Aadhaar Technical Specifications & Design Guidelines (2021\u20132024)."),
        ("ISO 19152 (LADM)",
         "Land Administration Domain Model \u2014 Part 3: 3D/4D Spatial Administration."),
        ("OGC Standards",
         "CityGML 3.0 & 3D Tiles Community Standard for streaming geospatial models."),
        ("Survey of India & MoHUA",
         "National Geospatial Policy 2022 & NUDM Smart City guidelines."),
        ("Academic Research",
         "Biljecki et al. (2015): 3D City Models; Stoter et al. (2020): 3D Cadastre in Practice."),
        ("Data Sources",
         "Copernicus GLO-30 DSM, SRTM DEM, ISRO Bhuvan, OSM (ODbL), TS-RERA Portal."),
    ]:
        pi = tf.add_paragraph()
        pi.space_after = Pt(5)
        run(pi, f"{title}: ", size=Pt(9), bold=True, color=SLATE_900)
        run(pi, desc, size=Pt(8.5), color=SLATE_600)

    # Right Top: Prototype Info
    card_pr = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                        Inches(7.6), Inches(1.3), Inches(5.15), Inches(1.05), SLATE_900, EMERALD_500, Pt(1.5))
    tf_pr = tf_setup(card_pr, ml=0.15, mt=0.1)
    p = tf_pr.paragraphs[0]
    p.space_after = Pt(3)
    run(p, "Working Prototype & Repository", size=Pt(11), bold=True, color=EMERALD_400)
    for label, val in [
        ("GitHub: ", "github.com/Imad-81/SIH-26011"),
        ("3D Viewer: ", "localhost:3000 (Next.js 16 + Three.js)"),
        ("Pipeline: ", "python scripts/pipeline.py --city hyderabad"),
    ]:
        pi = tf_pr.add_paragraph()
        run(pi, label, size=Pt(8.5), bold=True, color=SLATE_200)
        run(pi, val, size=Pt(8.5), color=CYAN_400)

    # Right Bottom: Screenshot
    if PROTOTYPE_IMG.exists():
        slide.shapes.add_picture(str(PROTOTYPE_IMG),
                                 Inches(7.6), Inches(2.45), width=Inches(5.15), height=Inches(4.05))
    else:
        ph = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                       Inches(7.6), Inches(2.45), Inches(5.15), Inches(4.05), SLATE_900, SLATE_700)
        ph.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = ph.text_frame.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        run(p, "3D Digital Twin Prototype", size=Pt(14), color=SLATE_400)


# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

def main():
    print("=" * 60)
    print("  SIH 2026 — Clean Professional Presentation (V3)")
    print("  Team: GeoVoxel The coders | PS: SIH26011")
    print("=" * 60)

    if not TEMPLATE_PATH.exists():
        print(f"Template not found: {TEMPLATE_PATH}")
        sys.exit(1)

    prs = Presentation(str(TEMPLATE_PATH))

    slide_1_title(prs)
    slide_2_solution(prs)
    slide_3_technical(prs)
    slide_4_feasibility(prs)
    slide_5_impact(prs)
    slide_6_references(prs)

    if len(prs.slides) > 6:
        rId = prs.slides._sldIdLst[6].rId
        prs.part.drop_rel(rId)
        del prs.slides._sldIdLst[6]

    prs.save(str(OUTPUT_PPTX))
    print(f"\nSaved {OUTPUT_PPTX.name} ({len(prs.slides)} slides)")


if __name__ == "__main__":
    main()
