#!/usr/bin/env python3
"""
10km × 10km Hyderabad Metropolitan Expansion Pipeline
=====================================================
Expands the Area of Interest to 10km × 10km (100 km²), centered at
(17.4370° N, 78.3800° E), covering HITEC City, Financial District,
Gachibowli, Kondapur, Madhapur, Durgam Cheruvu, Jubilee Hills, and Kukatpally.

Stages:
1. Crop 10km DEM & DSM from regional Copernicus 30m raster
2. Download and merge OSM buildings across 4 quadrants (~68k buildings)
3. Run 5-Tier Building Height Estimation & DEM ground sampling
4. Download and process 10km road network & multi-tier flyovers
5. Download and process 10km water bodies (100+ lakes)
6. Export viewer datasets (buildings.json, terrain.json, roads.json, water.json)
"""

import json
import math
import os
import sys
import time
from pathlib import Path
import numpy as np
import pyproj
import rasterio
from rasterio.mask import mask as rasterio_mask
from rasterio.warp import calculate_default_transform, reproject, Resampling
import requests
from shapely.geometry import Polygon, MultiPolygon, shape, mapping, box
from shapely.ops import unary_union
import geopandas as gpd
import pandas as pd
from tqdm import tqdm

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
METADATA_DIR = DATA_DIR / "metadata"
VIEWER_DATA_DIR = PROJECT_ROOT / "viewer" / "public" / "data"

CENTER_LAT = 17.4370
CENTER_LON = 78.3800
HALF_SIZE_KM = 5.0  # 10 km × 10 km (100 km²)

CRS_WGS84 = "EPSG:4326"
CRS_UTM = "EPSG:32644"

OVERPASS_MIRRORS = [
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass-api.de/api/interpreter"
]

def query_overpass(query: str, timeout: int = 120):
    headers = {"User-Agent": "SIH26011-Metropolis/2.0 (contact@sih.example.com)"}
    for url in OVERPASS_MIRRORS:
        try:
            print(f"  Querying {url}...")
            r = requests.post(url, data={"data": query}, headers=headers, timeout=timeout)
            if r.status_code == 200:
                data = r.json()
                if "elements" in data:
                    return data
            print(f"  Mirror {url} returned status {r.status_code}")
        except Exception as e:
            print(f"  Mirror {url} failed: {e}")
    raise RuntimeError("All Overpass API mirrors failed!")

def compute_10km_aoi():
    transformer = pyproj.Transformer.from_crs(CRS_WGS84, CRS_UTM, always_xy=True)
    inv_transformer = pyproj.Transformer.from_crs(CRS_UTM, CRS_WGS84, always_xy=True)

    cx, cy = transformer.transform(CENTER_LON, CENTER_LAT)
    min_x = cx - HALF_SIZE_KM * 1000.0
    max_x = cx + HALF_SIZE_KM * 1000.0
    min_y = cy - HALF_SIZE_KM * 1000.0
    max_y = cy + HALF_SIZE_KM * 1000.0

    w, s = inv_transformer.transform(min_x, min_y)
    e, n = inv_transformer.transform(max_x, max_y)

    return {
        "center": {"lat": CENTER_LAT, "lon": CENTER_LON},
        "centerUtm": {"x": round(cx, 2), "y": round(cy, 2)},
        "bbox": {
            "south": round(s, 6),
            "north": round(n, 6),
            "west": round(w, 6),
            "east": round(e, 6)
        },
        "utmBounds": {
            "minX": round(min_x, 2),
            "maxX": round(max_x, 2),
            "minY": round(min_y, 2),
            "maxY": round(max_y, 2)
        },
        "sizeKm": HALF_SIZE_KM * 2.0
    }

