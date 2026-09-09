#!/usr/bin/env python3
"""
SIH 2026 — Premium Presentation Generator (V2)
================================================
Generates a stunning, polished 6-slide PPTX using the official SIH template.

Features vs V1:
  • Gradient-style accent banners & decorative strips
  • Icon-based metric highlight cards with large numerics
  • Native vector pipeline flow diagram with connecting arrows
  • Dual-tier cadastre hierarchy with clear visual separation
  • Rich color-coded card system (Feasibility / Risk / Mitigation)
  • Embedded high-res prototype screenshot

Team: GeoVoxel The coders
Problem Statement: SIH26011
"""

import os
import sys
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn


# ═══════════════════════════════════════════════════════════════════
# GLOBAL CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

PROJECT_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_PATH = PROJECT_ROOT / "SIH2026-IDEA-Presentation-Format.pptx"
OUTPUT_PPTX = PROJECT_ROOT / "SIH2026_GeoVoxel_SIH26011.pptx"
PROTOTYPE_IMG = PROJECT_ROOT / "outputs" / "presentation_assets" / "prototype_cropped.png"

# ═══════════════════════════════════════════════════════════════════
# COLOR SYSTEM — Premium Dark + Vibrant Accent Palette
# ═══════════════════════════════════════════════════════════════════

# Dark Foundation
SLATE_950 = RGBColor(2, 6, 23)        # #020617
SLATE_900 = RGBColor(15, 23, 42)      # #0f172a
SLATE_800 = RGBColor(30, 41, 59)      # #1e293b
SLATE_700 = RGBColor(51, 65, 85)      # #334155
SLATE_600 = RGBColor(71, 85, 105)     # #475569
SLATE_400 = RGBColor(148, 163, 184)   # #94a3b8
SLATE_200 = RGBColor(226, 232, 240)   # #e2e8f0
SLATE_100 = RGBColor(241, 245, 249)   # #f1f5f9
SLATE_50 = RGBColor(248, 250, 252)    # #f8fafc

# Primary Accents
SKY_500 = RGBColor(14, 165, 233)      # #0ea5e9
SKY_600 = RGBColor(2, 132, 199)       # #0284c7
SKY_400 = RGBColor(56, 189, 248)      # #38bdf8
SKY_950 = RGBColor(8, 47, 73)         # #082f49

EMERALD_500 = RGBColor(16, 185, 129)  # #10b981
EMERALD_600 = RGBColor(5, 150, 105)   # #059669
EMERALD_400 = RGBColor(52, 211, 153)  # #34d399
EMERALD_300 = RGBColor(110, 231, 183) # #6ee7b7
EMERALD_950 = RGBColor(6, 78, 59)     # #064e3b

INDIGO_500 = RGBColor(99, 102, 241)   # #6366f1
INDIGO_600 = RGBColor(79, 70, 229)    # #4f46e5
INDIGO_400 = RGBColor(129, 140, 248)  # #818cf8
INDIGO_300 = RGBColor(165, 180, 252)  # #a5b4fc
INDIGO_950 = RGBColor(30, 27, 75)     # #1e1b4b
INDIGO_900 = RGBColor(49, 46, 129)    # #312e81

AMBER_500 = RGBColor(245, 158, 11)    # #f59e0b
AMBER_400 = RGBColor(251, 191, 36)    # #fbbf24
AMBER_950 = RGBColor(69, 26, 3)       # #451a03

ROSE_500 = RGBColor(244, 63, 94)      # #f43f5e
ROSE_600 = RGBColor(225, 29, 72)      # #e11d48
ROSE_400 = RGBColor(251, 113, 133)    # #fb7185
ROSE_950 = RGBColor(76, 5, 25)        # #4c0519

VIOLET_500 = RGBColor(139, 92, 246)   # #8b5cf6
VIOLET_950 = RGBColor(46, 16, 101)    # #2e1065

CYAN_500 = RGBColor(6, 182, 212)      # #06b6d4
CYAN_400 = RGBColor(34, 211, 238)     # #22d3ee

WHITE = RGBColor(255, 255, 255)

# Card System
CARD_BG = SLATE_50
CARD_BORDER = RGBColor(203, 213, 225)  # #cbd5e1
CARD_DARK_BG = SLATE_900
CARD_DARK_BORDER = SLATE_700

# ═══════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════

def set_rounded_corners(shape, radius_emu=91440):
    """Set corner rounding radius on a rounded rectangle shape."""
    sp = shape._element
    prstGeom = sp.find(qn('a:prstGeom'), sp.nsmap) if hasattr(sp, 'nsmap') else None
    if prstGeom is None:
        for child in sp:
            if child.tag.endswith('spPr'):
                prstGeom = child.find('.//{http://schemas.openxmlformats.org/drawingml/2006/main}prstGeom')
                break


def add_shape(slide, shape_type, left, top, width, height, fill_color, border_color=None, border_width=Pt(1.2)):
    """Add a shape with consistent styling."""
    s = slide.shapes.add_shape(shape_type, left, top, width, height)
    s.fill.solid()
    s.fill.fore_color.rgb = fill_color
    if border_color:
        s.line.color.rgb = border_color
        s.line.width = border_width
    else:
        s.line.fill.background()
    return s


