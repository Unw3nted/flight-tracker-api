import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import csvParser from "csv-parser";

const app = express();
const PORT = process.env.PORT || 3000;

// === Load Aircraft Database CSV ===
const aircraftDatabase = {};

fs.createReadStream("aircraftdatabase.csv")
  .pipe(
    csvParser({
      mapHeaders: ({ header }) => header.replace(/'/g, "").trim(),
      mapValues: ({ value }) => value.replace(/'/g, "").trim(),
    })
  )
  .on("data", (row) => {
    if (row.icao24 && row.typecode && row.typecode.toLowerCase() !== "unknow") {
      aircraftDatabase[row.icao24.toLowerCase()] = row.typecode;
    }
  })
  .on("end", () => {
    console.log(
      "Aircraft database loaded:",
      Object.keys(aircraftDatabase).length,
      "entries"
    );
  });

// Helper function
function getAircraftType(icao24) {
  if (!icao24) return "Unknown";
  return aircraftDatabase[icao24.toLowerCase()] || "Unknown";
}

// === OpenSky API Endpoint ===
app.get("/flights", async (req, res) => {
  try {
    const url = "https://opensky-network.org/api/states/all";
    const response = await fetch(url);
    const data = await response.json();

    if (!data.states) return res.json([]);

    const flights = data.states.map((state) => ({
      icao24: state[0],
      callsign: state[1] ? state[1].trim() : "N/A",
      origin_country: state[2],
      longitude: state[5],
      latitude: state[6],
      baro_altitude: state[7],
      velocity: state[9],
      heading: state[10],
      type: getAircraftType(state[0]),
    }));

    res.json(flights);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch OpenSky data" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
