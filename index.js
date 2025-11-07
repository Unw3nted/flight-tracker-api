import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import csvParser from "csv-parser";
import LRU from "lru-cache";

const app = express();
const PORT = process.env.PORT || 3000;

const CSV_URL =
  "https://www.dropbox.com/scl/fi/yd5szvvdb26g3z3nfzs6a/aircraftdatabase.csv?rlkey=eub7sf41he7kmf511uhfmx0kq&dl=1";
const CSV_PATH = "./aircraftdatabase.csv";

// Small LRU cache for ICAO lookups
const cache = new LRU({ max: 50000 }); // adjust max size as needed

// Download CSV
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

// Lookup typecode for ICAO24 (stream CSV, cache results)
const getTypecode = async (icao24) => {
  const key = icao24.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  return new Promise((resolve, reject) => {
    let found = false;
    fs.createReadStream(CSV_PATH)
      .pipe(csvParser())
      .on("data", (row) => {
        if (row.icao24?.toLowerCase() === key) {
          cache.set(key, row.typecode || "Unknown");
          found = true;
          resolve(row.typecode || "Unknown");
        }
      })
      .on("end", () => {
        if (!found) {
          cache.set(key, "Unknown");
          resolve("Unknown");
        }
      })
      .on("error", reject);
  });
};

// Fetch flights
const fetchFlights = async () => {
  try {
    const res = await fetch("https://opensky-network.org/api/states/all");
    const data = await res.json();

    const flights = await Promise.all(
      data.states.map(async (f) => ({
        callsign: f[1]?.trim() || "",
        country: f[2] || "",
        latitude: f[6],
        longitude: f[5],
        altitude: f[7],
        velocity: f[9],
        heading: f[10],
        type: await getTypecode(f[0]),
      }))
    );

    return flights;
  } catch (err) {
    console.error("Error fetching flights:", err);
    return [];
  }
};

// Endpoint
app.get("/flights", async (req, res) => {
  const flights = await fetchFlights();
  res.json(flights);
});

// Start server
app.listen(PORT, async () => {
  try {
    await downloadCSV();
    console.log(`Server running on port ${PORT}`);
  } catch (err) {
    console.error("Failed to start server:", err);
  }
});