def add_text_run(paragraph, text, font_name="Arial", font_size=Pt(10), bold=False, color=SLATE_800, italic=False):
    """Add a styled text run to a paragraph."""
    run = paragraph.add_run()
    run.text = text
    run.font.name = font_name
    run.font.size = font_size
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    return run


def setup_text_frame(shape, word_wrap=True, ml=0.2, mr=0.2, mt=0.15, mb=0.1):
    """Setup text frame with standard margins."""
    tf = shape.text_frame
    tf.word_wrap = word_wrap
    tf.margin_left = Inches(ml)
    tf.margin_right = Inches(mr)
    tf.margin_top = Inches(mt)
    tf.margin_bottom = Inches(mb)
    return tf


def add_accent_strip(slide, left, top, width, height, color):
    """Add a thin decorative accent strip."""
    strip = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    strip.fill.solid()
    strip.fill.fore_color.rgb = color
    strip.line.fill.background()
    return strip


def add_metric_badge(slide, left, top, width, height, number, label, bg_color, accent_color, text_color=WHITE):
    """Add a prominent metric highlight card with a large number and label."""
    card = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height, bg_color, accent_color, Pt(1.5))
    tf = card.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = Inches(0.08)
    tf.margin_right = Inches(0.08)
    
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    add_text_run(p, number, font_size=Pt(22), bold=True, color=text_color)
    
    p2 = tf.add_paragraph()
    p2.alignment = PP_ALIGN.CENTER
    add_text_run(p2, label, font_size=Pt(7.5), bold=False, color=accent_color)
    return card


def style_header_and_badge(slide, title_text):
    """Uniformly style the team badge and title across slides 2–6."""
    for s in slide.shapes:
        if "Oval" in s.name and s.has_text_frame:
            s.left = Inches(0.45)
            s.top = Inches(0.2)
            s.width = Inches(1.55)
            s.height = Inches(0.85)
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
            r1 = p.add_run()
            r1.text = "GeoVoxel"
            r1.font.name = "Arial"
            r1.font.size = Pt(12)
            r1.font.bold = True
            r1.font.color.rgb = WHITE
            p2 = s.text_frame.add_paragraph()
            p2.alignment = PP_ALIGN.CENTER
            r2 = p2.add_run()
            r2.text = "The coders"
            r2.font.name = "Arial"
            r2.font.size = Pt(8.5)
            r2.font.bold = False
            r2.font.color.rgb = INDIGO_300
            
        elif s.name == "Title 1" and s.has_text_frame:
            s.left = Inches(2.15)
            s.top = Inches(0.18)
            s.width = Inches(8.1)
            s.height = Inches(0.95)
            s.text_frame.clear()
            s.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = s.text_frame.paragraphs[0]
            p.alignment = PP_ALIGN.LEFT
            add_text_run(p, title_text, font_size=Pt(21), bold=True, color=SLATE_900)


def remove_placeholder(slide, name="TextBox 8"):
    """Remove a named placeholder shape from a slide."""
    for s in list(slide.shapes):
        if s.name == name:
            slide.shapes._spTree.remove(s._element)


# ═══════════════════════════════════════════════════════════════════
# SLIDE BUILDERS
# ═══════════════════════════════════════════════════════════════════

def build_slide_1_title(prs):
    """SLIDE 1: TITLE PAGE — Problem Statement & Team Identity"""
    slide = prs.slides[0]
    
    for s in slide.shapes:
        if s.name == "TextBox 9" and s.has_text_frame:
            tf = s.text_frame
            tf.clear()
            
            # Initial empty paragraph
            tf.paragraphs[0].text = ""
            
            entries = [
                ("Problem Statement ID – ", "SIH26011", SKY_600, True),
                ("Problem Statement Title – ", "3D ULPIN (Bhu-Aadhaar) Generation, Vertical Cadastre & 3D Building Visualization Digital Twin", SLATE_900, True),
                ("Theme – ", "Smart Automation / Geospatial Technology / Smart Cities", SLATE_800, False),
                ("PS Category – ", "Software", SLATE_800, False),
                ("Team Name (Registered on portal) – ", "GeoVoxel The coders", INDIGO_600, True),
            ]
            
            for label, value, val_color, is_bold in entries:
                p = tf.add_paragraph()
                p.space_after = Pt(14)
                
                r1 = p.add_run()
                r1.text = label
                r1.font.name = "Arial"
                r1.font.size = Pt(17)
                r1.font.bold = True
                r1.font.color.rgb = SLATE_800
                
                r2 = p.add_run()
                r2.text = value
                r2.font.name = "Arial"
                r2.font.size = Pt(17)
                r2.font.bold = is_bold
                r2.font.color.rgb = val_color


