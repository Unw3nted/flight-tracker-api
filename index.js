import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/flights", async (req, res) => {
  try {
    // Try to fetch live flights from OpenSky
    const response = await fetch("https://opensky-network.org/api/states/all");
    const data = await response.json();

    let flights = [];

    if (data.states && data.states.length > 0) {
      // Use first 50 live flights
      flights = data.states.slice(0, 50).map(s => ({
        callsign: s[1] || "N/A",
        country: s[2] || "N/A",
        latitude: s[5] || 0,
        longitude: s[6] || 0,
        altitude: s[7] || 0,
        velocity: s[9] || 0,
        heading: s[10] || 0
      }));
    } else {
      // Fallback dummy data
      flights = [
        { callsign: "TEST1", country: "US", latitude: 40, longitude: -80, altitude: 10000, velocity: 250, heading: 90 },
        { callsign: "TEST2", country: "US", latitude: 42, longitude: -75, altitude: 12000, velocity: 300, heading: 180 },
        { callsign: "TEST3", country: "US", latitude: 38, longitude: -77, altitude: 15000, velocity: 270, heading: 45 }
      ];
    }

    res.json(flights);
  } catch (err) {
    console.error(err);
    // If OpenSky fails, return fallback dummy flights
    const fallback = [
      { callsign: "TEST1", country: "US", latitude: 40, longitude: -80, altitude: 10000, velocity: 250, heading: 90 },
      { callsign: "TEST2", country: "US", latitude: 42, longitude: -75, altitude: 12000, velocity: 300, heading: 180 }
    ];
    res.json(fallback);
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
