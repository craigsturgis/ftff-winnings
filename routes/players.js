var express = require('express');
var router = express.Router();
var FantasySports = require('FantasySports');
var _ = require('lodash');
const marko = require('marko');
const util = require('util');
const bbPromise = require("bluebird");
const player = require("../helpers/player");
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

  const playerMap = {};
  const playerArray = [];
  const teamMap = {};
  const teamArray = [];

  let highestScoringArray = null;
  let marisaArray = null;
  let mysteryRoundArray = null;

  bbPromise
  .resolve(FantasySports
    .request(req, res)
    .api(apiUrl))
  .then(function(data) {

    const leagueObj = data.fantasy_content.league[0];
    const playersObj = data.fantasy_content.league[1].players;

    _.forEach(playersObj, function(player) {
      if (player.player) {

        // console.log(util.inspect(player.player, {depth: 5}));

        const playerObj = {
          player_key: player.player[0][0].player_key,
          name: player.player[0][2].name.full,
          // position: player.player[0][11].display_position,
          week_17_points: player.player[1].player_points.total,
          owner_team_key: player.player[2].ownership.owner_team_key || null,
          owner_team_name: player.player[2].ownership.owner_team_name || 'NOBODY!',
          populated: true,
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

    let keys = _.map(playerArray, function(playerObj) {
      return playerObj.player_key;
    });

    return player.cumulativePoints(keys, 13, req, res);

  }).then(function(pointsMap) {

    // console.log(util.inspect(pointsMap, {depth: null}))

    _.forEach(pointsMap, function(playerTotal) {
      let playerObj = playerMap[playerTotal.player_key];

      playerObj = updatePlayerFromPointsTotal(playerObj, playerTotal);
    });

    highestScoringArray = _.orderBy(playerArray, ['week_13_points'], ['desc']);

    // console.log(util.inspect(highestScoringArray, {depth: null}));
    return draftResults.firstTwoRounds(req, res);

  }).then(function(firstTwoRounds) {

    // console.log(util.inspect(firstTwoRounds, {depth: null}));

    let keys = _.map(firstTwoRounds, function(draftPick) {

      if (!teamMap[draftPick.team_key]) {
        const teamObj = {
          team_key: draftPick.team_key,
          firstTwoRoundsTotal: 0,
          mysteryRoundTotal: 0,
          picks: [],
          // picksMap: {},
        };

        teamMap[draftPick.team_key] = teamObj;
        teamArray.push(teamObj);
      }

      return populatePlayerFromDraftPickAndReturnPlayerKey(draftPick);
    });

    // console.log(util.inspect(keys, {depth: null}));
    return player.cumulativePoints(keys, 13, req, res);

  }).then(function(pointsMap) {

    _.forEach(pointsMap, function(playerTotal) {
      let playerObj = playerMap[playerTotal.player_key];
      playerObj = updatePlayerFromPointsTotal(playerObj, playerTotal);

      teamMap[playerObj.drafted_team_key].firstTwoRoundsTotal += playerObj.week_13_points;
    });

    marisaArray = _.orderBy(teamArray, ['firstTwoRoundsTotal'], ['asc']);

    // console.log(util.inspect(marisaArray, {depth: null}));

    return draftResults.mysteryRound(req, res);

  }).then(function(mysteryRound) {

    let keys = _.map(mysteryRound, function(draftPick) {

      return populatePlayerFromDraftPickAndReturnPlayerKey(draftPick);

    });
    // console.log(util.inspect(mysteryRound, {depth: null}));

    return player.cumulativePoints(keys, 13, req, res);

  }).then(function(pointsMap) {

    _.forEach(pointsMap, function(playerTotal) {
      let playerObj = playerMap[playerTotal.player_key];
      playerObj = updatePlayerFromPointsTotal(playerObj, playerTotal);

      teamMap[playerObj.drafted_team_key].mysteryRoundTotal += playerObj.week_13_points;
    });

    mysteryRoundArray = marisaArray = _.orderBy(teamArray, ['mysteryRoundTotal'], ['desc']);

    console.log(util.inspect(mysteryRoundArray[0], {depth: null}));

    playersTemplate.render({
      $global: {
        ENV_DEVELOPMENT: req.app.locals.ENV_DEVELOPMENT,
        isAuthenticated: FantasySports.isAuthenticated
      },
      highestScoring: _.take(highestScoringArray, 1)[0],
      highestScoringRunnersUp: _.take(highestScoringArray, 5),
    }, res);

  }).catch(function(e) {
    console.error(util.inspect(e, {depth: null}));

    res.status(e.statusCode).send('error!');
  });

function updatePlayerFromPointsTotal(playerObj, playerTotal) {
  if (!playerObj.week_13_points) {
    playerObj.week_13_points = playerTotal.pointTotal;
    playerObj.week_13_points_display = playerTotal.pointTotal.toFixed(2);
    playerObj.weeks = playerTotal.weeks;
    playerObj.pointBreakdown = _.reduce(playerTotal.weeks, function(result, value, key) {
      if (value) {
        result += value.toFixed(2) + ' ';

        if (key != playerObj.weeks.length - 1) {
          result += '+ ';
        }
      }

      return result;
    }, '');
  }

  return playerObj;
}

function populatePlayerFromDraftPickAndReturnPlayerKey(draftPick) {
  if (!playerMap[draftPick.player_key]) {
    playerMap[draftPick.player_key] = {
      player_key: draftPick.player_key,
      populated: false
    };
  }

  let playerObj = playerMap[draftPick.player_key];
  playerObj.drafted_team_key = draftPick.team_key;
  playerObj.drafted_round = draftPick.round;

  teamMap[draftPick.team_key].picks.push(playerObj);
  return draftPick.player_key;
}



});

module.exports = router;

