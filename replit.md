# Flight Tracker API

## Overview
A Node.js backend API that provides real-time flight tracking information by combining data from the OpenSky Network API with aircraft type information from a CSV database.

## Purpose
This application serves live flight data including:
- Aircraft callsign, country, position (lat/long)
- Altitude, velocity, and heading
- Aircraft type information (matched from ICAO24 codes)

## Project Architecture

### Core Components
- **Express.js Server**: REST API backend running on port 3000
- **OpenSky Network API**: External API for live flight data
- **Aircraft Database**: CSV file with ICAO24 to aircraft type mappings

### File Structure
```
.
├── index.js              # Main server application
├── package.json          # Node.js dependencies
├── aircraftdatabase.csv  # Downloaded aircraft database (auto-generated)
└── replit.md            # This file
```

### Dependencies
- `express`: Web server framework (v5.1.0)
- `node-fetch`: HTTP client for API requests (v3.3.2)
- `csv-parser`: CSV file parser (v3.2.0)

## API Endpoints

### GET /flights
Returns an array of current flights with aircraft information.

**Response Format:**
```json
[
  {
    "callsign": "UAL123",
    "country": "United States",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "altitude": 10668,
    "velocity": 250.5,
    "heading": 180,
    "type": "B738"
  }
]
```

## Recent Changes
- **2025-11-07**: Initial Replit environment setup
  - Configured server to bind to 0.0.0.0 for external accessibility
  - Added .gitignore for Node.js project (excludes node_modules, logs, CSV data)
  - Created project documentation
  - Configured VM deployment for always-on API service

## Environment Setup
- **Language**: Node.js (ES Modules)
- **Port**: 3000 (binds to 0.0.0.0 for external access)
- **Startup**: Server automatically downloads aircraft CSV if not present and loads data into memory

## Data Flow
1. On startup: Download aircraft database CSV from Dropbox (if not cached)
2. Load CSV into memory for fast lookups
3. API requests fetch live data from OpenSky Network
4. Enrich flight data with aircraft type information
5. Return combined data to client
