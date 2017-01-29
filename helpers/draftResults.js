const bbPromise = require("bluebird");
const util = require('util');
const _ = require('lodash');
const FantasySports = require('FantasySports');

const baseUrl = "http://fantasysports.yahooapis.com/fantasy/v2",
  leagueId = "nfl.l.318700";

module.exports = {
  firstTwoRounds: firstTwoRounds,
  mysteryRound: mysteryRound,
};

const storedDraft = {
  rounds: [],
  picks: [],
  updated: null,
};

const apiUrl = [
  [
    baseUrl,
    'league',
    leagueId,
    'draftresults',
  ].join('/'),
  //TODO: Parameterize year
  ';year=2016?format=json',
].join('');

function firstTwoRounds(req, res) {

  return requestDraftResults(req, res)
  .then(function(draft) {
    return _.slice(draft.rounds, 1, 3);
  });

}

function mysteryRound(req, res) {

  //TODO: parameterize round by year
  const mysteryRound = 14

  return requestDraftResults(req, res)
  .then(function(draft) {
    return draft.rounds[14];
  });

}

function requestDraftResults(req, res) {

  //could use some time block here to recalc after X amt of time
  if (storedDraft.updated === null) {
    console.log('requesting draft results');
    return bbPromise.resolve(FantasySports
    .request(req, res)
    .api(apiUrl))
    .then(function(data) {
      convertDraftResults(data);
      return storedDraft;
    });
  } else {
    console.log('returning stored draft results');
    return bbPromise.resolve(storedDraft);
  }

}

function convertDraftResults(data) {

  var draftObj = data.fantasy_content.league[1].draft_results;

  _.forEach(draftObj, function(draftResult) {

    if (draftResult && draftResult.draft_result) {
      var draftPick = _.assign({}, draftResult.draft_result);

      if (!storedDraft.rounds[draftPick.round]) {
        storedDraft.rounds[draftPick.round] = [];
      }

      storedDraft.rounds[draftPick.round].push(draftPick);
      storedDraft.picks.push(draftPick);
      storedDraft.updated = _.now();
    }

  });
}
