var express = require('express');
var router = express.Router();
var FantasySports = require('FantasySports');

FantasySports.options({
    "accessTokenUrl": "https://api.login.yahoo.com/oauth/v2/get_request_token",
    "requestTokenUrl": "https://api.login.yahoo.com/oauth/v2/get_token",
    "oauthKey": process.env.YAHOO_API_OAUTH_KEY,
    "oauthSecret": process.env.YAHOO_API_OAUTH_SECRET,
    "version": "1.0",
    "callback": "http://ftff.craigsturgis.com/auth/oauth/callback",
    "encryption": "HMAC-SHA1"
});


/* GET users listing. */
router.get('/', function(req, res) {
  res.send('To oauth to yahoo, use /auth/oauth and callback is /auth/oauth/callback');
});

//start yahoo fantasy oauth
router.get('/oauth', function(req, res) {
  FantasySports.startAuth(req, res);
});

//callback yahoo fantasy oauth
router.get('/oauth/callback', function(req, res) {
  console.dir(req);
  FantasySports.endAuth(req, res);
});


module.exports = router;