def build_slide_2_solution(prs):
    """SLIDE 2: PROPOSED SOLUTION — Rich visual layout with diagrams"""
    slide = prs.slides[1]
    style_header_and_badge(slide, "GEO-CADASTRE 3D: Autonomous 3D ULPIN & Vertical Cadastre Digital Twin")
    remove_placeholder(slide)
    
    # ── Left Column: Solution Text Card with accent strip ──
    # Accent strip on left edge
    add_accent_strip(slide, Inches(0.55), Inches(1.3), Inches(0.06), Inches(5.2), SKY_500)
    
    card_l = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                       Inches(0.65), Inches(1.3), Inches(6.7), Inches(5.2),
                       CARD_BG, CARD_BORDER)
    
    tf = setup_text_frame(card_l, ml=0.22, mt=0.16)
    
    sections = [
        ("⚡ Proposed Solution", SKY_600, [
            "End-to-end autonomous geospatial pipeline that generates India's first production-ready 3D vertical cadastre, transforming 2D Bhu-Aadhaar (ULPIN) into legally actionable volumetric land parcels.",
            "Interactive 60 FPS WebGL digital twin built on Next.js 16 + Three.js, delivering real-time building inspection, floor isolation, and solar analysis in any browser."
        ]),
        ("🔬 Detailed Technical Solution", INDIGO_600, [
            "Tier 1 (Unit-Level 3D ULPIN): Parses sanctioned TS-RERA architectural blueprints into individual flat/unit parcels ({ULPIN-2D}-FLxx-Uyyyy) with carpet area, facing direction, and Z-coordinates.",
            "Tier 2 (Floor-Level 3D ULPIN): Automated vertical cadastre ({ULPIN-2D}-FLxx) for all buildings via hybrid DSM-DEM height estimation with zero-discrepancy floor normalization."
        ]),
        ("🎯 How It Addresses The Problem", EMERALD_600, [
            "Eliminates multi-ownership chaos where hundreds of apartment owners share a single 2D survey number — each unit now has its own unique 3D spatial identity.",
            "Creates undisputed legal 3D spatial parcels (Z-min, Z-max MSL) aligned with ISO 19152 LADM Part 3 and OGC CityGML 3.0 standards."
        ]),
        ("💡 Innovation & Uniqueness", ROSE_600, [
            "Zero-Discrepancy Floor Slab Engine: Proportional normalization guarantees ∑ hᵢ ≡ H_building with 0.00m cumulative error across all 4,641 buildings.",
            "Client-Side 60 FPS Digital Twin: Full BatchedMesh / LOD rendering of 22,761 volumetric parcels + 238 km road network — no server GPU required."
        ]),
    ]
    
    for idx, (header, color, bullets) in enumerate(sections):
        hp = tf.add_paragraph() if idx > 0 or tf.paragraphs[0].text else tf.paragraphs[0]
        hp.space_before = Pt(6) if idx > 0 else Pt(0)
        hp.space_after = Pt(2)
        add_text_run(hp, header, font_size=Pt(11), bold=True, color=color)
        
        for bp in bullets:
            p = tf.add_paragraph()
            p.space_after = Pt(2.5)
            add_text_run(p, "• " + bp, font_size=Pt(8.8), color=SLATE_800)
    
    # ── Right Column: Native Cadastre Hierarchy Diagram ──
    
    # Top: 2D Bhu-Aadhaar Root Card
    box_2d = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                       Inches(7.6), Inches(1.3), Inches(5.15), Inches(1.35),
                       SKY_950, SKY_500, Pt(2.0))
    
    # Accent strip on top of 2D box
    add_accent_strip(slide, Inches(7.7), Inches(1.35), Inches(4.95), Inches(0.05), SKY_400)
    
    tf_2d = box_2d.text_frame
    tf_2d.word_wrap = True
    tf_2d.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf_2d.margin_left = Inches(0.12)
    
    p = tf_2d.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    add_text_run(p, "🏛 GOVERNMENT 2D BHU-AADHAAR (ULPIN)", font_size=Pt(9.5), bold=True, color=SKY_400)
    
    p2 = tf_2d.add_paragraph()
    p2.alignment = PP_ALIGN.CENTER
    add_text_run(p2, "3621050103VUWK", font_size=Pt(16), bold=True, color=WHITE)
    add_text_run(p2, "  (14-Digit DoLR Standard)", font_size=Pt(9), bold=False, color=SLATE_400)
    
    p3 = tf_2d.add_paragraph()
    p3.alignment = PP_ALIGN.CENTER
    add_text_run(p3, "State: 36 · District: 21 · Mandal: 05 · Village: 0103 · Survey: 83/1", font_size=Pt(7.8), color=SLATE_400)
    
    # Connection Arrow Bar
    arrow_bar = add_shape(slide, MSO_SHAPE.RECTANGLE,
                          Inches(9.92), Inches(2.68), Inches(0.06), Inches(0.22),
                          SKY_400)
    
    # Left Branch Arrow
    arrow_l = add_shape(slide, MSO_SHAPE.RECTANGLE,
                        Inches(8.5), Inches(2.88), Inches(1.5), Inches(0.04),
                        SKY_400)
    arrow_ld = add_shape(slide, MSO_SHAPE.RECTANGLE,
                         Inches(8.5), Inches(2.88), Inches(0.04), Inches(0.2),
                         SKY_400)
    
    # Right Branch Arrow
    arrow_r = add_shape(slide, MSO_SHAPE.RECTANGLE,
                        Inches(9.95), Inches(2.88), Inches(1.5), Inches(0.04),
                        SKY_400)
    arrow_rd = add_shape(slide, MSO_SHAPE.RECTANGLE,
                         Inches(11.42), Inches(2.88), Inches(0.04), Inches(0.2),
                         SKY_400)
    
    # Tier 1: Unit-Level 3D ULPIN (Left)
    box_t1 = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                       Inches(7.6), Inches(3.12), Inches(2.48), Inches(3.38),
                       EMERALD_950, EMERALD_500, Pt(1.5))
    
    # Tier 1 accent strip
    add_accent_strip(slide, Inches(7.7), Inches(3.17), Inches(2.28), Inches(0.04), EMERALD_400)
    
    tf_t1 = setup_text_frame(box_t1, ml=0.1, mr=0.1, mt=0.1)
    
    p = tf_t1.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    add_text_run(p, "TIER 1: UNIT 3D ULPIN", font_size=Pt(9.5), bold=True, color=EMERALD_400)
    
    p_sub = tf_t1.add_paragraph()
    p_sub.alignment = PP_ALIGN.CENTER
    p_sub.space_after = Pt(3)
    add_text_run(p_sub, "(Sanctioned RERA Blueprints)", font_size=Pt(7.5), color=EMERALD_300)
    
    units = [
        ("▸ -FL32-U3201", "4BHK Luxury · 318 m² · East"),
        ("▸ -FL32-U3202", "3BHK Premium · 241 m² · West"),
        ("▸ -FL32-U3203", "3BHK Premium · 241 m² · North"),
        ("▸ -FL32-ULOBBY", "Common Area · Lift & Fire · 85 m²"),
    ]
    for code, desc in units:
        pu = tf_t1.add_paragraph()
        pu.space_before = Pt(3)
        add_text_run(pu, code + "\n", font_size=Pt(7.5), bold=True, color=WHITE)
        add_text_run(pu, "   " + desc, font_size=Pt(7), color=EMERALD_300)
    
    # Tier 2: Floor-Level 3D ULPIN (Right)
    box_t2 = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                       Inches(10.27), Inches(3.12), Inches(2.48), Inches(3.38),
                       INDIGO_950, INDIGO_500, Pt(1.5))
    
    # Tier 2 accent strip
    add_accent_strip(slide, Inches(10.37), Inches(3.17), Inches(2.28), Inches(0.04), INDIGO_400)
    
    tf_t2 = setup_text_frame(box_t2, ml=0.1, mr=0.1, mt=0.1)
    
    p = tf_t2.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    add_text_run(p, "TIER 2: FLOOR 3D ULPIN", font_size=Pt(9.5), bold=True, color=INDIGO_400)
    
    p_sub2 = tf_t2.add_paragraph()
    p_sub2.alignment = PP_ALIGN.CENTER
    p_sub2.space_after = Pt(3)
    add_text_run(p_sub2, "(Automated Height Slicing)", font_size=Pt(7.5), color=INDIGO_300)
    
    floors = [
        ("▸ -FL32", "Floor 32 · Z: 691.01m – 694.00m MSL"),
        ("▸ -FL15", "Floor 15 · Z: 639.75m – 642.75m MSL"),
        ("▸ -FL08", "Floor 8 · Z: 618.34m – 621.34m MSL"),
        ("▸ -FL00", "Ground · Z: 594.00m – 598.34m MSL"),
    ]
    for code, desc in floors:
        pf = tf_t2.add_paragraph()
        pf.space_before = Pt(3)
        add_text_run(pf, code + "\n", font_size=Pt(7.5), bold=True, color=WHITE)
        add_text_run(pf, "   " + desc, font_size=Pt(7), color=INDIGO_300)


