# SmokeScout

SmokeScout is a simulated firefighting reconnaissance command dashboard. It is a **student software prototype**. All sensor data and thermal frames are simulated; its detection, forecasts and risk labels are **not validated for real-world firefighting or life-safety decisions**.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (usually `http://localhost:5173`). On Windows PowerShell with script execution disabled, use `npm.cmd install` and `npm.cmd run dev`.

Production compilation: `npm run build`. Preview it with `npm run preview`.

## Use

1. Select an environmental scenario and an independent human scenario under **Simulation controls**.
2. Click **Start mission**. A virtual reading arrives every second for up to five minutes.
3. Inspect live metrics, charts, thermal frame, candidate movement, regression forecasts and alerts.
4. Pause, resume or reset the mission. Export sensor or alert CSV files at any time after events arrive.
5. Completed, reset and safe-shutdown missions appear in **Mission history** until the browser tab closes.

The **Robot overheating** scenario drives the robot toward the fixed 50°C internal limit. At the limit the watchdog logs the critical retrieval alert, stops motors, retains the final thermal frame, enters safe shutdown and stops the telemetry timer until reset.

## Architecture

`VirtualESP32` in `src/services/sensorSimulator.js` is the replaceable telemetry source. It produces a time-stamped reading and 8×8 thermal matrix. `useSensorData` owns the one-second scheduler, mission lifecycle and in-memory history. Each incoming frame is analyzed by `humanDetectionEngine`; recent numeric readings go to `predictionEngine`; processed results and readings go to `alertEngine`; React renders the resulting state. CSV export is isolated in `src/utils/exportCSV.js`.

Telemetry fields: ambient and internal temperature, CO concentration, battery percentage, Wi-Fi dBm, thermal matrix, timestamp and operational status. The source can later be replaced by a WebSocket adapter returning the same reading shape.

## Algorithms

- **Simulation:** Target-seeking gradual changes with bounded noise. Scenario selection changes sensor targets and thermal patterns, never the displayed detection or forecast result directly.
- **Forecasting:** Ordinary least-squares linear regression over up to 30 recent readings, using elapsed seconds as the independent variable. Values are projected 30 seconds ahead. Time to the 50°C internal limit is shown only when the fitted slope is sufficiently positive.
- **Thermal detection:** Four-neighbor connected components find warm human-like regions and hotter fire regions. Candidate regions are tracked across frames by nearest centroid, retaining IDs and short trails. Movement is inferred from centroid displacement. A stationary candidate remains detected.
- **Risk:** An experimental score based on configurable demonstration thresholds, trends, possible human candidates and time to the internal limit.
- **Alerts:** Rules evaluate incoming readings and processed results. A 30-second per-rule cooldown prevents repeated events every second.

## Limitations and future work

The 8×8 thermal view has low spatial resolution. Warm objects can resemble people, overlapping regions can merge, and centroid tracking may lose IDs. There is no physical localization, calibrated distance, verified CO response, trained human classifier or model accuracy estimate. Regression assumes a short linear trend and can be wrong when conditions change. Mission records and readings are held in memory only.

Future work can add ESP32 and AMG8833/MLX90640 telemetry, an MQ-7 CO sensor, calibrated temperature sensors, a WebSocket/FastAPI backend, persistent storage, and a validated thermal model. These integrations are intentionally outside this prototype.
# smoke_robo-dashboard