def main():
    print("=" * 70)
    print("🚀 10km × 10km HYDERABAD METROPOLITAN EXPANSION")
    print("=" * 70)

    aoi = compute_10km_aoi()
    print(f"AOI: {aoi['sizeKm']} km × {aoi['sizeKm']} km ({aoi['sizeKm']**2:.0f} km²)")
    print(f"Center UTM: ({aoi['centerUtm']['x']}, {aoi['centerUtm']['y']})")
    print(f"BBox: S={aoi['bbox']['south']}, N={aoi['bbox']['north']}, W={aoi['bbox']['west']}, E={aoi['bbox']['east']}")

    # -------------------------------------------------------------
    # STAGE 1: Crop 10km DEM & DSM from regional raster
    # -------------------------------------------------------------
    print("\n📦 STAGE 1: Cropping 10km DEM & DSM from regional Copernicus COG...")
    raw_dsm_cog = RAW_DIR / "Copernicus_DSM_COG_10_N17_00_E078_00_DEM.tif"
    if not raw_dsm_cog.exists():
        raise FileNotFoundError(f"Missing regional raster {raw_dsm_cog}")

    dem_clipped_path = PROCESSED_DIR / "dem_clipped.tif"
    dsm_clipped_path = PROCESSED_DIR / "dsm_clipped.tif"

    # Crop to 10km bbox in UTM EPSG:32644
    with rasterio.open(raw_dsm_cog) as src:
        # Reproject to UTM Zone 44N and clip to exact 10km bounds
        dst_crs = CRS_UTM
        bounds = (
            aoi["utmBounds"]["minX"],
            aoi["utmBounds"]["minY"],
            aoi["utmBounds"]["maxX"],
            aoi["utmBounds"]["maxY"]
        )
        
        # 30m resolution in UTM
        res = 30.0
        width = int(round((bounds[2] - bounds[0]) / res))
        height = int(round((bounds[3] - bounds[1]) / res))
        transform = rasterio.transform.from_bounds(*bounds, width, height)

        kwargs = src.meta.copy()
        kwargs.update({
            "crs": dst_crs,
            "transform": transform,
            "width": width,
            "height": height,
            "nodata": -32768.0,
            "dtype": "float32"
        })

        out_data = np.empty((height, width), dtype="float32")
        reproject(
            source=rasterio.band(src, 1),
            destination=out_data,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=transform,
            dst_crs=dst_crs,
            dst_nodata=-32768.0,
            resampling=Resampling.bilinear
        )

        with rasterio.open(dem_clipped_path, "w", **kwargs) as dst:
            dst.write(out_data, 1)

        with rasterio.open(dsm_clipped_path, "w", **kwargs) as dst:
            dst.write(out_data, 1)

    print(f"✅ Created 10km DEM & DSM: {width} × {height} pixels ({res}m resolution)")

    # -------------------------------------------------------------
    # STAGE 2: Export 10km Terrain Grid for Viewer
    # -------------------------------------------------------------
    print("\n🏔️ STAGE 2: Generating 10km Terrain Mesh Grid for Viewer...")
    # 192 × 192 grid for smooth topography over 10km
    grid_size = 192
    with rasterio.open(dem_clipped_path) as src:
        raw_grid = src.read(
            1,
            out_shape=(grid_size, grid_size),
            resampling=Resampling.bilinear
        )
        nodata = src.nodata

    valid_vals = raw_grid[(raw_grid != nodata) & (~np.isnan(raw_grid)) & (raw_grid > 400) & (raw_grid < 800)]
    median_elev = float(np.median(valid_vals)) if len(valid_vals) > 0 else 569.0
    min_elev = float(np.min(valid_vals)) if len(valid_vals) > 0 else 500.0
    max_elev = float(np.max(valid_vals)) if len(valid_vals) > 0 else 630.0

    clean_grid = np.where(
        (raw_grid != nodata) & (~np.isnan(raw_grid)) & (raw_grid > 400) & (raw_grid < 800),
        raw_grid,
        median_elev
    )

    terrain_json = {
        "grid": np.round(clean_grid, 1).tolist(),
        "gridSize": [grid_size, grid_size],
        "centerElevation": round(median_elev, 1),
        "minElevation": round(min_elev, 1),
        "maxElevation": round(max_elev, 1),
        "bounds": {
            "left": aoi["utmBounds"]["minX"],
            "right": aoi["utmBounds"]["maxX"],
            "bottom": aoi["utmBounds"]["minY"],
            "top": aoi["utmBounds"]["maxY"]
        }
    }

    terrain_out = VIEWER_DATA_DIR / "terrain.json"
    with open(terrain_out, "w") as f:
        json.dump(terrain_json, f, separators=(",", ":"))
    print(f"✅ Saved terrain.json ({terrain_out.stat().st_size / 1024:.1f} KB, Elev: {min_elev:.1f}m to {max_elev:.1f}m, Center: {median_elev:.1f}m)")

    # -------------------------------------------------------------
    # STAGE 3: Download 10km OSM Buildings in 4 Quadrants
    # -------------------------------------------------------------
    print("\n🏢 STAGE 3: Downloading 10km OSM Buildings (4 Quadrants)...")
    b = aoi["bbox"]
    mid_lat = (b["south"] + b["north"]) / 2.0
    mid_lon = (b["west"] + b["east"]) / 2.0

    quadrants = [
        ("SW", b["south"], b["west"], mid_lat, mid_lon),
        ("SE", b["south"], mid_lon, mid_lat, b["east"]),
        ("NW", mid_lat, b["west"], b["north"], mid_lon),
        ("NE", mid_lat, mid_lon, b["north"], b["east"]),
    ]

    all_nodes = {}
    all_ways = {}
    all_relations = {}

    for qname, qs, qw, qn, qe in quadrants:
        print(f"  Downloading Quadrant {qname} (S={qs:.4f}, W={qw:.4f}, N={qn:.4f}, E={qe:.4f})...")
        q_query = f"""
[out:json][timeout:150];
(
  way["building"]({qs},{qw},{qn},{qe});
  relation["building"]({qs},{qw},{qn},{qe});
);
out body;
>;
out skel qt;
"""
        data = query_overpass(q_query, timeout=180)
        elements = data.get("elements", [])
        q_nodes = 0
        q_ways = 0
        for elem in elements:
            etype = elem.get("type")
            eid = elem.get("id")
            if etype == "node":
                all_nodes[eid] = (elem["lon"], elem["lat"])
                q_nodes += 1
            elif etype == "way":
                all_ways[eid] = elem
                q_ways += 1
            elif etype == "relation":
                all_relations[eid] = elem
        print(f"    Quadrant {qname}: {q_ways} buildings, {q_nodes} nodes")
        time.sleep(1)

    print(f"✅ Total Unique Buildings Downloaded: {len(all_ways)} ways, {len(all_relations)} relations")

    # Save raw cache
    raw_bldg_cache = RAW_DIR / "osm_buildings_10km.json"
    with open(raw_bldg_cache, "w") as f:
        json.dump({"elements": list(all_ways.values()) + list(all_relations.values())}, f)

    # -------------------------------------------------------------
    # STAGE 4: 5-Tier Height Estimation & 3D Building Extrusion
    # -------------------------------------------------------------
    print("\n📐 STAGE 4: 5-Tier Height Estimation & Geometry Processing...")
    # Load landmark registry
    registry_path = METADATA_DIR / "landmarks_registry.json"
    landmark_registry = {}
    if registry_path.exists():
        with open(registry_path) as f:
            reg_data = json.load(f)
            landmark_registry = reg_data.get("by_osm_id", {})
    print(f"  Loaded {len(landmark_registry)} curated landmark registry entries")

    transformer = pyproj.Transformer.from_crs(CRS_WGS84, CRS_UTM, always_xy=True)
    center_x = aoi["centerUtm"]["x"]
    center_y = aoi["centerUtm"]["y"]

    with rasterio.open(dem_clipped_path) as dem_src:
        dem_data = dem_src.read(1)
        dem_nodata = dem_src.nodata

        def get_dem_elev(ux, uy):
            try:
                r, c = dem_src.index(ux, uy)
                if 0 <= r < dem_data.shape[0] and 0 <= c < dem_data.shape[1]:
                    v = dem_data[r, c]
                    if v != dem_nodata and not np.isnan(v) and 400 < v < 800:
                        return float(v)
            except Exception:
                pass
            return median_elev

        processed_buildings = []
        stats = {
            "total": 0,
            "withLandmarkRegistry": 0,
            "withOsmHeight": 0,
            "withOsmLevels": 0,
            "withMorphological": 0,
            "withDefault": 0
        }

        for wid, w in tqdm(all_ways.items(), desc="Processing Buildings"):
            node_ids = w.get("nodes", [])
            if len(node_ids) < 4:
                continue

            pts_wgs = [all_nodes[nid] for nid in node_ids if nid in all_nodes]
            if len(pts_wgs) < 4:
                continue

            # Convert to relative UTM coords
            rel_coords = []
            utms = []
            for lon, lat in pts_wgs:
                ux, uy = transformer.transform(lon, lat)
                utms.append((ux, uy))
                rel_coords.append([round(ux - center_x, 2), round(uy - center_y, 2)])

            # Polygon validity
            try:
                poly = Polygon(utms)
                if not poly.is_valid or poly.area < 10.0:
                    continue
            except Exception:
                continue

            tags = w.get("tags", {})
            name = tags.get("name")
            b_type = tags.get("building", "yes")
            levels_str = tags.get("building:levels")
            height_str = tags.get("height")
            osm_id_str = str(wid)

            # 5-Tier Height Estimation
            height = None
            source = "default"
            levels = None

            # Tier 1: Registry
            if osm_id_str in landmark_registry:
                entry = landmark_registry[osm_id_str]
                height = float(entry["height_m"])
                levels = int(entry.get("floors", max(1, int(height / 3.5))))
                name = name or entry.get("name")
                source = "landmark_registry"
                stats["withLandmarkRegistry"] += 1
            # Tier 2: Explicit OSM height
            elif height_str:
                try:
                    h_val = float(height_str.replace("m", "").strip())
                    if 2.0 <= h_val <= 250.0:
                        height = h_val
                        source = "osm_height"
                        stats["withOsmHeight"] += 1
                except ValueError:
                    pass
            # Tier 3: OSM levels
            if height is None and levels_str:
                try:
                    lvl = float(levels_str.strip())
                    if 1 <= lvl <= 60:
                        levels = int(lvl)
                        floor_h = 3.5 if b_type in ["commercial", "office", "retail"] else 3.0
                        height = lvl * floor_h
                        source = "osm_levels"
                        stats["withOsmLevels"] += 1
                except ValueError:
                    pass
            # Tier 4 & 5: Morphological footprint estimation
            if height is None:
                area = poly.area
                if area > 4000:
                    height = 24.0
                    levels = 7
                elif area > 1800:
                    height = 15.0
                    levels = 5
                elif area > 800:
                    height = 9.0
                    levels = 3
                elif area > 300:
                    height = 6.0
                    levels = 2
                else:
                    height = 4.0
                    levels = 1
                source = "morphological"
                stats["withMorphological"] += 1

            # Sample terrain elevation at centroid
            cent = poly.centroid
            base_elev = round(get_dem_elev(cent.x, cent.y), 1)

            processed_buildings.append({
                "id": osm_id_str,
                "osmId": wid,
                "coordinates": rel_coords,
                "height": round(height, 1),
                "estimatedFloors": levels or max(1, int(height / 3.0)),
                "buildingType": b_type,
                "name": name,
                "heightSource": source,
                "baseElevation": base_elev,
                "centroid": [round(cent.x - center_x, 2), round(cent.y - center_y, 2)]
            })

    stats["total"] = len(processed_buildings)
    print(f"✅ Processed {stats['total']:,} 3D Buildings!")
    print(f"   Registry: {stats['withLandmarkRegistry']} | OSM Height: {stats['withOsmHeight']} | OSM Levels: {stats['withOsmLevels']} | Morphology: {stats['withMorphological']}")

    buildings_json = {
        "aoi": aoi,
        "stats": stats,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "buildings": processed_buildings
    }

    bldg_out = VIEWER_DATA_DIR / "buildings.json"
    with open(bldg_out, "w") as f:
        json.dump(buildings_json, f, separators=(",", ":"))
    print(f"✅ Exported buildings.json ({bldg_out.stat().st_size / (1024*1024):.2f} MB)")

    # -------------------------------------------------------------
    # STAGE 5: 10km Water Bodies
    # -------------------------------------------------------------
    print("\n🌊 STAGE 5: Downloading 10km Water Bodies...")
    water_query = f"""
[out:json][timeout:120];
(
  way["natural"="water"]({b['south']},{b['west']},{b['north']},{b['east']});
  way["water"]({b['south']},{b['west']},{b['north']},{b['east']});
  relation["natural"="water"]({b['south']},{b['west']},{b['north']},{b['east']});
  relation["water"]({b['south']},{b['west']},{b['north']},{b['east']});
  way["bridge"="yes"]({b['south']},{b['west']},{b['north']},{b['east']});
);
out body;
>;
out skel qt;
"""
    water_data = query_overpass(water_query, timeout=120)
    w_nodes = {e["id"]: (e["lon"], e["lat"]) for e in water_data.get("elements", []) if e.get("type") == "node"}
    w_elements = [e for e in water_data.get("elements", []) if e.get("type") == "way"]

    water_items = []
    bridge_items = []

    for e in w_elements:
        tags = e.get("tags", {})
        name = tags.get("name", "")
        is_water = tags.get("natural") == "water" or tags.get("water") in ["lake", "reservoir", "pond", "basin"]
        is_bridge = tags.get("bridge") in ["yes", "viaduct"]

        node_ids = e.get("nodes", [])
        way_pts = [w_nodes[nid] for nid in node_ids if nid in w_nodes]
        if len(way_pts) < 3:
            continue

        rel_coords = []
        for lon, lat in way_pts:
            ux, uy = transformer.transform(lon, lat)
            rel_coords.append([round(ux - center_x, 2), round(uy - center_y, 2)])

        item = {
            "id": str(e["id"]),
            "name": name or ("Water Body" if is_water else "Bridge"),
            "coordinates": rel_coords
        }

        if is_water and len(rel_coords) >= 4:
            water_items.append(item)
        elif is_bridge:
            bridge_items.append(item)

    water_out = VIEWER_DATA_DIR / "water.json"
    with open(water_out, "w") as f:
        json.dump({"water": water_items, "bridges": bridge_items}, f, separators=(",", ":"))
    print(f"✅ Exported water.json ({len(water_items)} lakes/reservoirs, {len(bridge_items)} bridge spans)")

    # -------------------------------------------------------------
    # STAGE 6: 10km Road Network & Flyovers
    # -------------------------------------------------------------
    print("\n🛣️ STAGE 6: Downloading & Building 10km Road Network...")
    road_query = f"""
[out:json][timeout:150];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|residential|service|unclassified)"]({b['south']},{b['west']},{b['north']},{b['east']});
);
out body;
>;
out skel qt;
"""
    raw_roads = query_overpass(road_query, timeout=180)
    raw_roads_cache = RAW_DIR / "highway_features.json"
    with open(raw_roads_cache, "w") as f:
        json.dump(raw_roads, f)
    print(f"  Downloaded 10km road features ({raw_roads_cache.stat().st_size / (1024*1024):.2f} MB)")

    # Run build_roads.py
    from build_roads import main as run_build_roads
    run_build_roads()

    print("\n🎉 10km × 10km HYDERABAD METROPOLITAN PIPELINE COMPLETE!")

if __name__ == "__main__":
    main()