def build_slide_3_technical(prs):
    """SLIDE 3: TECHNICAL APPROACH — Pipeline Architecture + Tech Stack"""
    slide = prs.slides[2]
    style_header_and_badge(slide, "TECHNICAL APPROACH & PIPELINE ARCHITECTURE")
    remove_placeholder(slide)
    
    # ── 4-Stage Pipeline Cards ──
    stages = [
        {
            "title": "STAGE 1",
            "subtitle": "DATA INGESTION",
            "icon": "📡",
            "accent": SKY_500,
            "bg": SKY_950,
            "items": [
                "OpenStreetMap (Overpass QL)",
                "Copernicus GLO-30 DSM (AWS)",
                "SRTM GL1 DEM (OpenTopo)",
                "ISRO Bhuvan OGC Geoportal",
                "TS-RERA & Dharani Land DB",
            ],
        },
        {
            "title": "STAGE 2",
            "subtitle": "5-TIER HEIGHT ENGINE",
            "icon": "📐",
            "accent": INDIGO_500,
            "bg": INDIGO_950,
            "items": [
                "1. Landmark / RERA Registry",
                "2. DSM-DEM Zonal Statistics",
                "3. Annular Buffer Sampling",
                "4. Morphological Typology",
                "5. Cluster Spatial Propagation",
            ],
        },
        {
            "title": "STAGE 3",
            "subtitle": "3D CADASTRE & ULPIN",
            "icon": "🏗",
            "accent": EMERALD_500,
            "bg": EMERALD_950,
            "items": [
                "14-Digit 2D Bhu-Aadhaar (NIC)",
                "Unit 3D ULPIN (-FLxx-Uyyyy)",
                "Floor 3D ULPIN (-FLxx)",
                "Zero-Discrepancy Normalizer",
                "ISO 19152 LADM / CityGML 3.0",
            ],
        },
        {
            "title": "STAGE 4",
            "subtitle": "3D DIGITAL TWIN",
            "icon": "🌐",
            "accent": AMBER_500,
            "bg": AMBER_950,
            "items": [
                "Next.js 16 + React 19 + Three.js",
                "60 FPS BatchedMesh / LOD",
                "Interactive Floor Isolation",
                "Solar & Flood Simulation",
                "3D Flyovers & Road Network",
            ],
        },
    ]
    
    stage_w = Inches(2.95)
    stage_h = Inches(2.48)
    gap = Inches(0.15)
    start_x = Inches(0.55)
    start_y = Inches(1.25)
    
    for idx, st in enumerate(stages):
        bx = start_x + idx * (stage_w + gap)
        
        # Outer card
        card = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE, bx, start_y, stage_w, stage_h,
                         st["bg"], st["accent"], Pt(1.8))
        
        # Header banner
        banner_h = Inches(0.55)
        banner = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                           bx + Inches(0.06), start_y + Inches(0.06),
                           stage_w - Inches(0.12), banner_h,
                           st["accent"])
        tf_b = banner.text_frame
        tf_b.vertical_anchor = MSO_ANCHOR.MIDDLE
        tf_b.margin_left = Inches(0.08)
        p = tf_b.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        add_text_run(p, f'{st["icon"]} {st["title"]}', font_size=Pt(8), bold=True, color=WHITE)
        p2 = tf_b.add_paragraph()
        p2.alignment = PP_ALIGN.CENTER
        add_text_run(p2, st["subtitle"], font_size=Pt(9.5), bold=True, color=WHITE)
        
        # Body items
        tb = slide.shapes.add_textbox(
            bx + Inches(0.08), start_y + Inches(0.66),
            stage_w - Inches(0.16), stage_h - Inches(0.72))
        tf_body = tb.text_frame
        tf_body.word_wrap = True
        tf_body.margin_left = Inches(0.06)
        tf_body.margin_top = Inches(0.04)
        
        for i, item in enumerate(st["items"]):
            p = tf_body.add_paragraph() if i > 0 else tf_body.paragraphs[0]
            p.space_after = Pt(3.5)
            add_text_run(p, "• " + item, font_size=Pt(8.5), color=SLATE_200)
        
        # Connection arrow to next stage
        if idx < len(stages) - 1:
            arrow_x = bx + stage_w + Inches(0.02)
            arrow_y = start_y + stage_h / 2 - Inches(0.02)
            arr = add_shape(slide, MSO_SHAPE.RIGHT_ARROW,
                            arrow_x, arrow_y, gap - Inches(0.04), Inches(0.15),
                            SKY_400)
    
    # ── Metric Badges Row ──
    badge_y = Inches(3.86)
    badge_h = Inches(0.6)
    badge_w = Inches(2.4)
    badge_gap = Inches(0.15)
    
    metrics = [
        ("4,641", "Buildings Processed", SKY_950, SKY_400),
        ("22,761", "3D Vertical Parcels", EMERALD_950, EMERALD_400),
        ("238 km", "Road Network", INDIGO_950, INDIGO_400),
        ("12.5s", "Pipeline Execution", AMBER_950, AMBER_400),
        ("60 FPS", "Rendering Speed", VIOLET_950, VIOLET_500),
    ]
    
    total_badge_w = len(metrics) * badge_w + (len(metrics) - 1) * badge_gap
    badge_start = Inches(0.55)
    actual_badge_w = (Inches(12.46) - (len(metrics) - 1) * badge_gap) / len(metrics)
    
    for i, (num, label, bg, accent) in enumerate(metrics):
        bx = badge_start + i * (actual_badge_w + badge_gap)
        add_metric_badge(slide, bx, badge_y, actual_badge_w, badge_h, num, label, bg, accent)
    
    # ── Bottom: Technologies + Methodology (2 Columns) ──
    col_y = Inches(4.58)
    col_h = Inches(1.92)
    
    # Left: Technologies
    card_tech = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                          Inches(0.55), col_y, Inches(6.1), col_h,
                          CARD_BG, CARD_BORDER)
    add_accent_strip(slide, Inches(0.55), col_y, Inches(0.05), col_h, SKY_500)
    
    tf_tech = setup_text_frame(card_tech, ml=0.2, mt=0.12)
    
    p = tf_tech.paragraphs[0]
    p.space_after = Pt(4)
    add_text_run(p, "Technologies & Frameworks", font_size=Pt(11), bold=True, color=SKY_600)
    
    tech = [
        ("Core Geospatial", "Python 3.10+, GDAL, Rasterio, Shapely, GeoPandas, PyProj, SciPy k-d trees, OpenTopography API."),
        ("Elevation & Remote Sensing", "Copernicus GLO-30 DSM (30m), SRTM GL1 DEM, ISRO Bhuvan OGC WFS/WMS, OSM Overpass QL, TS-RERA."),
        ("3D Digital Twin Platform", "Next.js 16 (Turbopack), React 19, Three.js (r185), React Three Fiber, BatchedMesh / WebGL 2.0."),
    ]
    for cat, desc in tech:
        pi = tf_tech.add_paragraph()
        pi.space_after = Pt(2.5)
        add_text_run(pi, f"• {cat}: ", font_size=Pt(8.8), bold=True, color=SLATE_900)
        add_text_run(pi, desc, font_size=Pt(8.5), color=SLATE_600)
    
    # Right: Methodology
    card_meth = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                          Inches(6.85), col_y, Inches(6.16), col_h,
                          CARD_BG, CARD_BORDER)
    add_accent_strip(slide, Inches(6.85), col_y, Inches(0.05), col_h, EMERALD_500)
    
    tf_meth = setup_text_frame(card_meth, ml=0.2, mt=0.12)
    
    p = tf_meth.paragraphs[0]
    p.space_after = Pt(4)
    add_text_run(p, "Methodology & Implementation", font_size=Pt(11), bold=True, color=EMERALD_600)
    
    meth = [
        ("1. Data Ingestion", "Bounding box clipping, UTM 44N reprojection, OSM vector extraction, Bhuvan cadastral validation."),
        ("2. Height Engine", "DSM-DEM zonal diff + annular buffer terrain sampling + morphological typology + landmark registry."),
        ("3. 3D Cadastre", "14-digit ULPIN, zero-discrepancy floor normalization (∑ hᵢ ≡ H), dual-tier volumetric parcels."),
        ("4. Digital Twin", "Instanced rendering of 4,641 buildings + 238 km roads in 12.5s; interactive floor inspection."),
    ]
    for cat, desc in meth:
        pi = tf_meth.add_paragraph()
        pi.space_after = Pt(2)
        add_text_run(pi, f"• {cat}: ", font_size=Pt(8.8), bold=True, color=SLATE_900)
        add_text_run(pi, desc, font_size=Pt(8.5), color=SLATE_600)


