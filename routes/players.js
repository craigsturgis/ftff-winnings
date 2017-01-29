var express = require('express');
var router = express.Router();
var FantasySports = require('FantasySports');
var _ = require('lodash');
const util = require('util');
const bbPromise = require("bluebird");

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

console.log(apiUrl);

router.get('/', function(req, res) {
  //console.log("isAuthenticated: " + FantasySports.isAuthenticated);

  bbPromise
  .resolve(FantasySports
    .request(req, res)
    .api(apiUrl))
  .then(function(data) {

    var leagueObj = data.fantasy_content.league[0];
    var playersObj = data.fantasy_content.league[1].players;

    var players = [];

    _.forEach(playersObj, function(player) {
      if (player.player) {

        console.log(util.inspect(player.player, {depth: 5}));

        players.push({
          player_key: player.player[0][0].player_key,
          name: player.player[0][2].name.full,
          // position: player.player[0][11].display_position,
          week_17_points: player.player[1].player_points.total,
          owner_team_key: player.player[2].ownership.owner_team_key || null,
          owner_team_name: player.player[2].ownership.owner_team_name || 'NOBODY!',
          // owner_count: player.player[2].ownership[0],
        });

        console.log('_______________');
      }

    });

    //console.log(util.inspect(playersObj, {depth: null}))
    console.log(util.inspect(players, {depth: null}))

    res.send("OK");

  });
});

module.exports = router;
