#!/usr/bin/env python3
"""
Road Network & Flyover Elevation Generator
==========================================
Processes OSM highway features and Copernicus DEM raster to produce 3D road polylines
with realistic elevation profiles:
- Conforms surface roads to DEM ground elevation
- Elevates bridges, viaducts, and flyovers at actual physical clearances (IRC:54 standards):
    * Layer 1 / standard flyovers: +7.5m clearance
    * Layer 2 viaducts: +15.0m clearance
    * Layer 3 overpasses: +22.5m clearance
    * Layer -1 underpasses: -5.0m depression
    * Durgam Cheruvu bridge: +15.0m lake clearance (deck at 548.0m)
- Applies smooth Hermite ramp easing on approaches to eliminate cliff drop-offs
- Computes cylindrical support pier locations along elevated spans
- Merges into optimized viewer/public/data/roads.json
"""

import json
import math
from pathlib import Path
import numpy as np
import pyproj
import rasterio

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
RAW_HIGHWAYS = PROJECT_ROOT / "data" / "raw" / "highway_features.json"
DEM_PATH = PROJECT_ROOT / "data" / "processed" / "dem_clipped.tif"
OUTPUT_JSON = PROJECT_ROOT / "viewer" / "public" / "data" / "roads.json"

# Center of AOI (matches buildings.json and pipeline.py)
CENTER_LON = 78.3800
CENTER_LAT = 17.4370
DEFAULT_ELEV = 569.0

# Road tier classification
TIER_1_TYPES = {
    'motorway', 'motorway_link',
    'trunk', 'trunk_link',
    'primary', 'primary_link'
}
TIER_2_TYPES = {
    'secondary', 'secondary_link',
    'tertiary', 'tertiary_link'
}

def get_tier(highway_type: str) -> int:
    if highway_type in TIER_1_TYPES:
        return 1
    if highway_type in TIER_2_TYPES:
        return 2
    return 3

def smoothstep(edge0: float, edge1: float, x: float) -> float:
    t = max(0.0, min(1.0, (x - edge0) / (edge1 - edge0)))
    return t * t * (3.0 - 2.0 * t)