def build_slide_4_feasibility(prs):
    """SLIDE 4: FEASIBILITY AND VIABILITY — 3 Structured Cards with icons"""
    slide = prs.slides[3]
    style_header_and_badge(slide, "FEASIBILITY AND VIABILITY ANALYSIS")
    remove_placeholder(slide)
    
    columns = [
        {
            "title": "✅ Analysis of Feasibility",
            "color": SKY_600,
            "accent_strip": SKY_500,
            "icon_prefix": "•",
            "icon_color": SKY_600,
            "items": [
                ("Data Feasibility", "100% open, authoritative sovereign data: Copernicus DEM, SRTM, ISRO Bhuvan, OSM, LGD codes. Zero recurring licensing fees."),
                ("Operational Feasibility", "Master pipeline processes 9 km² (4,641 buildings, 22,761 vertical parcels, 238 km roads) in 12.5 seconds on commodity hardware."),
                ("Technical Feasibility", "Built on validated open standards: 14-digit DoLR ULPIN, ISO 19152 LADM, OGC CityGML, and GeoJSON-3D."),
                ("Deployment Viability", "Client-side WebGL viewer runs at 60 FPS in standard desktop/mobile browsers — no GPUs or native installs required."),
            ],
        },
        {
            "title": "⚠️ Potential Challenges & Risks",
            "color": ROSE_600,
            "accent_strip": ROSE_500,
            "icon_prefix": "⚠",
            "icon_color": ROSE_500,
            "items": [
                ("Satellite Raster Noise", "Global 30m DSM/DEM rasters exhibit height distortion and ground clutter in dense high-rise clusters."),
                ("Missing Floor Plans", "Over 95% of municipal multi-story buildings lack digitized CAD/BIM floor plans for unit-level mapping."),
                ("Browser Memory Limits", "Rendering tens of thousands of volumetric property units simultaneously can exhaust WebGL resources."),
                ("Elevation Drift", "Floor slab elevation rounding errors cause cumulative drift between computed slices and physical rooftops."),
            ],
        },
        {
            "title": "🛡 Mitigation Strategies",
            "color": EMERALD_600,
            "accent_strip": EMERALD_500,
            "icon_prefix": "✓",
            "icon_color": EMERALD_500,
            "items": [
                ("5-Tier Fallback Matrix", "Combines annular terrain buffering, morphological typology rules, and crowd-verified landmark registries for robust accuracy."),
                ("Dual-Mode Architecture", "Automated floor-level vertical partitioning (-FLxx) as standard, seamlessly upgrading to unit-level (-FLxx-Uyyyy) when blueprints exist."),
                ("On-Demand Volumetric LOD", "Only the selected building is dynamically extruded into volumetric floor slices; others remain optimized batched meshes at 60 FPS."),
                ("Proportional Normalizer", "Strictly enforces ∑ hᵢ ≡ H_building and snaps top floor ceiling to base + total_height with 0.00m error."),
            ],
        },
    ]
    
    col_w = Inches(3.95)
    col_gap = Inches(0.18)
    col_h = Inches(5.2)
    col_start_x = Inches(0.55)
    col_y = Inches(1.3)
    
    for idx, col in enumerate(columns):
        cx = col_start_x + idx * (col_w + col_gap)
        
        # Main card
        card = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                         cx, col_y, col_w, col_h,
                         CARD_BG, CARD_BORDER)
        
        # Accent strip at top
        add_accent_strip(slide, cx + Inches(0.12), col_y + Inches(0.06), col_w - Inches(0.24), Inches(0.04), col["accent_strip"])
        
        tf = setup_text_frame(card, ml=0.18, mr=0.18, mt=0.2)
        
        # Title
        p = tf.paragraphs[0]
        p.space_after = Pt(8)
        add_text_run(p, col["title"], font_size=Pt(12), bold=True, color=col["color"])
        
        for item_title, item_desc in col["items"]:
            pi = tf.add_paragraph()
            pi.space_after = Pt(6)
            
            add_text_run(pi, f'{col["icon_prefix"]} {item_title}: ', font_size=Pt(9.2), bold=True, color=col["icon_color"])
            add_text_run(pi, item_desc, font_size=Pt(8.5), color=SLATE_600)


