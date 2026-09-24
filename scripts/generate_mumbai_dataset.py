#!/usr/bin/env python3
"""
Mumbai (Bandra Kurla Complex) 3D Dataset Generator
Creates realistic 3D building, cadastre, terrain, water, roads, analytics,
and landmarks data for Mumbai BKC and updates viewer/public/data/cities.json.
"""

import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "scripts"))

from cadastre_ulpin import (
    NationalLGDResolver,
    generate_2d_ulpin,
    FloorPlanRegistry,
    FloorSlabEngine,
)

OUTPUT_DIR = PROJECT_ROOT / "viewer" / "public" / "data" / "cities" / "mumbai"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

CENTER_LAT = 19.0657
CENTER_LON = 72.8687
DEFAULT_ELEV = 12.0

# 1. Prominent BKC Buildings
BKC_PRESETS = [
    {
        "id": "b_mum_001",
        "name": "Jio World Centre & Convention Centre",
        "type": "commercial",
        "height": 98.0,
        "floors": 26,
        "x": 60.0,
        "y": 40.0,
        "w": 140.0,
        "h": 110.0,
        "survey": "BKC/C-44",
        "village": "Bandra East",
    },
    {
        "id": "b_mum_002",
        "name": "BKC One (The Capital)",
        "type": "commercial",
        "height": 84.0,
        "floors": 22,
        "x": -120.0,
        "y": 80.0,
        "w": 90.0,
        "h": 75.0,
        "survey": "BKC/G-Block-12",
        "village": "Bandra East",
    },
    {
        "id": "b_mum_003",
        "name": "Maker Maxity Commercial Complex",
        "type": "commercial",
        "height": 62.0,
        "floors": 16,
        "x": -260.0,
        "y": 140.0,
        "w": 110.0,
        "h": 85.0,
        "survey": "BKC/C-3",
        "village": "Bandra East",
    },
    {
        "id": "b_mum_004",
        "name": "IL&FS Financial Centre",
        "type": "commercial",
        "height": 72.0,
        "floors": 18,
        "x": -80.0,
        "y": -60.0,
        "w": 80.0,
        "h": 65.0,
        "survey": "BKC/G-Block-22",
        "village": "Bandra East",
    },
    {
        "id": "b_mum_005",
        "name": "Securities and Exchange Board of India (SEBI) Bhavan",
        "type": "commercial",
        "height": 68.0,
        "floors": 17,
        "x": -180.0,
        "y": -40.0,
        "w": 70.0,
        "h": 70.0,
        "survey": "BKC/G-Block-C14",
        "village": "Bandra East",
    },
    {
        "id": "b_mum_006",
        "name": "National Stock Exchange (NSE) HQ",
        "type": "commercial",
        "height": 75.0,
        "floors": 19,
        "x": 20.0,
        "y": -120.0,
        "w": 75.0,
        "h": 75.0,
        "survey": "BKC/G-Block-C1",
        "village": "Bandra East",
    },
    {
        "id": "b_mum_007",
        "name": "Bharat Diamond Bourse (Tower A-B)",
        "type": "commercial",
        "height": 65.0,
        "floors": 16,
        "x": 220.0,
        "y": -50.0,
        "w": 130.0,
        "h": 95.0,
        "survey": "BKC/G-Block-BDB",
        "village": "Bandra East",
    },
    {
        "id": "b_mum_008",
        "name": "Godrej BKC",
        "type": "commercial",
        "height": 88.0,
        "floors": 23,
        "x": 140.0,
        "y": 120.0,
        "w": 85.0,
        "h": 70.0,
        "survey": "BKC/C-68",
        "village": "Bandra East",
    },
    {
        "id": "b_mum_009",
        "name": "US Consulate General Mumbai",
        "type": "commercial",
        "height": 38.0,
        "floors": 8,
        "x": 280.0,
        "y": 80.0,
        "w": 100.0,
        "h": 90.0,
        "survey": "BKC/C-49",
        "village": "Bandra East",
    },
    {
        "id": "b_mum_010",
        "name": "Dhirubhai Ambani Square & Fountain",
        "type": "commercial",
        "height": 24.0,
        "floors": 4,
        "x": 80.0,
        "y": 180.0,
        "w": 60.0,
        "h": 60.0,
        "survey": "BKC/C-45",
        "village": "Bandra East",
    },
]

