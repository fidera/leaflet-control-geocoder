import L from 'leaflet';
import { template, getJSON } from '../util';

var SOURCES = {
  ADDRESSES: 'addresses',
  GEOGRAPHIC_NAMES: 'geographic-names',
  INTERPOLATED_ROAD_ADDRESSES: 'interpolated-road-addresses',
  CADASTRAL_UNITS: 'cadastral-units'
}

function findNewestObject(arr, property) {
  var newestObject = null;
  var newestTimestamp = null;
  for (const obj of arr) {
    var timestamp = new Date(obj[property]).getTime();
    if (newestTimestamp === null || timestamp > newestTimestamp) {
      newestTimestamp = timestamp;
      newestObject = obj;
    }
  }
  return newestObject;
}

// Formats address properties.
function formatAddresses(properties) {
  return properties;
}

// Formats geographic name properties.
function formatGeographicNames(properties) {
  var names = properties.name;
  var name = findNewestObject(names, "placeNameCreationTime");
  return {
    name: name.spelling
  };
}

// Formats interpolated road address properties.
function formatInterpolatedRoadAddresses(properties) {
  return properties;
}

// Formats cadastral unit properties.
function formatCadastralUnits(properties) {
  return properties;
}

export var Mml = L.Class.extend({
  options: {
    serviceUrl: 'https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v2/pelias/',
    apiKey: null, // MML API-key
    geocodingQueryParams: {
      sources: SOURCES.GEOGRAPHIC_NAMES
    },
    reverseQueryParams: {},
    htmlTemplate: function(r) {
      console.log(r);
      
      var a = r.address;
      var parts = [];

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
          sources: this.options.geocodingQueryParams.sources ? this.options.geocodingQueryParams.sources : SOURCES.GEOGRAPHIC_NAMES, // Change default to addresses.
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
          var properties;

          if (this.options.geocodingQueryParams.sources == SOURCES.ADDRESSES) {
            properties = formatAddresses(features[i].properties);
          }
          if (this.options.geocodingQueryParams.sources == SOURCES.GEOGRAPHIC_NAMES) {
            properties = formatGeographicNames(features[i].properties);
          }
          if (this.options.geocodingQueryParams.sources == SOURCES.INTERPOLATED_ROAD_ADDRESSES) {
            properties = formatInterpolatedRoadAddresses(features[i].properties);
          }
          if (this.options.geocodingQueryParams.sources == SOURCES.CADASTRAL_UNITS) {
            properties = formatCadastralUnits(features[i].properties);
          }

          console.log(properties);

          // Reverse the coordinates array because the coordinates are in the wrong order for L.latLng.
          var c =  features[i].geometry.coordinates.reverse();
          results[i] = {
            name: properties.name,
            html: this.options.htmlTemplate ? this.options.htmlTemplate(features[i]) : undefined,
            bbox: L.latLngBounds(c, c),
            center: L.latLng(c[0], c[1]),
          };
        }

        cb.call(context, results);
      }, this)
    );
  },

  reverse: function() {
    console.log("Reverse geocoding is not supported.")
  }
});

export function mml(options) {
  return new Mml(options);
}
