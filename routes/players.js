var express = require('express');
var router = express.Router();
var FantasySports = require('FantasySports');
var _ = require('lodash');
const marko = require('marko');
const util = require('util');
const bbPromise = require("bluebird");
const cumulativePoints = require("../helpers/cumulativePoints");
const draftResults = require('../helpers/draftResults');


var playersTemplate = marko.load(require.resolve('../views/players.marko'));

/* GET players route. */

const baseUrl = "http://fantasysports.yahooapis.com/fantasy/v2",
  leagueId = "nfl.l.318700";

var apiUrl = [
  [
    baseUrl,
    'league',
    leagueId,
    "players",
  ].join('/'),
  ';out=stats,ownership',
  ';sort=PTS',
  ';year=2016?format=json',
].join('');

router.get('/', function(req, res) {

  var playerMap = {};
  var playerArray = [];
  var highestScoringArray = null;

  bbPromise
  .resolve(FantasySports
    .request(req, res)
    .api(apiUrl))
  .then(function(data) {

    var leagueObj = data.fantasy_content.league[0];
    var playersObj = data.fantasy_content.league[1].players;

    _.forEach(playersObj, function(player) {
      if (player.player) {

        // console.log(util.inspect(player.player, {depth: 5}));

        var playerObj = {
          player_key: player.player[0][0].player_key,
          name: player.player[0][2].name.full,
          // position: player.player[0][11].display_position,
          week_17_points: player.player[1].player_points.total,
          owner_team_key: player.player[2].ownership.owner_team_key || null,
          owner_team_name: player.player[2].ownership.owner_team_name || 'NOBODY!',
        };

        if (player.player[2].ownership[0]) {
          // console.log(util.inspect(player.player[2].ownership, {depth: 5}));
          playerObj.owner_count = player.player[2].ownership[0].teams[0].count;
        }

        playerArray.push(playerObj);
        playerMap[playerObj.player_key] = playerObj;
      }
    });

    //console.log(util.inspect(playersObj, {depth: null}))

    var keys = _.map(playerArray, function(playerObj) {
      return playerObj.player_key;
    });

    return cumulativePoints.playerCumulativePoints(keys, 13, req, res);

  }).then(function(pointsMap) {

    // console.log(util.inspect(pointsMap, {depth: null}))

    _.forEach(pointsMap, function(playerTotal) {
      var player = playerMap[playerTotal.player_key];

      player.week_13_points = playerTotal.pointTotal;
      player.week_13_points_display = playerTotal.pointTotal.toFixed(2);
      player.weeks = playerTotal.weeks;
      player.pointBreakdown = _.reduce(playerTotal.weeks, function(result, value, key) {
        if (value) {
          result += value.toFixed(2) + ' ';

          if (key != player.weeks.length - 1) {
            result += '+ ';
          }
        }

        return result;
      }, '');
    });

    highestScoringArray = _.orderBy(playerArray, ['week_13_points'], ['desc']);

    // console.log(util.inspect(highestScoringArray, {depth: null}));
    return draftResults.firstTwoRounds(req, res);

  }).then(function(firstTwoRounds) {

    console.log(util.inspect(firstTwoRounds, {depth: null}));

    return draftResults.mysteryRound(req, res);

  }).then(function(mysteryRound) {

    console.log(util.inspect(mysteryRound, {depth: null}));

    playersTemplate.render({
      $global: {
        ENV_DEVELOPMENT: req.app.locals.ENV_DEVELOPMENT,
        isAuthenticated: FantasySports.isAuthenticated
      },
      highestScoring: _.take(highestScoringArray, 1)[0],
      highestScoringRunnersUp: _.take(highestScoringArray, 5),
    }, res);

  });
});

module.exports = router;
