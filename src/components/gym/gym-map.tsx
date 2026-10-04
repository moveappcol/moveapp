"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Parqueadero } from "@/lib/parqueaderos";

/** Pines de color vía divIcon (HTML/CSS) en vez de los íconos por defecto
 * de Leaflet — esos vienen como archivos .png que el bundler de Next casi
 * nunca resuelve bien (rutas rotas, íconos invisibles), un problema
 * conocido de react-leaflet. Con divIcon no hay ningún archivo externo que
 * cargar. */
function pinIcon(color: string, size: number): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

const gymIcon = pinIcon("#063009", 30);
const parkingIcon = pinIcon("#ff4f3f", 24);

export default function GymMap({
  lat,
  lng,
  name,
  parqueaderos,
}: {
  lat: number;
  lng: number;
  name: string;
  parqueaderos: Parqueadero[];
}) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lng]} icon={gymIcon}>
        <Popup>{name}</Popup>
      </Marker>
      {parqueaderos.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={parkingIcon}>
          <Popup>
            {p.nombre}
            {p.precio && (
              <>
                <br />
                {p.precio}
              </>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
