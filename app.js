/*jshint node:true*/

//------------------------------------------------------------------------------
// node.js calendar demo application for Bluemix
// sample code was pulled from GitHub at https://github.com/DHTMLX/node-scheduler-demo
//------------------------------------------------------------------------------

//************ Required Node module imports ************************************
var express = require('express');
var expressSession = require('express-session');
var errorHandler = require('errorhandler');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var path = require('path');
var moment = require('moment');

var passport = require('passport');
var IbmIdStrategy = require('passport-ibmid-oauth2').Strategy;

var host = (process.env.VCAP_APP_HOST || 'localhost');
var port = (process.env.VCAP_APP_PORT || 3000);
var url = JSON.parse(process.env.VCAP_APPLICATION ||
		'{"uris":["' + 'https://' + host + ':' + port + '"]}').uris[0] 

var async = require('async');
var https = require('https');
var request = require('request');
// Allow self-signed certs @see https://github.com/request/request/issues/418
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
var util = require('util');

//************ CF App  Bootstrapping *******************************************

var appInfo = JSON.parse(process.env.VCAP_APPLICATION || "{}");
var services = JSON.parse(process.env.VCAP_SERVICES || "{}");
var SSO_CLIENT_ID = (process.env.SSO_CLIENT_ID || ' ');
var SSO_CLIENT_SECRET = (process.env.SSO_CLIENT_SECRET || ' ');

var host = (process.env.VCAP_APP_HOST || 'localhost');
var port = (process.env.VCAP_APP_PORT || 3000);
var url = JSON.parse(process.env.VCAP_APPLICATION ||
		'{"uris":["' + 'https://' + host + ':' + port + '"]}').uris[0] 

//************ Application variables *******************************************

var app = express();

var mongo_creds = services['mongolab'][0]['credentials'];
var mongo_uri			= mongo_creds['uri'];

//Random variables
var cookie_secret = 's3cr3t';
var use_sso = false;

var detail_array = [	{
							id: String,
							text: String,
							start_date: String,
							end_date: String
							}];

//************ Application setup ***********************************************

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(errorHandler());

// Any conditional behavior based on env target
var current_env = app.get('env');
console.log("current_env: ", current_env );
switch( current_env )
	{
	  case 'public_prod':
	    console.log("Public Production environment. ");
	    use_sso = true;
	    break;
	  case 'public_dev':
	    console.log("Public Development environment");
	    use_sso = true;
	    app.locals.pretty = true;
	    break;
	  default:
	    console.log("Developing outside public Bluemix, without SSO enabled");
	    use_sso = false;
	    app.locals.pretty = true;
	}

//store these variables for use later
app.set('url', url );
app.set('use_sso', use_sso );

//Default values for use in templates
app.set('title', 'Unleash the Cloud');

// Set up Mongo DB
console.log("Mongo uri is - " + mongo_uri);
var db = require('mongoskin').db(mongo_uri, { w: 0});
db.bind('event');

//Passport setup
var sessionStore  = new expressSession.MemoryStore;
app.use(expressSession({
	secret: cookie_secret,
	store: sessionStore,
	proxy: true,
	resave: true,
	saveUninitialized: true
	}));

passport.use('ibmid', new IbmIdStrategy(
	{
	clientID: SSO_CLIENT_ID,
	clientSecret: SSO_CLIENT_SECRET,
	callbackURL: 'https://' + url + '/auth/ibmid/callback',
	passReqToCallback: true    
	}, 
	function(req, accessToken, refreshToken, profile, done)
		{
		req.session.ibmid = {};
		req.session.ibmid.profile = profile;
		return done(null, profile);
		}
	));
passport.serializeUser(function(user, done) { done(null, user); });
passport.deserializeUser(function(obj, done) { done(null, obj); });

app.use(passport.initialize());
app.use(passport.session());

//
//Add locals for use in templates
//
app.use(function(req,res,next)
	{
  	res.locals.forms = require('./controllers/forms');
	if( req.app.get('env') == 'public_prod')
		{
		res.locals.env = 'production';
		}
	
//	console.log("Common middleware");
	res.locals.loggedIn = req.isAuthenticated();
//	console.log("req.isAuthenticated? : ", res.locals.loggedIn )
	res.locals.session = req.session;
//	console.log("session : ", util.inspect(res.locals.session) );
	if( req.session && req.session.ibmid )
		{
		res.locals.profile = req.session.ibmid.profile;
		}
	next();
	}
);

// ************   Application functions ****************************************

// Create a custom authenticate middleware
function authenticate()
	{
	return function(req, res, next)
		{
		if ( req.app.get('use_sso') && (!req.isAuthenticated() || req.session.ibmid == undefined) )
			{
			req.session.originalUrl = req.originalUrl;
			res.redirect('/auth/ibmid');
			}
		else
			{
			next();
			}
		}
	}

//************   Application routes ********************************************

// Setup Static hosting
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/views');
app.use(bodyParser.json());

// Application Controllers
//var auth_controller = require('./controllers/auth');

// Auth Controller methods
//app.get('/auth/error', auth_controller.login_error );

