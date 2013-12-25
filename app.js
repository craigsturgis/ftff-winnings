//FTFF Winnings express app

var express = require('express'),
		app = express(),
		consKey = 'dj0yJmk9Rk5PMHZXM1FGZXBPJmQ9WVdrOVVqaE5UV1p1TTJNbWNHbzlPVFk1TVRBNU1qWXkmcz1jb25zdW1lcnNlY3JldCZ4PTEw',
		consSecret = '38994f9f308c51e24195a1559ea11d33de870de7',
		OAuth= require('oauth').OAuth;

app.get('/', function(req, res){
  res.send('Hello world');
});

app.listen(3000);
console.log('Listening on port 3000');