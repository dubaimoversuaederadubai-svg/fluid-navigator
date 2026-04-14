import React, { useRef, useEffect, useCallback } from "react";

export interface MapMessage {
  type: "distance" | "pickup_set" | "dropoff_set" | "ready" | "pickup_geocoded" | "dropoff_geocoded";
  distanceKm?: number;
  address?: string;
  lat?: number;
  lng?: number;
  durationMin?: number;
}

interface LeafletMapProps {
  pickupAddress?: string;
  dropoffAddress?: string;
  mode?: "picker" | "tracking";
  vehicleType?: "bike" | "rickshaw" | "car";
  onMessage?: (msg: MapMessage) => void;
  style?: any;
  driverLat?: number;
  driverLng?: number;
}

const MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body, #map { width:100%; height:100%; background:#d4e8d4; }
  .custom-pickup { background:#10B981; color:#fff; border:3px solid #fff; border-radius:50%; width:32px!important; height:32px!important; display:flex; align-items:center; justify-content:center; font-size:16px; box-shadow:0 3px 12px rgba(0,0,0,0.3); }
  .custom-dropoff { background:#EF4444; color:#fff; border:3px solid #fff; border-radius:50%; width:32px!important; height:32px!important; display:flex; align-items:center; justify-content:center; font-size:16px; box-shadow:0 3px 12px rgba(0,0,0,0.3); }
  .custom-driver { background:#2170E4; color:#fff; border:3px solid #fff; border-radius:50%; width:40px!important; height:40px!important; display:flex; align-items:center; justify-content:center; font-size:20px; box-shadow:0 3px 12px rgba(0,0,0,0.4); animation:pulse 2s infinite; }
  .custom-user { background:#10B981; color:#fff; border:3px solid #fff; border-radius:50%; width:28px!important; height:28px!important; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 2px 8px rgba(0,0,0,0.3); }
  @keyframes pulse { 0%,100%{transform:scale(1);opacity:1;} 50%{transform:scale(1.1);opacity:0.9;} }
  .leaflet-popup-content-wrapper { border-radius:14px; box-shadow:0 4px 16px rgba(0,0,0,0.15); }
  .leaflet-popup-content { font-family:sans-serif; font-size:13px; margin:8px 14px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map, pickupMarker, dropoffMarker, driverMarker, routeLine, userMarker;
var mode = 'picker';
var vehicleType = 'car';
var pickupCoords = null;
var dropoffCoords = null;

function sendMsg(data) {
  try { window.parent.postMessage(JSON.stringify(data), '*'); } catch(e) {}
}

function makeIcon(cls, emoji) {
  return L.divIcon({
    html: '<div class="' + cls + '">' + emoji + '</div>',
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
}

function drawRoute() {
  if (!pickupCoords || !dropoffCoords) return;
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
  var url = 'https://router.project-osrm.org/route/v1/driving/' +
    pickupCoords[1] + ',' + pickupCoords[0] + ';' +
    dropoffCoords[1] + ',' + dropoffCoords[0] +
    '?overview=full&geometries=geojson';
  fetch(url)
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (data.routes && data.routes[0]) {
        var route = data.routes[0];
        var distKm = (route.distance / 1000).toFixed(2);
        var durMin = Math.round(route.duration / 60);
        var coords = route.geometry.coordinates.map(function(c){ return [c[1], c[0]]; });
        routeLine = L.polyline(coords, { color:'#2170E4', weight:5, opacity:0.85, lineCap:'round', lineJoin:'round' }).addTo(map);
        var bounds = L.latLngBounds([pickupCoords, dropoffCoords]);
        map.fitBounds(bounds, { padding: [60, 60] });
        sendMsg({ type:'distance', distanceKm:parseFloat(distKm), durationMin:durMin });
      }
    })
    .catch(function() {
      var lat1=pickupCoords[0], lng1=pickupCoords[1], lat2=dropoffCoords[0], lng2=dropoffCoords[1];
      var R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
      var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
      var distKm=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
      routeLine = L.polyline([pickupCoords,dropoffCoords],{color:'#2170E4',weight:4,opacity:0.7,dashArray:'10,6'}).addTo(map);
      var bounds=L.latLngBounds([pickupCoords,dropoffCoords]);
      map.fitBounds(bounds,{padding:[60,60]});
      sendMsg({type:'distance',distanceKm:parseFloat(distKm.toFixed(2)),durationMin:Math.round(distKm*3)});
    });
}

function geocode(address, isPickup) {
  if (!address || address.length < 3) return;
  fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address + ' Pakistan') + '&limit=1&countrycodes=pk', { headers:{'Accept-Language':'en'} })
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (data && data[0]) {
        var lat=parseFloat(data[0].lat), lng=parseFloat(data[0].lon);
        if (isPickup) {
          pickupCoords=[lat,lng];
          if (pickupMarker) map.removeLayer(pickupMarker);
          pickupMarker=L.marker(pickupCoords,{icon:makeIcon('custom-pickup','📍'),draggable:mode==='picker'}).addTo(map);
          pickupMarker.bindPopup('<b>📍 شروع:</b><br>'+address).openPopup();
          if (mode==='picker') { pickupMarker.on('dragend',function(e){var ll=e.target.getLatLng();pickupCoords=[ll.lat,ll.lng];reverseGeocode(ll.lat,ll.lng,true);drawRoute();}); }
          sendMsg({type:'pickup_geocoded',lat:lat,lng:lng});
        } else {
          dropoffCoords=[lat,lng];
          if (dropoffMarker) map.removeLayer(dropoffMarker);
          dropoffMarker=L.marker(dropoffCoords,{icon:makeIcon('custom-dropoff','🏁'),draggable:mode==='picker'}).addTo(map);
          dropoffMarker.bindPopup('<b>🏁 منزل:</b><br>'+address).openPopup();
          if (mode==='picker') { dropoffMarker.on('dragend',function(e){var ll=e.target.getLatLng();dropoffCoords=[ll.lat,ll.lng];reverseGeocode(ll.lat,ll.lng,false);drawRoute();}); }
          sendMsg({type:'dropoff_geocoded',lat:lat,lng:lng});
        }
        map.setView([lat,lng],14);
        if (pickupCoords && dropoffCoords) drawRoute();
      }
    }).catch(function(){});
}

function reverseGeocode(lat, lng, isPickup) {
  fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat='+lat+'&lon='+lng+'&zoom=16',{headers:{'Accept-Language':'ur'}})
    .then(function(r){return r.json();})
    .then(function(data){if(data&&data.display_name){var parts=data.display_name.split(',');var short=parts.slice(0,2).join(',').trim();sendMsg({type:isPickup?'pickup_set':'dropoff_set',address:short});}})
    .catch(function(){});
}

function initMap(cfg) {
  mode=cfg.mode||'picker';
  vehicleType=cfg.vehicleType||'car';
  var center=cfg.center||[31.5204,74.3587];
  map=L.map('map',{zoomControl:true,attributionControl:false}).setView(center,13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  if (cfg.userLat) { userMarker=L.marker([cfg.userLat,cfg.userLng],{icon:makeIcon('custom-user','🔵')}).addTo(map); }
  if (cfg.pickup) geocode(cfg.pickup,true);
  if (cfg.dropoff) geocode(cfg.dropoff,false);
  if (cfg.driverLat) {
    var de=vehicleType==='bike'?'🏍️':vehicleType==='rickshaw'?'🛺':'🚗';
    driverMarker=L.marker([cfg.driverLat,cfg.driverLng],{icon:makeIcon('custom-driver',de)}).addTo(map);
    driverMarker.bindPopup('<b>ڈرائیور</b>').openPopup();
    map.setView([cfg.driverLat,cfg.driverLng],15);
  }
  if (mode==='picker') {
    map.on('click',function(e){
      var lat=e.latlng.lat,lng=e.latlng.lng;
      if (!pickupCoords) {
        pickupCoords=[lat,lng];
        if (pickupMarker) map.removeLayer(pickupMarker);
        pickupMarker=L.marker(pickupCoords,{icon:makeIcon('custom-pickup','📍'),draggable:true}).addTo(map);
        reverseGeocode(lat,lng,true);
        pickupMarker.on('dragend',function(ev){var ll=ev.target.getLatLng();pickupCoords=[ll.lat,ll.lng];reverseGeocode(ll.lat,ll.lng,true);if(dropoffCoords)drawRoute();});
      } else if (!dropoffCoords) {
        dropoffCoords=[lat,lng];
        if (dropoffMarker) map.removeLayer(dropoffMarker);
        dropoffMarker=L.marker(dropoffCoords,{icon:makeIcon('custom-dropoff','🏁'),draggable:true}).addTo(map);
        reverseGeocode(lat,lng,false);
        dropoffMarker.on('dragend',function(ev){var ll=ev.target.getLatLng();dropoffCoords=[ll.lat,ll.lng];reverseGeocode(ll.lat,ll.lng,false);drawRoute();});
        drawRoute();
      }
    });
  }
  sendMsg({type:'ready'});
}

window.addEventListener('message',function(event){
  try {
    var data=typeof event.data==='string'?JSON.parse(event.data):event.data;
    if (data.action==='init') initMap(data);
    else if (data.action==='set_pickup') geocode(data.address,true);
    else if (data.action==='set_dropoff') geocode(data.address,false);
    else if (data.action==='set_user') {
      if (userMarker) map.removeLayer(userMarker);
      userMarker=L.marker([data.lat,data.lng],{icon:makeIcon('custom-user','🔵')}).addTo(map);
      map.setView([data.lat,data.lng],14);
      if (!pickupCoords) { pickupCoords=[data.lat,data.lng]; if(pickupMarker)map.removeLayer(pickupMarker); pickupMarker=L.marker(pickupCoords,{icon:makeIcon('custom-pickup','📍'),draggable:true}).addTo(map); reverseGeocode(data.lat,data.lng,true); }
    }
  } catch(e) {}
});
</script>
</body>
</html>`;

export default function LeafletMap({
  pickupAddress,
  dropoffAddress,
  mode = "picker",
  vehicleType = "car",
  onMessage,
  style,
  driverLat,
  driverLng,
}: LeafletMapProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const initSentRef = useRef(false);

  const sendInit = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    const initData = {
      action: "init",
      mode,
      vehicleType,
      pickup: pickupAddress,
      dropoff: dropoffAddress,
      center: [31.5204, 74.3587],
      driverLat,
      driverLng,
    };
    iframe.contentWindow.postMessage(JSON.stringify(initData), "*");
    initSentRef.current = true;
  }, [pickupAddress, dropoffAddress, mode, vehicleType, driverLat, driverLng]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data: MapMessage = typeof event.data === "string"
          ? JSON.parse(event.data)
          : event.data;
        if (data && data.type) onMessage?.(data);
      } catch {}
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onMessage]);

  const handleLoad = useCallback(() => {
    setTimeout(sendInit, 300);
  }, [sendInit]);

  const containerStyle: React.CSSProperties = {
    flex: 1,
    width: "100%",
    height: "100%",
    overflow: "hidden",
    position: "relative",
    ...(style as React.CSSProperties),
  };

  return (
    <div style={containerStyle}>
      <iframe
        ref={iframeRef}
        srcDoc={MAP_HTML}
        onLoad={handleLoad}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        title="Fluid Navigator Map"
      />
    </div>
  );
}