def build_slide_5_impact(prs):
    """SLIDE 5: IMPACT AND BENEFITS — Stakeholders + Benefits"""
    slide = prs.slides[4]
    style_header_and_badge(slide, "IMPACT AND MULTI-SECTOR BENEFITS")
    remove_placeholder(slide)
    
    # ── Left Card: Stakeholder Impact ──
    card_imp = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                         Inches(0.55), Inches(1.3), Inches(6.05), Inches(5.2),
                         CARD_BG, CARD_BORDER)
    add_accent_strip(slide, Inches(0.55), Inches(1.3), Inches(0.05), Inches(5.2), SKY_500)
    
    tf_imp = setup_text_frame(card_imp, ml=0.22, mt=0.18)
    
    p = tf_imp.paragraphs[0]
    p.space_after = Pt(6)
    add_text_run(p, "🎯 Potential Impact on Target Audience", font_size=Pt(12), bold=True, color=SKY_600)
    
    stakeholders = [
        ("Dept. of Land Resources (DoLR) & Survey of India",
         "Production-ready blueprint to transition 2D Bhu-Aadhaar into a national 3D cadastral framework, ending airspace boundary overlaps."),
        ("Urban Local Bodies (GHMC / Smart City SPVs)",
         "Unlocks 15–25% higher property tax collection by detecting unassessed floors, unauthorized penthouses, and FAR/FSI violations."),
        ("Homebuyers, Citizens & RWA Associations",
         "Grants undisputed legal title to specific vertical airspace parcels, replacing fragile Undivided Share of Land (UDS) agreements."),
        ("Banks, NBFCs & Mortgage Lenders",
         "Instant 3D geospatial collateral verification; completely eliminates fraudulent multi-mortgaging of the same apartment flat."),
    ]
    
    for title, desc in stakeholders:
        pi = tf_imp.add_paragraph()
        pi.space_after = Pt(6)
        add_text_run(pi, f"• {title}:\n", font_size=Pt(9.5), bold=True, color=SLATE_900)
        add_text_run(pi, f"  {desc}", font_size=Pt(8.8), color=SLATE_600)
    
    # ── Right Card: Benefits ──
    card_ben = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                         Inches(6.85), Inches(1.3), Inches(6.16), Inches(5.2),
                         CARD_BG, CARD_BORDER)
    add_accent_strip(slide, Inches(6.85), Inches(1.3), Inches(0.05), Inches(5.2), EMERALD_500)
    
    tf_ben = setup_text_frame(card_ben, ml=0.22, mt=0.18)
    
    p = tf_ben.paragraphs[0]
    p.space_after = Pt(6)
    add_text_run(p, "★ Benefits (Social, Economic, Environmental)", font_size=Pt(12), bold=True, color=EMERALD_600)
    
    benefits = [
        ("💰 Economic Benefits",
         "Eliminates billions of rupees in civil land litigation; accelerates bank loan approvals from weeks to minutes; enables transparent, view-based property valuations."),
        ("🏛 Social & Governance",
         "100% transparency in vertical real estate ownership; prevents double-selling scams; empowers citizens with direct verification of sanctioned boundaries."),
        ("🚨 Disaster Management & Safety",
         "Floor-level flood inundation simulation (e.g. Durgam Cheruvu lake breach modeling) identifies submerged levels in real time for precision rescue operations."),
        ("🌿 Environmental & Urban Planning",
         "3D solar shadow path analysis enables accurate rooftop solar PV capacity estimation and micro-climate urban heat island mitigation strategies."),
    ]
    
    for title, desc in benefits:
        pi = tf_ben.add_paragraph()
        pi.space_after = Pt(6)
        add_text_run(pi, f"{title}:\n", font_size=Pt(9.5), bold=True, color=EMERALD_500)
        add_text_run(pi, f"  {desc}", font_size=Pt(8.8), color=SLATE_600)


