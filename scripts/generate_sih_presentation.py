import os
import shutil
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def build_presentation():
    template_path = "SIH2026-IDEA-Presentation-Format.pptx"
    output_pptx = "SIH2026_GeoVoxel_SIH26011.pptx"
    
    prs = Presentation(template_path)
    
    # Color palette
    NAVY_DARK = RGBColor(11, 15, 25)
    BLUE_ACCENT = RGBColor(14, 165, 233)     # #0ea5e9
    BLUE_DARK = RGBColor(2, 132, 199)       # #0284c7
    TEAL_ACCENT = RGBColor(16, 185, 129)     # #10b981
    TEAL_DARK = RGBColor(5, 150, 105)        # #059669
    INDIGO_ACCENT = RGBColor(99, 102, 241)   # #6366f1
    INDIGO_DARK = RGBColor(67, 56, 202)      # #4338ca
    AMBER_ACCENT = RGBColor(245, 158, 11)    # #f59e0b
    ROSE_ACCENT = RGBColor(225, 29, 72)      # #e11d48
    TEXT_DARK = RGBColor(15, 23, 42)         # #0f172a
    TEXT_BODY = RGBColor(30, 41, 59)         # #1e293b
    TEXT_MUTED = RGBColor(71, 85, 105)       # #475569
    WHITE = RGBColor(255, 255, 255)
    
    CARD_BG = RGBColor(248, 250, 252)        # #f8fafc
    CARD_BORDER = RGBColor(203, 213, 225)    # #cbd5e1

    def style_header_and_badge(slide, title_text):
        """Uniformly styles the title and Team Name badge across slides 2-6"""
        for s in slide.shapes:
            if "Oval" in s.name and s.has_text_frame:
                s.left = Inches(0.45)
                s.top = Inches(0.2)
                s.width = Inches(1.55)
                s.height = Inches(0.85)
                s.fill.solid()
                s.fill.fore_color.rgb = INDIGO_DARK
                s.line.color.rgb = INDIGO_ACCENT
                s.line.width = Pt(1.5)
                
                s.text_frame.clear()
                s.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
                s.text_frame.margin_left = Inches(0.05)
                s.text_frame.margin_right = Inches(0.05)
                p = s.text_frame.paragraphs[0]
                p.text = "GeoVoxel\nThe coders"
                p.font.name = "Arial"
                p.font.size = Pt(10.5)
                p.font.bold = True
                p.font.color.rgb = WHITE
                p.alignment = PP_ALIGN.CENTER
            elif s.name == "Title 1" and s.has_text_frame:
                s.left = Inches(2.15)
                s.top = Inches(0.18)
                s.width = Inches(8.1)
                s.height = Inches(0.95)
                s.text_frame.clear()
                s.text_frame.vertical_anchor = MSO_ANCHOR.MIDDLE
                p = s.text_frame.paragraphs[0]
                p.text = title_text
                p.font.name = "Arial"
                p.font.size = Pt(21)
                p.font.bold = True
                p.font.color.rgb = TEXT_DARK
                p.alignment = PP_ALIGN.LEFT

    # =========================================================================
    # SLIDE 1: TITLE PAGE
    # =========================================================================
    slide1 = prs.slides[0]
    for s in slide1.shapes:
        if s.name == "TextBox 9" and s.has_text_frame:
            tf = s.text_frame
            tf.clear()
            
            p0 = tf.paragraphs[0]
            p0.text = ""
            
            # Removed Team ID as requested, updated team name to GeoVoxel The coders
            entries = [
                ("Problem Statement ID – ", "SIH26011", BLUE_DARK, True),
                ("Problem Statement Title – ", "3D ULPIN (Bhu-Aadhaar) Generation, Vertical Cadastre & 3D Building Visualization Digital Twin", TEXT_DARK, True),
                ("Theme – ", "Smart Automation / Geospatial Technology / Smart Cities", TEXT_BODY, False),
                ("PS Category – ", "Software", TEXT_BODY, False),
                ("Team Name (Registered on portal) – ", "GeoVoxel The coders", INDIGO_DARK, True)
            ]
            
            for label, value, val_color, is_bold in entries:
                p = tf.add_paragraph()
                p.space_after = Pt(14)
                
                run1 = p.add_run()
                run1.text = label
                run1.font.name = "Arial"
                run1.font.size = Pt(17)
                run1.font.bold = True
                run1.font.color.rgb = RGBColor(30, 41, 59)
                
                run2 = p.add_run()
                run2.text = value
                run2.font.name = "Arial"
                run2.font.size = Pt(17)
                run2.font.bold = is_bold
                run2.font.color.rgb = val_color

    # =========================================================================
    # SLIDE 2: PROPOSED SOLUTION
    # =========================================================================
    slide2 = prs.slides[1]
    style_header_and_badge(slide2, "GEO-CADASTRE 3D: Autonomous 3D ULPIN & Vertical Cadastre Twin")
    
    # Remove old placeholder TextBox 8
    shapes_to_remove = [s for s in slide2.shapes if s.name == "TextBox 8"]
    for s in shapes_to_remove:
        slide2.shapes._spTree.remove(s._element)
        
    # Left Column: Card container for text
    card_l2 = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.65), Inches(1.3), Inches(6.9), Inches(5.2))
    card_l2.fill.solid()
    card_l2.fill.fore_color.rgb = CARD_BG
    card_l2.line.color.rgb = CARD_BORDER
    card_l2.line.width = Pt(1.2)
    
    tf2 = card_l2.text_frame
    tf2.word_wrap = True
    tf2.margin_left = Inches(0.2)
    tf2.margin_right = Inches(0.2)
    tf2.margin_top = Inches(0.18)
    tf2.margin_bottom = Inches(0.15)
    
    def add_bullet_section(tf, header, color, points):
        hp = tf.add_paragraph() if len(tf.paragraphs) > 0 and tf.paragraphs[0].text else tf.paragraphs[0]
        hp.space_before = Pt(5)
        hp.space_after = Pt(2)
        hrun = hp.add_run()
        hrun.text = header
        hrun.font.name = "Arial"
        hrun.font.size = Pt(11.5)
        hrun.font.bold = True
        hrun.font.color.rgb = color
        
        for bp in points:
            p = tf.add_paragraph()
            p.space_after = Pt(2.5)
            brun = p.add_run()
            brun.text = "• " + bp
            brun.font.name = "Arial"
            brun.font.size = Pt(9.5)
            brun.font.color.rgb = TEXT_BODY
            
    add_bullet_section(
        tf2,
        "Proposed Solution (Describe your Idea/Solution/Prototype)",
        BLUE_DARK,
        [
            "Autonomous master geospatial pipeline and interactive 3D WebGL digital twin solving the missing vertical dimension in India's land administration.",
            "Synthesizes official 14-digit 2D Bhu-Aadhaar and extends it into multi-tier vertical 3D spatial cadastre units."
        ]
    )
    add_bullet_section(
        tf2,
        "Detailed explanation of the proposed solution",
        INDIGO_DARK,
        [
            "Tier 1 (Flat/Unit-Level 3D ULPIN): Parses sanctioned TS-RERA architectural floor plans into individual flat parcels ({ULPIN-2D}-FLxx-Uyyyy) with carpet area, facing, and Z-coordinates.",
            "Tier 2 (Floor-Level 3D ULPIN): Automated floor-by-floor vertical cadastre ({ULPIN-2D}-FLxx) for all buildings lacking floor plans via hybrid DSM-DEM height estimation."
        ]
    )
    add_bullet_section(
        tf2,
        "How it addresses the problem",
        TEAL_DARK,
        [
            "Eliminates multi-ownership ambiguity where hundreds of apartment owners share a single 2D survey parcel number.",
            "Establishes undisputed legal 3D spatial units (Z-min, Z-max MSL) fully aligned with ISO 19152 LADM Part 3 and OGC CityGML standards."
        ]
    )
    add_bullet_section(
        tf2,
        "Innovation and uniqueness of the solution",
        ROSE_ACCENT,
        [
            "Zero-Discrepancy Floor Slab Engine: Proportional normalization guarantees ∑ h_i ≡ H_building with 0.00m error across all 4,641 buildings.",
            "60 FPS In-Browser Digital Twin: Full client-side Three.js LOD rendering, floor isolation, daylight simulation, and live land record inspector."
        ]
    )
    
    # Right Side: Native Vector Cadastre Diagram
    # 1. 2D Bhu-Aadhaar Box
    box_2d = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.75), Inches(1.3), Inches(5.0), Inches(1.3))
    box_2d.fill.solid()
    box_2d.fill.fore_color.rgb = RGBColor(8, 47, 73)      # #082f49
    box_2d.line.color.rgb = RGBColor(14, 165, 233)       # #0ea5e9
    box_2d.line.width = Pt(1.8)
    
    tf_2d = box_2d.text_frame
    tf_2d.word_wrap = True
    tf_2d.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf_2d.paragraphs[0]
    p.text = "GOVERNMENT 2D BHU-AADHAAR (ULPIN)"
    p.font.name = "Arial"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = RGBColor(56, 189, 248)
    p.alignment = PP_ALIGN.CENTER
    
    p2 = tf_2d.add_paragraph()
    p2.text = "3621050103VUWK  (14-Digit DoLR Standard)"
    p2.font.name = "Arial"
    p2.font.size = Pt(13)
    p2.font.bold = True
    p2.font.color.rgb = WHITE
    p2.alignment = PP_ALIGN.CENTER
    
    p3 = tf_2d.add_paragraph()
    p3.text = "State: 36 · District: 21 · Mandal: 05 · Village: 0103 · Survey: 83/1"
    p3.font.name = "Arial"
    p3.font.size = Pt(8.5)
    p3.font.color.rgb = RGBColor(148, 163, 184)
    p3.alignment = PP_ALIGN.CENTER

    # 2. Tier 1 Container (Flat/Unit-Level 3D ULPIN)
    box_t1 = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.75), Inches(2.75), Inches(2.42), Inches(3.75))
    box_t1.fill.solid()
    box_t1.fill.fore_color.rgb = RGBColor(6, 78, 59)      # #064e3b
    box_t1.line.color.rgb = RGBColor(16, 185, 129)       # #10b981
    box_t1.line.width = Pt(1.5)
    
    tf_t1 = box_t1.text_frame
    tf_t1.word_wrap = True
    tf_t1.margin_left = Inches(0.1)
    tf_t1.margin_right = Inches(0.1)
    tf_t1.margin_top = Inches(0.1)
    p = tf_t1.paragraphs[0]
    p.text = "TIER 1: UNIT 3D ULPIN"
    p.font.name = "Arial"
    p.font.size = Pt(9.5)
    p.font.bold = True
    p.font.color.rgb = RGBColor(52, 211, 153)
    p.alignment = PP_ALIGN.CENTER
    
    p_sub = tf_t1.add_paragraph()
    p_sub.text = "(Sanctioned RERA Plans)"
    p_sub.font.name = "Arial"
    p_sub.font.size = Pt(7.8)
    p_sub.font.color.rgb = RGBColor(167, 243, 208)
    p_sub.alignment = PP_ALIGN.CENTER
    
    units = [
        ("3621050103VUWK-FL32-U3201", "Flat 3201 · 4BHK (318 m²)\nZ: 691.01m–694.00m · East"),
        ("3621050103VUWK-FL32-U3202", "Flat 3202 · 3BHK (241 m²)\nZ: 691.01m–694.00m · West"),
        ("3621050103VUWK-FL32-ULOBBY", "Common Area · Lift Lobby\nFire Escape Shafts (85 m²)")
    ]
    for code, desc in units:
        p_u = tf_t1.add_paragraph()
        p_u.space_before = Pt(5)
        p_u.text = f"▶ {code}\n   {desc}"
        p_u.font.name = "Arial"
        p_u.font.size = Pt(7.5)
        p_u.font.color.rgb = WHITE

    # 3. Tier 2 Container (Floor-Level 3D ULPIN)
    box_t2 = slide2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(10.33), Inches(2.75), Inches(2.42), Inches(3.75))
    box_t2.fill.solid()
    box_t2.fill.fore_color.rgb = RGBColor(30, 27, 75)     # #1e1b4b
    box_t2.line.color.rgb = RGBColor(99, 102, 241)       # #6366f1
    box_t2.line.width = Pt(1.5)
    
    tf_t2 = box_t2.text_frame
    tf_t2.word_wrap = True
    tf_t2.margin_left = Inches(0.1)
    tf_t2.margin_right = Inches(0.1)
    tf_t2.margin_top = Inches(0.1)
    p = tf_t2.paragraphs[0]
    p.text = "TIER 2: FLOOR 3D ULPIN"
    p.font.name = "Arial"
    p.font.size = Pt(9.5)
    p.font.bold = True
    p.font.color.rgb = RGBColor(129, 140, 248)
    p.alignment = PP_ALIGN.CENTER
    
    p_sub2 = tf_t2.add_paragraph()
    p_sub2.text = "(Automated Slicing)"
    p_sub2.font.name = "Arial"
    p_sub2.font.size = Pt(7.8)
    p_sub2.font.color.rgb = RGBColor(199, 210, 254)
    p_sub2.alignment = PP_ALIGN.CENTER
    
    floors = [
        ("3621050103VUWK-FL32", "Floor 32 Spatial Parcel\nZ: 691.01m–694.00m MSL"),
        ("3621050103VUWK-FL15", "Floor 15 Spatial Parcel\nZ: 639.75m–642.75m MSL"),
        ("3621050103VUWK-FL00", "Ground Floor Spatial Parcel\nZ: 594.00m–598.34m MSL")
    ]
    for code, desc in floors:
        p_f = tf_t2.add_paragraph()
        p_f.space_before = Pt(5)
        p_f.text = f"▶ {code}\n   {desc}"
        p_f.font.name = "Arial"
        p_f.font.size = Pt(7.5)
        p_f.font.color.rgb = WHITE

    # =========================================================================
    # SLIDE 3: TECHNICAL APPROACH & NATIVE ARCHITECTURE DIAGRAM
    # =========================================================================
    slide3 = prs.slides[2]
    style_header_and_badge(slide3, "TECHNICAL APPROACH & PIPELINE ARCHITECTURE")
    
    shapes_to_remove = [s for s in slide3.shapes if s.name == "TextBox 8"]
    for s in shapes_to_remove:
        slide3.shapes._spTree.remove(s._element)
        
    # Build 4 Native Vector Stage Cards for Pipeline Architecture
    stage_data = [
        ("STAGE 1: DATA INGESTION", RGBColor(14, 165, 233), RGBColor(8, 47, 73), [
            "OpenStreetMap (Overpass QL)",
            "Copernicus GLO-30 DSM (AWS)",
            "SRTM GL1 DEM (OpenTopo)",
            "ISRO Bhuvan OGC Geoportal",
            "TS-RERA & Dharani Land DB"
        ]),
        ("STAGE 2: 5-TIER HEIGHT", RGBColor(99, 102, 241), RGBColor(30, 27, 75), [
            "1. Landmark / RERA Registry",
            "2. DSM-DEM Zonal Statistics",
            "3. Annular Buffer Sampling",
            "4. Morphological Typology Rules",
            "5. Cluster Spatial Propagation"
        ]),
        ("STAGE 3: 3D CADASTRE", RGBColor(16, 185, 129), RGBColor(6, 78, 59), [
            "14-Digit 2D Bhu-Aadhaar (NIC)",
            "Unit 3D ULPIN (-FLxx-Uyyyy)",
            "Floor 3D ULPIN (-FLxx)",
            "Zero-Discrepancy Height Norm",
            "ISO 19152 LADM / CityGML"
        ]),
        ("STAGE 4: 3D DIGITAL TWIN", RGBColor(245, 158, 11), RGBColor(69, 26, 3), [
            "Next.js 16 + React 19 + Three.js",
            "60 FPS BatchedMesh / LOD",
            "Interactive Floor Slicing",
            "Solar & Hydrology Engine",
            "3D Flyovers & Road Network"
        ])
    ]
    
    stage_w = Inches(2.88)
    stage_h = Inches(2.35)
    gap = Inches(0.18)
    start_x = Inches(0.65)
    start_y = Inches(1.25)
    
    for idx, (s_title, s_accent, s_bg, s_items) in enumerate(stage_data):
        bx = start_x + idx * (stage_w + gap)
        
        # Outer card
        card_st = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, bx, start_y, stage_w, stage_h)
        card_st.fill.solid()
        card_st.fill.fore_color.rgb = s_bg
        card_st.line.color.rgb = s_accent
        card_st.line.width = Pt(1.5)
        
        # Header banner inside card
        banner = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, bx + Inches(0.06), start_y + Inches(0.06), stage_w - Inches(0.12), Inches(0.42))
        banner.fill.solid()
        banner.fill.fore_color.rgb = s_accent
        banner.line.fill.background()
        tf_b = banner.text_frame
        tf_b.vertical_anchor = MSO_ANCHOR.MIDDLE
        p = tf_b.paragraphs[0]
        p.text = s_title
        p.font.name = "Arial"
        p.font.size = Pt(9.2)
        p.font.bold = True
        p.font.color.rgb = WHITE
        p.alignment = PP_ALIGN.CENTER
        
        # Body text
        tb_b = slide3.shapes.add_textbox(bx + Inches(0.08), start_y + Inches(0.52), stage_w - Inches(0.16), stage_h - Inches(0.58))
        tf_body = tb_b.text_frame
        tf_body.word_wrap = True
        tf_body.margin_left = Inches(0.05)
        tf_body.margin_top = Inches(0.04)
        for itm_idx, itm in enumerate(s_items):
            p = tf_body.add_paragraph() if itm_idx > 0 else tf_body.paragraphs[0]
            p.space_after = Pt(2.5)
            p.text = "• " + itm
            p.font.name = "Arial"
            p.font.size = Pt(8.2)
            p.font.color.rgb = RGBColor(226, 232, 240)

    # Bottom Pipeline Summary Badge
    badge_pip = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.65), Inches(3.72), Inches(12.06), Inches(0.38))
    badge_pip.fill.solid()
    badge_pip.fill.fore_color.rgb = RGBColor(15, 23, 42)
    badge_pip.line.color.rgb = RGBColor(51, 65, 85)
    badge_pip.line.width = Pt(1.0)
    tf_bp = badge_pip.text_frame
    tf_bp.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf_bp.paragraphs[0]
    p.text = "⚡ Autonomous Master Pipeline: 4,641 Buildings · 22,761 Vertical Parcels · 238 km Roads · Execution Time: 12.5s"
    p.font.name = "Arial"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = RGBColor(56, 189, 248)
    p.alignment = PP_ALIGN.CENTER

    # Bottom Details: 2 Structured Columns
    # Col 1: Technologies to be used
    card_t1 = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.65), Inches(4.22), Inches(5.9), Inches(2.28))
    card_t1.fill.solid()
    card_t1.fill.fore_color.rgb = CARD_BG
    card_t1.line.color.rgb = CARD_BORDER
    card_t1.line.width = Pt(1.2)
    
    tf_ct1 = card_t1.text_frame
    tf_ct1.word_wrap = True
    tf_ct1.margin_left = Inches(0.18)
    tf_ct1.margin_right = Inches(0.18)
    tf_ct1.margin_top = Inches(0.14)
    
    p = tf_ct1.paragraphs[0]
    p.space_after = Pt(4)
    r = p.add_run()
    r.text = "Technologies to be used (e.g. programming languages, frameworks, hardware)"
    r.font.name = "Arial"
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = BLUE_DARK
    
    tech_items = [
        ("Core Geospatial Stack", "Python 3.10+, GDAL, Rasterio, Shapely, GeoPandas, PyProj, SciPy k-d trees, OpenTopography API."),
        ("Elevation & Remote Sensing", "Copernicus GLO-30 DSM (30m), SRTM GL1 DEM, ISRO Bhuvan OGC Geoportal WFS/WMS, OSM Overpass QL, TS-RERA Database."),
        ("3D Digital Twin Platform", "Next.js 16 (Turbopack), React 19, Three.js (r185), React Three Fiber, BatchedMesh / WebGL 2.0, Tailwind CSS 4.")
    ]
    for cat, desc in tech_items:
        p_item = tf_ct1.add_paragraph()
        p_item.space_after = Pt(2.5)
        rc = p_item.add_run()
        rc.text = f"• {cat}: "
        rc.font.bold = True
        rc.font.size = Pt(9.2)
        rc.font.color.rgb = TEXT_DARK
        rd = p_item.add_run()
        rd.text = desc
        rd.font.size = Pt(8.8)
        rd.font.color.rgb = TEXT_BODY

    # Col 2: Methodology and process for implementation
    card_t2 = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.8), Inches(4.22), Inches(5.91), Inches(2.28))
    card_t2.fill.solid()
    card_t2.fill.fore_color.rgb = CARD_BG
    card_t2.line.color.rgb = CARD_BORDER
    card_t2.line.width = Pt(1.2)
    
    tf_ct2 = card_t2.text_frame
    tf_ct2.word_wrap = True
    tf_ct2.margin_left = Inches(0.18)
    tf_ct2.margin_right = Inches(0.18)
    tf_ct2.margin_top = Inches(0.14)
    
    p = tf_ct2.paragraphs[0]
    p.space_after = Pt(4)
    r = p.add_run()
    r.text = "Methodology and process for implementation (Flow Charts/Images/ working prototype)"
    r.font.name = "Arial"
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = TEAL_DARK
    
    meth_items = [
        ("1. Data Ingestion & Boundary Prep", "Autonomous bounding box clipping, UTM Zone 44N reprojection, OSM vector footprint extraction, and Bhuvan cadastral validation."),
        ("2. 5-Tier Height Synthesis Engine", "DSM-DEM zonal difference + annular buffer terrain sampling + morphological typology heuristics + landmark truth registry."),
        ("3. 3D Cadastre & ULPIN Engine", "14-digit DoLR ULPIN generation, zero-discrepancy floor height normalization (∑ h_i ≡ H), and dual-tier volumetric cadastre generation."),
        ("4. 3D Digital Twin Visualization", "Instanced rendering of 4,641 buildings and 238 km road network in 12.5s execution time; real-time interactive floor inspection.")
    ]
    for cat, desc in meth_items:
        p_item = tf_ct2.add_paragraph()
        p_item.space_after = Pt(2.0)
        rc = p_item.add_run()
        rc.text = f"• {cat}: "
        rc.font.bold = True
        rc.font.size = Pt(9.0)
        rc.font.color.rgb = TEXT_DARK
        rd = p_item.add_run()
        rd.text = desc
        rd.font.size = Pt(8.6)
        rd.font.color.rgb = TEXT_BODY

    # =========================================================================
    # SLIDE 4: FEASIBILITY AND VIABILITY (3 Structured Cards)
    # =========================================================================
    slide4 = prs.slides[3]
    style_header_and_badge(slide4, "FEASIBILITY AND VIABILITY ANALYSIS")
    
    shapes_to_remove = [s for s in slide4.shapes if s.name == "TextBox 8"]
    for s in shapes_to_remove:
        slide4.shapes._spTree.remove(s._element)

    card_defs4 = [
        ("Analysis of the feasibility of the idea", BLUE_DARK, Inches(0.65), Inches(3.85), [
            ("Data Feasibility", "100% open, authoritative sovereign data (Copernicus DEM, SRTM, ISRO Bhuvan, OSM, LGD codes). Zero recurring software or data licensing fees."),
            ("Operational Feasibility", "Master pipeline processes an entire 9 km² urban sector (4,641 buildings, 22,761 vertical parcels, 238 km roads) in 12.5 seconds on commodity hardware."),
            ("Technical Feasibility", "Built on validated open standards: 14-digit DoLR ULPIN, ISO 19152 LADM, OGC CityGML, and GeoJSON-3D."),
            ("Deployment Viability", "Client-side WebGL viewer runs at 60 FPS in standard desktop and mobile browsers without requiring high-end GPUs or native client installs.")
        ]),
        ("Potential challenges and risks", ROSE_ACCENT, Inches(4.75), Inches(3.85), [
            ("Satellite Raster Noise", "Global 30m DSM/DEM rasters exhibit height distortion and ground clutter in dense high-rise clusters."),
            ("Missing Architectural Blueprints", "Over 95% of municipal multi-story buildings lack digitized CAD/BIM floor plans."),
            ("Browser Memory & WebGL Limits", "Rendering tens of thousands of volumetric property units simultaneously can crash client browsers."),
            ("Vertical Elevation Discrepancy", "Floor slab elevation rounding errors causing cumulative drift between floor slices and physical rooftops.")
        ]),
        ("Strategies for overcoming these challenges", TEAL_DARK, Inches(8.85), Inches(3.85), [
            ("5-Tier Fallback Matrix", "Combines annular terrain buffering, morphological typology rules, and crowd-verified landmark registries for 100% height accuracy."),
            ("Dual-Mode Cadastre Architecture", "Automated floor-level vertical partitioning (-FLxx) as standard, seamlessly upgrading to unit-level (-FLxx-Uyyyy) when blueprints exist."),
            ("Selective On-Demand Volumetric LOD", "Only the selected building is dynamically extruded into volumetric floor slices; others remain optimized batched meshes at 60 FPS."),
            ("Proportional Elevation Normalizer", "Strictly enforces ∑ h_i ≡ H_building and snaps the top floor ceiling to base + total_height with 0.00m error.")
        ])
    ]

    for c_title, c_color, c_left, c_width, c_items in card_defs4:
        card = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c_left, Inches(1.3), c_width, Inches(5.2))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = CARD_BORDER
        card.line.width = Pt(1.2)
        
        tf = card.text_frame
        tf.word_wrap = True
        tf.margin_left = Inches(0.18)
        tf.margin_right = Inches(0.18)
        tf.margin_top = Inches(0.18)
        
        p = tf.paragraphs[0]
        p.space_after = Pt(6)
        r = p.add_run()
        r.text = c_title
        r.font.name = "Arial"
        r.font.size = Pt(11.5)
        r.font.bold = True
        r.font.color.rgb = c_color
        
        for item_title, item_desc in c_items:
            p_item = tf.add_paragraph()
            p_item.space_after = Pt(5)
            icon = "• " if c_color == BLUE_DARK else ("⚠ " if c_color == ROSE_ACCENT else "✓ ")
            rt = p_item.add_run()
            rt.text = f"{icon}{item_title}: "
            rt.font.bold = True
            rt.font.size = Pt(9.2)
            rt.font.color.rgb = TEXT_DARK if c_color == BLUE_DARK else (RGBColor(190, 18, 60) if c_color == ROSE_ACCENT else RGBColor(5, 150, 105))
            rd = p_item.add_run()
            rd.text = item_desc
            rd.font.size = Pt(8.8)
            rd.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 5: IMPACT AND BENEFITS (2 Structured Cards)
    # =========================================================================
    slide5 = prs.slides[4]
    style_header_and_badge(slide5, "IMPACT AND MULTI-SECTOR BENEFITS")
    
    shapes_to_remove = [s for s in slide5.shapes if s.name == "TextBox 8"]
    for s in shapes_to_remove:
        slide5.shapes._spTree.remove(s._element)

    # Left Card: Potential impact on target audience
    card_imp = slide5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.65), Inches(1.3), Inches(5.85), Inches(5.2))
    card_imp.fill.solid()
    card_imp.fill.fore_color.rgb = CARD_BG
    card_imp.line.color.rgb = CARD_BORDER
    card_imp.line.width = Pt(1.2)
    
    tf_imp = card_imp.text_frame
    tf_imp.word_wrap = True
    tf_imp.margin_left = Inches(0.2)
    tf_imp.margin_right = Inches(0.2)
    tf_imp.margin_top = Inches(0.18)
    
    p = tf_imp.paragraphs[0]
    p.space_after = Pt(6)
    r = p.add_run()
    r.text = "Potential impact on the target audience"
    r.font.name = "Arial"
    r.font.size = Pt(12)
    r.font.bold = True
    r.font.color.rgb = BLUE_DARK
    
    stakeholders = [
        ("Dept. of Land Resources (DoLR) & Survey of India", "Provides the production-ready technical blueprint to transition 2D Bhu-Aadhaar into a national 3D Cadastral framework, ending airspace boundary overlaps."),
        ("Urban Local Bodies (GHMC / Smart City SPVs)", "Unlocks 15–25% higher property tax collection by detecting unassessed floors, unauthorized penthouses, and FAR/FSI zoning violations."),
        ("Homebuyers, Citizens & RWA Associations", "Grants undisputed legal title to specific vertical airspace parcels, replacing fragile Undivided Share of Land (UDS) agreements."),
        ("Banks, NBFCs & Mortgage Lenders", "Instant 3D geospatial collateral verification; completely eliminates fraudulent multi-mortgaging of the same apartment flat across lenders.")
    ]
    for title, desc in stakeholders:
        p_item = tf_imp.add_paragraph()
        p_item.space_after = Pt(6)
        rt = p_item.add_run()
        rt.text = f"• {title}:\n  "
        rt.font.bold = True
        rt.font.size = Pt(9.6)
        rt.font.color.rgb = TEXT_DARK
        rd = p_item.add_run()
        rd.text = desc
        rd.font.size = Pt(9.0)
        rd.font.color.rgb = TEXT_MUTED

    # Right Card: Benefits of the solution
    card_ben = slide5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.85), Inches(1.3), Inches(5.85), Inches(5.2))
    card_ben.fill.solid()
    card_ben.fill.fore_color.rgb = CARD_BG
    card_ben.line.color.rgb = CARD_BORDER
    card_ben.line.width = Pt(1.2)
    
    tf_ben = card_ben.text_frame
    tf_ben.word_wrap = True
    tf_ben.margin_left = Inches(0.2)
    tf_ben.margin_right = Inches(0.2)
    tf_ben.margin_top = Inches(0.18)
    
    p = tf_ben.paragraphs[0]
    p.space_after = Pt(6)
    r = p.add_run()
    r.text = "Benefits of the solution (social, economic, environmental, etc.)"
    r.font.name = "Arial"
    r.font.size = Pt(12)
    r.font.bold = True
    r.font.color.rgb = TEAL_DARK
    
    benefits = [
        ("Economic Benefits", "Eliminates billions of rupees in civil land litigation; accelerates bank loan approvals from weeks to minutes; enables transparent, view-based property valuations."),
        ("Social & Governance Benefits", "100% transparency in vertical real estate; prevents double-selling scams; empowers citizens with direct verification of sanctioned floor boundaries."),
        ("Disaster Management & Safety", "Floor-level flood inundation simulation (e.g. Durgam Cheruvu lake breach modeling) identifies submerged levels in real time for precision rescue operations."),
        ("Environmental & Urban Planning", "3D solar shadow path analysis enables accurate rooftop solar PV capacity estimation and micro-climate urban heat island mitigation.")
    ]
    for title, desc in benefits:
        p_item = tf_ben.add_paragraph()
        p_item.space_after = Pt(6)
        rt = p_item.add_run()
        rt.text = f"★ {title}:\n  "
        rt.font.bold = True
        rt.font.size = Pt(9.6)
        rt.font.color.rgb = RGBColor(16, 185, 129)
        rd = p_item.add_run()
        rd.text = desc
        rd.font.size = Pt(9.0)
        rd.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 6: RESEARCH AND REFERENCES (With Cropped High-Res Prototype)
    # =========================================================================
    slide6 = prs.slides[5]
    style_header_and_badge(slide6, "RESEARCH, REFERENCES & WORKING PROTOTYPE")
    
    shapes_to_remove = [s for s in slide6.shapes if s.name == "TextBox 8"]
    for s in shapes_to_remove:
        slide6.shapes._spTree.remove(s._element)

    # Left: Reference List Card
    card_ref = slide6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.65), Inches(1.3), Inches(6.8), Inches(5.2))
    card_ref.fill.solid()
    card_ref.fill.fore_color.rgb = CARD_BG
    card_ref.line.color.rgb = CARD_BORDER
    card_ref.line.width = Pt(1.2)
    
    tf_ref = card_ref.text_frame
    tf_ref.word_wrap = True
    tf_ref.margin_left = Inches(0.2)
    tf_ref.margin_right = Inches(0.2)
    tf_ref.margin_top = Inches(0.18)
    
    p = tf_ref.paragraphs[0]
    p.space_after = Pt(5)
    r = p.add_run()
    r.text = "Details / Links of the reference and research work"
    r.font.name = "Arial"
    r.font.size = Pt(12)
    r.font.bold = True
    r.font.color.rgb = BLUE_DARK
    
    references = [
        ("DoLR / NIC Technical Guidelines", "Dept. of Land Resources, Ministry of Rural Development, Govt. of India: Unique Land Parcel Identification Number (ULPIN) / Bhu-Aadhaar Technical Specifications & Design Guidelines (2021–2024)."),
        ("ISO 19152:2012 / 2024 (LADM)", "Geographic Information — Land Administration Domain Model (LADM) — Part 3: 3D/4D Marine and Space Administration."),
        ("OGC Geospatial Standards", "Open Geospatial Consortium (OGC): City Geography Markup Language (CityGML 3.0) & 3D Tiles Community Standard for Streaming Massive Geospatial Models."),
        ("Survey of India & MoHUA", "National Geospatial Policy 2022 & National Urban Digital Mission (NUDM) Smart City guidelines."),
        ("Academic Research", "Biljecki et al. (2015): 'Applications of 3D City Models: State of the Art Review' (ISPRS IJGI); Stoter et al. (2020): '3D Cadastre in Operational Practice'."),
        ("Authoritative Data Provenance", "Copernicus GLO-30 DSM (AWS), SRTM GL1 DEM (OpenTopography), ISRO Bhuvan OGC Geoportal WFS/WMS Services, OpenStreetMap (ODbL), TS-RERA Portal.")
    ]
    for title, desc in references:
        p_item = tf_ref.add_paragraph()
        p_item.space_after = Pt(4)
        rt = p_item.add_run()
        rt.text = f"• {title}: "
        rt.font.bold = True
        rt.font.size = Pt(9.0)
        rt.font.color.rgb = TEXT_DARK
        rd = p_item.add_run()
        rd.text = desc
        rd.font.size = Pt(8.6)
        rd.font.color.rgb = TEXT_MUTED

    # Right: Prototype Header Card + Cropped Live Screenshot
    card_pr_hdr = slide6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(7.75), Inches(1.3), Inches(5.0), Inches(1.05))
    card_pr_hdr.fill.solid()
    card_pr_hdr.fill.fore_color.rgb = RGBColor(15, 23, 42)
    card_pr_hdr.line.color.rgb = RGBColor(16, 185, 129)
    card_pr_hdr.line.width = Pt(1.5)
    
    tf_pr = card_pr_hdr.text_frame
    tf_pr.word_wrap = True
    tf_pr.margin_left = Inches(0.15)
    tf_pr.margin_top = Inches(0.1)
    p = tf_pr.paragraphs[0]
    p.space_after = Pt(2)
    r = p.add_run()
    r.text = "Working Prototype & Open Source Repository"
    r.font.name = "Arial"
    r.font.size = Pt(11)
    r.font.bold = True
    r.font.color.rgb = RGBColor(52, 211, 153)
    
    p2 = tf_pr.add_paragraph()
    r2 = p2.add_run()
    r2.text = "• GitHub: github.com/Imad-81/SIH-26011\n• Interactive 3D Viewer: localhost:3000 (Next.js 16 + Three.js)\n• Master CLI: python scripts/pipeline.py --city hyderabad"
    r2.font.name = "Arial"
    r2.font.size = Pt(8.6)
    r2.font.color.rgb = RGBColor(226, 232, 240)

    # Add the high-res cropped prototype screenshot
    slide6.shapes.add_picture(
        "outputs/presentation_assets/prototype_cropped.png",
        Inches(7.75), Inches(2.45), width=Inches(5.0), height=Inches(4.05)
    )

    # =========================================================================
    # DELETE SLIDE 7 (Instruction slide)
    # =========================================================================
    if len(prs.slides) > 6:
        rId = prs.slides._sldIdLst[6].rId
        prs.part.drop_rel(rId)
        del prs.slides._sldIdLst[6]
        print("Deleted Slide 7 (Important Pointers) as per SIH guidelines.")

    prs.save(output_pptx)
    print(f"✅ Successfully saved polished presentation to {output_pptx} with {len(prs.slides)} slides!")

if __name__ == "__main__":
    build_presentation()
