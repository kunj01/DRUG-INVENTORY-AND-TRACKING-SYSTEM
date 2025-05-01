import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = defaultIcon;

interface OrderTrackingMapProps {
  currentLocation?: [number, number];
  destinationLocation?: [number, number];
  orderStatus?: string;
}

const OrderTrackingMap: React.FC<OrderTrackingMapProps> = ({
  currentLocation = [21.1702, 72.8311], // Default to Surat, Gujarat
  destinationLocation = [21.1702, 72.8311], // Default to Surat, Gujarat
  orderStatus = 'In Transit'
}) => {
  const mapRef = useRef(null);

  useEffect(() => {
    if (mapRef.current) {
      // You can add any map initialization logic here
    }
  }, []);

  return (
    <div className="w-full h-[400px] rounded-lg overflow-hidden shadow-lg">
      <MapContainer
        center={currentLocation}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={currentLocation}>
          <Popup>
            <div className="font-medium">
              <p>Current Location</p>
              <p className="text-sm text-gray-600">{orderStatus}</p>
            </div>
          </Popup>
        </Marker>
        <Marker position={destinationLocation}>
          <Popup>
            <div className="font-medium">
              <p>Delivery Destination</p>
              <p className="text-sm text-gray-600">Surat, Gujarat</p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

export default OrderTrackingMap;
