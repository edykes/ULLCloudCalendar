node-scheduler-demo
===================

Demo of dhtmlxScheduler with NodeJs + MongoDB as backend

### How to start

To run the app, do the next after cloning the repo

~~~
npm install
node app.js
~~~

After that, open in a browser using Bluemix
To generate a single test event, hit <bluemix path>/init to populate a single event into the calendar. 

### DB config

App expects to find the mongoDB on localhost, you can change the server address in the app.js 


## Files

The Node.js starter application has files as below:

* app.js

	This file contains the server side JavaScript code for your application
	written using the express server package.

* public/

	This directory contains public resources of the application, that will be
	served up by this server

* package.json

	This file contains metadata about your application, that is used by both
	the `npm` program to install packages, but also Bluemix when it's
	staging your application.  For more information, see:
	<https://docs.npmjs.com/files/package.json>
