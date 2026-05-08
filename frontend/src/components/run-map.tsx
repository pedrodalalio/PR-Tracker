import "leaflet/dist/leaflet.css";
import { LatLngBounds } from "leaflet";
import { useEffect, useMemo, useRef } from "react";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { RoutePoint } from "@/lib/types";
import { cn } from "@/lib/utils";

interface RunMapProps {
  points: RoutePoint[];
  className?: string;
}

function FitBounds({ bounds }: { bounds: LatLngBounds }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [16, 16] });
  }, [map, bounds]);
  return null;
}

export function RunMap({ points, className }: RunMapProps) {
  const ref = useRef<HTMLDivElement>(null);

  const polyline = useMemo<[number, number][]>(
    () => points.map((p) => [p.lat, p.lng]),
    [points],
  );

  const bounds = useMemo(() => {
    if (polyline.length === 0) return null;
    return new LatLngBounds(polyline);
  }, [polyline]);

  if (polyline.length === 0 || !bounds) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex h-64 w-full items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 text-sm text-muted-foreground",
          className,
        )}
      >
        Sem rota registrada
      </div>
    );
  }

  const start = polyline[0]!;
  const end = polyline[polyline.length - 1]!;

  return (
    <div
      ref={ref}
      role="img"
      aria-label={`Mapa do percurso da corrida com ${polyline.length} pontos GPS`}
      className={cn(
        "relative h-72 w-full overflow-hidden rounded-xl border border-border md:h-96",
        className,
      )}
    >
      <MapContainer
        bounds={bounds}
        scrollWheelZoom={false}
        className="size-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Polyline
          positions={polyline}
          pathOptions={{
            color: "var(--primary)",
            weight: 4,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
        <CircleMarker
          center={start}
          radius={6}
          pathOptions={{
            color: "#ffffff",
            weight: 2,
            fillColor: "var(--primary)",
            fillOpacity: 1,
          }}
        />
        <CircleMarker
          center={end}
          radius={6}
          pathOptions={{
            color: "var(--primary)",
            weight: 2,
            fillColor: "#ffffff",
            fillOpacity: 1,
          }}
        />
        <FitBounds bounds={bounds} />
      </MapContainer>
    </div>
  );
}
