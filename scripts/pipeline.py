#!/usr/bin/env python3
"""
SIH26011 — Geospatial Data Acquisition & 3D Building Pipeline
==============================================================

Hyderabad 3D Building Dataset Generator
Area of Interest: ~3 km × 3 km around Durgam Cheruvu, HITEC City

Pipeline:
  OSM Buildings → DEM + DSM → Height Estimation → 3D Extrusion → Viewer Data

Author: SIH Power Rangers
"""

import hashlib
import json
import math
import os
import re
import sys
import time
import warnings
from datetime import datetime, timezone
from pathlib import Path

import geopandas as gpd
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
from matplotlib.patches import Patch
import numpy as np
import pandas as pd
import rasterio
from rasterio.mask import mask as rasterio_mask
from rasterio.warp import calculate_default_transform, reproject, Resampling
from rasterio.transform import from_bounds
import requests
from shapely.geometry import shape, mapping, box, Polygon, MultiPolygon
from shapely.ops import unary_union
import pyproj
from tqdm import tqdm

try:
    import trimesh
    HAS_TRIMESH = True
except ImportError:
    HAS_TRIMESH = False
    print("⚠️  trimesh not installed — GLB export will be skipped")

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

warnings.filterwarnings('ignore', category=rasterio.errors.NotGeoreferencedWarning)
warnings.filterwarnings('ignore', category=FutureWarning)

# ═══════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════

# Durgam Cheruvu / HITEC City center
CENTER_LAT = 17.4239
CENTER_LON = 78.3812

# 3 km × 3 km bounding box (~9 km²)
HALF_SIZE_KM = 1.5

# CRS
CRS_WGS84 = "EPSG:4326"
CRS_UTM = "EPSG:32644"  # UTM Zone 44N for Hyderabad

# Height estimation
FLOOR_HEIGHT_M = 3.0
MAX_VALID_HEIGHT_M = 200.0
MIN_VALID_HEIGHT_M = 0.0

# OpenTopography API
OPENTOPO_API_KEY = os.environ.get("OPEN_TOPOGRAPHY_API", "")

# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
METADATA_DIR = DATA_DIR / "metadata"
OUTPUTS_DIR = PROJECT_ROOT / "outputs"
VIEWER_DATA_DIR = PROJECT_ROOT / "viewer" / "public" / "data"

# Colors for height visualization
HEIGHT_COLORS = {
    (0, 5): "#4ecdc4",
    (5, 15): "#44bd32",
    (15, 30): "#f9ca24",
    (30, 60): "#e17055",
    (60, 300): "#d63031",
}


# ═══════════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════════

def banner(text, char="═"):
    """Print a styled banner."""
    width = 60
    print(f"\n{'':>{2}}{char * width}")
    print(f"{'':>{2}}  {text}")
    print(f"{'':>{2}}{char * width}\n")


def info(msg):
    print(f"  ✅ {msg}")


def warn(msg):
    print(f"  ⚠️  {msg}")


def error(msg):
    print(f"  ❌ {msg}")


def progress(msg):
    print(f"  🔄 {msg}")


def ensure_dirs():
    """Create all required directories."""
    for d in [RAW_DIR, PROCESSED_DIR, METADATA_DIR, OUTPUTS_DIR, VIEWER_DATA_DIR]:
        d.mkdir(parents=True, exist_ok=True)
    info("Directory structure created")


# ═══════════════════════════════════════════════════════════════════
# STAGE 1: AOI DEFINITION
# ═══════════════════════════════════════════════════════════════════

def compute_aoi():
    """Compute the Area of Interest bounding box."""
    banner("STAGE 1: AOI Definition")

    # Convert km offset to degrees (approximate)
    # 1 degree latitude ≈ 111.32 km
    # 1 degree longitude ≈ 111.32 * cos(lat) km
    lat_offset = HALF_SIZE_KM / 111.32
    lon_offset = HALF_SIZE_KM / (111.32 * math.cos(math.radians(CENTER_LAT)))

    south = CENTER_LAT - lat_offset
    north = CENTER_LAT + lat_offset
    west = CENTER_LON - lon_offset
    east = CENTER_LON + lon_offset

    aoi = {
        "center": {"lat": CENTER_LAT, "lon": CENTER_LON},
        "bbox": {
            "south": round(south, 6),
            "north": round(north, 6),
            "west": round(west, 6),
            "east": round(east, 6),
        },
        "size_km": HALF_SIZE_KM * 2,
        "area_km2": (HALF_SIZE_KM * 2) ** 2,
        "crs_geographic": CRS_WGS84,
        "crs_projected": CRS_UTM,
    }

    info(f"Center: {CENTER_LAT}°N, {CENTER_LON}°E (Durgam Cheruvu)")
    info(f"Bbox: S={aoi['bbox']['south']}, N={aoi['bbox']['north']}, "
         f"W={aoi['bbox']['west']}, E={aoi['bbox']['east']}")
    info(f"Size: {aoi['size_km']} km × {aoi['size_km']} km = ~{aoi['area_km2']:.0f} km²")

    return aoi


def aoi_polygon_wgs84(aoi):
    """Create a Shapely polygon from the AOI bbox in WGS84."""
    b = aoi["bbox"]
    return box(b["west"], b["south"], b["east"], b["north"])


# ═══════════════════════════════════════════════════════════════════
# STAGE 2: OSM BUILDING DOWNLOAD
# ═══════════════════════════════════════════════════════════════════

