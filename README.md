
# forker 

This crazy forker listens on a port (typically 80) and forwards HTTP transactions to other
servers based on what is found in the "Host:" headers. 
Doing something like simplistic "virtual hosts".

I wrote this because I have a Linux server that hosts many legacy virtual hosts using
Apache and PHP.
The Apache+PHP sites work great and I wanted to just leave them as they are, but I also
wanted a way to deploy new Node servers on the same host that can share port 80
without forcing the Node servers to suffer by making their traffic to go through Apache
(using something like mod rewrite for example).

So the idea is that forker listens on port 80 and acts as a "fork in the road".
Traffic is split based on the hostname in "Host:" and goes either to Apache, or to some
other destination based on what's in the simple configuration file called "config.json".


## Install
	
	npm install forker

## Example config.json

The logLevel can be 0 thru 5.  Higher levels beget more deatailed output.

The "port" setting is the port that forker will listen on. 
If "host" is not included, forker listens on all IPs (xxx support multiple IPs)
The "uid" and "gid" values are for downgrading privilege if when run as root.

The "default" fork goes to the legacy Apache server (changed to listen on 8080 instead of 80)
The "foo.com" fork goes to a Node server listening on port 3901

	{
		"uid": "apache",
		"gid": "apache",
		"logLevel": 1,
		"port": 80,
		"host": "127.0.0.1",
		"forks":{
			"foo.com": { "host":"localhost", "port":3901 },
			"default": { "host":"localhost", "port":8080 }
		}
	}

## Running

The config.json file is expected to be in the current working directory. (xxx)

	node forker.js

## License

	Copyright 2011 Sleepless Software Inc. All rights reserved.

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