// TODO: Not sure how to pass or access variables from the controllers
// the three routes below all reference passport
//app.get('/auth/ibmid', auth_controller. );
//app.get('/auth/ibmid/callback', auth_controller. );
//app.get('/logout', auth_controller. );

//
// Home Page handler
//
app.get('/', function(req, res)
	{
	res.render('index', { title : 'Unleash the Cloud' });
	});

//
// INIT of the database via /init route
//
app.get('/init', function(req, res)
	{
	db.event.insert(
		{
		id:1,
		text:"New Year's Day",
		start_date: new Date(2014,11,31),
		end_date:	new Date(2015,0,1)
		}, 
		function ()
			{
			console.log("GET INIT - completed " );
			res.send("Test events were added to the database")
			}
		);
	}); // end of GET /init
	

//
// GET of all calendar data
//
app.get('/data', function(req, res)
	{
	var detail_array = [	{
								id: String,
								text: String,
								start_date: String,
								end_date: String,
								color: String,
								textColor: String
								}];
								
	db.event.find().toArray(function(err, data)
		{
		var start_date = '';
		var end_date = '';
		var color = 'rgb(204,204,204)'; // grey block
		var textcolor = 'rgb(0,0,0)';   // black text
		for (var i = 0; i < data.length; i++)
			{
			//set id property for all records
			data[i].id = data[i]._id;
			delete data[i]._id;
			// Set the proper color
			if (!data[i].color)
				{
				color = 'rgb(204,204,204)';  // grey block
				textcolor = 'rgb(0,0,0)';    // black text
				}
			else
				{
				color = data[i].color;
				textcolor = 'rgb(0,0,0)';    // black text
				if (color == 'rgb(77,77,184)')  // if block is indigo
					textcolor = 'rgb(255,255,255)';    // go with white text
				}
			
			// Convert dates to mm/dd/yy hh:mm format that scheduler expects
			start_date = moment(data[i].start_date, ["YYYY-MM-DD HH:mm","MM/DD/YYYY HH:mm"]).format("MM/DD/YYYY HH:mm");
			end_date = moment(data[i].end_date, ["YYYY-MM-DD HH:mm","MM/DD/YYYY HH:mm"]).format("MM/DD/YYYY HH:mm");
			
			// Put detail array into format order that scheduler expects
			detail_array[i] = {	id: data[i].id, 
										text: data[i].text, 
										start_date: start_date,
										end_date: end_date,
										color: color,
										textColor: textcolor };  // add a new entry to array
			}
		//output response
//
// This is a sample of a well formatted json response
// Response has to be in (id, text, start_date, end_date) order,
// date needs to be in "mm/dd/yyyy hh:mm" format
// otherwise the handler does not display the data
//
//		detail_array = [
//			{id:1, text:"Meeting",start_date:"06/11/2015 14:00",end_date:"06/11/2015 17:00"},
//			{id:22, text:"Conference",start_date:"06/15/2015 12:00",end_date:"06/18/2015 19:00"},
//			{id:3333, text:"Interview", start_date:"06/24/2015 09:00",end_date:"06/24/2015 10:00"}
//			];

//		console.log("GET DATA - sending - " + util.inspect(detail_array) );
		res.send(detail_array);

		});
		
	}); // end of GET /data


//
// POST of new events
//
app.post('/data', function(req, res)
	{
	var data = req.body;
	var mode = data["!nativeeditor_status"];
	var sid = data.id;
	var tid = sid;
	// remove properties we do not want to save in the DB
	delete data.id;
	delete data.gr_id;
	delete data["!nativeeditor_status"];

	function update_response(err, result)
		{
		if (err)
			{
			mode = "error";
			}
		else if (mode == "inserted")
			{
			tid = data._id;
			}
//		console.log("POST DATA - sending confirmation ");
		res.setHeader("Content-Type","text/xml");
		res.send("<data><action type='"+mode+"' sid='"+sid+"' tid='"+tid+"'/></data>");
		}
		
	if (mode == "updated")
		{
		db.event.updateById( sid, data, update_response);
		console.log("POST DATA - update - " + util.inspect(data) );
		}
	else if (mode == "inserted")
		{
		db.event.insert(data, update_response);
		console.log("POST DATA - new - " + util.inspect(data) );
		}
	else if (mode == "deleted")
		{
		db.event.removeById( sid, update_response);
		console.log("POST DATA - delete - " + util.inspect(sid) );
		}
	else
		{
		res.send("Not supported operation");
		console.log("POST DATA - ERROR - unsupported operation" );
		}

	}); // end of POST /data

//
// LOGOUT function (not used)
//

//app.get('/logout', function(req, res)
//{
//	passport._strategy('ibmid').logout(req, res, 'https://' + url + '/');
//});

//
// Authentication handlers (not used)
//

//app.get('/auth/ibmid', passport.authenticate('ibmid', { scope: ['profile'] }),
//	function(req, res){} );

//app.get('/auth/ibmid/callback',
//	function(req, res)
//  {
//    var redirect_url = req.session.originalUrl || '/request';
//    return passport.authenticate( 'ibmid',
//      { failureRedirect: '/auth/error', scope: ['profile'], successRedirect: redirect_url }
//                                )(req,res);
//	}
//);

//************ Start the Application *******************************************
app.listen(port, host);
console.log('App started on port ' + port);

