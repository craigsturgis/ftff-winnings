const bbPromise = require("bluebird");
const util = require('util');
const _ = require('lodash');
const FantasySports = require('FantasySports');

const baseUrl = "http://fantasysports.yahooapis.com/fantasy/v2",
  leagueId = "nfl.l.318700";

module.exports = {
  cumulativePoints: cumulativePoints
};

function cumulativePoints(playerKeyArray, throughWeek, req, res) {

  var apiUrls = _.map(_.range(1, throughWeek + 1), function(weekNum) {
    return getApiUrlForWeek(playerKeyArray, weekNum);
  });

  var playerPointsMap = {};

  // console.log(apiUrls);

  return bbPromise.map(apiUrls, function(apiUrl) {
    return bbPromise.resolve(FantasySports
      .request(req, res)
      .api(apiUrl))
      .then(function(data) {
        var playersObj = data.fantasy_content.league[1].players;

        _.forEach(playersObj, function(player) {
          if (player.player) {

            var pk = player.player[0][0].player_key;

            if (!playerPointsMap[pk]) {
              playerPointsMap[pk] = {
                player_key: pk,
                pointTotal: 0,
                weeks: []
              };
            }

            var weekTotal = _.toNumber(player.player[1].player_points.total);
            var week = _.toNumber(player.player[1].player_points[0].week);

            playerPointsMap[pk].pointTotal += weekTotal;

            playerPointsMap[pk].weeks[week] = weekTotal;
          }

        });
      });

  }).then(function(resultsArray) {
    return playerPointsMap;
  });

}

function getApiUrlForWeek(playerKeyArray, weekNum) {

  return apiUrl = [
    [
      baseUrl,
      'league',
      leagueId,
      "players;player_keys=",
    ].join('/'),
    playerKeyArray.join(','),
    '/stats',
    ';type=week;week=',
    weekNum,
    ';year=2016?format=json',
  ].join('');

}