# Generate additional regular commercial / residential / mixed-use surrounding blocks
def generate_all_buildings():
    buildings = []
    ulpin_registry = {}
    fps = FloorPlanRegistry()

    # Add landmark presets
    all_specs = list(BKC_PRESETS)

    # Grid of surrounding buildings in BKC G-Block & E-Block
    grid_coords = [
        (-350, 40, 60, 50, 45.0, 11, "commercial", "BKC Commercial Block A1"),
        (-350, -60, 55, 55, 52.0, 13, "commercial", "BKC Corporate Suites B2"),
        (-280, -150, 65, 50, 48.0, 12, "office", "Bandra Financial Tower"),
        (-140, -180, 70, 55, 58.0, 15, "commercial", "Canara Bank Zonal Office"),
        (-40, -220, 60, 60, 42.0, 10, "commercial", "Bank of Baroda Bhavan"),
        (100, -220, 65, 50, 55.0, 14, "commercial", "ICICI Bank Towers"),
        (180, -170, 70, 60, 64.0, 16, "office", "Kotak Mahindra Bank HQ"),
        (280, -160, 80, 55, 45.0, 11, "commercial", "Standard Chartered Tower"),
        (-320, 220, 70, 50, 36.0, 9, "apartments", "BKC Signature Residences 1"),
        (-200, 240, 65, 60, 40.0, 10, "apartments", "BKC Signature Residences 2"),
        (-80, 250, 75, 55, 46.0, 12, "residential", "Kalpataru Sparkle BKC"),
        (50, 260, 70, 50, 52.0, 13, "apartments", "Adani Ten BKC"),
        (170, 240, 80, 60, 58.0, 15, "residential", "Rustomjee Seasons BKC"),
        (290, 220, 75, 55, 42.0, 11, "apartments", "Sunteck Signia Isles"),
        (-400, 120, 50, 45, 28.0, 7, "commercial", "Kalanagar Business Bay"),
        (-400, -20, 55, 40, 32.0, 8, "retail", "BKC Galleria"),
        (380, 40, 70, 60, 38.0, 9, "commercial", "Asian Heart Institute Annex"),
        (380, -70, 75, 65, 45.0, 11, "hospital", "Asian Heart Institute Complex"),
        (40, 340, 60, 50, 30.0, 8, "office", "MMRDA Headquarters Annex"),
        (-80, 340, 65, 55, 48.0, 12, "commercial", "MMRDA Administrative Tower"),
    ]

    for idx, (gx, gy, gw, gh, ght, gfl, gtype, gname) in enumerate(grid_coords, start=11):
        all_specs.append({
            "id": f"b_mum_{idx:03d}",
            "name": gname,
            "type": gtype,
            "height": ght,
            "floors": gfl,
            "x": gx,
            "y": gy,
            "w": gw,
            "h": gh,
            "survey": f"BKC/CTS-{1000 + idx}",
            "village": "Bandra East",
        })

    for b in all_specs:
        half_w = b["w"] / 2.0
        half_h = b["h"] / 2.0
        x, y = b["x"], b["y"]
        poly = [
            [round(x - half_w, 2), round(y - half_h, 2)],
            [round(x + half_w, 2), round(y - half_h, 2)],
            [round(x + half_w, 2), round(y + half_h, 2)],
            [round(x - half_w, 2), round(y + half_h, 2)],
            [round(x - half_w, 2), round(y - half_h, 2)],
        ]
        
        # Approximate lat/lon from relative coordinates
        m_per_deg_lat = 111320.0
        m_per_deg_lon = 111320.0 * math.cos(math.radians(CENTER_LAT))
        b_lat = CENTER_LAT + (y / m_per_deg_lat)
        b_lon = CENTER_LON + (x / m_per_deg_lon)

        lgd = NationalLGDResolver.resolve(b_lat, b_lon)
        ulpin2d = generate_2d_ulpin(b_lat, b_lon, lgd["state_code"])

        # Floor elevations
        elevs = FloorSlabEngine.calculate_elevations(
            DEFAULT_ELEV, b["height"], b["floors"], b["type"]
        )

        footprint_area = b["w"] * b["h"]
        floors_list = []
        total_units = 0

        for fl_idx, z_min, z_max in elevs:
            units = fps.generate_procedural_units_for_floor(
                fl_idx, footprint_area, b["type"], z_min, z_max, ulpin2d
            )
            fl_label = "Ground Floor" if fl_idx == 0 else f"Floor {fl_idx}"
            fl_3d_ulpin = f"{ulpin2d}-FL{fl_idx:02d}"
            floors_list.append({
                "floorIndex": fl_idx,
                "floorLabel": fl_label,
                "ulpin3d": fl_3d_ulpin,
                "zMin": z_min,
                "zMax": z_max,
                "heightM": round(z_max - z_min, 2),
                "units": units
            })
            total_units += len(units)

        ulpin_registry[b["id"]] = {
            "buildingId": b["id"],
            "osmId": 8000000 + int(b["id"].split("_")[-1]),
            "buildingName": b["name"],
            "ulpin2d": ulpin2d,
            "hasFloorPlan": True,
            "surveyNumber": b["survey"],
            "villageName": b["village"],
            "mandalName": "Bandra",
            "districtName": "Mumbai Suburban",
            "khataNumber": f"CTS-{2000 + int(b['id'].split('_')[-1])}",
            "ptinGhmc": f"MCGM-{300000 + int(b['id'].split('_')[-1])}",
            "reraId": f"P518000{10000 + int(b['id'].split('_')[-1])}",
            "totalFloors": b["floors"],
            "totalUnits": total_units,
            "floors": floors_list
        }

        buildings.append({
            "id": b["id"],
            "osmId": 8000000 + int(b["id"].split("_")[-1]),
            "coordinates": poly,
            "height": b["height"],
            "estimatedFloors": b["floors"],
            "osmLevels": b["floors"],
            "buildingType": b["type"],
            "name": b["name"],
            "heightSource": "landmark_registry",
            "baseElevation": DEFAULT_ELEV,
            "centroid": [x, y],
            "ulpin2d": ulpin2d,
            "surveyNumber": b["survey"],
            "villageName": b["village"],
            "hasFloorPlan": True,
            "floorsCount": b["floors"],
            "unitsCount": total_units,
            "ulpin3dSample": f"{ulpin2d}-FL00"
        })

    return buildings, ulpin_registry


