var express = require('express');
var router = express.Router();
var marko = require('marko');
var FantasySports = require('FantasySports');

/* GET home page. */

var indexTemplate = marko.load(require.resolve('../views/index.marko'));
router.get('/', function(req, res) {
  //console.log("isAuthenticated: " + FantasySports.isAuthenticated);

  try {
    console.log("trying");
    FantasySports
    .request(req, res)
    .api('http://fantasysports.yahooapis.com/fantasy/v2/league/nfl.l.318700/?format=json')
    .done(function(data) {
      console.dir(data.fantasy_content.league[0]);
      indexTemplate.render({
        $global: {
          ENV_DEVELOPMENT: req.app.locals.ENV_DEVELOPMENT,
          isAuthenticated: FantasySports.isAuthenticated
        },
        title: 'Fumbled the Frikkin\' Football'
      }, res);
    });
  }

  catch(err) {
    console.log("hjalp!");
    console.dir(err);
  }

});

module.exports = router;
