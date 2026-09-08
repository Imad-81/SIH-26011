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
│   └── pipeline.py          # Python data pipeline
├── viewer/                   # Next.js + Three.js web app
│   ├── src/
│   │   ├── app/              # Next.js app router
│   │   ├── components/       # React Three Fiber components
│   │   ├── hooks/            # Data loading hooks
│   │   └── lib/              # Utilities (types, colors, geo)
│   └── public/data/          # Pipeline output consumed by viewer
├── data/
│   ├── raw/                  # Downloaded source data
│   ├── processed/            # Processed outputs
│   └── metadata/             # Data provenance
└── outputs/                  # Preview images, GLB export
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

# Create .env file with API key (optional but recommended)
echo "OPEN_TOPOGRAPHY_API=your_api_key_here" > .env

# Run the pipeline
python scripts/pipeline.py
```

### 2. Start the Viewer

```bash
cd viewer
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📐 How Building Height Is Estimated

```
building_height = median(DSM pixels inside footprint) - median(DEM pixels inside footprint)
```

- **DSM** (Digital Surface Model) — captures rooftop/canopy elevation
- **DEM** (Digital Elevation Model) — captures bare ground elevation
- **Difference** = approximate building height

### Fallback chain:
1. Raster-derived height (DSM - DEM)
2. OSM `height` tag
3. OSM `building:levels` × 3m
4. Default: 4m (single-story assumption)

### Floor estimation:
```
estimated_floors = round(height / 3.0)
```
(3m per floor is a prototype assumption only)

---

## 🎮 Viewer Controls

| Action | Control |
|--------|---------|
| **Orbit** | Left-click + drag |
| **Zoom** | Scroll wheel |
| **Pan** | Right-click + drag |
| **Select building** | Click on building |
| **Deselect** | Click on empty space |

---

## ⚠️ Disclaimer

> The generated building heights and 3D geometries are **prototype estimates** and are **not authoritative cadastral or survey data**. Heights are derived from ~30m resolution satellite data and OSM tags, which have inherent inaccuracies.

---

## 📄 License

- **Code**: MIT
- **OSM Data**: ODbL 1.0
- **Copernicus DEM**: Copernicus Licence
- **SRTM**: Public Domain

---

*Built with ❤️ for SIH 2026 by Team Power Rangers*
# SIH-26011