def generate_terrain():
    # 51x51 grid covering -500 to +500 m
    grid_size = [51, 51]
    heightmap = []
    for r in range(51):
        row = []
        for c in range(51):
            # Gentle coastal slope: 8m near Mithi river channel, 14m inland
            elev = 11.5 + 2.5 * math.sin(c * 0.1) + 1.2 * math.cos(r * 0.1)
            row.append(round(elev, 2))
        heightmap.append(row)

    return {
        "heightmap": heightmap,
        "gridSize": grid_size,
        "bounds": {"left": -500.0, "right": 500.0, "bottom": -500.0, "top": 500.0},
        "centerElevation": DEFAULT_ELEV,
        "minElevation": 8.0,
        "maxElevation": 16.0
    }


def generate_water():
    # Mithi River curving along northern/north-eastern boundary of BKC
    curve = []
    for t in range(-450, 480, 30):
        wx = float(t)
        wy = float(320.0 + 80.0 * math.sin(t * 0.005))
        curve.append([round(wx, 2), round(wy, 2)])
    # close the river bank polygon
    for t in range(450, -480, -30):
        wx = float(t)
        wy = float(370.0 + 80.0 * math.sin(t * 0.005))
        curve.append([round(wx, 2), round(wy, 2)])
    curve.append(curve[0])

    return {
        "baseElevation": 4.5,
        "water": [
            {
                "id": "water_mithi_river",
                "name": "Mithi River & Mahim Creek Channel",
                "coordinates": curve
            }
        ]
    }