def build_slide_6_references(prs):
    """SLIDE 6: RESEARCH, REFERENCES & WORKING PROTOTYPE"""
    slide = prs.slides[5]
    style_header_and_badge(slide, "RESEARCH, REFERENCES & WORKING PROTOTYPE")
    remove_placeholder(slide)
    
    # ── Left: References Card ──
    card_ref = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                         Inches(0.55), Inches(1.3), Inches(6.8), Inches(5.2),
                         CARD_BG, CARD_BORDER)
    add_accent_strip(slide, Inches(0.55), Inches(1.3), Inches(0.05), Inches(5.2), SKY_500)
    
    tf_ref = setup_text_frame(card_ref, ml=0.22, mt=0.18)
    
    p = tf_ref.paragraphs[0]
    p.space_after = Pt(5)
    add_text_run(p, "📚 Research & Reference Work", font_size=Pt(12), bold=True, color=SKY_600)
    
    references = [
        ("DoLR / NIC Technical Guidelines",
         "Dept. of Land Resources, MoRD, GoI: ULPIN / Bhu-Aadhaar Technical Specifications & Design Guidelines (2021–2024)."),
        ("ISO 19152:2012 / 2024 (LADM)",
         "Geographic Information — Land Administration Domain Model (LADM) — Part 3: 3D/4D Marine and Space Administration."),
        ("OGC Geospatial Standards",
         "City Geography Markup Language (CityGML 3.0) & 3D Tiles Community Standard for streaming massive geospatial models."),
        ("Survey of India & MoHUA",
         "National Geospatial Policy 2022 & National Urban Digital Mission (NUDM) Smart City guidelines."),
        ("Academic Research",
         "Biljecki et al. (2015): 'Applications of 3D City Models' (ISPRS IJGI); Stoter et al. (2020): '3D Cadastre in Practice'."),
        ("Authoritative Data Provenance",
         "Copernicus GLO-30 DSM (AWS), SRTM GL1 DEM (OpenTopography), ISRO Bhuvan OGC Geoportal, OSM (ODbL), TS-RERA Portal."),
    ]
    
    for title, desc in references:
        pi = tf_ref.add_paragraph()
        pi.space_after = Pt(4)
        add_text_run(pi, f"• {title}: ", font_size=Pt(8.8), bold=True, color=SLATE_900)
        add_text_run(pi, desc, font_size=Pt(8.2), color=SLATE_600)
    
    # ── Right Top: Prototype Info Card (Dark) ──
    card_proto = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                           Inches(7.6), Inches(1.3), Inches(5.15), Inches(1.1),
                           SLATE_900, EMERALD_500, Pt(1.5))
    add_accent_strip(slide, Inches(7.7), Inches(1.35), Inches(4.95), Inches(0.04), EMERALD_400)
    
    tf_pr = setup_text_frame(card_proto, ml=0.15, mt=0.1)
    
    p = tf_pr.paragraphs[0]
    p.space_after = Pt(2)
    add_text_run(p, "🚀 Working Prototype & Open Source Repository", font_size=Pt(11), bold=True, color=EMERALD_400)
    
    p2 = tf_pr.add_paragraph()
    add_text_run(p2, "• GitHub: ", font_size=Pt(8.5), bold=True, color=SLATE_200)
    add_text_run(p2, "github.com/Imad-81/SIH-26011", font_size=Pt(8.5), color=CYAN_400)
    
    p3 = tf_pr.add_paragraph()
    add_text_run(p3, "• 3D Viewer: ", font_size=Pt(8.5), bold=True, color=SLATE_200)
    add_text_run(p3, "localhost:3000 (Next.js 16 + Three.js r185)", font_size=Pt(8.5), color=CYAN_400)
    
    p4 = tf_pr.add_paragraph()
    add_text_run(p4, "• Pipeline: ", font_size=Pt(8.5), bold=True, color=SLATE_200)
    add_text_run(p4, "python scripts/pipeline.py --city hyderabad", font_size=Pt(8.5), color=CYAN_400)
    
    # ── Right Bottom: Prototype Screenshot ──
    if PROTOTYPE_IMG.exists():
        slide.shapes.add_picture(
            str(PROTOTYPE_IMG),
            Inches(7.6), Inches(2.5), width=Inches(5.15), height=Inches(4.0)
        )
    else:
        # Placeholder card if screenshot is missing
        placeholder = add_shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE,
                                Inches(7.6), Inches(2.5), Inches(5.15), Inches(4.0),
                                SLATE_900, SLATE_700)
        tf_ph = placeholder.text_frame
        tf_ph.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf_ph.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        add_text_run(p, "3D Digital Twin Prototype\n(Screenshot not found)", font_size=Pt(14), color=SLATE_400)


