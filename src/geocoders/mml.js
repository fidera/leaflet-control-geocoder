import L from 'leaflet';
import { template, getJSON } from '../util';

export var Mml = L.Class.extend({
  options: {
    serviceUrl: 'https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v2/pelias/',
    apiKey: null, // MML API-key
    geocodingQueryParams: {},
    reverseQueryParams: {},
    htmlTemplate: function(r) {
      console.log(r);
      
      var a = r.address,
        // className,
        parts = [];
      // if (a.road || a.building) {
      //   parts.push('{building} {road} {house_number}');
      // }

      // if (a.city || a.town || a.village || a.hamlet) {
      //   className = parts.length > 0 ? 'leaflet-control-geocoder-address-detail' : '';
      //   parts.push(
      //     '<span class="' + className + '">{postcode} {city} {town} {village} {hamlet}</span>'
      //   );
      // }

      // if (a.state || a.country) {
      //   className = parts.length > 0 ? 'leaflet-control-geocoder-address-context' : '';
      //   parts.push('<span class="' + className + '">{state} {country}</span>');
      // }

      return template(parts.join('<br/>'), a, true);
    }
  },

  initialize: function(options) {
    console.log(options);
    // Should return an error if an API key is missing.
    // Merge options passed to constructor with the defaults defines in the class.
    L.Util.setOptions(this, options);
  },

  geocode: function(query, cb, context) {
    console.log(query, cb, context);
    getJSON(
      this.options.serviceUrl + 'search',
      L.extend(
        {
          'api-key': this.options.apiKey,
          text: query,
          sources: 'geographic-names',
          crs: 'EPSG:4326', // Leaflet's map display CRS is different from the map's data CRS which EPSG:4326.
          lang: 'fi'
        },
        this.options.geocodingQueryParams
      ),
      L.bind(function(data) {
        console.log(data);
        
        var features = data.features;
        var results = [];
        
        for (var i = features.length - 1; i >= 0; i--) {
          // var bbox = features[i].boundingbox;
          // for (var j = 0; j < 4; j++) bbox[j] = parseFloat(bbox[j]);
          // Reverse the coordinates array because the coordinates are in the wrong order for L.latLng.
          var c =  features[i].geometry.coordinates.reverse();
          results[i] = {
            // icon: features[i].icon,
            name: "",
            html: this.options.htmlTemplate ? this.options.htmlTemplate(features[i]) : undefined,
            bbox: L.latLngBounds(c, c),
            center: L.latLng(c[0], c[1]),
            // properties: data[i]
          };
        }

        cb.call(context, results);
      }, this)
    );
  },

  // Reverse geocoding is not used, so this can be removed.
  reverse: function(location, scale, cb, context) {
    console.log(location, scale, cb, context);
    getJSON(
      this.options.serviceUrl + 'reverse',
      L.extend(
        {
          'api-key': this.options.apiKey,
          lat: location.lat,
          lon: location.lng,
          zoom: Math.round(Math.log(scale / 256) / Math.log(2)),
        },
        this.options.reverseQueryParams
      ),
      L.bind(function(data) {
        var result = [],
          loc;

        if (data && data.lat && data.lon) {
          loc = L.latLng(data.lat, data.lon);
          result.push({
            name: data.display_name,
            html: this.options.htmlTemplate ? this.options.htmlTemplate(data) : undefined,
            center: loc,
            bounds: L.latLngBounds(loc, loc),
            properties: data
          });
        }

        cb.call(context, result);
      }, this)
    );
  }
});

export function mml(options) {
  return new Mml(options);
}