def generate_roads():
    roads = [
        {
            "id": 901,
            "tier": 1,
            "type": "primary",
            "length": 900.0,
            "name": "BKC Avenue (Main Central Boulevard)",
            "isBridge": False,
            "layer": 0,
            "coords": [[-450.0, DEFAULT_ELEV, 0.0], [450.0, DEFAULT_ELEV, 0.0]]
        },
        {
            "id": 902,
            "tier": 1,
            "type": "primary",
            "length": 900.0,
            "name": "G-Block North Spine",
            "isBridge": False,
            "layer": 0,
            "coords": [[-450.0, DEFAULT_ELEV, 150.0], [450.0, DEFAULT_ELEV, 150.0]]
        },
        {
            "id": 903,
            "tier": 1,
            "type": "primary",
            "length": 900.0,
            "name": "G-Block South Spine",
            "isBridge": False,
            "layer": 0,
            "coords": [[-450.0, DEFAULT_ELEV, -150.0], [450.0, DEFAULT_ELEV, -150.0]]
        },
        {
            "id": 904,
            "tier": 1,
            "type": "secondary",
            "length": 700.0,
            "name": "Jio World Access Crossway",
            "isBridge": False,
            "layer": 0,
            "coords": [[0.0, DEFAULT_ELEV, -350.0], [0.0, DEFAULT_ELEV, 350.0]]
        },
        {
            "id": 905,
            "tier": 1,
            "type": "secondary",
            "length": 700.0,
            "name": "NSE & BDB Exchange Way",
            "isBridge": False,
            "layer": 0,
            "coords": [[200.0, DEFAULT_ELEV, -350.0], [200.0, DEFAULT_ELEV, 350.0]]
        },
        {
            "id": 906,
            "tier": 1,
            "type": "secondary",
            "length": 700.0,
            "name": "SEBI & Capital Avenue",
            "isBridge": False,
            "layer": 0,
            "coords": [[-200.0, DEFAULT_ELEV, -350.0], [-200.0, DEFAULT_ELEV, 350.0]]
        },
        # Elevated Flyover
        {
            "id": 907,
            "tier": 1,
            "type": "motorway_link",
            "length": 850.0,
            "name": "BKC Connector Elevated Flyover to Chunabhatti",
            "isBridge": True,
            "layer": 1,
            "coords": [
                [-420.0, DEFAULT_ELEV + 1.0, -80.0],
                [-250.0, DEFAULT_ELEV + 8.5, -90.0],
                [-50.0, DEFAULT_ELEV + 12.0, -100.0],
                [150.0, DEFAULT_ELEV + 12.0, -105.0],
                [350.0, DEFAULT_ELEV + 8.0, -110.0],
                [440.0, DEFAULT_ELEV + 1.0, -115.0]
            ]
        }
    ]
    return roads


