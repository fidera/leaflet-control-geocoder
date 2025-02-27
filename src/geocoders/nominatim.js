import L from 'leaflet';
import { template, getJSON } from '../util';

export var Nominatim = L.Class.extend({
  options: {
    serviceUrl: 'https://nominatim.openstreetmap.org/',
    geocodingQueryParams: {},
    reverseQueryParams: {},
    htmlTemplate: function(r) {
      var nameStyle = "color: black;";
      var subTitleStyle = "color: black; opacity: 0.75;";

      var a = r.address,
        parts = [];
      if (a.road || a.building) {
        parts.push('<span style="' + nameStyle + '">' + '{building} {road} {house_number}</span>');
      }

      if (a.city || a.town || a.village || a.hamlet) {
        var style = parts.length > 0 ? subTitleStyle : nameStyle;
        parts.push('<span style="' + style + '">' + '{postcode} {city} {town} {village} {hamlet}</span>');
      }

      if (a.state || a.country) {
        var style = parts.length > 0 ? subTitleStyle : nameStyle;
        parts.push('<span style="' + style + '">' + '{state} {country}</span>');
      }

      return template(parts.join('<br/>'), a, true);
    }
  },

  initialize: function(options) {
    L.Util.setOptions(this, options);
  },

  geocode: function(query, cb, context) {
    getJSON(
      this.options.serviceUrl + 'search',
      L.extend(
        {
          q: query,
          limit: 5,
          format: 'json',
          addressdetails: 1
        },
        this.options.geocodingQueryParams
      ),
      L.bind(function(data) {
        var results = [];
        for (var i = data.length - 1; i >= 0; i--) {
          var bbox = data[i].boundingbox;
          for (var j = 0; j < 4; j++) bbox[j] = parseFloat(bbox[j]);
          results[i] = {
            icon: data[i].icon,
            name: data[i].display_name,
            html: this.options.htmlTemplate ? this.options.htmlTemplate(data[i]) : undefined,
            bbox: L.latLngBounds([bbox[0], bbox[2]], [bbox[1], bbox[3]]),
            center: L.latLng(data[i].lat, data[i].lon),
            properties: data[i]
          };
        }
        cb.call(context, results);
      }, this)
    );
  },

  reverse: function(location, scale, cb, context) {
    getJSON(
      this.options.serviceUrl + 'reverse',
      L.extend(
        {
          lat: location.lat,
          lon: location.lng,
          zoom: Math.round(Math.log(scale / 256) / Math.log(2)),
          addressdetails: 1,
          format: 'json'
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

export function nominatim(options) {
  return new Nominatim(options);
}
