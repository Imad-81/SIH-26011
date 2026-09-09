# SIH26011 — 3D Building Visualization Pipeline

> **Smart India Hackathon 2026** | Team: Power Rangers

Interactive 3D building visualization prototype for **Durgam Cheruvu / HITEC City, Hyderabad, Telangana, India**.

---

## 🏙️ Overview

This project implements a complete geospatial data pipeline that:

1. **Downloads** building footprints from OpenStreetMap
2. **Acquires** Digital Elevation Model (DEM) and Digital Surface Model (DSM) rasters
3. **Estimates** building heights using `DSM - DEM` zonal statistics
4. **Extrudes** 2D footprints into 3D prismatic buildings
5. **Visualizes** the result in an interactive **Next.js + Three.js** web viewer

```
OSM Buildings + DEM + DSM → Height Estimation → 3D Extrusion → Interactive Viewer
```

---

## 📍 Area of Interest

| Parameter | Value |
|-----------|-------|
| **Location** | Durgam Cheruvu / HITEC City, Hyderabad |
| **Center** | 17.4239°N, 78.3812°E |
| **Size** | 3 km × 3 km (~9 km²) |
| **Geographic CRS** | EPSG:4326 (WGS84) |
| **Projected CRS** | EPSG:32644 (UTM Zone 44N) |

### Why Durgam Cheruvu?

- Dense urban area with mix of commercial and residential buildings
- IT hub (HITEC City) with varying building heights
- Good OSM coverage
- Natural landmark (Durgam Cheruvu lake)

---

## 📦 Data Sources

| Dataset | Source | Resolution | License |
|---------|--------|------------|---------|
| **Buildings** | OpenStreetMap (Overpass API) | Vector | ODbL 1.0 |
| **DSM** | Copernicus DEM GLO-30 (AWS S3) | ~30m | Copernicus |
| **DEM** | SRTM GL1 (OpenTopography API) | ~30m | Public Domain |

---

## 🏗️ Architecture

```
sih_power_rangers/
├── scripts/
│   ├── pipeline.py          # Master autonomous geospatial pipeline
│   └── build_roads.py       # 3D Road Network, Multi-Tier Flyovers & Piers Generator
├── viewer/                   # Next.js 16 + React 19 + Three.js web application
│   ├── src/
│   │   ├── app/              # Next.js app router
│   │   ├── components/       # 3D Canvas and UI components (R3F, BatchedMesh)
│   │   ├── hooks/            # Data loading & telemetry hooks
│   │   └── lib/              # Spatial indexing, colors, types, coordinate helpers
│   └── public/data/          # Synchronized datasets consumed by viewer
├── data/
│   ├── raw/                  # Downloaded OSM, DEM, DSM rasters and vectors
│   ├── processed/            # Clipped rasters and 3D GeoJSON
│   └── metadata/             # Landmarks registry and provenance metadata
└── outputs/                  # High-res preview maps and GLB models
```

---

## 🚀 Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm

### 1. Run the Data Pipeline

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Run the pipeline for Hyderabad (default 3km × 3km)
python scripts/pipeline.py --city hyderabad

# Or run with custom city preset or coordinates
python scripts/pipeline.py --city mumbai --size 5.0
python scripts/pipeline.py --lat 17.4370 --lon 78.3800 --size 3.0

# Force re-download of raw rasters and OSM data
python scripts/pipeline.py --force-download
```

### 2. Start the 3D Viewer

```bash
cd viewer
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📐 5-Tier Hierarchical Height Estimation Engine

Building heights are accurately inferred using a hierarchical fusion pipeline:

1. **Tier 1: Authoritative Registry & Verified Tags**
   - Authoritative landmark registry with 130+ verified skyscraper heights (e.g., Wells Fargo, Raheja Mindspace, Phoenix VK Towers) and regex matching.
   - Ground-truth OSM explicit `height` and `building:levels` tags.
2. **Tier 2: Physical nDSM Ground Differential & Annular Sampling**
   - Normalized Digital Surface Model (`nDSM = DSM - DEM`) sampling over roof footprints.
   - Annular ground-ring filtering on Copernicus GLO-30 DSM to isolate structure height against local terrain.
3. **Tier 3: Landuse Zoning & Spatial High-Rise Corridors**
   - OSM landuse zoning polygons (commercial, IT park, residential, retail).
   - High-rise corridor multipliers for financial districts and tech campuses.
4. **Tier 3.5: Campus & Complex Height Propagation**
   - `scipy.spatial.cKDTree` spatial clustering: propagates authoritative heights across campus sibling towers.
5. **Tier 4: Morphological Regression**
   - Footprint area scaling law, aspect ratio, and building classification heuristics (commercial, IT, residential, academic, civic, parking).
6. **Tier 5: Urban Lot Baseline Defaults**
   - Municipal baseline defaults for unclassified structures.

---

## 🎮 Viewer Features & Controls

| Feature | Description |
|---------|-------------|
| **Orbit / Pan / Zoom** | Left-click + drag to orbit, right-click to pan, scroll wheel to zoom |
| **Building Inspection** | Click any building to focus camera, view estimated height, floors, and solar potential |
| **Drone Camera Tour** | Guided cinematic drone flight across key Hyderabad landmarks |
| **Camera Presets** | Instant fly-to buttons for Financial District, HITEC City, Cable Bridge, etc. |
| **Time of Day** | Real-time dynamic sun, sky, dusk/dawn glow, and night illumination with vehicle traffic |
| **Simulation Modes** | **Height** (elevation gradient), **Landuse** (typology), **Data Quality** (confidence tiers), **Flood** (interactive flood level simulation), **Solar** (photovoltaic potential) |
| **3D Infrastructure** | 230+ km multi-tier road network with elevated flyovers and concrete support columns |

---

## ⚠️ Disclaimer

> The generated building heights and 3D geometries are **prototype estimates** and are **not authoritative cadastral or survey data**. Heights are derived from satellite data, OpenStreetMap vectors, and machine inference.

---

## 📄 License

- **Code**: MIT
- **OSM Data**: ODbL 1.0
- **Copernicus DEM**: Copernicus Licence
- **SRTM**: Public Domain

---

*Built with ❤️ for SIH 2026 by Team Power Rangers*