def generate_landmarks(buildings):
    sorted_b = sorted(buildings, key=lambda b: b["height"], reverse=True)
    top_landmarks = []
    
    presets_by_name = {
        "Jio World Centre & Convention Centre": {
            "badge": "Convention & Cultural Hub",
            "desc": "Premier international exhibition and convention centre in Bandra Kurla Complex with state-of-the-art multi-tier halls.",
            "cameraPreset": {"dist": 220, "pitch": 32, "bearing": 215, "targetOffset": [0, 45, 0]}
        },
        "BKC One (The Capital)": {
            "badge": "Signature Corporate HQ",
            "desc": "Iconic energy-efficient commercial high-rise housing global investment banks and technology leaders.",
            "cameraPreset": {"dist": 180, "pitch": 35, "bearing": 135, "targetOffset": [0, 40, 0]}
        },
        "Godrej BKC": {
            "badge": "Platinum LEED Commercial",
            "desc": "Gold-standard sustainable corporate commercial tower with high-density vertical cadastre units.",
            "cameraPreset": {"dist": 190, "pitch": 30, "bearing": 45, "targetOffset": [0, 42, 0]}
        },
        "National Stock Exchange (NSE) HQ": {
            "badge": "Financial Institution",
            "desc": "Primary financial exchange headquarters anchored in the central financial enclave of Mumbai.",
            "cameraPreset": {"dist": 170, "pitch": 34, "bearing": 310, "targetOffset": [0, 36, 0]}
        },
        "IL&FS Financial Centre": {
            "badge": "Financial Hub",
            "desc": "Landmark high-density corporate tower pioneering BKC's transition into India's premier financial center.",
            "cameraPreset": {"dist": 160, "pitch": 30, "bearing": 270, "targetOffset": [0, 35, 0]}
        },
        "Securities and Exchange Board of India (SEBI) Bhavan": {
            "badge": "Regulator Headquarters",
            "desc": "National capital market regulator headquarters with advanced digital infrastructure and security.",
            "cameraPreset": {"dist": 150, "pitch": 32, "bearing": 180, "targetOffset": [0, 32, 0]}
        },
        "Maker Maxity Commercial Complex": {
            "badge": "Mixed-Use Enclave",
            "desc": "Multi-tower premier commercial and luxury retail hub at the gateway to Bandra Kurla Complex.",
            "cameraPreset": {"dist": 200, "pitch": 28, "bearing": 90, "targetOffset": [0, 30, 0]}
        },
        "Bharat Diamond Bourse (Tower A-B)": {
            "badge": "Diamond Exchange Hub",
            "desc": "The world's largest diamond trading hub spanning multiple interlinked towers with high-security cadastre units.",
            "cameraPreset": {"dist": 240, "pitch": 32, "bearing": 330, "targetOffset": [0, 32, 0]}
        }
    }

    for b in sorted_b[:8]:
        name = b.get("name") or f"Tower {b['id']}"
        cfg = presets_by_name.get(name, {
            "badge": "Commercial Landmark",
            "desc": f"Prominent {b['height']:.0f}m tower located in Bandra Kurla Complex.",
            "cameraPreset": {"dist": 180, "pitch": 32, "bearing": 45, "targetOffset": [0, b["height"] * 0.5, 0]}
        })
        top_landmarks.append({
            "id": f"lm_{b['id']}",
            "name": name,
            "badge": cfg["badge"],
            "buildingId": b["id"],
            "height": b["height"],
            "floors": b["estimatedFloors"],
            "centroid": b["centroid"],
            "ulpin2d": b["ulpin2d"],
            "description": cfg["desc"],
            "cameraPreset": cfg["cameraPreset"]
        })
    return top_landmarks


