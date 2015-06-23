// Auth Controller

//var passport = params.passport;

/*
var passport = require('passport');


exports.error =  function(req, res)
{
  res.send('Failed to authenticate\n');
};

exports.logout = function(req, res)
{
  passport._strategy('ibmid').logout(req, res, 'https://' + req.app.get('url') + '/');
};
*/

// Testing for authentication
/*
exports.myprivate = function(req, res)
{
  var profile = req.session.ibmid.profile;
  res.send('Hello ' + profile.firstName + ' ' + profile.lastName + '! <a href="/logout">Logout</a>\n');
};
*/

exports.login_error = function(req, res)
{
	res.send('Failed to authenticate\n');
};

exports.about = function(req, res)
{

};