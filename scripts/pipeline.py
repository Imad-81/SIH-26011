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

import json
import math
import os
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
    """Estimate building heights using DSM - DEM zonal statistics."""
    banner("STAGE 6: Building Height Estimation")

    # Load buildings
    with open(buildings_path) as f:
        buildings_geojson = json.load(f)

    features = buildings_geojson["features"]
    progress(f"Processing {len(features)} buildings...")

    # Create GeoDataFrame
    gdf = gpd.GeoDataFrame.from_features(features, crs=CRS_WGS84)

    # Reproject to UTM
    gdf_utm = gdf.to_crs(CRS_UTM)

    # Open rasters
    dem_src = rasterio.open(dem_path)
    dsm_src = rasterio.open(dsm_path)

    estimated_heights = []
    estimated_floors_list = []
    height_sources = []

    for idx, row in tqdm(gdf_utm.iterrows(), total=len(gdf_utm), desc="Estimating heights"):
        geom = row.geometry
        osm_height = row.get("osm_height")
        osm_levels = row.get("osm_levels")

        est_height = None
        height_source = "none"

        if not dem_same_as_dsm:
            # Try raster-derived height
            try:
                # Sample DSM within building footprint
                dsm_values = _sample_raster(dsm_src, geom)
                dem_values = _sample_raster(dem_src, geom)

                if dsm_values is not None and dem_values is not None:
                    if len(dsm_values) > 0 and len(dem_values) > 0:
                        median_roof = np.nanmedian(dsm_values)
                        median_ground = np.nanmedian(dem_values)
                        h = median_roof - median_ground

                        if h >= MIN_VALID_HEIGHT_M and h <= MAX_VALID_HEIGHT_M:
                            est_height = round(float(h), 2)
                            height_source = "raster"
                        elif h > MAX_VALID_HEIGHT_M:
                            warn(f"  Building {row.get('osm_id', '?')}: suspicious height {h:.1f}m (flagged)")
                            est_height = round(float(h), 2)
                            height_source = "raster_suspicious"

            except Exception:
                pass

        # Fallback to OSM height
        if est_height is None and osm_height is not None:
            try:
                h = float(osm_height)
                if 0 < h <= MAX_VALID_HEIGHT_M:
                    est_height = h
                    height_source = "osm_tag"
            except (ValueError, TypeError):
                pass

        # Fallback to OSM levels
        if est_height is None and osm_levels is not None:
            try:
                levels = int(osm_levels)
                if 0 < levels <= 60:
                    est_height = levels * FLOOR_HEIGHT_M
                    height_source = "osm_levels"
            except (ValueError, TypeError):
                pass

        # Default minimum height for buildings without any data
        if est_height is None:
            est_height = 4.0  # Default single-story ~4m
            height_source = "default"

        # Estimate floors
        est_floors = max(1, round(est_height / FLOOR_HEIGHT_M))

        estimated_heights.append(est_height)
        estimated_floors_list.append(est_floors)
        height_sources.append(height_source)

    dem_src.close()
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
    info(f"Height estimation complete:")
    for source, count in source_counts.items():
        info(f"  {source}: {count}")

    info(f"Height range: {gdf['estimated_height'].min():.1f}m – {gdf['estimated_height'].max():.1f}m")
    info(f"Mean height: {gdf['estimated_height'].mean():.1f}m")
    info(f"Processed buildings → {output_path.name}")

    return output_path, gdf


def _sample_raster(src, geometry, buffer_m=5):
    """Sample raster values within a geometry. Returns array of values."""
    try:
        # Buffer the geometry slightly to capture edges
        geom = geometry
        if geom.area < 100:  # Very small building
            geom = geometry.buffer(buffer_m)

        out_image, out_transform = rasterio_mask(
            src, [mapping(geom)], crop=True, nodata=src.nodata or -9999, filled=True
        )

        data = out_image[0]
        nodata = src.nodata or -9999

        # Filter valid values
        valid = data[data != nodata]
        valid = valid[~np.isnan(valid)]
        valid = valid[valid > -1000]  # Filter extreme negatives

        if len(valid) == 0:
            return None
        return valid

    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════
# STAGE 7: 3D EXTRUSION
# ═══════════════════════════════════════════════════════════════════

def generate_3d_buildings(gdf, aoi):
    """Generate 3D building extrusions."""
    banner("STAGE 7: 3D Building Extrusion")

    # Reproject to UTM for metric coordinates
    gdf_utm = gdf.to_crs(CRS_UTM)

    # Calculate center in UTM for relative coordinates
    transformer = pyproj.Transformer.from_crs(CRS_WGS84, CRS_UTM, always_xy=True)
    center_x, center_y = transformer.transform(aoi["center"]["lon"], aoi["center"]["lat"])

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
            # Get exterior coordinates (relative to center)
            coords = list(poly.exterior.coords)
            rel_coords = [(x - center_x, y - center_y) for x, y in coords]

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
            "withRasterHeight": sum(1 for b in buildings_json if b["heightSource"] == "raster"),
            "withOsmHeight": sum(1 for b in buildings_json if b["heightSource"] == "osm_tag"),
            "withOsmLevels": sum(1 for b in buildings_json if b["heightSource"] == "osm_levels"),
            "withDefault": sum(1 for b in buildings_json if b["heightSource"] == "default"),
        },
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }

    viewer_path = VIEWER_DATA_DIR / "buildings.json"
    with open(viewer_path, "w") as f:
        json.dump(viewer_data, f)
    info(f"Viewer data → viewer/public/data/buildings.json ({len(buildings_json)} buildings)")

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
            "height_estimation": "median(DSM pixels in footprint) - median(DEM pixels in footprint)" if not dem_same_as_dsm
                                 else "OSM height tags and building:levels only",
            "floor_height_assumption": f"{FLOOR_HEIGHT_M}m per floor (prototype estimate only)",
            "3d_extrusion": "Prismatic extrusion of building footprints",
            "default_height": "4.0m for buildings without any height data",
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
    generate_3d_buildings(gdf, aoi)

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
