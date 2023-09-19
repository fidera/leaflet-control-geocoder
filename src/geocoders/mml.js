/**
 * mml.js
 * 
 * Geocoder for the Maanmittauslaitos geocoding API.
 */

import L from 'leaflet';
import { template, getJSON } from '../util';

/**
 * Geocoder source types supported by the geocoding API of Maanmittauslaitos.
 */
var SOURCES = {
  ADDRESSES: 'addresses',
  GEOGRAPHIC_NAMES: 'geographic-names',
  INTERPOLATED_ROAD_ADDRESSES: 'interpolated-road-addresses',
  CADASTRAL_UNITS: 'cadastral-units'
}

/**
 * Finds the newest object from an array.
 * @param {array} arr - An array of objects
 * @param {string} property - The name of a property which can be converted to a Date object.
 * @returns {object}
 */
function findNewestObject(arr, property) {
  var newestObject = null;
  var newestTimestamp = null;
  for (var index in arr) {
    var obj = arr[index];
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
  var name = "";
  if (properties.katunimi) name = properties.katunimi;
  if (properties.katunumero) name = name + " " + properties.katunumero;
  return {
    name: name,
    postalCode: properties.postinumero,
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
  var name = "";
  if (properties.katunimi) name = properties.katunimi;
  if (properties.katunumero) name = name + " " + properties.katunumero;
  return {
    name: name, 
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
    /**
     * @param {object} properties
     */
    htmlTemplate: function(properties) {
      var parts = [];
      var nameStyle = "color: black;";
      var subTitleStyle = "color: black; opacity: 0.75;";
      
      if (properties.name) {
        parts.push('<span style="' + nameStyle + '">' + properties.name + '</span>');
      }  
      if (properties.region) {
        parts.push('<span style="' + subTitleStyle + '">' + properties.region + '</span>');
      }
      if (properties.municipality) {
        var municipalityText = properties.municipality;
        if (properties.postalCode) {
          municipalityText = properties.postalCode + " " + municipalityText;
        }
        parts.push('<span style="' + subTitleStyle + '">' + municipalityText + '</span>');
      }
      if (properties.country) {
        parts.push('<span style="' + subTitleStyle + '">' + properties.country + '</span>');
      }
      
      return template(parts.join('<br/>'), properties, true);
    }
  },

  /**
   * @param {object} options
   * @param {string} options.serviceUrl - The URL where the data is requested from. Defaults to https://avoin-paikkatieto.maanmittauslaitos.fi/geocoding/v2/pelias/.
   * @param {string} options.apiKey - MML API key
   * @param {string} options.sources - The source string. Check the SOURCES variable for available options.
   */
  initialize: function(options) {
    if (!options.apiKey) return console.error("Error: API key is missing.");
    L.Util.setOptions(this, options);
  },

  geocode: function(query, cb, context) {
    getJSON(
      this.options.serviceUrl + 'search',
      L.extend(
        {
          'api-key': this.options.apiKey,
          text: query, 
          sources: this.options.sources ? this.options.sources : SOURCES.ADDRESSES, 
          // Leaflet's map display CRS is different from the map's data CRS which EPSG:4326.
          crs: 'EPSG:4326',
          lang: 'fi'
        },
        this.options.geocodingQueryParams
      ),
      L.bind(function(data) {
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

          // Reverse the coordinates array because the coordinates are in the wrong order for L.latLng.
          var c =  features[i].geometry.coordinates.reverse();
          results[i] = {
            name: properties.name,
            html: this.options.htmlTemplate ? this.options.htmlTemplate(properties) : undefined,
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
