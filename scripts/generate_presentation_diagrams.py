import matplotlib.pyplot as plt
import matplotlib.patches as patches

fig, ax = plt.subplots(figsize=(14, 6), dpi=300)
fig.patch.set_facecolor('#0b0f19')
ax.set_facecolor('#0b0f19')

# Define stages and blocks
stages = [
    {
        "title": "STAGE 1: DATA INGESTION",
        "color": "#0ea5e9",
        "bg": "#082f49",
        "items": [
            "OpenStreetMap (Overpass QL)",
            "Copernicus GLO-30 DSM (AWS)",
            "SRTM GL1 DEM (OpenTopo)",
            "ISRO Bhuvan OGC Geoportal",
            "TS-RERA & Dharani Land DB"
        ]
    },
    {
        "title": "STAGE 2: 5-TIER HEIGHT ENGINE",
        "color": "#6366f1",
        "bg": "#1e1b4b",
        "items": [
            "1. Landmark / RERA Truth Registry",
            "2. DSM - DEM Zonal Raster Diff",
            "3. Annular Buffer Sampling",
            "4. Morphological Typology Engine",
            "5. Cluster Spatial Propagation"
        ]
    },
    {
        "title": "STAGE 3: 3D CADASTRE & ULPIN",
        "color": "#10b981",
        "bg": "#064e3b",
        "items": [
            "14-Digit 2D Bhu-Aadhaar (NIC)",
            "Unit 3D ULPIN (-FLxx-Uyyyy)",
            "Floor 3D ULPIN (-FLxx)",
            "Zero-Discrepancy Height Norm",
            "ISO 19152 LADM / CityGML"
        ]
    },
    {
        "title": "STAGE 4: 3D DIGITAL TWIN VIEWER",
        "color": "#f59e0b",
        "bg": "#451a03",
        "items": [
            "Next.js 16 + React 19 + Three.js",
            "60 FPS BatchedMesh / LOD",
            "Interactive Floor Slicing",
            "Solar Path & Hydrology Engine",
            "3D Flyovers & Road Network"
        ]
    }
]

box_w = 2.9
box_h = 4.2
gap = 0.5
start_x = 0.4
start_y = 0.9

for idx, stage in enumerate(stages):
    bx = start_x + idx * (box_w + gap)
    
    # Outer Card
    rect = patches.FancyBboxPatch(
        (bx, start_y), box_w, box_h,
        boxstyle="round,pad=0.15,rounding_size=0.18",
        facecolor=stage["bg"],
        edgecolor=stage["color"],
        linewidth=2.2,
        alpha=0.9
    )
    ax.add_patch(rect)
    
    # Header Box
    h_rect = patches.FancyBboxPatch(
        (bx + 0.1, start_y + box_h - 0.75), box_w - 0.2, 0.65,
        boxstyle="round,pad=0.08,rounding_size=0.1",
        facecolor=stage["color"],
        edgecolor="none",
        alpha=0.95
    )
    ax.add_patch(h_rect)
    
    # Header Text
    ax.text(
        bx + box_w / 2, start_y + box_h - 0.42, stage["title"],
        color="#ffffff", fontsize=10.5, fontweight="bold",
        ha="center", va="center"
    )
    
    # Item text
    for item_idx, item in enumerate(stage["items"]):
        iy = start_y + box_h - 1.25 - item_idx * 0.62
        # Bullet dot
        dot = patches.Circle((bx + 0.3, iy), 0.05, facecolor=stage["color"], edgecolor="none")
        ax.add_patch(dot)
        ax.text(
            bx + 0.48, iy, item,
            color="#e2e8f0", fontsize=9.2, fontweight="medium",
            ha="left", va="center"
        )
    
    # Arrow to next stage
    if idx < len(stages) - 1:
        arrow_x = bx + box_w + 0.08
        arrow_y = start_y + box_h / 2
        ax.annotate(
            "", xy=(arrow_x + gap - 0.16, arrow_y), xytext=(arrow_x, arrow_y),
            arrowprops=dict(arrowstyle="->,head_width=0.4,head_length=0.6",
                            color="#38bdf8", lw=3.0)
        )

# Pipeline performance badge at the bottom
badge = patches.FancyBboxPatch(
    (0.4, 0.18), 13.1, 0.52,
    boxstyle="round,pad=0.08,rounding_size=0.1",
    facecolor="#111827", edgecolor="#374151", linewidth=1.5
)
ax.add_patch(badge)
ax.text(
    6.95, 0.44,
    "⚡ Autonomous Master Pipeline: 4,641 Buildings · 22,761 Vertical Parcels · 238 km Roads · Execution Time: 12.5s",
    color="#38bdf8", fontsize=11, fontweight="bold", ha="center", va="center"
)

ax.set_xlim(0, 14.0)
ax.set_ylim(0, 5.6)
ax.axis("off")

plt.tight_layout()
plt.savefig("outputs/presentation_assets/pipeline_architecture.png", dpi=300, bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close()
print("Saved outputs/presentation_assets/pipeline_architecture.png")
