
# forker 

This crazy little forker listens on a port (typically 80) and forwards HTTP
transactions to other
servers based on what is found in the "Host:" headers. 

	[Diagram](https://github.com/sleeplessinc/forker/raw/master/forker.pdf)

## Install
	
	npm install forker
	
	cd node_modules/forker			# or where ever
	cp cfg.json-example cfg.json
	./start							# or sudo ./start

	open "http://localhost" in a browser

	vim cfg.json					# to suit your purposes
	./restart						# or sudo ./restart


## Example config.json

There is a file called cfg.json-example that shows how to configure it.
rename it to cfg.json and edit to your liking.

	{
		"logLevel": 2,
		"port": 80,
		"host": "0.0.0.0",
		"forks":{
			"localhost":			{ "host":"sleepless.com",	"port":8080 },
			"default":				{ "host":"sleepless.com",	"port":80 }
		}
	}

The logLevel can be 0 thru 5.  Higher levels give more deatailed output.

The "port" setting is the port that forker will listen on. 
If "host" is not included, forker listens on all IPs 

With the shown configuration,
the "default" fork goes to the legacy Apache server (changed to listen on 8080 instead of 80)
and the "foo.com" fork goes to a Node server listening on port 2900

## Running

The cfg.json file is expected to be in the current working directory. 

	./start
	./stop
	./restart

These scripts should be pretty self explanatory.  When started, a log will
be written to "log.txt"

Note that if you want forker to listen on a privileged port, like 80, then
it needs to be run with root privileges.  If you run forker as root, it will
try to downgrade its uid/gid to 'nobody'.


## Why?

There is already a project package called node-http-proxy which similar things.
I wasn't (or didn't want to be) aware of it though, so I just rolled my own.
Mine is very simple and featureless by comparison, but I like to think it's much
more efficient and simpler to setup and use.

I wrote this because I have a Linux server that hosts many legacy virtual hosts using
Apache and PHP.
The Apache+PHP sites work great and I wanted to just leave them as they are, but I also
wanted a way to deploy new Node servers on the same host that can share port 80
without forcing the Node servers to suffer by making their traffic go through Apache first.

So the idea is that forker listens on port 80 and acts as a "fork in the road".
Traffic is split based on the hostname in "Host:" and goes either to Apache, or to some
other destination based on what's in the configuration file called.

Anyone interested in making improvements is welcome to send pull requests.
Note that I'm most interested in making it robust and reliable, versus adding
features, options, flexibility, etc.


## License

	Copyright 2012 Sleepless Software Inc. All rights reserved.

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to
	deal in the Software without restriction, including without limitation the
	rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
	sell copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
	FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
	IN THE SOFTWARE. 
