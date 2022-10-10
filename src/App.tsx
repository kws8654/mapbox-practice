import React, { useState, useRef, useEffect } from 'react';
import mapboxgl from 'mapbox-gl'; // eslint-disable-line import/no-webpack-loader-syntax
import './App.css';

mapboxgl.accessToken = 'pk.eyJ1Ijoia3dzODY1NCIsImEiOiJjbDhpbXlna3owMm40M3ZzZHVwcDA3YXpvIn0.Vxh_2fvvyj4xiLjle7wdxg';

function App() {
  const mapContainer = useRef<any>(null);
  const map = useRef<any>(null);
  const [lng, setLng] = useState(127.157264);
  const [lat, setLat] = useState(37.4616957);
  const [zoom, setZoom] = useState(15);
  const [bounds, setBounds] = useState([
    [-123.069003, 45.395273],
    [-122.303707, 45.612333],
  ]);
  const [start, setStart] = useState([127.157264, 37.4616957]);

  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [lng, lat],
      zoom: zoom,
    });
    // map.current.setMaxBounds(bounds); // 추가하면 위도, 경도 제한 걸림

    if (!map.current) return; // wait for map to initialize
    map.current.on('move', () => {
      setLng(map.current.getCenter().lng.toFixed(4));
      setLat(map.current.getCenter().lat.toFixed(4));
      setZoom(map.current.getZoom().toFixed(2));
    });

    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        // When active the map will receive updates to the device's location as it changes.
        trackUserLocation: true,
        // Draw an arrow next to the location dot to indicate which direction the device is heading.
        showUserHeading: true,
      }).on('geolocate', (e: any) => {
        console.log(e.coords.longitude);
        console.log(e.coords.latitude);
        setStart([e.coords.longitude, e.coords.latitude]);
      }),
    );

    async function getRoute(end: any) {
      // make a directions request using cycling profile
      // an arbitrary start will always be the same
      // only the end or destination will change
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/cycling/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
        { method: 'GET' },
      );
      const json = await query.json();
      const data = json.routes[0];
      const route = data.geometry.coordinates;
      const geojson = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: route,
        },
      };
      // if the route already exists on the map, we'll reset it using setData
      if (map.current.getSource('route')) {
        map.current.getSource('route').setData(geojson);
      }
      // otherwise, we'll make a new request
      else {
        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: {
            type: 'geojson',
            data: geojson,
          },
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3887be',
            'line-width': 5,
            'line-opacity': 0.75,
          },
        });
      }
      // add turn instructions here at the end
    }
    map.current.on('load', () => {
      // make an initial directions request that
      // starts and ends at the same location
      getRoute(start);

      // Add starting point to the map
      map.current.addLayer({
        id: 'point',
        type: 'circle',
        source: {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                properties: {},
                geometry: {
                  type: 'Point',
                  coordinates: start,
                },
              },
            ],
          },
        },
        paint: {
          'circle-radius': 10,
          'circle-color': '#3887be',
        },
      });
      // this is where the code from the next step will go
    });

    map.current.on('click', (event: any) => {
      const coords = Object.keys(event.lngLat).map((key) => event.lngLat[key]);
      const end = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'Point',
              coordinates: coords,
            },
          },
        ],
      };
      if (map.current.getLayer('end')) {
        map.current.getSource('end').setData(end);
      } else {
        map.current.addLayer({
          id: 'end',
          type: 'circle',
          source: {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'Point',
                    coordinates: coords,
                  },
                },
              ],
            },
          },
          paint: {
            'circle-radius': 10,
            'circle-color': '#f30',
          },
        });
      }
      getRoute(coords);
    });
  });

  return (
    <>
      <div>
        <div className='sidebar'>
          Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
        </div>
        <div ref={mapContainer} className='map-container' />
      </div>
    </>
  );
}

export default App;
