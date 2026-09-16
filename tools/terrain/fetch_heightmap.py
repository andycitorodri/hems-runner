"""Descarga una malla de alturas reales (SRTM vía api.open-elevation.com) y la guarda en JSON.
   python3 tools/terrain/fetch_heightmap.py nombre lat0 lat1 lon0 lon1 paso_m
   → assets/terrain/<nombre>.json  { lat0, lat1, lon0, lon1, nx, ny, wx_m, wy_m, z: [ny*nx] }  (fila = latitud, de sur a norte)"""
import json, math, sys, urllib.request, time
name, lat0, lat1, lon0, lon1, step = sys.argv[1], *map(float, sys.argv[2:7])
lat_m = 111320.0; lon_m = 111320.0 * math.cos(math.radians((lat0 + lat1) / 2))
wy, wx = (lat1 - lat0) * lat_m, (lon1 - lon0) * lon_m
ny, nx = int(round(wy / step)) + 1, int(round(wx / step)) + 1
pts = [(lat0 + (lat1 - lat0) * j / (ny - 1), lon0 + (lon1 - lon0) * i / (nx - 1)) for j in range(ny) for i in range(nx)]
z = []
for k in range(0, len(pts), 400):
    batch = pts[k:k + 400]
    body = json.dumps({"locations": [{"latitude": a, "longitude": b} for a, b in batch]}).encode()
    for attempt in range(4):
        try:
            req = urllib.request.Request("https://api.open-elevation.com/api/v1/lookup", data=body, headers={"Content-Type": "application/json"})
            res = json.load(urllib.request.urlopen(req, timeout=60))["results"]
            z += [r["elevation"] for r in res]; break
        except Exception as e:
            print("reintento", attempt, e); time.sleep(3)
    else: sys.exit("fallo API")
    print(f"{len(z)}/{len(pts)}", flush=True)
json.dump({"lat0": lat0, "lat1": lat1, "lon0": lon0, "lon1": lon1, "nx": nx, "ny": ny, "wx_m": wx, "wy_m": wy, "z": z}, open(f"assets/terrain/{name}.json", "w"))
print(name, nx, "x", ny, "min", min(z), "max", max(z))
