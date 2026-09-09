import matplotlib.pyplot as plt
import matplotlib.patches as patches

fig, ax = plt.subplots(figsize=(12, 6.2), dpi=300)
fig.patch.set_facecolor('#0b0f19')
ax.set_facecolor('#0b0f19')

# Root 2D Parcel
rect_2d = patches.FancyBboxPatch(
    (0.5, 4.4), 11.0, 1.35,
    boxstyle="round,pad=0.15,rounding_size=0.18",
    facecolor="#082f49", edgecolor="#0ea5e9", linewidth=2.2
)
ax.add_patch(rect_2d)
ax.text(6.0, 5.35, "GOVERNMENT 2D BHU-AADHAAR (ULPIN)", color="#38bdf8", fontsize=11, fontweight="bold", ha="center")
ax.text(6.0, 4.88, "3621050103VUWK  (14-Digit DoLR / NIC Standard)", color="#ffffff", fontsize=14, fontweight="bold", ha="center")
ax.text(6.0, 4.55, "State: 36 (Telangana) · District: 21 (Ranga Reddy) · Mandal: 05 (Serilingampally) · Village: 0103 · Survey: 83/1", color="#94a3b8", fontsize=8.5, ha="center")

# Downward arrows
ax.annotate("", xy=(3.3, 3.75), xytext=(3.3, 4.3),
            arrowprops=dict(arrowstyle="->,head_width=0.35,head_length=0.5", color="#38bdf8", lw=2.2))
ax.annotate("", xy=(8.7, 3.75), xytext=(8.7, 4.3),
            arrowprops=dict(arrowstyle="->,head_width=0.35,head_length=0.5", color="#38bdf8", lw=2.2))

# Branch 1: Buildings with Architectural Floor Plans
rect_branch1 = patches.FancyBboxPatch(
    (0.5, 0.4), 5.3, 3.25,
    boxstyle="round,pad=0.15,rounding_size=0.18",
    facecolor="#064e3b", edgecolor="#10b981", linewidth=2.0
)
ax.add_patch(rect_branch1)
ax.text(3.15, 3.25, "TIER 1: FLAT/UNIT-LEVEL 3D ULPIN", color="#34d399", fontsize=10.5, fontweight="bold", ha="center")
ax.text(3.15, 2.92, "(Buildings with Sanctioned RERA Blueprints)", color="#a7f3d0", fontsize=8.2, ha="center")

units = [
    ("3621050103VUWK-FL32-U3201", "Flat 3201 · 4BHK Luxury (318 m²) · East"),
    ("3621050103VUWK-FL32-U3202", "Flat 3202 · 3BHK Premium (241 m²) · West"),
    ("3621050103VUWK-FL32-ULOBBY", "Common Area · Lift Lobby & Fire Escape (85 m²)")
]
for u_idx, (code, desc) in enumerate(units):
    uy = 2.35 - u_idx * 0.72
    u_box = patches.FancyBboxPatch(
        (0.7, uy - 0.18), 4.9, 0.55,
        boxstyle="round,pad=0.08,rounding_size=0.1",
        facecolor="#022c22", edgecolor="#059669", linewidth=1.2
    )
    ax.add_patch(u_box)
    ax.text(0.9, uy + 0.12, code, color="#ffffff", fontsize=8.5, fontweight="bold")
    ax.text(0.9, uy - 0.08, desc, color="#6ee7b7", fontsize=7.5)

# Branch 2: Buildings without Floor Plans (Automatic Fallback)
rect_branch2 = patches.FancyBboxPatch(
    (6.2, 0.4), 5.3, 3.25,
    boxstyle="round,pad=0.15,rounding_size=0.18",
    facecolor="#1e1b4b", edgecolor="#6366f1", linewidth=2.0
)
ax.add_patch(rect_branch2)
ax.text(8.85, 3.25, "TIER 2: FLOOR-LEVEL 3D ULPIN", color="#818cf8", fontsize=10.5, fontweight="bold", ha="center")
ax.text(8.85, 2.92, "(Automated Slicing for Multi-Story Buildings)", color="#c7d2fe", fontsize=8.2, ha="center")

floors = [
    ("3621050103VUWK-FL32", "Floor 32 Cadastre · Z: 691.01m – 694.00m MSL"),
    ("3621050103VUWK-FL15", "Floor 15 Cadastre · Z: 639.75m – 642.75m MSL"),
    ("3621050103VUWK-FL00", "Ground Floor Cadastre · Z: 594.00m – 598.34m MSL")
]
for f_idx, (code, desc) in enumerate(floors):
    fy = 2.35 - f_idx * 0.72
    f_box = patches.FancyBboxPatch(
        (6.4, fy - 0.18), 4.9, 0.55,
        boxstyle="round,pad=0.08,rounding_size=0.1",
        facecolor="#0f172a", edgecolor="#4f46e5", linewidth=1.2
    )
    ax.add_patch(f_box)
    ax.text(6.6, fy + 0.12, code, color="#ffffff", fontsize=8.5, fontweight="bold")
    ax.text(6.6, fy - 0.08, desc, color="#a5b4fc", fontsize=7.5)

ax.set_xlim(0, 12.0)
ax.set_ylim(0, 6.0)
ax.axis("off")

plt.tight_layout()
plt.savefig("outputs/presentation_assets/cadastre_hierarchy.png", dpi=300, bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close()
print("Saved outputs/presentation_assets/cadastre_hierarchy.png")
