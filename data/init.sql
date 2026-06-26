-- ============================================================
-- BharatSim Database Initialization
-- PostGIS Extensions for Geospatial Support
-- ============================================================

-- Core PostGIS extension for geometry/geography types
CREATE EXTENSION IF NOT EXISTS postgis;

-- Topology support for complex spatial relationships
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Fuzzy string matching for address/name searches
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- Tiger geocoder for address normalization
CREATE EXTENSION IF NOT EXISTS postgis_tiger_geocoder;

-- ============================================================
-- Additional useful extensions
-- ============================================================

-- UUID generation for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Full-text search with unaccented characters
CREATE EXTENSION IF NOT EXISTS unaccent;