# ═══════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════

def build_presentation():
    """Build the complete SIH 2026 presentation."""
    print("=" * 60)
    print("  SIH 2026 — Premium Presentation Generator (V2)")
    print("  Team: GeoVoxel The coders · PS: SIH26011")
    print("=" * 60)
    
    if not TEMPLATE_PATH.exists():
        print(f"❌ Template not found: {TEMPLATE_PATH}")
        sys.exit(1)
    
    prs = Presentation(str(TEMPLATE_PATH))
    
    print("\n📄 Building Slide 1: Title Page...")
    build_slide_1_title(prs)
    
    print("📄 Building Slide 2: Proposed Solution...")
    build_slide_2_solution(prs)
    
    print("📄 Building Slide 3: Technical Approach...")
    build_slide_3_technical(prs)
    
    print("📄 Building Slide 4: Feasibility & Viability...")
    build_slide_4_feasibility(prs)
    
    print("📄 Building Slide 5: Impact & Benefits...")
    build_slide_5_impact(prs)
    
    print("📄 Building Slide 6: Research & Prototype...")
    build_slide_6_references(prs)
    
    # Delete Slide 7 (Instructions) if present
    if len(prs.slides) > 6:
        rId = prs.slides._sldIdLst[6].rId
        prs.part.drop_rel(rId)
        del prs.slides._sldIdLst[6]
        print("🗑  Deleted Slide 7 (Important Pointers)")
    
    prs.save(str(OUTPUT_PPTX))
    print(f"\n✅ Successfully saved premium presentation to {OUTPUT_PPTX.name}")
    print(f"   Slides: {len(prs.slides)}")
    
    # Also export to PDF-ready check
    print(f"\n📁 Output: {OUTPUT_PPTX}")
    print("   Open in PowerPoint/LibreOffice to review and export to PDF.")


if __name__ == "__main__":
    build_presentation()
