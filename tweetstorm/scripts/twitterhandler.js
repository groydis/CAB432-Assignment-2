var twitter = require('twitter');
var Promise = require('bluebird');

const config = require('../config.js');

const client = new twitter({
  consumer_key: config.twitter.consumer.key,
  consumer_secret: config.twitter.consumer.secret,
  access_token_key: config.twitter.access.key,
  access_token_secret: config.twitter.access.secret
});

module.exports = {
  stream: function(query) {
    return client.stream('status/filter', {language: 'en', track: query});
  },

  trends: function(location) {
    return new Promise( function(resolve, reject) {
      var parameters = {id: location };
      client.get('trends/place', parameters, function (error, results) {
        if (!error) {
          var trends = [];
          for (var i = 0; i < results[0].trends.length; i++) {
            let trend = {
              title: results[0].trends[i].name,
              volume: results[0].trends[i].tweet_volume
            }
            trends[i] = trend;
          }
          return resolve(trends);
        } else {
          console.log(error);
          return reject(error);
        }
      });
    });
  }

};