def main(aoi=None, dem_path=None):
    print("🛣️  Processing 3D Road Network & Flyovers...")
    
    if not RAW_HIGHWAYS.exists():
        raise FileNotFoundError(f"Missing {RAW_HIGHWAYS}")
    
    actual_dem = Path(dem_path) if dem_path else DEM_PATH
    if not actual_dem.exists():
        raise FileNotFoundError(f"Missing {actual_dem}")

    # Center and CRS
    center_lon = aoi["center"]["lon"] if aoi else CENTER_LON
    center_lat = aoi["center"]["lat"] if aoi else CENTER_LAT
    crs_utm = aoi.get("crs_projected", "EPSG:32644") if aoi else "EPSG:32644"

    # Coordinate transformer WGS84 -> UTM
    transformer = pyproj.Transformer.from_crs("EPSG:4326", crs_utm, always_xy=True)
    center_x, center_y = transformer.transform(center_lon, center_lat)
    print(f"Center UTM: ({center_x:.2f}, {center_y:.2f})")

    # Load DEM
    with rasterio.open(actual_dem) as src:
        dem_data = src.read(1)
        nodata = src.nodata

    def sample_dem(utm_x: float, utm_y: float) -> float:
        try:
            row, col = src.index(utm_x, utm_y)
            if 0 <= row < dem_data.shape[0] and 0 <= col < dem_data.shape[1]:
                val = dem_data[row, col]
                if val != nodata and not np.isnan(val) and 400 < val < 800:
                    return float(val)
        except Exception:
            pass
        return DEFAULT_ELEV

    # Load OSM Highway data
    with open(RAW_HIGHWAYS, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    elements = raw_data.get("elements", [])
    nodes = {e["id"]: (e["lon"], e["lat"]) for e in elements if e.get("type") == "node"}
    ways = [e for e in elements if e.get("type") == "way"]
    print(f"Loaded {len(nodes)} nodes, {len(ways)} highway ways")

    processed_roads = []
    piers = []
    
    tier_lengths = {1: 0.0, 2: 0.0, 3: 0.0}
    bridge_count = 0
    underpass_count = 0

    for w in ways:
        tags = w.get("tags", {})
        hwy_type = tags.get("highway", "residential")
        name = tags.get("name", "")
        bridge_tag = tags.get("bridge")
        layer_tag = tags.get("layer", "0")
        
        try:
            layer = int(layer_tag)
        except ValueError:
            layer = 0
            
        tier = get_tier(hwy_type)

        # Detect bridges, flyovers, and elevated viaducts
        is_bridge = (
            bridge_tag in ["yes", "viaduct"]
            or layer > 0
            or "Flyover" in name
            or ("Bridge" in name and "Flyover" not in name)
        )
        is_underpass = layer < 0 or "Underpass" in name

        if is_bridge:
            bridge_count += 1
        if is_underpass:
            underpass_count += 1

        # Extract 2D UTM coordinates for each node
        node_ids = w.get("nodes", [])
        raw_pts = []
        for nid in node_ids:
            if nid not in nodes:
                continue
            lon, lat = nodes[nid]
            ux, uy = transformer.transform(lon, lat)
            rx = ux - center_x
            ry = uy - center_y
            raw_pts.append((ux, uy, rx, ry))

        if len(raw_pts) < 2:
            continue

        # Subdivide segments longer than MAX_SEG_LEN so roads conform faithfully to 3D DEM relief
        MAX_SEG_LEN = 20.0
        way_pts = []
        for i in range(len(raw_pts) - 1):
            p0 = raw_pts[i]
            p1 = raw_pts[i + 1]
            seg_len = math.hypot(p1[2] - p0[2], p1[3] - p0[3])
            steps = max(1, math.ceil(seg_len / MAX_SEG_LEN))
            
            for s in range(steps):
                t = s / steps
                ux = p0[0] + t * (p1[0] - p0[0])
                uy = p0[1] + t * (p1[1] - p0[1])
                rx = p0[2] + t * (p1[2] - p0[2])
                ry = p0[3] + t * (p1[3] - p0[3])
                g_elev = sample_dem(ux, uy)
                way_pts.append({
                    "ux": ux,
                    "uy": uy,
                    "rx": rx,
                    "ry": ry,
                    "ground_elev": g_elev,
                })

        # Append final point
        p_last = raw_pts[-1]
        way_pts.append({
            "ux": p_last[0],
            "uy": p_last[1],
            "rx": p_last[2],
            "ry": p_last[3],
            "ground_elev": sample_dem(p_last[0], p_last[1]),
        })

        if len(way_pts) < 2:
            continue

        # Compute cumulative distance along the way
        dists = [0.0]
        for i in range(1, len(way_pts)):
            d = math.hypot(way_pts[i]["rx"] - way_pts[i-1]["rx"], way_pts[i]["ry"] - way_pts[i-1]["ry"])
            dists.append(dists[-1] + d)
        
        total_way_len = dists[-1]
        if total_way_len < 1.0:
            continue

        tier_lengths[tier] += total_way_len

        # Determine target clearance
        is_durgam_lake_crossing = (
            "Durgam Cheruvu Bridge" in name
            and any(800 <= p["rx"] <= 1400 and 400 <= -p["ry"] <= 700 for p in way_pts)
        )

        if is_underpass:
            target_clearance = -5.0
        elif is_bridge:
            if layer >= 3:
                target_clearance = 22.5
            elif layer == 2:
                target_clearance = 15.0
            else:
                target_clearance = 7.5
        else:
            target_clearance = 0.0

        # Calculate final 3D node coordinates with smooth ramp transitions
        ramp_len = min(45.0, total_way_len / 2.2) if total_way_len > 15.0 else 2.0
        coords_3d = []

        for i, pt in enumerate(way_pts):
            s = dists[i]
            g_elev = pt["ground_elev"]

            if is_durgam_lake_crossing:
                # Durgam Cheruvu cable-stayed bridge maintains a level deck at 548.0m across lake
                t_in = smoothstep(0, ramp_len, s)
                t_out = smoothstep(0, ramp_len, total_way_len - s)
                alpha = min(t_in, t_out)
                final_elev = (1.0 - alpha) * g_elev + alpha * 548.0
            elif target_clearance != 0.0:
                t_in = smoothstep(0, ramp_len, s)
                t_out = smoothstep(0, ramp_len, total_way_len - s)
                alpha = min(t_in, t_out)
                final_elev = g_elev + alpha * target_clearance
            else:
                final_elev = g_elev

            coords_3d.append([
                round(pt["rx"], 2),
                round(final_elev, 2),
                round(pt["ry"], 2)
            ])

        # Generate cylindrical support piers along elevated bridge spans
        if is_bridge and target_clearance > 0:
            step_d = 35.0
            curr_d = 25.0
            while curr_d <= total_way_len - 25.0:
                # Find segment containing curr_d
                for idx in range(len(dists) - 1):
                    if dists[idx] <= curr_d <= dists[idx + 1]:
                        seg_d = dists[idx + 1] - dists[idx]
                        ratio = (curr_d - dists[idx]) / max(seg_d, 0.001)
                        
                        px = way_pts[idx]["rx"] + ratio * (way_pts[idx + 1]["rx"] - way_pts[idx]["rx"])
                        py = way_pts[idx]["ry"] + ratio * (way_pts[idx + 1]["ry"] - way_pts[idx]["ry"])
                        p_ground = way_pts[idx]["ground_elev"] + ratio * (way_pts[idx + 1]["ground_elev"] - way_pts[idx]["ground_elev"])
                        
                        t_in = smoothstep(0, ramp_len, curr_d)
                        t_out = smoothstep(0, ramp_len, total_way_len - curr_d)
                        alpha = min(t_in, t_out)

                        if is_durgam_lake_crossing:
                            p_deck = (1.0 - alpha) * p_ground + alpha * 548.0
                        else:
                            p_deck = p_ground + alpha * target_clearance
                        
                        pier_h = p_deck - p_ground
                        # Only place piers when vertical clearance is significant
                        if pier_h >= 3.2:
                            piers.append({
                                "x": round(px, 2),
                                "z": round(-py, 2),  # Three.js world Z is -rel_y
                                "groundY": round(p_ground, 2),
                                "deckY": round(p_deck, 2),
                                "height": round(pier_h, 2),
                                "bridge": name or "Flyover"
                            })
                        break
                curr_d += step_d

        road_record = {
            "id": w["id"],
            "tier": tier,
            "type": hwy_type,
            "length": round(total_way_len, 1),
            "coords": coords_3d
        }
        if name:
            road_record["name"] = name
        if is_bridge:
            road_record["isBridge"] = True
            road_record["layer"] = max(1, layer)
        if is_underpass:
            road_record["isUnderpass"] = True
            road_record["layer"] = -1

        processed_roads.append(road_record)

    # Sort roads: tier 3 first, then tier 2, then tier 1, and elevated bridges last (for proper render layering)
    processed_roads.sort(key=lambda r: (1 if r.get("isBridge") else 0, -r["tier"]))

    total_km = sum(tier_lengths.values()) / 1000.0
    stats = {
        "totalLengthKm": round(total_km, 1),
        "tier1LengthKm": round(tier_lengths[1] / 1000.0, 1),
        "tier2LengthKm": round(tier_lengths[2] / 1000.0, 1),
        "tier3LengthKm": round(tier_lengths[3] / 1000.0, 1),
        "bridgeCount": bridge_count,
        "underpassCount": underpass_count,
        "pierCount": len(piers),
        "segmentCount": len(processed_roads)
    }

    output_data = {
        "stats": stats,
        "piers": piers,
        "roads": processed_roads
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output_data, f, separators=(",", ":"))

    file_size_kb = OUTPUT_JSON.stat().st_size / 1024.0
    print(f"✅ Exported {len(processed_roads)} roads and {len(piers)} piers to {OUTPUT_JSON} ({file_size_kb:.1f} KB)")
    print(f"   Total Network: {stats['totalLengthKm']} km | Tier 1: {stats['tier1LengthKm']} km | Tier 2: {stats['tier2LengthKm']} km | Tier 3: {stats['tier3LengthKm']} km")
    print(f"   Bridges/Flyovers: {bridge_count} spans | Piers: {len(piers)} concrete columns")

if __name__ == "__main__":
    main()