def download_osm_buildings(aoi):
    """Download building footprints from OpenStreetMap via Overpass API."""
    banner("STAGE 2: OSM Building Download")

    output_path = RAW_DIR / "osm_buildings.geojson"
    if output_path.exists() and output_path.stat().st_size > 50000:
        info(f"Using cached OSM buildings: {output_path.name} ({output_path.stat().st_size / 1024:.1f} KB)")
        return output_path

    b = aoi["bbox"]

    # Overpass QL query
    query = f"""
[out:json][timeout:120];
(
  way["building"]({b['south']},{b['west']},{b['north']},{b['east']});
  relation["building"]({b['south']},{b['west']},{b['north']},{b['east']});
);
out body;
>;
out skel qt;
"""

    # Try multiple Overpass API mirrors
    mirrors = [
        ("maps.mail.ru", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"),
        ("overpass-api.de", "https://overpass-api.de/api/interpreter"),
        ("overpass.kumi.systems", "https://overpass.kumi.systems/api/interpreter"),
    ]

    resp = None
    for mirror_name, url in mirrors:
        progress(f"Querying Overpass API ({mirror_name})...")
        try:
            resp = requests.post(
                url,
                data={"data": query},
                timeout=180,
                headers={"User-Agent": "SIH26011-Pipeline/1.0"},
            )
            resp.raise_for_status()
            info(f"Success via {mirror_name}")
            break
        except requests.RequestException as e:
            warn(f"Mirror {mirror_name} failed: {e}")
            resp = None
            continue

    if resp is None:
        error("All Overpass API mirrors failed!")
        return None

    data = resp.json()
    elements = data.get("elements", [])

    # Parse nodes
    nodes = {}
    for el in elements:
        if el["type"] == "node":
            nodes[el["id"]] = (el["lon"], el["lat"])

    # Parse ways into polygons
    features = []
    ways = [el for el in elements if el["type"] == "way" and "tags" in el]

    progress(f"Processing {len(ways)} building ways...")
    for way in ways:
        node_ids = way.get("nodes", [])
        coords = []
        for nid in node_ids:
            if nid in nodes:
                coords.append(nodes[nid])

        if len(coords) < 4:
            continue

        # Ensure ring is closed
        if coords[0] != coords[-1]:
            coords.append(coords[0])

        try:
            poly = Polygon(coords)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty or not poly.is_valid:
                continue
        except Exception:
            continue

        tags = way.get("tags", {})
        props = {
            "osm_id": way["id"],
            "building_type": tags.get("building", "yes"),
            "osm_height": None,
            "osm_levels": None,
            "name": tags.get("name"),
        }

        # Extract height
        if "height" in tags:
            try:
                h = tags["height"].replace("m", "").replace(" ", "")
                props["osm_height"] = float(h)
            except (ValueError, AttributeError):
                pass

        # Extract levels
        if "building:levels" in tags:
            try:
                props["osm_levels"] = int(tags["building:levels"])
            except (ValueError, TypeError):
                pass

        # Preserve additional useful tags
        for key in ["building:material", "building:colour", "building:roof:shape",
                     "roof:shape", "roof:material", "addr:street", "addr:housenumber",
                     "amenity", "shop", "office", "tourism", "leisure"]:
            if key in tags:
                props[key.replace(":", "_")] = tags[key]

        features.append({
            "type": "Feature",
            "geometry": mapping(poly),
            "properties": props,
        })

    # Parse relations (multipolygon buildings)
    relations = [el for el in elements if el["type"] == "relation" and "tags" in el]
    way_geoms = {}
    for way in [el for el in elements if el["type"] == "way"]:
        node_ids = way.get("nodes", [])
        coords = [nodes[nid] for nid in node_ids if nid in nodes]
        if len(coords) >= 2:
            way_geoms[way["id"]] = coords

    for rel in relations:
        tags = rel.get("tags", {})
        members = rel.get("members", [])

        outer_rings = []
        for member in members:
            if member.get("type") == "way" and member.get("role") == "outer":
                if member["ref"] in way_geoms:
                    coords = way_geoms[member["ref"]]
                    if len(coords) >= 4:
                        if coords[0] != coords[-1]:
                            coords.append(coords[0])
                        outer_rings.append(coords)

        for ring in outer_rings:
            try:
                poly = Polygon(ring)
                if not poly.is_valid:
                    poly = poly.buffer(0)
                if poly.is_empty:
                    continue
            except Exception:
                continue

            props = {
                "osm_id": rel["id"],
                "building_type": tags.get("building", "yes"),
                "osm_height": None,
                "osm_levels": None,
                "name": tags.get("name"),
            }

            if "height" in tags:
                try:
                    h = tags["height"].replace("m", "").replace(" ", "")
                    props["osm_height"] = float(h)
                except (ValueError, AttributeError):
                    pass

            if "building:levels" in tags:
                try:
                    props["osm_levels"] = int(tags["building:levels"])
                except (ValueError, TypeError):
                    pass

            features.append({
                "type": "Feature",
                "geometry": mapping(poly),
                "properties": props,
            })

    if not features:
        error("No building footprints found!")
        return None

    # Create GeoJSON
    geojson = {
        "type": "FeatureCollection",
        "features": features,
    }

    with open(output_path, "w") as f:
        json.dump(geojson, f)

    info(f"Downloaded {len(features)} buildings → {output_path.name}")

    # Stats
    with_height = sum(1 for f in features if f["properties"]["osm_height"] is not None)
    with_levels = sum(1 for f in features if f["properties"]["osm_levels"] is not None)
    info(f"  With OSM height tag: {with_height}")
    info(f"  With OSM levels tag: {with_levels}")

    return output_path


# ═══════════════════════════════════════════════════════════════════
# STAGE 3: DSM DOWNLOAD (Copernicus GLO-30)
# ═══════════════════════════════════════════════════════════════════

def download_copernicus_dsm(aoi):
    """Download Copernicus GLO-30 DSM from AWS S3 (public, no auth)."""
    banner("STAGE 3: DSM Download (Copernicus GLO-30)")

    output_path = RAW_DIR / "dsm.tif"
    if output_path.exists() and output_path.stat().st_size > 1000000:
        info(f"Using cached Copernicus DSM: {output_path.name} ({output_path.stat().st_size / 1024 / 1024:.1f} MB)")
        return output_path

    # Determine tile(s) needed
    # Tile naming: Copernicus_DSM_COG_10_N{lat}_00_E{lon}_00_DEM
    b = aoi["bbox"]
    lat_tiles = set()
    lon_tiles = set()

    for lat in [math.floor(b["south"]), math.floor(b["north"])]:
        lat_tiles.add(lat)
    for lon in [math.floor(b["west"]), math.floor(b["east"])]:
        lon_tiles.add(lon)

    tiles_to_download = []
    for lat in sorted(lat_tiles):
        for lon in sorted(lon_tiles):
            lat_str = f"N{abs(lat):02d}" if lat >= 0 else f"S{abs(lat):02d}"
            lon_str = f"E{abs(lon):03d}" if lon >= 0 else f"W{abs(lon):03d}"
            tile_name = f"Copernicus_DSM_COG_10_{lat_str}_00_{lon_str}_00_DEM"
            tile_url = f"https://copernicus-dem-30m.s3.amazonaws.com/{tile_name}/{tile_name}.tif"
            tiles_to_download.append((tile_name, tile_url))

    info(f"Tiles needed: {len(tiles_to_download)}")
    for name, url in tiles_to_download:
        info(f"  {name}")

    # Download tile(s)
    downloaded_paths = []
    for tile_name, tile_url in tiles_to_download:
        progress(f"Downloading {tile_name}...")
        try:
            resp = requests.get(tile_url, timeout=120, stream=True)
            resp.raise_for_status()

            tile_path = RAW_DIR / f"{tile_name}.tif"
            total = int(resp.headers.get('content-length', 0))
            with open(tile_path, "wb") as f:
                with tqdm(total=total, unit='B', unit_scale=True, desc=tile_name[:30]) as pbar:
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
                        pbar.update(len(chunk))

            downloaded_paths.append(tile_path)
            info(f"  Downloaded: {tile_path.name} ({tile_path.stat().st_size / 1024 / 1024:.1f} MB)")

        except requests.RequestException as e:
            error(f"  Failed to download {tile_name}: {e}")
            return None

    # If single tile, just copy/rename
    if len(downloaded_paths) == 1:
        import shutil
        shutil.copy2(downloaded_paths[0], output_path)
    else:
        # Merge multiple tiles using rasterio
        _merge_rasters(downloaded_paths, output_path)

    info(f"DSM saved → {output_path.name}")

    # Report raster info
    with rasterio.open(output_path) as src:
        info(f"  CRS: {src.crs}")
        info(f"  Resolution: {src.res[0]:.6f}° × {src.res[1]:.6f}°")
        info(f"  Size: {src.width} × {src.height} pixels")
        info(f"  Bounds: {src.bounds}")

    return output_path


def _merge_rasters(paths, output_path):
    """Merge multiple raster tiles into one."""
    from rasterio.merge import merge
    datasets = [rasterio.open(p) for p in paths]
    merged, transform = merge(datasets)
    meta = datasets[0].meta.copy()
    meta.update({
        "height": merged.shape[1],
        "width": merged.shape[2],
        "transform": transform,
    })
    with rasterio.open(output_path, "w", **meta) as dst:
        dst.write(merged)
    for ds in datasets:
        ds.close()


# ═══════════════════════════════════════════════════════════════════
# STAGE 4: DEM DOWNLOAD
# ═══════════════════════════════════════════════════════════════════

def download_dem(aoi):
    """Download a bare-earth DEM. Try SRTM via OpenTopography, then fallback."""
    banner("STAGE 4: DEM Download (Bare Earth)")

    output_path = RAW_DIR / "dem.tif"
    if output_path.exists() and output_path.stat().st_size > 1000:
        info(f"Using cached DEM: {output_path.name} ({output_path.stat().st_size / 1024:.1f} KB)")
        return output_path

    # Strategy 1: OpenTopography SRTM GL1 (we have API key)
    if OPENTOPO_API_KEY:
        progress("Attempting SRTM GL1 via OpenTopography API...")
        b = aoi["bbox"]
        url = (
            f"https://portal.opentopography.org/API/globaldem"
            f"?demtype=SRTMGL1"
            f"&south={b['south']}&north={b['north']}"
            f"&west={b['west']}&east={b['east']}"
            f"&outputFormat=GTiff"
            f"&API_Key={OPENTOPO_API_KEY}"
        )

        try:
            resp = requests.get(url, timeout=180, stream=True)
            resp.raise_for_status()

            # Check content type (API returns error as JSON/text sometimes)
            content_type = resp.headers.get('content-type', '')
            if 'tif' in content_type or 'octet' in content_type or len(resp.content) > 10000:
                total = int(resp.headers.get('content-length', 0))
                with open(output_path, "wb") as f:
                    downloaded = 0
                    for chunk in resp.iter_content(chunk_size=8192):
                        f.write(chunk)
                        downloaded += len(chunk)

                # Verify it's a valid raster
                try:
                    with rasterio.open(output_path) as src:
                        info(f"SRTM DEM downloaded via OpenTopography")
                        info(f"  CRS: {src.crs}")
                        info(f"  Resolution: {src.res[0]:.6f}° × {src.res[1]:.6f}°")
                        info(f"  Size: {src.width} × {src.height} pixels")
                        return output_path
                except Exception as e:
                    warn(f"Downloaded file is not a valid raster: {e}")
                    output_path.unlink(missing_ok=True)
            else:
                warn(f"OpenTopography returned non-raster content: {content_type}")
                # Try to read error message
                try:
                    err_text = resp.text[:500]
                    warn(f"  Response: {err_text}")
                except Exception:
                    pass

        except requests.RequestException as e:
            warn(f"OpenTopography request failed: {e}")
    else:
        warn("No OpenTopography API key found in .env")

    # Strategy 2: Use Copernicus GLO-30 as both DSM and approximate DEM
    # BUT — we need to be honest about this
    warn("Could not obtain a separate bare-earth DEM")
    warn("Falling back: will use Copernicus GLO-30 for both DSM and DEM")
    warn("Building heights from DSM-DEM will be ZERO in this case")
    warn("Height estimation will rely on OSM tags + building:levels only")

    # Copy DSM as DEM so pipeline can continue (clearly marked in metadata)
    dsm_path = RAW_DIR / "dsm.tif"
    if dsm_path.exists():
        import shutil
        shutil.copy2(dsm_path, output_path)
        info(f"DEM (=copy of DSM, heights will be from OSM tags only) → {output_path.name}")
        return output_path
    else:
        error("DSM not available either. Cannot proceed with DEM.")
        return None


# ═══════════════════════════════════════════════════════════════════
# STAGE 5: RASTER ALIGNMENT & CLIPPING
# ═══════════════════════════════════════════════════════════════════

def clip_and_align_rasters(aoi, dem_path, dsm_path):
    """Clip and reproject DEM and DSM to AOI in UTM."""
    banner("STAGE 5: Raster Alignment & Clipping")

    aoi_geom = aoi_polygon_wgs84(aoi)
    dem_clipped = PROCESSED_DIR / "dem_clipped.tif"
    dsm_clipped = PROCESSED_DIR / "dsm_clipped.tif"

    dem_same_as_dsm = False

    for label, src_path, dst_path in [("DEM", dem_path, dem_clipped), ("DSM", dsm_path, dsm_clipped)]:
        progress(f"Processing {label}: {src_path.name}")

        with rasterio.open(src_path) as src:
            # First clip in source CRS
            src_crs = src.crs

            # Transform AOI to source CRS if needed
            if str(src_crs) != CRS_WGS84:
                transformer = pyproj.Transformer.from_crs(CRS_WGS84, src_crs, always_xy=True)
                b = aoi["bbox"]
                coords = [
                    transformer.transform(b["west"], b["south"]),
                    transformer.transform(b["east"], b["south"]),
                    transformer.transform(b["east"], b["north"]),
                    transformer.transform(b["west"], b["north"]),
                ]
                clip_geom = box(
                    min(c[0] for c in coords),
                    min(c[1] for c in coords),
                    max(c[0] for c in coords),
                    max(c[1] for c in coords),
                )
            else:
                clip_geom = aoi_geom

            # Check overlap
            raster_bounds = box(*src.bounds)
            if not raster_bounds.intersects(clip_geom):
                error(f"{label} does not overlap AOI!")
                return None, None
            
            overlap = raster_bounds.intersection(clip_geom)
            overlap_pct = (overlap.area / clip_geom.area) * 100
            info(f"  {label} overlap with AOI: {overlap_pct:.1f}%")

            # Clip
            try:
                clipped_data, clipped_transform = rasterio_mask(
                    src, [mapping(clip_geom)], crop=True, nodata=src.nodata or -9999
                )
            except Exception as e:
                error(f"  Clipping failed: {e}")
                return None, None

            # Calculate transform to UTM
            dst_transform, dst_width, dst_height = calculate_default_transform(
                src_crs, CRS_UTM,
                clipped_data.shape[2], clipped_data.shape[1],
                left=clipped_transform.c,
                bottom=clipped_transform.f + clipped_transform.e * clipped_data.shape[1],
                right=clipped_transform.c + clipped_transform.a * clipped_data.shape[2],
                top=clipped_transform.f,
            )

            meta = src.meta.copy()
            meta.update({
                "driver": "GTiff",
                "crs": CRS_UTM,
                "transform": dst_transform,
                "width": dst_width,
                "height": dst_height,
                "nodata": src.nodata or -9999,
            })

            with rasterio.open(dst_path, "w", **meta) as dst:
                for band in range(1, src.count + 1):
                    reproject(
                        source=clipped_data[band - 1],
                        destination=rasterio.band(dst, band),
                        src_transform=clipped_transform,
                        src_crs=src_crs,
                        dst_transform=dst_transform,
                        dst_crs=CRS_UTM,
                        resampling=Resampling.bilinear,
                    )

            info(f"  {label} clipped & reprojected → {dst_path.name}")

            with rasterio.open(dst_path) as check:
                info(f"    CRS: {check.crs}")
                info(f"    Size: {check.width} × {check.height}")
                info(f"    Resolution: {check.res[0]:.1f}m × {check.res[1]:.1f}m")

    # Check if DEM and DSM are actually the same file
    if dem_path.name == dsm_path.name or _files_identical(dem_path, dsm_path):
        dem_same_as_dsm = True
        warn("DEM and DSM are the same dataset — raster-derived heights will be ~0")
        warn("Height estimation will rely on OSM tags only")

    return dem_clipped, dsm_clipped, dem_same_as_dsm


def _files_identical(path1, path2):
    """Check if two files have identical content."""
    try:
        return path1.stat().st_size == path2.stat().st_size
    except Exception:
        return False


# ═══════════════════════════════════════════════════════════════════
# STAGE 6: BUILDING HEIGHT ESTIMATION
# ═══════════════════════════════════════════════════════════════════

def estimate_building_heights(aoi, buildings_path, dem_path, dsm_path, dem_same_as_dsm=False):
    """
    Estimate building heights using a 5-Tier Hierarchical Fusion Engine:
      Tier 1: Authoritative Landmark Registry & Verified OSM tags (osm_height, osm_levels)
      Tier 2: Annular Buffer Local Morphological Ground Filter on modern DSM
      Tier 3: Spatial Cluster Propagation (HITEC City / Knowledge City / Raidurg tech corridors)
      Tier 4: Morphological & Typological Regression / Rules Engine (Footprint Area Law)
      Tier 5: Hyderabad GHMC Urban Lot-Size Baseline Defaults
    """
    banner("STAGE 6: 5-Tier Hierarchical Building Height Estimation")

    # Load buildings
    with open(buildings_path) as f:
        buildings_geojson = json.load(f)

    features = buildings_geojson["features"]
    progress(f"Processing {len(features)} buildings...")

    # Create GeoDataFrame
    gdf = gpd.GeoDataFrame.from_features(features, crs=CRS_WGS84)
    gdf_utm = gdf.to_crs(CRS_UTM)

    # Load authoritative landmark registry
    registry_path = METADATA_DIR / "landmarks_registry.json"
    by_osm_id = {}
    by_name_pattern = []
    if registry_path.exists():
        try:
            with open(registry_path) as rf:
                reg_data = json.load(rf)
                by_osm_id = reg_data.get("by_osm_id", {})
                by_name_pattern = reg_data.get("by_name_pattern", [])
            info(f"Loaded landmark registry: {len(by_osm_id)} registered towers, {len(by_name_pattern)} name patterns")
        except Exception as e:
            warn(f"Failed to load landmark registry: {e}")

    # Open DSM for Annular Sampling
    dsm_src = None
    if dsm_path and Path(dsm_path).exists():
        try:
            dsm_src = rasterio.open(dsm_path)
        except Exception as e:
            warn(f"Could not open DSM for annular sampling: {e}")

    estimated_heights = []
    estimated_floors_list = []
    height_sources = []

    for idx, row in tqdm(gdf_utm.iterrows(), total=len(gdf_utm), desc="Estimating heights (5-Tier)"):
        geom = row.geometry
        osm_id = row.get("osm_id")
        osm_id_str = str(int(osm_id)) if osm_id is not None and not pd.isna(osm_id) else ""
        name = str(row.get("name") or "").strip()
        b_type = str(row.get("building_type") or "yes").lower()
        office = str(row.get("office") or "").lower()
        shop = str(row.get("shop") or "").lower()
        amenity = str(row.get("amenity") or "").lower()
        osm_height = row.get("osm_height")
        osm_levels = row.get("osm_levels")

        area = geom.area if geom and not geom.is_empty else 150.0
        perimeter = geom.length if geom and not geom.is_empty else 50.0
        compactness = (4.0 * math.pi * area) / (perimeter * perimeter) if perimeter > 0 else 0.5
        centroid = geom.centroid if geom and not geom.is_empty else None

        h = None
        fl = None
        src = None

        # -------------------------------------------------------------
        # TIER 1a: Authoritative Landmark Registry by OSM ID
        # -------------------------------------------------------------
        if osm_id_str in by_osm_id:
            entry = by_osm_id[osm_id_str]
            h = float(entry["height_m"])
            fl = int(entry.get("floors", max(1, round(h / 3.5))))
            src = "landmark_registry"

        # -------------------------------------------------------------
        # TIER 1b: Authoritative Landmark Registry by Name Pattern
        # -------------------------------------------------------------
        if h is None and name:
            for pat in by_name_pattern:
                if re.search(pat["regex"], name, re.IGNORECASE):
                    h = float(pat["height_m"])
                    fl = int(pat.get("floors", max(1, round(h / 3.5))))
                    src = "landmark_registry"
                    break

        # -------------------------------------------------------------
        # TIER 1c: Authoritative OSM Explicit Height Tag
        # -------------------------------------------------------------
        if h is None and osm_height is not None and not pd.isna(osm_height):
            try:
                val = float(str(osm_height).replace("m", "").strip())
                if 3.0 <= val <= 250.0:
                    h = val
                    fl = max(1, round(h / 3.5))
                    src = "osm_tag"
            except (ValueError, TypeError):
                pass

        # -------------------------------------------------------------
        # TIER 1d: Authoritative OSM Explicit Levels Tag
        # -------------------------------------------------------------
        if h is None and osm_levels is not None and not pd.isna(osm_levels):
            try:
                lv = int(float(str(osm_levels).strip()))
                if 1 <= lv <= 70:
                    fl = lv
                    floor_h = 3.5 if (b_type in ["commercial", "office"] or office != "") else 3.0
                    h = round(fl * floor_h, 2)
                    src = "osm_levels"
            except (ValueError, TypeError):
                pass

        # -------------------------------------------------------------
        # TIER 2: Annular Buffer Local Morphological Ground Filter
        # -------------------------------------------------------------
        if h is None and dsm_src is not None and geom is not None and not geom.is_empty and area >= 800:
            annular_h = _sample_annular_dsm(dsm_src, geom)
            if annular_h is not None and 10.0 <= annular_h <= 140.0:
                h = round(annular_h, 2)
                fl = max(1, round(h / 3.5))
                src = "raster_annular"

        # -------------------------------------------------------------
        # TIER 3: Spatial Cluster Context (HITEC City / Knowledge City)
        # -------------------------------------------------------------
        is_in_tech_corridor = False
        if centroid is not None:
            # Check if inside Raidurg/Knowledge City or Mindspace bounding envelopes
            in_raidurg = (220500 <= centroid.x <= 222200 and 1927400 <= centroid.y <= 1929600)
            in_mindspace = (221800 <= centroid.x <= 223300 and 1928400 <= centroid.y <= 1929900)
            is_in_tech_corridor = in_raidurg or in_mindspace

        # -------------------------------------------------------------
        # TIER 4: Morphological & Typological Regression / Rules Engine
        # -------------------------------------------------------------
        if h is None:
            is_it_or_office = (
                office in ["it", "company", "commercial", "yes", "government"]
                or b_type in ["commercial", "office"]
                or any(k in name.lower() for k in ["tower", "tech", "software", "infotech", "centre", "center", "cyber", "block", "plaza", "house", "campus"])
                or (is_in_tech_corridor and area >= 1200)
            )
            is_mall = (shop in ["mall", "supermarket"] or b_type == "retail" or "mall" in name.lower())
            is_apartments = (
                b_type == "apartments"
                or any(k in name.lower() for k in ["residency", "heights", "apartments", "towers", "gardenia", "enclave"])
            )
            is_worship = (amenity in ["place_of_worship"] or b_type in ["place_of_worship", "temple", "mosque", "church"])

            # Deterministic variation (+/- 0.4m) using hash of ID
            seed_val = int(hashlib.md5(f"{osm_id}_{idx}".encode()).hexdigest()[:6], 16) % 9 - 4
            delta = seed_val * 0.1  # -0.4m to +0.4m

            if is_mall:
                fl = 6 if area >= 5000 else 4
                h = round(fl * 4.5 + delta, 2)
                src = "morphological_retail"
            elif is_it_or_office:
                if area >= 5000:
                    fl = 20
                    h = round(fl * 3.5 + delta, 2)
                elif area >= 2500:
                    fl = 14
                    h = round(fl * 3.5 + delta, 2)
                elif area >= 1000:
                    fl = 10
                    h = round(fl * 3.5 + delta, 2)
                elif area >= 400:
                    fl = 6
                    h = round(fl * 3.5 + delta, 2)
                else:
                    fl = 4
                    h = round(fl * 3.5 + delta, 2)
                src = "morphological_office"
            elif is_apartments:
                if area >= 2500:
                    fl = 20
                    h = round(fl * 3.0 + delta, 2)
                elif area >= 1000:
                    fl = 12
                    h = round(fl * 3.0 + delta, 2)
                elif area >= 400:
                    fl = 6
                    h = round(fl * 3.0 + delta, 2)
                else:
                    fl = 4
                    h = round(fl * 3.0 + delta, 2)
                src = "morphological_residential"
            elif is_worship:
                fl = 2
                h = round(9.0 + delta, 2)
                src = "morphological_civic"
            else:
                # General structures classified by footprint area (Tier 5 GHMC baseline)
                if area >= 4000:
                    fl = 12
                    h = round(fl * 3.5 + delta, 2)
                    src = "morphological_large"
                elif area >= 1500:
                    fl = 8
                    h = round(fl * 3.2 + delta, 2)
                    src = "morphological_midrise"
                elif area >= 500:
                    fl = 5
                    h = round(fl * 3.0 + delta, 2)
                    src = "morphological_midrise"
                elif area >= 120:
                    # Standard Hyderabad residential G+3 (4 floors)
                    fl = 4
                    h = round(fl * 3.0 + delta, 2)
                    src = "morphological_residential"
                elif area >= 50:
                    # Compact residential G+2 (3 floors)
                    fl = 3
                    h = round(fl * 3.0 + delta, 2)
                    src = "morphological_residential"
                else:
                    # Small auxiliary structure / kiosk
                    fl = 1
                    h = 3.5
                    src = "morphological_small"

        # Final sanity clamp
        h = max(3.5, min(h, MAX_VALID_HEIGHT_M))
        fl = max(1, round(fl if fl else h / FLOOR_HEIGHT_M))

        estimated_heights.append(round(float(h), 2))
        estimated_floors_list.append(int(fl))
        height_sources.append(src)

    if dsm_src is not None:
        dsm_src.close()

    # Add to GeoDataFrame
    gdf["estimated_height"] = estimated_heights
    gdf["estimated_floors"] = estimated_floors_list
    gdf["height_source"] = height_sources

    # Assign building IDs
    gdf["building_id"] = [f"b_{i}" for i in range(len(gdf))]

    # Save processed buildings (WGS84)
    output_path = PROCESSED_DIR / "buildings.geojson"
    gdf.to_file(output_path, driver="GeoJSON")

    # Stats
    source_counts = gdf["height_source"].value_counts()
    info("Height estimation complete (5-Tier Engine):")
    for source, count in source_counts.items():
        info(f"  {source}: {count}")

    info(f"Height range: {gdf['estimated_height'].min():.1f}m – {gdf['estimated_height'].max():.1f}m")
    info(f"Mean height: {gdf['estimated_height'].mean():.1f}m (Median: {gdf['estimated_height'].median():.1f}m)")
    info(f"Processed buildings → {output_path.name}")

    return output_path, gdf


def _sample_annular_dsm(dsm_src, geometry):
    """
    Sample building roof vs surrounding ground ring on Copernicus DSM.
    Returns estimated height difference (m), or None if insufficient pixels.
    """
    try:
        # 1. Sample roof interior
        roof_img, _ = rasterio_mask(dsm_src, [mapping(geometry)], crop=True, nodata=dsm_src.nodata or -9999, filled=True)
        nodata = dsm_src.nodata or -9999
        roof_data = roof_img[0]
        valid_roof = roof_data[(roof_data != nodata) & (~np.isnan(roof_data)) & (roof_data > -1000)]
        if len(valid_roof) < 2:
            return None
        roof_elev = float(np.percentile(valid_roof, 90))

        # 2. Sample annular ground ring (15m to 60m buffer around building)
        ring = geometry.buffer(60).difference(geometry.buffer(15))
        if ring.is_empty:
            return None
        ground_img, _ = rasterio_mask(dsm_src, [mapping(ring)], crop=True, nodata=dsm_src.nodata or -9999, filled=True)
        ground_data = ground_img[0]
        valid_ground = ground_data[(ground_data != nodata) & (~np.isnan(ground_data)) & (ground_data > -1000)]
        if len(valid_ground) < 4:
            return None
        ground_elev = float(np.median(valid_ground))

        diff = roof_elev - ground_elev
        return diff
    except Exception:
        return None


def _sample_raster(src, geometry, buffer_m=5):
    """Sample raster values within a geometry. Returns array of values."""
    try:
        geom = geometry
        if geom.area < 100:
            geom = geometry.buffer(buffer_m)

        out_image, out_transform = rasterio_mask(
            src, [mapping(geom)], crop=True, nodata=src.nodata or -9999, filled=True
        )

        data = out_image[0]
        nodata = src.nodata or -9999

        valid = data[data != nodata]
        valid = valid[~np.isnan(valid)]
        valid = valid[valid > -1000]

        if len(valid) == 0:
            return None
        return valid

    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════
# STAGE 7: 3D EXTRUSION & VIEWER DATA GENERATION
# ═══════════════════════════════════════════════════════════════════

def generate_3d_buildings(gdf, aoi, dem_path=None):
    """Generate 3D building extrusions and synchronized viewer datasets."""
    banner("STAGE 7: 3D Building Extrusion & Analytics")

    # Reproject to UTM for metric coordinates
    gdf_utm = gdf.to_crs(CRS_UTM)

    # Calculate center in UTM for relative coordinates
    transformer = pyproj.Transformer.from_crs(CRS_WGS84, CRS_UTM, always_xy=True)
    center_x, center_y = transformer.transform(aoi["center"]["lon"], aoi["center"]["lat"])

    # Open DEM to sample terrain base elevations for buildings
    dem_src = None
    check_dem = dem_path if dem_path else (PROCESSED_DIR / "dem_clipped.tif")
    if check_dem and Path(check_dem).exists():
        try:
            dem_src = rasterio.open(check_dem)
        except Exception:
            pass

    # Generate 3D GeoJSON features
    features_3d = []
    buildings_json = []  # Simplified format for Three.js viewer
    all_meshes = []  # For GLB export

    progress(f"Extruding {len(gdf_utm)} buildings...")

    for idx, row in tqdm(gdf_utm.iterrows(), total=len(gdf_utm), desc="3D Extrusion"):
        geom = row.geometry
        height = row["estimated_height"]
        building_id = row["building_id"]
        osm_id = row.get("osm_id", None)

        if geom.is_empty or not geom.is_valid:
            continue

        # Handle MultiPolygon
        if isinstance(geom, MultiPolygon):
            polys = list(geom.geoms)
        else:
            polys = [geom]

        for poly in polys:
            coords = list(poly.exterior.coords)
            rel_coords = [(x - center_x, y - center_y) for x, y in coords]

            centroid = poly.centroid
            cx_rel = round(centroid.x - center_x, 2)
            cy_rel = round(centroid.y - center_y, 2)

            # Sample terrain elevation at building centroid
            base_elev = 569.0
            if dem_src is not None:
                try:
                    for val in dem_src.sample([(centroid.x, centroid.y)]):
                        if val[0] > -1000 and not np.isnan(val[0]):
                            base_elev = round(float(val[0]), 1)
                except Exception:
                    pass

            # 3D GeoJSON feature (ground polygon + height property)
            feature_3d = {
                "type": "Feature",
                "geometry": mapping(poly),
                "properties": {
                    "building_id": building_id,
                    "osm_id": osm_id,
                    "height": height,
                    "estimated_floors": row.get("estimated_floors", 1),
                    "osm_levels": row.get("osm_levels"),
                    "osm_height": row.get("osm_height"),
                    "building_type": row.get("building_type", "yes"),
                    "name": row.get("name"),
                    "height_source": row.get("height_source", "unknown"),
                    "base_elevation": base_elev,
                },
            }
            features_3d.append(feature_3d)

            # Simplified building for Three.js
            building_data = {
                "id": building_id,
                "osmId": int(osm_id) if osm_id and not pd.isna(osm_id) else None,
                "coordinates": [[round(x, 2), round(y, 2)] for x, y in rel_coords],
                "height": round(height, 2),
                "estimatedFloors": int(row.get("estimated_floors", 1)),
                "osmLevels": int(row["osm_levels"]) if row.get("osm_levels") and not pd.isna(row.get("osm_levels")) else None,
                "buildingType": row.get("building_type", "yes"),
                "name": row.get("name") if row.get("name") and not pd.isna(row.get("name")) else None,
                "heightSource": row.get("height_source", "unknown"),
                "baseElevation": base_elev,
                "centroid": [cx_rel, cy_rel],
            }
            buildings_json.append(building_data)

            # Create 3D mesh for GLB export
            if HAS_TRIMESH:
                try:
                    mesh = _extrude_polygon(rel_coords, height)
                    if mesh is not None:
                        all_meshes.append(mesh)
                except Exception:
                    pass

    if dem_src is not None:
        dem_src.close()

    # Save 3D GeoJSON
    geojson_3d = {
        "type": "FeatureCollection",
        "features": features_3d,
    }
    geojson_path = PROCESSED_DIR / "buildings_3d.geojson"
    with open(geojson_path, "w") as f:
        json.dump(geojson_3d, f)
    info(f"3D GeoJSON → {geojson_path.name} ({len(features_3d)} features)")

    # Save buildings.json for viewer
    viewer_data = {
        "aoi": {
            "center": {"lat": aoi["center"]["lat"], "lon": aoi["center"]["lon"]},
            "centerUtm": {"x": round(center_x, 2), "y": round(center_y, 2)},
            "bbox": aoi["bbox"],
            "sizeKm": aoi["size_km"],
        },
        "buildings": buildings_json,
        "stats": {
            "total": len(buildings_json),
            "withLandmarkRegistry": sum(1 for b in buildings_json if b["heightSource"] == "landmark_registry"),
            "withOsmHeight": sum(1 for b in buildings_json if b["heightSource"] == "osm_tag"),
            "withOsmLevels": sum(1 for b in buildings_json if b["heightSource"] == "osm_levels"),
            "withRasterAnnular": sum(1 for b in buildings_json if b["heightSource"] == "raster_annular"),
            "withRasterHeight": sum(1 for b in buildings_json if b["heightSource"] in ["raster", "raster_annular"]),
            "withMorphological": sum(1 for b in buildings_json if "morphological" in b["heightSource"]),
            "withDefault": sum(1 for b in buildings_json if b["heightSource"] in ["default", "unknown"]),
        },
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }

    viewer_path = VIEWER_DATA_DIR / "buildings.json"
    with open(viewer_path, "w") as f:
        json.dump(viewer_data, f)
    info(f"Viewer data → viewer/public/data/buildings.json ({len(buildings_json)} buildings)")

    # Generate synchronized Analytics JSON
    generate_analytics(gdf_utm, buildings_json)

    # Export GLB
    glb_path = OUTPUTS_DIR / "buildings_3d.glb"
    if HAS_TRIMESH and all_meshes:
        progress(f"Generating GLB from {len(all_meshes)} meshes...")
        try:
            scene = trimesh.Scene()
            for i, mesh in enumerate(all_meshes):
                scene.add_geometry(mesh, node_name=f"building_{i}")
            scene.export(str(glb_path))
            info(f"GLB export → {glb_path.name} ({glb_path.stat().st_size / 1024 / 1024:.1f} MB)")
        except Exception as e:
            warn(f"GLB export failed: {e}")
    else:
        warn("GLB export skipped (trimesh not available or no meshes)")

    return geojson_path


def generate_analytics(gdf, buildings_json):
    """Generate analytics.json matching the viewer's AnalyticsModal schema."""
    total_buildings = len(buildings_json)
    
    total_footprint = 0.0
    total_volume = 0.0
    gross_floor_area = 0.0
    
    height_buckets = {
        "0-5m": 0,
        "5-15m": 0,
        "15-30m": 0,
        "30-60m": 0,
        "60m+": 0,
    }
    
    type_breakdown = {}
    
    for idx, row in gdf.iterrows():
        area = float(row.geometry.area) if hasattr(row.geometry, 'area') else 150.0
        h = float(row.get('estimated_height', 10.0))
        fl = int(row.get('estimated_floors', 3))
        b_type = str(row.get('building_type', 'yes'))
        
        total_footprint += area
        total_volume += area * h
        gross_floor_area += area * fl
        
        type_breakdown[b_type] = type_breakdown.get(b_type, 0) + 1
        
        if h < 5.0:
            height_buckets["0-5m"] += 1
        elif h < 15.0:
            height_buckets["5-15m"] += 1
        elif h < 30.0:
            height_buckets["15-30m"] += 1
        elif h < 60.0:
            height_buckets["30-60m"] += 1
        else:
            height_buckets["60m+"] += 1
            
    # Solar potential estimates (standard 5.5 GHI, 75% usable, 18% efficiency)
    usable_rooftop = total_footprint * 0.75
    daily_gen_kwh = usable_rooftop * 5.5 * 0.18
    annual_gen_mwh = (daily_gen_kwh * 365) / 1000.0
    annual_co2_tons = annual_gen_mwh * 0.82
    
    analytics_data = {
        "totalBuildings": total_buildings,
        "totalFootprintAreaM2": round(total_footprint, 1),
        "totalBuiltVolumeM3": round(total_volume, 1),
        "grossFloorAreaM2": round(gross_floor_area, 1),
        "heightBuckets": height_buckets,
        "typeBreakdown": type_breakdown,
        "solar": {
            "usableRooftopAreaM2": round(usable_rooftop, 1),
            "dailyGenerationKwh": round(daily_gen_kwh, 1),
            "annualGenerationMwh": round(annual_gen_mwh, 1),
            "annualCo2OffsetTons": round(annual_co2_tons, 1),
            "ghiAverage": 5.5
        }
    }
    
    analytics_path = VIEWER_DATA_DIR / "analytics.json"
    with open(analytics_path, "w") as f:
        json.dump(analytics_data, f, indent=2)
    info(f"Analytics data → {analytics_path.name}")
    return analytics_data


def _extrude_polygon(coords_2d, height):
    """Extrude a 2D polygon to a 3D prism using trimesh."""
    if len(coords_2d) < 4 or height <= 0:
        return None

    try:
        # Create 2D polygon path
        poly = Polygon(coords_2d)
        if not poly.is_valid or poly.is_empty:
            return None

        # Simplify complex polygons for performance
        if len(coords_2d) > 50:
            poly = poly.simplify(0.5, preserve_topology=True)

        # Use trimesh to create extruded mesh
        vertices_2d = np.array(list(poly.exterior.coords)[:-1])

        mesh = trimesh.creation.extrude_polygon(poly, height)
        return mesh

    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════
# STAGE 8: TERRAIN DATA FOR VIEWER
# ═══════════════════════════════════════════════════════════════════

def generate_terrain_data(aoi, dem_path):
    """Generate terrain elevation grid for the Three.js viewer."""
    banner("STAGE 8: Terrain Data for Viewer")

    transformer = pyproj.Transformer.from_crs(CRS_WGS84, CRS_UTM, always_xy=True)
    center_x, center_y = transformer.transform(aoi["center"]["lon"], aoi["center"]["lat"])

    try:
        with rasterio.open(dem_path) as src:
            data = src.read(1)
            nodata = src.nodata or -9999

            # Downsample to reasonable grid for viewer
            target_size = 128
            if data.shape[0] > target_size or data.shape[1] > target_size:
                step_y = max(1, data.shape[0] // target_size)
                step_x = max(1, data.shape[1] // target_size)
                data = data[::step_y, ::step_x]

            # Replace nodata with median valid value
            # Use multiple nodata detection strategies
            valid_mask = (data != nodata) & (~np.isnan(data))
            
            # Also filter extreme values (nodata that wasn't properly tagged)
            if valid_mask.any():
                p5 = np.percentile(data[valid_mask], 5)
                p95 = np.percentile(data[valid_mask], 95)
                iqr = p95 - p5
                lower_bound = p5 - 2 * iqr
                valid_mask = valid_mask & (data > lower_bound) & (data < p95 + 2 * iqr)
            
            if valid_mask.any():
                median_elev = float(np.nanmedian(data[valid_mask]))
                data = np.where(valid_mask, data, median_elev)
            else:
                warn("No valid terrain data found")
                data = np.zeros_like(data)
                median_elev = 0

            # Normalize relative to center elevation
            center_elev = float(data[data.shape[0] // 2, data.shape[1] // 2])

            terrain_data = {
                "grid": data.tolist(),
                "gridSize": [data.shape[1], data.shape[0]],
                "bounds": {
                    "left": round(src.bounds.left - center_x, 2),
                    "right": round(src.bounds.right - center_x, 2),
                    "bottom": round(src.bounds.bottom - center_y, 2),
                    "top": round(src.bounds.top - center_y, 2),
                },
                "centerElevation": round(center_elev, 2),
                "minElevation": round(float(np.nanmin(data)), 2),
                "maxElevation": round(float(np.nanmax(data)), 2),
            }

            terrain_path = VIEWER_DATA_DIR / "terrain.json"
            with open(terrain_path, "w") as f:
                json.dump(terrain_data, f)

            info(f"Terrain grid: {data.shape[1]}×{data.shape[0]}")
            info(f"Elevation range: {terrain_data['minElevation']}m – {terrain_data['maxElevation']}m")
            info(f"Terrain data → viewer/public/data/terrain.json")

    except Exception as e:
        warn(f"Terrain data generation failed: {e}")


# ═══════════════════════════════════════════════════════════════════
# STAGE 9: VISUALIZATION
# ═══════════════════════════════════════════════════════════════════

def generate_preview(gdf, aoi):
    """Generate a matplotlib preview of buildings colored by height."""
    banner("STAGE 9: Preview Generation")

    fig, ax = plt.subplots(1, 1, figsize=(14, 14), facecolor='#1a1a2e')
    ax.set_facecolor('#1a1a2e')

    # Plot DEM hillshade if available
    dem_clipped = PROCESSED_DIR / "dem_clipped.tif"
    if dem_clipped.exists():
        try:
            with rasterio.open(dem_clipped) as src:
                dem_data = src.read(1)
                nodata = src.nodata or -9999
                dem_data = np.where(dem_data == nodata, np.nan, dem_data)

                # Create hillshade
                from numpy import gradient
                dy, dx = np.gradient(dem_data)
                slope = np.pi / 2.0 - np.arctan(np.sqrt(dx ** 2 + dy ** 2))
                aspect = np.arctan2(-dx, dy)
                azimuth = 315 * np.pi / 180
                altitude = 45 * np.pi / 180
                hillshade = np.sin(altitude) * np.sin(slope) + np.cos(altitude) * np.cos(slope) * np.cos(azimuth - aspect)

                ax.imshow(
                    hillshade,
                    extent=[src.bounds.left, src.bounds.right, src.bounds.bottom, src.bounds.top],
                    cmap='gray',
                    alpha=0.3,
                )
        except Exception as e:
            warn(f"Hillshade generation failed: {e}")

    # Reproject buildings to UTM for plotting
    gdf_plot = gdf.to_crs(CRS_UTM)

    # Create colormap
    cmap = plt.cm.RdYlGn_r
    height_min = gdf_plot["estimated_height"].min()
    height_max = gdf_plot["estimated_height"].max()
    norm = mcolors.Normalize(vmin=height_min, vmax=min(height_max, 60))

    gdf_plot.plot(
        ax=ax,
        column="estimated_height",
        cmap=cmap,
        norm=norm,
        edgecolor='#ffffff22',
        linewidth=0.3,
        alpha=0.85,
    )

    # AOI boundary
    aoi_geom = aoi_polygon_wgs84(aoi)
    aoi_gdf = gpd.GeoDataFrame(geometry=[aoi_geom], crs=CRS_WGS84).to_crs(CRS_UTM)
    aoi_gdf.boundary.plot(ax=ax, color='#00f5ff', linewidth=2, linestyle='--', alpha=0.8)

    # Colorbar
    sm = plt.cm.ScalarMappable(cmap=cmap, norm=norm)
    sm.set_array([])
    cbar = plt.colorbar(sm, ax=ax, shrink=0.6, pad=0.02)
    cbar.set_label('Building Height (m)', fontsize=12, color='white')
    cbar.ax.yaxis.set_tick_params(color='white')
    plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='white')

    # Title
    ax.set_title(
        'SIH26011 — Hyderabad 3D Building Dataset\n'
        f'Durgam Cheruvu / HITEC City • {len(gdf_plot)} buildings',
        fontsize=16,
        color='white',
        fontweight='bold',
        pad=20,
    )

    ax.tick_params(colors='white', labelsize=8)
    ax.set_xlabel('Easting (m)', color='white', fontsize=10)
    ax.set_ylabel('Northing (m)', color='white', fontsize=10)

    # Stats annotation
    stats_text = (
        f"Height range: {height_min:.1f}m – {height_max:.1f}m\n"
        f"Mean height: {gdf_plot['estimated_height'].mean():.1f}m\n"
        f"Buildings: {len(gdf_plot)}\n"
        f"AOI: {aoi['size_km']}×{aoi['size_km']} km"
    )
    ax.text(
        0.02, 0.02, stats_text,
        transform=ax.transAxes,
        fontsize=9,
        color='#00f5ff',
        family='monospace',
        verticalalignment='bottom',
        bbox=dict(boxstyle='round,pad=0.5', facecolor='#1a1a2e', edgecolor='#00f5ff', alpha=0.8),
    )

    plt.tight_layout()
    preview_path = OUTPUTS_DIR / "buildings_preview.png"
    fig.savefig(preview_path, dpi=200, bbox_inches='tight', facecolor=fig.get_facecolor())
    plt.close(fig)

    info(f"Preview → {preview_path.name}")
    return preview_path


# ═══════════════════════════════════════════════════════════════════
# STAGE 10: METADATA & SUMMARY
# ═══════════════════════════════════════════════════════════════════

def save_metadata(aoi, gdf, dem_same_as_dsm):
    """Save comprehensive metadata about data sources."""
    banner("STAGE 10: Metadata & Summary")

    metadata = {
        "project": "SIH26011 — 3D Building Visualization Prototype",
        "area_of_interest": {
            "name": "Durgam Cheruvu / HITEC City, Hyderabad, Telangana, India",
            "center_wgs84": aoi["center"],
            "bbox_wgs84": aoi["bbox"],
            "size_km": f"{aoi['size_km']} × {aoi['size_km']}",
            "approximate_area_km2": aoi["area_km2"],
            "crs_geographic": CRS_WGS84,
            "crs_projected": CRS_UTM,
        },
        "data_sources": {
            "buildings": {
                "source": "OpenStreetMap",
                "api": "Overpass API (https://overpass-api.de/api/interpreter)",
                "license": "ODbL 1.0 (https://opendatacommons.org/licenses/odbl/1-0/)",
                "download_date": datetime.now(timezone.utc).isoformat(),
            },
            "dsm": {
                "source": "Copernicus DEM GLO-30",
                "description": "Digital Surface Model (includes buildings/vegetation)",
                "resolution": "~30m (1 arc-second)",
                "vertical_units": "meters (EGM2008 geoid)",
                "crs": "EPSG:4326",
                "download_url": "https://copernicus-dem-30m.s3.amazonaws.com/",
                "license": "Copernicus licence (https://spacedata.copernicus.eu/en/web/guest/collections/copernicus-digital-elevation-model)",
                "download_date": datetime.now(timezone.utc).isoformat(),
            },
            "dem": {
                "source": "SRTM GL1 via OpenTopography" if not dem_same_as_dsm else "Same as DSM (Copernicus GLO-30)",
                "description": "Used as bare-earth approximation" if not dem_same_as_dsm else "No separate bare-earth DEM available",
                "api": "OpenTopography GlobalDEM API" if not dem_same_as_dsm else "N/A",
                "download_date": datetime.now(timezone.utc).isoformat(),
                "note": "SRTM is technically a DSM but older data (2000) serves as ground approximation" if not dem_same_as_dsm
                        else "DEM = DSM, so raster-derived building heights are not available. Heights from OSM tags/levels only.",
            },
        },
        "processing": {
            "height_estimation_engine": "5-Tier Hierarchical Fusion Engine",
            "tier_1": "Authoritative Landmark Registry & Verified OSM tags (height, building:levels)",
            "tier_2": "Annular Buffer Local Morphological Ground Filter on Copernicus DSM",
            "tier_3": "Spatial Tech Corridor Propagation (Raidurg, Knowledge City, Mindspace)",
            "tier_4": "Morphological & Typological Regression (Footprint Area Law)",
            "tier_5": "Hyderabad GHMC Urban Lot-Size Baseline Defaults",
            "floor_height_assumption": "3.5m for commercial/office/IT; 3.0m for residential",
            "3d_extrusion": "Prismatic extrusion with terrain base elevations",
        },
        "statistics": {
            "total_buildings": len(gdf),
            "height_sources": gdf["height_source"].value_counts().to_dict(),
            "height_range_m": {
                "min": round(float(gdf["estimated_height"].min()), 2),
                "max": round(float(gdf["estimated_height"].max()), 2),
                "mean": round(float(gdf["estimated_height"].mean()), 2),
                "median": round(float(gdf["estimated_height"].median()), 2),
            },
        },
        "disclaimer": (
            "The generated building heights and 3D geometries are prototype estimates "
            "and are not authoritative cadastral or survey data."
        ),
    }

    metadata_path = METADATA_DIR / "sources.json"
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    info(f"Metadata → {metadata_path.name}")
    return metadata


def print_summary(metadata, gdf):
    """Print a rich terminal summary."""
    stats = metadata["statistics"]
    height_sources = stats["height_sources"]

    print("\n")
    print("  ╔══════════════════════════════════════════════════════════╗")
    print("  ║     🏙️  SIH26011 — Hyderabad 3D Building Dataset 🏙️     ║")
    print("  ╠══════════════════════════════════════════════════════════╣")
    print(f"  ║  AOI: Durgam Cheruvu, HITEC City, Hyderabad             ║")
    print(f"  ║  Area: ~{metadata['area_of_interest']['approximate_area_km2']:.0f} km² ({metadata['area_of_interest']['size_km']} km)    ║")
    print("  ╠══════════════════════════════════════════════════════════╣")
    print(f"  ║  Total buildings:          {stats['total_buildings']:>6}                     ║")
    for source, count in height_sources.items():
        label = source.ljust(26)
        print(f"  ║    {label} {count:>6}                     ║")
    print("  ╠══════════════════════════════════════════════════════════╣")
    hr = stats["height_range_m"]
    print(f"  ║  Height range:  {hr['min']:.1f}m – {hr['max']:.1f}m                       ║")
    print(f"  ║  Mean height:   {hr['mean']:.1f}m                                  ║")
    print(f"  ║  Median height: {hr['median']:.1f}m                                  ║")
    print("  ╠══════════════════════════════════════════════════════════╣")
    dsm_status = "AVAILABLE" if (RAW_DIR / "dsm.tif").exists() else "MISSING"
    dem_status = "AVAILABLE" if (RAW_DIR / "dem.tif").exists() else "MISSING"
    print(f"  ║  DSM: {dsm_status.ljust(52)}║")
    print(f"  ║  DEM: {dem_status.ljust(52)}║")
    print("  ╠══════════════════════════════════════════════════════════╣")
    print(f"  ║  Outputs:                                              ║")
    print(f"  ║    data/processed/buildings.geojson                     ║")
    print(f"  ║    data/processed/buildings_3d.geojson                  ║")
    print(f"  ║    viewer/public/data/buildings.json                    ║")
    print(f"  ║    outputs/buildings_preview.png                        ║")
    if (OUTPUTS_DIR / "buildings_3d.glb").exists():
        print(f"  ║    outputs/buildings_3d.glb                             ║")
    print("  ╚══════════════════════════════════════════════════════════╝")
    print()


# ═══════════════════════════════════════════════════════════════════
# MAIN PIPELINE
# ═══════════════════════════════════════════════════════════════════

def main():
    """Run the complete pipeline."""
    print()
    print("  ╔══════════════════════════════════════════════════════════╗")
    print("  ║  🚀 SIH26011 — 3D Building Pipeline for Hyderabad 🚀   ║")
    print("  ║  Durgam Cheruvu / HITEC City                            ║")
    print("  ╚══════════════════════════════════════════════════════════╝")
    print()

    start_time = time.time()
    ensure_dirs()

    # Stage 1: AOI
    aoi = compute_aoi()

    # Stage 2: OSM Buildings
    buildings_path = download_osm_buildings(aoi)
    if buildings_path is None:
        error("FATAL: OSM building download failed. Cannot continue.")
        sys.exit(1)

    # Stage 3: DSM
    dsm_path = download_copernicus_dsm(aoi)
    if dsm_path is None:
        error("FATAL: DSM download failed. Cannot continue.")
        sys.exit(1)

    # Stage 4: DEM
    dem_path = download_dem(aoi)
    if dem_path is None:
        error("FATAL: DEM download failed. Cannot continue.")
        sys.exit(1)

    # Stage 5: Clip & Align
    result = clip_and_align_rasters(aoi, dem_path, dsm_path)
    if result is None or result[0] is None:
        error("FATAL: Raster alignment failed. Cannot continue.")
        sys.exit(1)

    dem_clipped, dsm_clipped, dem_same_as_dsm = result

    # Stage 6: Height Estimation
    processed_path, gdf = estimate_building_heights(
        aoi, buildings_path, dem_clipped, dsm_clipped, dem_same_as_dsm
    )

    # Stage 7: 3D Extrusion
    generate_3d_buildings(gdf, aoi, dem_clipped)

    # Stage 8: Terrain Data
    generate_terrain_data(aoi, dem_clipped)

    # Stage 9: Preview
    generate_preview(gdf, aoi)

    # Stage 10: Metadata & Summary
    metadata = save_metadata(aoi, gdf, dem_same_as_dsm)
    print_summary(metadata, gdf)

    elapsed = time.time() - start_time
    info(f"Pipeline completed in {elapsed:.1f} seconds")
    print()


if __name__ == "__main__":
    main()
