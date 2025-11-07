import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import csvParser from "csv-parser";

const app = express();
const PORT = process.env.PORT || 3000;

// Dropbox direct download link (dl=1 ensures direct download)
const CSV_URL = "https://www.dropbox.com/scl/fi/yd5szvvdb26g3z3nfzs6a/aircraftdatabase.csv?rlkey=eub7sf41he7kmf511uhfmx0kq&dl=1";
const CSV_PATH = "./aircraftdatabase.csv";

// Use a Map for faster lookups
let aircraftTypes = new Map();

// Flight data cache
let cachedFlights = [];
let lastFetch = 0; // timestamp of last OpenSky fetch
const CACHE_DURATION = 10000; // 10 seconds cache

// Download CSV from Dropbox
const downloadCSV = async () => {
  console.log("Downloading CSV from Dropbox...");
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`Failed to download CSV: ${res.statusText}`);

  const fileStream = fs.createWriteStream(CSV_PATH);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });

  console.log("CSV downloaded successfully!");
};

// Load CSV into memory
const loadCSV = () => {
  return new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csvParser())
      .on("data", (row) => {
        if (row.icao24 && row.typecode) {
          aircraftTypes.set(row.icao24.toLowerCase(), row.typecode);
        }
      })
      .on("end", () => {
        console.log(`Aircraft CSV loaded, total entries: ${aircraftTypes.size}`);
        resolve();
      })
      .on("error", reject);
  });
};

// Fetch flights from OpenSky with caching
const fetchFlights = async () => {
  // Return cached data if it's still valid
  if (Date.now() - lastFetch < CACHE_DURATION && cachedFlights.length) return cachedFlights;

  try {
    const res = await fetch("https://opensky-network.org/api/states/all");
    const data = await res.json();

    cachedFlights = data.states.map((f) => ({
      callsign: f[1]?.trim() || "",
      country: f[2] || "",
      latitude: f[6],
      longitude: f[5],
      altitude: f[7],
      velocity: f[9],
      heading: f[10],
      type: aircraftTypes.get(f[0].toLowerCase()) || "Unknown",
    }));

    lastFetch = Date.now();
    return cachedFlights;
  } catch (err) {
    console.error("Error fetching flights:", err);
    return [];
  }
};

// API endpoint
app.get("/flights", async (req, res) => {
  const flights = await fetchFlights();
  res.json(flights);
});

// Start server
app.listen(PORT, async () => {
  try {
    await downloadCSV();
    await loadCSV();
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    console.error("Failed to start server:", err);
  }
});
