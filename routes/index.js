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

      var teamArray = [];
      var teamMap = {};
      var regSeasonWinner = null;
      var highestPointsAgainst = null;

      //console.dir(req.session);
      //console.dir(leagueObj);

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

            //TODO need tie scenario logic
            if (!highestPointsAgainst || teamResult.pointsAgainst > highestPointsAgainst.pointsAgainst) {
              highestPointsAgainst = teamResult;
            }
          }

          //console.log(teamResult);
          teamArray.push(teamResult);
          teamMap[teamResult.team_key] = teamResult;
        }

      });

      regSeasonWinner.finalPrizes.push({
        prizeName: "Regular season best record (" + regSeasonWinner.wins + "-" + regSeasonWinner.losses + ")",
        winnings: 50
      });
      regSeasonWinner.totalWinnings += 50;

      highestPointsAgainst.finalPrizes.push({
        prizeName: "Highest Points against (" + highestPointsAgainst.pointsAgainst + ")",
        winnings: 40
      });
      highestPointsAgainst.totalWinnings += 40;
      //console.dir(teamArray);


      FantasySports
      .request(req, res)
      //.api('http://fantasysports.yahooapis.com/fantasy/v2/team/nfl.l.318700.t.1/stats;year=2016;type=week;week=13?format=json')
      //.api('http://fantasysports.yahooapis.com/fantasy/v2/team/nfl.l.318700.t.1/standings;year=2016;week=3?format=json')
      .api('http://fantasysports.yahooapis.com/fantasy/v2/league/nfl.l.318700/scoreboard;year=2016;week=1;week=2;week=3;week=4;week=5;week=6;week=7;week=8;week=9;week=10;week=11;week=12;week=13?format=json')
      //.api('http://fantasysports.yahooapis.com/fantasy/v2/league/nfl.l.318700/scoreboard;year=2016;week=1;week=2;week=3;week=4?format=json')
      .done(function(muData) {

        //console.dir(muData.fantasy_content.league[1].standings[0].teams[7].team[2]);
        //console.dir(muData.fantasy_content.league[1].scoreboard[0].matchups[0].matchup);
        //console.log('----');
        //console.dir(muData.fantasy_content.league[1].scoreboard[0].matchups[0].matchup[0].teams[0].team);
        //console.dir(muData.fantasy_content.team[1]);

        var matchupsObj = muData.fantasy_content.league[1].scoreboard[0].matchups;

        var weekWinners = [];

        _.forEach(matchupsObj, function(matchupData) {

          //console.dir(matchupData);

          var matchup = matchupData.matchup;
          if (matchup) {

            var weekNumber = _.toNumber(matchup.week);

            var winner = {
              key: matchup.winner_team_key,
              pointsFor: 0,
              pointsAgainst: 0,
              weekNumber: weekNumber
            };

            //console.dir(matchup);
            //console.dir(matchup[0].teams[0].team[1].team_points.total);

            if (matchup[0].teams[0].team[0][0].team_key === winner.key) {
              //console.log('team0');
              winner.pointsFor = _.toNumber(matchup[0].teams[0].team[1].team_points.total);
              winner.pointsAgainst = _.toNumber(matchup[0].teams[1].team[1].team_points.total);
            } else {
              //console.log('team1');
              winner.pointsFor = _.toNumber(matchup[0].teams[1].team[1].team_points.total);
              winner.pointsAgainst = _.toNumber(matchup[0].teams[0].team[1].team_points.total);
            }

            //console.dir(winner);


          }

          if (!weekWinners[weekNumber] ||
            (weekWinners[weekNumber].pointsFor === winner.pointsFor && weekWinners[weekNumber].pointsAgainst < winner.pointsAgainst) ||
            weekWinners[weekNumber].pointsFor < winner.pointsFor) {

            weekWinners[weekNumber] = winner;
          }
        });

        _.forEach(weekWinners, function(weekWinner) {
          if (weekWinner) {
            teamMap[weekWinner.key].finalPrizes.push({
              prizeName: "Week " + weekWinner.weekNumber + " Highest Points: (" + weekWinner.pointsFor + ")",
              winnings: 20
            });
            teamMap[weekWinner.key].totalWinnings += 20;
          }

        });


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
