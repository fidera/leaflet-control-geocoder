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

/**
 * Formats address properties.
 * @param {object} properties
 * @returns {object}
 */
function formatAddresses(properties) {
  return {
    name: properties.label, 
    country: properties.country,
    municipality: properties["label:municipality"],
    continent: properties.continent
  };
}

/**
 * Formats geographic name properties.
 * @param {object} properties
 * @returns {object}
 */
function formatGeographicNames(properties) {
  var names = properties.name;
  var name = findNewestObject(names, "placeNameCreationTime");
  return {
    name: name.spelling,
    country: properties.country,
    region: properties["label:region"],
    municipality: properties["label:municipality"],
    continent: properties.continent
  };
}

/**
 * Formats interpolated road address properties.
 * @param {object} properties
 * @returns {object}
 */
function formatInterpolatedRoadAddresses(properties) {
  return {
    name: properties.label, 
    country: properties.country,
    municipality: properties["label:municipality"],
    continent: properties.continent
  };
}

/**
 * Formats cadastral unit properties.
 * @param {object} properties
 * @returns {object}
 */
function formatCadastralUnits(properties) {
  return {
    name: properties.label, 
    country: properties.country,
    region: properties["label:municipality"],
    continent: properties.continent
  };
}

export var Mml = L.Class.extend({
  options: {
    serviceUrl: 'https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v2/pelias/',
    apiKey: null, 
    sources: null,
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
          sources: this.options.sources ? this.options.sources : SOURCES.ADDRESSES, 
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

          if (this.options.sources == SOURCES.ADDRESSES) {
            properties = formatAddresses(features[i].properties);
          }
          if (this.options.sources == SOURCES.GEOGRAPHIC_NAMES) {
            properties = formatGeographicNames(features[i].properties);
          }
          if (this.options.sources == SOURCES.INTERPOLATED_ROAD_ADDRESSES) {
            properties = formatInterpolatedRoadAddresses(features[i].properties);
          }
          if (this.options.sources == SOURCES.CADASTRAL_UNITS) {
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
    return console.error("Reverse geocoding is not supported.")
  }
});

export function mml(options) {
  return new Mml(options);
}
