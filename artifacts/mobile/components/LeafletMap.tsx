import React, { forwardRef, useCallback, useImperativeHandle, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";
import WebView from "react-native-webview";

export interface MapMessage {
  type: "distance" | "pickup_set" | "dropoff_set" | "ready" | "pickup_geocoded" | "dropoff_geocoded";
  distanceKm?: number;
  address?: string;
  lat?: number;
  lng?: number;
  durationMin?: number;
}

export interface LeafletMapRef {
  sendCommand: (data: object) => void;
}

interface NearbyDriver {
  id: string;
  name?: string;
  vehicleType?: "bike" | "rickshaw" | "car";
  lat: number;
  lng: number;
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
  userLat?: number;
  userLng?: number;
  nearbyDrivers?: NearbyDriver[];
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  tripStarted?: boolean;
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
  .custom-driver { background:#2170E4; color:#fff; border:3px solid #fff; border-radius:50%; width:40px!important; height:40px!important; display:flex; align-items:center; justify-content:center; font-size:20px; box-shadow:0 3px 12px rgba(0,0,0,0.4); animation:pulse 1.5s infinite; }
  .custom-nearby { background:#fff; border:2.5px solid #10B981; border-radius:50%; width:36px!important; height:36px!important; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 2px 8px rgba(0,0,0,0.2); }
  .custom-user { background:#10B981; color:#fff; border:3px solid #fff; border-radius:50%; width:28px!important; height:28px!important; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 2px 8px rgba(0,0,0,0.3); }
  @keyframes pulse { 0%,100%{transform:scale(1);box-shadow:0 3px 12px rgba(33,112,228,0.4);} 50%{transform:scale(1.15);box-shadow:0 3px 20px rgba(33,112,228,0.7);} }
  .leaflet-popup-content-wrapper { border-radius:14px; box-shadow:0 4px 16px rgba(0,0,0,0.15); }
  .leaflet-popup-content { font-family:sans-serif; font-size:13px; margin:8px 14px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map, pickupMarker, dropoffMarker, driverMarker, routeLine, userMarker, driverRouteLine;
var nearbyMarkers = {};
var mode = 'picker';
var vehicleType = 'car';
var pickupCoords = null;
var dropoffCoords = null;
var tripStarted = false;

function sendMsg(data) {
  var str = JSON.stringify(data);
  try {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(str);
    else window.parent.postMessage(str, '*');
  } catch(e) {}
}

function vehicleEmoji(vt) {
  if (vt === 'bike') return '🏍️';
  if (vt === 'rickshaw') return '🛺';
  return '🚗';
}

function makeIcon(cls, emoji) {
  return L.divIcon({
    html: '<div class="' + cls + '">' + emoji + '</div>',
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
}

function fetchRoute(fromLat, fromLng, toLat, toLng, callback) {
  var url = 'https://router.project-osrm.org/route/v1/driving/' +
    fromLng + ',' + fromLat + ';' +
    toLng + ',' + toLat +
    '?overview=full&geometries=geojson';
  fetch(url)
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (data.routes && data.routes[0]) {
        var route = data.routes[0];
        var coords = route.geometry.coordinates.map(function(c){ return [c[1], c[0]]; });
        var distKm = (route.distance / 1000).toFixed(2);
        var durMin = Math.round(route.duration / 60);
        callback(coords, parseFloat(distKm), durMin);
      }
    })
    .catch(function() {
      // Fallback straight line
      callback([[fromLat, fromLng], [toLat, toLng]], null, null);
    });
}

function drawRoute() {
  if (!pickupCoords || !dropoffCoords) return;
  if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
  fetchRoute(pickupCoords[0], pickupCoords[1], dropoffCoords[0], dropoffCoords[1], function(coords, distKm, durMin) {
    routeLine = L.polyline(coords, {
      color: '#2170E4', weight: 5, opacity: 0.85, lineCap: 'round', lineJoin: 'round'
    }).addTo(map);
    var bounds = L.latLngBounds([pickupCoords, dropoffCoords]);
    map.fitBounds(bounds, { padding: [60, 60] });
    if (distKm !== null) sendMsg({ type: 'distance', distanceKm: distKm, durationMin: durMin });
  });
}

// Draw route from driver's current position to pickup (for tracking mode)
function drawDriverRoute(dLat, dLng) {
  if (!pickupCoords) return;
  if (driverRouteLine) { map.removeLayer(driverRouteLine); driverRouteLine = null; }
  fetchRoute(dLat, dLng, pickupCoords[0], pickupCoords[1], function(coords, distKm, durMin) {
    driverRouteLine = L.polyline(coords, {
      color: '#10B981', weight: 4, opacity: 0.8, lineCap: 'round', lineJoin: 'round',
      dashArray: tripStarted ? null : '12, 6'
    }).addTo(map);
    // Fit bounds to show driver + pickup
    if (dropoffCoords && tripStarted) {
      var bounds = L.latLngBounds([pickupCoords, dropoffCoords, [dLat, dLng]]);
      map.fitBounds(bounds, { padding: [60, 60] });
    } else {
      var bounds = L.latLngBounds([[dLat, dLng], pickupCoords]);
      map.fitBounds(bounds, { padding: [60, 60] });
    }
    if (distKm !== null) sendMsg({ type: 'distance', distanceKm: distKm, durationMin: durMin });
  });
}

function geocode(address, isPickup) {
  if (!address || address.length < 3) return;
  var url = 'https://nominatim.openstreetmap.org/search?format=json&q=' +
    encodeURIComponent(address + ' Pakistan') + '&limit=1&countrycodes=pk';
  fetch(url, { headers: { 'Accept-Language': 'en' } })
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (data && data[0]) {
        var lat = parseFloat(data[0].lat);
        var lng = parseFloat(data[0].lon);
        if (isPickup) {
          pickupCoords = [lat, lng];
          if (pickupMarker) map.removeLayer(pickupMarker);
          pickupMarker = L.marker(pickupCoords, { icon: makeIcon('custom-pickup', '📍'), draggable: mode === 'picker' }).addTo(map);
          pickupMarker.bindPopup('<b>📍 شروع:</b><br>' + address).openPopup();
          if (mode === 'picker') {
            pickupMarker.on('dragend', function(e) {
              var ll = e.target.getLatLng();
              pickupCoords = [ll.lat, ll.lng];
              reverseGeocode(ll.lat, ll.lng, true);
              drawRoute();
            });
          }
          sendMsg({ type: 'pickup_geocoded', lat: lat, lng: lng });
        } else {
          dropoffCoords = [lat, lng];
          if (dropoffMarker) map.removeLayer(dropoffMarker);
          dropoffMarker = L.marker(dropoffCoords, { icon: makeIcon('custom-dropoff', '🏁'), draggable: mode === 'picker' }).addTo(map);
          dropoffMarker.bindPopup('<b>🏁 منزل:</b><br>' + address).openPopup();
          if (mode === 'picker') {
            dropoffMarker.on('dragend', function(e) {
              var ll = e.target.getLatLng();
              dropoffCoords = [ll.lat, ll.lng];
              reverseGeocode(ll.lat, ll.lng, false);
              drawRoute();
            });
          }
          sendMsg({ type: 'dropoff_geocoded', lat: lat, lng: lng });
        }
        map.setView([lat, lng], 14);
        if (pickupCoords && dropoffCoords) drawRoute();
      }
    }).catch(function(){});
}

function reverseGeocode(lat, lng, isPickup) {
  var url = 'https://nominatim.openstreetmap.org/reverse?format=json&lat=' + lat + '&lon=' + lng + '&zoom=16';
  fetch(url, { headers: { 'Accept-Language': 'ur' } })
    .then(function(r){ return r.json(); })
    .then(function(data) {
      if (data && data.display_name) {
        var parts = data.display_name.split(',');
        var short = parts.slice(0, 2).join(',').trim();
        sendMsg({ type: isPickup ? 'pickup_set' : 'dropoff_set', address: short });
      }
    }).catch(function(){});
}

function setUserLocation(lat, lng) {
  if (userMarker) map.removeLayer(userMarker);
  userMarker = L.marker([lat, lng], { icon: makeIcon('custom-user', '🔵') }).addTo(map);
  userMarker.bindPopup('<b>آپ کی موجودہ جگہ</b>');
  map.setView([lat, lng], 15);
  if (!pickupCoords) {
    pickupCoords = [lat, lng];
    if (pickupMarker) map.removeLayer(pickupMarker);
    pickupMarker = L.marker(pickupCoords, { icon: makeIcon('custom-pickup', '📍'), draggable: true }).addTo(map);
    pickupMarker.bindPopup('<b>📍 آپ کی جگہ</b>').openPopup();
    pickupMarker.on('dragend', function(e) {
      var ll = e.target.getLatLng();
      pickupCoords = [ll.lat, ll.lng];
      reverseGeocode(ll.lat, ll.lng, true);
      if (dropoffCoords) drawRoute();
    });
    reverseGeocode(lat, lng, true);
  }
}

function setNearbyDrivers(drivers) {
  Object.values(nearbyMarkers).forEach(function(m) { map.removeLayer(m); });
  nearbyMarkers = {};
  if (!drivers || !drivers.length) return;
  drivers.forEach(function(d) {
    var emoji = vehicleEmoji(d.vehicleType);
    var m = L.marker([d.lat, d.lng], { icon: makeIcon('custom-nearby', emoji) }).addTo(map);
    var label = d.name || 'Driver';
    m.bindPopup('<b>' + emoji + ' ' + label + '</b><br><small>' + (d.vehicleType || 'car') + '</small>');
    nearbyMarkers[d.id] = m;
  });
}

var driverRouteTimer = null;
function updateDriver(lat, lng) {
  var emoji = vehicleEmoji(vehicleType);
  if (!driverMarker) {
    driverMarker = L.marker([lat, lng], { icon: makeIcon('custom-driver', emoji) }).addTo(map);
    driverMarker.bindPopup('<b>' + emoji + ' ڈرائیور</b>').openPopup();
  } else {
    driverMarker.setLatLng([lat, lng]);
  }
  // Re-draw driver route every 10 seconds max (throttle to avoid too many OSRM calls)
  if (!driverRouteTimer) {
    drawDriverRoute(lat, lng);
    driverRouteTimer = setTimeout(function() { driverRouteTimer = null; }, 10000);
  }
}

function initMap(cfg) {
  mode = cfg.mode || 'picker';
  vehicleType = cfg.vehicleType || 'car';
  tripStarted = cfg.tripStarted || false;
  var center = (cfg.userLat && cfg.userLng) ? [cfg.userLat, cfg.userLng] : (cfg.center || [31.5204, 74.3587]);
  var zoom = (cfg.userLat && cfg.userLng) ? 15 : 13;

  map = L.map('map', { zoomControl: true, attributionControl: false }).setView(center, zoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19
  }).addTo(map);

  if (cfg.userLat && cfg.userLng) {
    setUserLocation(cfg.userLat, cfg.userLng);
  }

  // Set pickup/dropoff from coordinates if provided (tracking mode)
  if (cfg.pickupLat && cfg.pickupLng) {
    pickupCoords = [cfg.pickupLat, cfg.pickupLng];
    if (pickupMarker) map.removeLayer(pickupMarker);
    pickupMarker = L.marker(pickupCoords, { icon: makeIcon('custom-pickup', '📍') }).addTo(map);
    pickupMarker.bindPopup('<b>📍 Pickup</b>');
  } else if (cfg.pickup && cfg.pickup.length > 2) {
    geocode(cfg.pickup, true);
  }

  if (cfg.dropoffLat && cfg.dropoffLng) {
    dropoffCoords = [cfg.dropoffLat, cfg.dropoffLng];
    if (dropoffMarker) map.removeLayer(dropoffMarker);
    dropoffMarker = L.marker(dropoffCoords, { icon: makeIcon('custom-dropoff', '🏁') }).addTo(map);
    dropoffMarker.bindPopup('<b>🏁 Dropoff</b>');
  } else if (cfg.dropoff && cfg.dropoff.length > 2) {
    geocode(cfg.dropoff, false);
  }

  if (pickupCoords && dropoffCoords && mode === 'tracking' && tripStarted) {
    drawRoute(); // Show full pickup → dropoff route during trip
  }

  if (cfg.driverLat && cfg.driverLng) {
    var driverEmoji = vehicleEmoji(vehicleType);
    driverMarker = L.marker([cfg.driverLat, cfg.driverLng], { icon: makeIcon('custom-driver', driverEmoji) }).addTo(map);
    driverMarker.bindPopup('<b>' + driverEmoji + ' ڈرائیور</b>').openPopup();
    if (!tripStarted && pickupCoords) {
      drawDriverRoute(cfg.driverLat, cfg.driverLng);
    }
    map.setView([cfg.driverLat, cfg.driverLng], 15);
  }

  if (cfg.nearbyDrivers && cfg.nearbyDrivers.length > 0) {
    setNearbyDrivers(cfg.nearbyDrivers);
  }

  if (mode === 'picker') {
    map.on('click', function(e) {
      var lat = e.latlng.lat, lng = e.latlng.lng;
      if (!pickupCoords) {
        pickupCoords = [lat, lng];
        if (pickupMarker) map.removeLayer(pickupMarker);
        pickupMarker = L.marker(pickupCoords, { icon: makeIcon('custom-pickup', '📍'), draggable: true }).addTo(map);
        sendMsg({ type: 'pickup_geocoded', lat: lat, lng: lng });
        reverseGeocode(lat, lng, true);
        pickupMarker.on('dragend', function(ev) {
          var ll = ev.target.getLatLng();
          pickupCoords = [ll.lat, ll.lng];
          sendMsg({ type: 'pickup_geocoded', lat: ll.lat, lng: ll.lng });
          reverseGeocode(ll.lat, ll.lng, true);
          if (dropoffCoords) drawRoute();
        });
      } else if (!dropoffCoords) {
        dropoffCoords = [lat, lng];
        if (dropoffMarker) map.removeLayer(dropoffMarker);
        dropoffMarker = L.marker(dropoffCoords, { icon: makeIcon('custom-dropoff', '🏁'), draggable: true }).addTo(map);
        sendMsg({ type: 'dropoff_geocoded', lat: lat, lng: lng });
        reverseGeocode(lat, lng, false);
        dropoffMarker.on('dragend', function(ev) {
          var ll = ev.target.getLatLng();
          dropoffCoords = [ll.lat, ll.lng];
          sendMsg({ type: 'dropoff_geocoded', lat: ll.lat, lng: ll.lng });
          reverseGeocode(ll.lat, ll.lng, false);
          drawRoute();
        });
        drawRoute();
      } else {
        dropoffCoords = [lat, lng];
        if (dropoffMarker) map.removeLayer(dropoffMarker);
        dropoffMarker = L.marker(dropoffCoords, { icon: makeIcon('custom-dropoff', '🏁'), draggable: true }).addTo(map);
        sendMsg({ type: 'dropoff_geocoded', lat: lat, lng: lng });
        reverseGeocode(lat, lng, false);
        dropoffMarker.on('dragend', function(ev) {
          var ll = ev.target.getLatLng();
          dropoffCoords = [ll.lat, ll.lng];
          sendMsg({ type: 'dropoff_geocoded', lat: ll.lat, lng: ll.lng });
          reverseGeocode(ll.lat, ll.lng, false);
          drawRoute();
        });
        drawRoute();
      }
    });
  }

  sendMsg({ type: 'ready' });
}

var messageHandler = function(event) {
  try {
    var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (data.action === 'init') { initMap(data); }
    else if (data.action === 'set_pickup') { geocode(data.address, true); }
    else if (data.action === 'set_dropoff') { geocode(data.address, false); }
    else if (data.action === 'set_pickup_coords') {
      pickupCoords = [data.lat, data.lng];
      if (pickupMarker) map.removeLayer(pickupMarker);
      pickupMarker = L.marker(pickupCoords, { icon: makeIcon('custom-pickup', '📍'), draggable: true }).addTo(map);
      map.setView(pickupCoords, 15);
      if (dropoffCoords) drawRoute();
    }
    else if (data.action === 'set_dropoff_coords') {
      dropoffCoords = [data.lat, data.lng];
      if (dropoffMarker) map.removeLayer(dropoffMarker);
      dropoffMarker = L.marker(dropoffCoords, { icon: makeIcon('custom-dropoff', '🏁'), draggable: true }).addTo(map);
      if (pickupCoords) drawRoute();
    }
    else if (data.action === 'update_driver') {
      updateDriver(data.lat, data.lng);
    }
    else if (data.action === 'trip_started') {
      tripStarted = true;
      // Switch to showing pickup→dropoff route
      if (driverRouteLine) { map.removeLayer(driverRouteLine); driverRouteLine = null; }
      if (pickupCoords && dropoffCoords) drawRoute();
    }
    else if (data.action === 'set_user') { setUserLocation(data.lat, data.lng); }
    else if (data.action === 'set_nearby_drivers') { setNearbyDrivers(data.drivers); }
  } catch(e) {}
};
document.addEventListener('message', messageHandler);
window.addEventListener('message', messageHandler);
</script>
</body>
</html>`;

const LeafletMap = forwardRef<LeafletMapRef, LeafletMapProps>(
  (
    {
      pickupAddress,
      dropoffAddress,
      mode = "picker",
      vehicleType = "car",
      onMessage,
      style,
      driverLat,
      driverLng,
      userLat,
      userLng,
      nearbyDrivers,
      pickupLat,
      pickupLng,
      dropoffLat,
      dropoffLng,
      tripStarted = false,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);

    const sendCommand = useCallback((data: object) => {
      webViewRef.current?.injectJavaScript(`
        (function() {
          var e = new Event('message');
          e.data = ${JSON.stringify(JSON.stringify(data))};
          document.dispatchEvent(e);
          window.dispatchEvent(e);
        })();
        true;
      `);
    }, []);

    useImperativeHandle(ref, () => ({ sendCommand }), [sendCommand]);

    const onLoadEnd = useCallback(() => {
      const initData = {
        action: "init",
        mode,
        vehicleType,
        pickup: pickupAddress,
        dropoff: dropoffAddress,
        center: [31.5204, 74.3587],
        userLat,
        userLng,
        driverLat,
        driverLng,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        tripStarted,
        nearbyDrivers: nearbyDrivers ?? [],
      };
      webViewRef.current?.injectJavaScript(`
        (function() {
          var e = new Event('message');
          e.data = ${JSON.stringify(JSON.stringify(initData))};
          document.dispatchEvent(e);
          window.dispatchEvent(e);
        })();
        true;
      `);
    }, [pickupAddress, dropoffAddress, mode, vehicleType, driverLat, driverLng, userLat, userLng, pickupLat, pickupLng, dropoffLat, dropoffLng, tripStarted]);

    const handleMessage = useCallback(
      (event: any) => {
        try {
          const data: MapMessage = JSON.parse(event.nativeEvent.data);
          onMessage?.(data);
        } catch {}
      },
      [onMessage]
    );

    if (Platform.OS === "web") {
      return (
        <View style={[styles.container, style]}>
          <WebView
            ref={webViewRef}
            source={{ html: MAP_HTML }}
            style={styles.webview}
            onLoadEnd={onLoadEnd}
            onMessage={handleMessage}
            scrollEnabled={false}
            allowsInlineMediaPlayback
            javaScriptEnabled
          />
        </View>
      );
    }

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          source={{ html: MAP_HTML }}
          style={styles.webview}
          onLoadEnd={onLoadEnd}
          onMessage={handleMessage}
          scrollEnabled={false}
          allowsInlineMediaPlayback
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          mixedContentMode="always"
        />
      </View>
    );
  }
);

export default LeafletMap;

const styles = StyleSheet.create({
  container: { overflow: "hidden" },
  webview: { flex: 1, backgroundColor: "#d4e8d4" },
});
