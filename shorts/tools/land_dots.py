"""Turn Natural Earth land (world-atlas land-110m.json, TopoJSON) into dots for a dotted globe.

Usage: python tools/land_dots.py land-110m.json src/lib/land.json [step_degrees]
Download the input once (not committed): https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json
Dots sit on an equal-area grid (the longitude step widens toward the poles), so the globe has no crowding at the top.
Writes [[lat, lon], ...] rounded to 0.1 degree. Standard library only.
"""
import json
import math
import sys


def decode(topo):
    sx, sy = topo["transform"]["scale"]
    tx, ty = topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        x = y = 0
        pts = []
        for dx, dy in arc:
            x += dx
            y += dy
            pts.append((x * sx + tx, y * sy + ty))
        arcs.append(pts)

    def ring(idx):
        out = []
        for i in idx:
            pts = arcs[i] if i >= 0 else arcs[~i][::-1]
            out.extend(pts if not out else pts[1:])
        return out

    polys = []
    for g in topo["objects"]["land"]["geometries"]:
        shapes = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
        for shape in shapes:
            polys.append([ring(r) for r in shape])
    return polys


def inside(lon, lat, rings):
    hit = False
    for r in rings:  # even-odd over outer ring and holes
        j = len(r) - 1
        for i in range(len(r)):
            xi, yi = r[i]
            xj, yj = r[j]
            if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi:
                hit = not hit
            j = i
    return hit


def main(src, dst, step=1.6):
    polys = decode(json.load(open(src)))
    boxes = []
    for rings in polys:
        xs = [p[0] for p in rings[0]]
        # A polygon that crosses the 180 meridian (Fiji, Chukotka) spans the whole map and would fill its latitude
        # with dots: move its far-west points (beyond -90) by +360 and test points there too.
        wrap = max(xs) - min(xs) > 300
        if wrap:
            rings = [[(x + 360 if x < -90 else x, y) for x, y in r] for r in rings]
            xs = [p[0] for p in rings[0]]
        ys = [p[1] for p in rings[0]]
        boxes.append((min(xs), max(xs), min(ys), max(ys), rings, wrap))
    dots = []
    lat = -58.0  # skip Antarctica: it only clutters the bottom of the globe
    while lat <= 84:
        lstep = step / max(0.2, math.cos(math.radians(lat)))
        lon = -180 + lstep / 2
        while lon < 180:
            for x0, x1, y0, y1, rings, wrap in boxes:
                x = lon + 360 if wrap and lon < -90 else lon
                if x0 <= x <= x1 and y0 <= lat <= y1 and inside(x, lat, rings):
                    dots.append([round(lat, 1), round(lon, 1)])
                    break
            lon += lstep
        lat += step
    json.dump(dots, open(dst, "w"), separators=(",", ":"))
    print(f"{len(dots)} dots -> {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], float(sys.argv[3]) if len(sys.argv) > 3 else 1.6)
