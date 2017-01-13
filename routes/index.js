var express = require('express');
var router = express.Router();
var marko = require('marko');
var FantasySports = require('FantasySports');
var _ = require('lodash');

/* GET home page. */

var indexTemplate = marko.load(require.resolve('../views/index.marko'));
router.get('/', function(req, res) {
  //console.log("isAuthenticated: " + FantasySports.isAuthenticated);

  try {
    FantasySports
    .request(req, res)
    .api('http://fantasysports.yahooapis.com/fantasy/v2/league/nfl.l.318700/standings;year=2016?format=json')
    .done(function(data) {

      var leagueObj = data.fantasy_content.league[0];
      var standingsObj = data.fantasy_content.league[1].standings[0];

      FantasySports
      .request(req, res)
      //.api('http://fantasysports.yahooapis.com/fantasy/v2/team/nfl.l.318700.t.1/stats;year=2016;type=week;week=13?format=json')
      //.api('http://fantasysports.yahooapis.com/fantasy/v2/team/nfl.l.318700.t.1/standings;year=2016;week=3?format=json')
      .api('http://fantasysports.yahooapis.com/fantasy/v2/league/nfl.l.318700/standings;year=2016?format=json')
      .done(function(sbData) {


        var teamArray = [];
        var regSeasonWinner = null;

        //console.dir(req.session);
        //console.dir(leagueObj);
        console.dir(sbData.fantasy_content.league[1].standings[0].teams[7].team[2]);
        //console.dir(sbData.fantasy_content.team[1]);

        _.forEach(standingsObj.teams, function(team) {

          if (team.team) {
            //console.log(team.team);

            var teamResult = {
              totalWinnings: 0,
              finalPrizes: [],
            };

            //console.log(team.team[0]);

            //get team name
            if (team.team[0]) {
              _.assign(teamResult, _.find(team.team[0], function(o) {
                if (o.name) return o;
              }));

              _.assign(teamResult, _.find(team.team[0], function(o) {
                if (o.team_key) return o;
              }));
            }

            //find playoff winners, regular season winner
            if (team.team[2]) {
              var team_standings = team.team[2].team_standings;
              var rank = team_standings.rank;

              //console.log("rank: " + rank);

              if (rank === 1) {
                teamResult.finalPrizes.push({
                  prizeName: "Playoffs Champion",
                  winnings: 300
                });
                teamResult.totalWinnings += 300;
              }

              if (rank === 2) {
                teamResult.finalPrizes.push({
                  prizeName: "Playoffs Runner Up",
                  winnings: 200
                });
                teamResult.totalWinnings += 200;
              }

              if (rank === 3) {
                teamResult.finalPrizes.push({
                  prizeName: "3rd place game winner",
                  winnings: 100
                });
                teamResult.totalWinnings += 100;
              }

              _.assign(teamResult, {
                wins: _.toNumber(team_standings.outcome_totals.wins),
                losses: _.toNumber(team_standings.outcome_totals.losses),
                pointsFor: _.toNumber(team_standings.points_for),
                pointsAgainst: _.toNumber(team_standings.points_against)
              });

              if (!regSeasonWinner || teamResult.wins > regSeasonWinner.wins ||
                (teamResult.wins === regSeasonWinner.wins && teamResult.pointsFor > regSeasonWinner.pointsFor)) {
                regSeasonWinner = teamResult;
              }
            }

            //console.log(teamResult);
            teamArray.push(teamResult);
          }

        });

        regSeasonWinner.finalPrizes.push({
          prizeName: "Regular season best record",
          winnings: 50
        });
        regSeasonWinner.totalWinnings += 50;
        //console.dir(teamArray);

        indexTemplate.render({
          $global: {
            ENV_DEVELOPMENT: req.app.locals.ENV_DEVELOPMENT,
            isAuthenticated: FantasySports.isAuthenticated
          },
          title: leagueObj.name,
          teams: teamArray
        }, res);
      });
    });
  }

  catch(err) {
    console.log("hjalp!");
    console.dir(err);
  }

});

module.exports = router;