def generate_analytics(buildings, ulpin_registry):
    total_footprint = sum((b["coordinates"][1][0] - b["coordinates"][0][0]) * 
                          (b["coordinates"][2][1] - b["coordinates"][1][1]) for b in buildings)
    total_volume = sum(b["height"] * 
                       abs((b["coordinates"][1][0] - b["coordinates"][0][0]) * 
                           (b["coordinates"][2][1] - b["coordinates"][1][1])) for b in buildings)
    total_units = sum(reg["totalUnits"] for reg in ulpin_registry.values())
    
    usable_rooftop = total_footprint * 0.75
    daily_solar_kwh = usable_rooftop * 5.2 * 0.18
    annual_solar_mwh = (daily_solar_kwh * 365) / 1000.0
    annual_co2 = annual_solar_mwh * 0.82

    return {
        "cityName": "Mumbai (Bandra Kurla Complex)",
        "areaSizeKm": 2.5,
        "totalBuildings": len(buildings),
        "totalFootprintAreaM2": round(total_footprint, 1),
        "totalBuiltVolumeM3": round(total_volume, 1),
        "grossFloorAreaM2": round(total_footprint * 12.4, 1),
        "heightBuckets": {
            "0-5m": 0,
            "5-15m": 0,
            "15-30m": 3,
            "30-60m": 19,
            "60m+": 8
        },
        "typeBreakdown": {
            "commercial": 20,
            "office": 3,
            "apartments": 4,
            "residential": 2,
            "retail": 1
        },
        "cadastre": {
            "total2DParcels": len(buildings),
            "total3DVerticalParcels": total_units,
            "buildingsWithFloorPlans": len(buildings),
            "verticalDensityRatio": round(total_units / len(buildings), 1)
        },
        "solar": {
            "usableRooftopAreaM2": round(usable_rooftop, 1),
            "dailyGenerationKwh": round(daily_solar_kwh, 1),
            "annualGenerationMwh": round(annual_solar_mwh, 1),
            "annualCo2OffsetTons": round(annual_co2, 1),
            "ghiAverage": 5.2
        }
    }


def main():
    print("Generating Mumbai (Bandra Kurla Complex) 3D dataset...")
    buildings, ulpin_registry = generate_all_buildings()
    terrain = generate_terrain()
    water = generate_water()
    roads = generate_roads()
    landmarks = generate_landmarks(buildings)
    analytics = generate_analytics(buildings, ulpin_registry)

    # Write files to viewer/public/data/cities/mumbai/
    files = {
        "buildings.json": {
            "buildings": buildings,
            "stats": {
                "total": len(buildings),
                "total2DParcels": len(buildings),
                "total3DVerticalParcels": analytics["cadastre"]["total3DVerticalParcels"],
                "buildingsWithFloorPlans": len(buildings)
            },
            "generatedAt": datetime.now(timezone.utc).isoformat()
        },
        "ulpins_3d.json": ulpin_registry,
        "terrain.json": terrain,
        "water.json": water,
        "roads.json": roads,
        "landmarks.json": landmarks,
        "analytics.json": analytics
    }

    for fname, data in files.items():
        out_p = OUTPUT_DIR / fname
        with open(out_p, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        print(f"  ✓ Written {out_p.name} ({out_p.stat().st_size} bytes)")

    # Update cities.json
    manifest_p = PROJECT_ROOT / "viewer" / "public" / "data" / "cities.json"
    manifest = []
    if manifest_p.exists():
        with open(manifest_p, "r", encoding="utf-8") as f:
            manifest = json.load(f)

    mumbai_entry = {
        "id": "mumbai",
        "name": "Mumbai (Bandra Kurla Complex)",
        "state": "Maharashtra",
        "center": [CENTER_LON, CENTER_LAT],
        "centerCoords": {"lat": CENTER_LAT, "lon": CENTER_LON},
        "sizeKm": 2.5,
        "buildingCount": len(buildings),
        "defaultElev": DEFAULT_ELEV,
        "generatedAt": datetime.now(timezone.utc).isoformat()
    }

    found = False
    for i, item in enumerate(manifest):
        if item.get("id") == "mumbai":
            manifest[i] = mumbai_entry
            found = True
            break
    if not found:
        manifest.append(mumbai_entry)

    with open(manifest_p, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"  ✓ Updated {manifest_p.name} with {len(manifest)} cities")
    print("Done generating Mumbai dataset!")


if __name__ == "__main__":
    main()
