import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import csvParser from "csv-parser";

const app = express();
const PORT = process.env.PORT || 3000;

// Dropbox CSV direct download link
const CSV_URL = process.env.CSV_URL;
const CSV_PATH = "./aircraftdatabase.csv"; 

// Object to store aircraft types by ICAO24
let aircraftTypes = {};

// Download CSV if not present
const downloadCSV = async () => {
  if (fs.existsSync(CSV_PATH)) {
    console.log("CSV already exists locally, skipping download.");
    return;
  }

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
    const results = {};
    fs.createReadStream(CSV_PATH)
      .pipe(csvParser({ separator: ',', quote: "'" })) // <--- important
      .on("data", (row) => {
        const icao = row['icao24']?.toLowerCase();
        const type = row['typecode'];
        if (icao && type) {
          results[icao.trim()] = type.trim();
        }
      })
      .on("end", () => {
        aircraftTypes = results;
        console.log("Aircraft CSV loaded, total entries:", Object.keys(aircraftTypes).length);
        resolve();
      })
      .on("error", reject);
  });
};


// Fetch flight data from OpenSky
const fetchFlights = async () => {
  const res = await fetch("https://opensky-network.org/api/states/all");
  if (!res.ok) throw new Error(`Failed to fetch flights: ${res.statusText}`);
  const data = await res.json();

  // Map flights with aircraft type
  const flights = data.states.map((f) => ({
    callsign: f[1]?.trim() || "Unknown",
    country: f[2] || "Unknown",
    latitude: f[6],
    longitude: f[5],
    altitude: f[7],
    velocity: f[9],
    heading: f[10],
    type: aircraftTypes[f[0]?.toLowerCase()] || "Unknown",
  }));

  return flights;
};

// API endpoint
app.get("/flights", async (req, res) => {
  try {
    const flights = await fetchFlights();
    res.json(flights);
  } catch (err) {
    console.error("Error fetching flights:", err);
    res.status(500).send("Error fetching flights");
  }
});

// Start server
app.listen(PORT, "0.0.0.0", async () => {
  try {
    await downloadCSV();
    await loadCSV();
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  } catch (err) {
    console.error("Failed to start server:", err);
  }
});
