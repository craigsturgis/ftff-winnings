//FTFF Winnings express app

var express = require('express'),
		app = express(),
		yKeys = {},
		OAuth= require('oauth').OAuth;

try {
  var file_keys = require('./keys_file');
  for(var key in file_keys) {
    yKeys[key]= file_keys[key];
  }
}
catch(e) {
  console.log('Unable to locate the keys_file.js file.  Please copy and ammend the keys_file-sample.js as appropriate');
  return;
}

app.get('/', function(req, res){
  res.send('Hello world');
});

app.listen(3000);
console.log('Listening on port 3000');