#!/usr/bin/env python3
"""
Unit and Integration Tests for Multi-City Dataset Directory Structure & Auto-Generated Landmarks.
Addresses Issue #14 and Issue #15.
"""

import json
import shutil
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from pipeline import (
    generate_landmarks,
    update_cities_manifest,
    sync_city_dataset,
    parse_args,
    CITY_PRESETS,
    VIEWER_DATA_DIR,
)


class TestLandmarkGeneration(unittest.TestCase):
    def setUp(self):
        self.mock_aoi = {
            "city": "hyderabad",
            "name": "Hyderabad (HITEC City)",
            "center": {"lat": 17.4370, "lon": 78.3800},
            "size_km": 3.0,
        }
        self.mock_buildings = [
            {
                "id": "b_1",
                "name": "Tower Alpha Skyscraper",
                "height": 120.0,
                "centroid": [10.0, -20.0],
                "buildingType": "commercial",
                "estimatedFloors": 35,
                "villageName": "HITEC City",
            },
            {
                "id": "b_2",
                "name": "Beta Tech Park",
                "height": 85.0,
                "centroid": [300.0, -400.0],
                "buildingType": "commercial",
                "estimatedFloors": 24,
                "villageName": "Raidurg",
            },
            {
                "id": "b_3",
                "name": "Gamma Heights",
                "height": 65.0,
                "centroid": [-500.0, 600.0],
                "buildingType": "residential",
                "estimatedFloors": 18,
                "villageName": "Kondapur",
            },
            {
                "id": "b_4",
                "name": "Delta Mall & Cinema",
                "height": 35.0,
                "centroid": [700.0, -800.0],
                "buildingType": "retail",
                "estimatedFloors": 6,
                "villageName": "Madhapur",
            },
            {
                "id": "b_5",
                "name": "Epsilon National University",
                "height": 28.0,
                "centroid": [-800.0, -200.0],
                "buildingType": "school",
                "estimatedFloors": 5,
                "villageName": "Gachibowli",
            },
            {
                "id": "b_6",
                "name": "Zeta Horizon Tower",
                "height": 95.0,
                "centroid": [-200.0, 300.0],
                "buildingType": "office",
                "estimatedFloors": 26,
                "villageName": "HITEC City",
            },
        ]
        self.temp_dir = Path(tempfile.mkdtemp())
        self.patcher = patch("pipeline.VIEWER_DATA_DIR", self.temp_dir)
        self.patcher.start()

    def tearDown(self):
        self.patcher.stop()
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_landmarks_preset_schema_and_counts(self):
        landmarks = generate_landmarks(self.mock_buildings, self.mock_aoi, city_dir=self.temp_dir)
        self.assertGreaterEqual(len(landmarks), 5)
        self.assertLessEqual(len(landmarks), 8)

        # Check file output in city_dir
        city_landmarks_path = self.temp_dir / "landmarks.json"
        self.assertTrue(city_landmarks_path.exists())
        with open(city_landmarks_path) as f:
            written_data = json.load(f)
        self.assertEqual(len(written_data), len(landmarks))

        # Check required fields and camera coordinate math
        for lm in landmarks:
            self.assertIn("id", lm)
            self.assertIn("name", lm)
            self.assertIn("category", lm)
            self.assertIn("description", lm)
            self.assertIn("pos", lm)
            self.assertIn("cameraPos", lm)
            self.assertIn("target", lm)
            self.assertIn("height", lm)
            self.assertIn("badge", lm)

            cx, h, cz = lm["pos"]
            cam_x, cam_y, cam_z = lm["cameraPos"]
            tar_x, tar_y, tar_z = lm["target"]

            # Offset checks: [cx + 100, height + 60, cz + 120]
            self.assertAlmostEqual(cam_x, cx + 100.0, places=1)
            self.assertAlmostEqual(cam_y, h + 60.0, places=1)
            self.assertAlmostEqual(cam_z, cz + 120.0, places=1)

            # Target checks: [cx, height * 0.5, cz]
            self.assertAlmostEqual(tar_x, cx, places=1)
            self.assertAlmostEqual(tar_y, h * 0.5, places=1)
            self.assertAlmostEqual(tar_z, cz, places=1)

            # Badge check: starts with building emoji and contains height
            self.assertTrue(lm["badge"].startswith("🏢"))
            self.assertIn(f"{int(round(h))}m", lm["badge"])


class TestCitiesManifestAndDirectoryStructure(unittest.TestCase):
    def setUp(self):
        self.temp_dir = Path(tempfile.mkdtemp())
        self.patcher = patch("pipeline.VIEWER_DATA_DIR", self.temp_dir)
        self.patcher.start()
        self.mock_aoi_mumbai = {
            "city": "mumbai",
            "name": "Mumbai (Bandra Kurla Complex)",
            "center": {"lat": 19.0657, "lon": 72.8687},
            "size_km": 3.0,
        }

    def tearDown(self):
        self.patcher.stop()
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_update_cities_manifest(self):
        # Test creating entry for Mumbai
        manifest = update_cities_manifest(
            city_id="mumbai",
            aoi=self.mock_aoi_mumbai,
            building_count=3250,
            default_elev=12.0,
            city_dir=self.temp_dir,
        )
        self.assertTrue(any(c["id"] == "mumbai" for c in manifest))
        mumbai_entry = next(c for c in manifest if c["id"] == "mumbai")
        self.assertEqual(mumbai_entry["state"], "Maharashtra")
        self.assertEqual(mumbai_entry["buildingCount"], 3250)
        self.assertEqual(mumbai_entry["defaultElev"], 12.0)
        self.assertEqual(mumbai_entry["sizeKm"], 3.0)
        self.assertIn("center", mumbai_entry)
        self.assertIn("generatedAt", mumbai_entry)

        # Update entry with new building count
        updated_manifest = update_cities_manifest(
            city_id="mumbai",
            aoi=self.mock_aoi_mumbai,
            building_count=3300,
            default_elev=14.0,
            city_dir=self.temp_dir,
        )
        mumbai_updated = next(c for c in updated_manifest if c["id"] == "mumbai")
        self.assertEqual(mumbai_updated["buildingCount"], 3300)
        self.assertEqual(mumbai_updated["defaultElev"], 14.0)

    def test_sync_city_dataset(self):
        city_sub = self.temp_dir / "cities" / "test_city"
        city_sub.mkdir(parents=True, exist_ok=True)
        (city_sub / "buildings.json").write_text('{"buildings": []}')
        (city_sub / "landmarks.json").write_text('[]')

        sync_city_dataset(city_sub)
        self.assertTrue((self.temp_dir / "buildings.json").exists())
        self.assertTrue((self.temp_dir / "landmarks.json").exists())


class TestCLIParsing(unittest.TestCase):
    def test_city_id_argument(self):
        with patch("sys.argv", ["pipeline.py", "--city", "mumbai", "--city-id", "mumbai_bkc"]):
            args = parse_args()
            self.assertEqual(args.city, "mumbai")
            self.assertEqual(args.city_id, "mumbai_bkc")


if __name__ == "__main__":
    unittest.main()
