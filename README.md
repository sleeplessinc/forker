
# Forker 

This crazy little forker listens on a port (typically 80) and forwards HTTP
transactions to other servers based on what is found in the "Host:" headers
of the request.
See [diagram](https://github.com/sleeplessinc/forker/raw/master/forker.pdf).


## Example config.json

There is a file called cfg.json-example that shows how to configure it.
rename it to config.json and edit to your liking.

	{
		"port": 80,
		"forks":{
			"sleepless.com":			{ "host":"localhost",	"port":8080 },
		}
	}

The "port" setting is the port that forker will listen on. 
Forker listens on all IPs 


## Running

The config.json file is expected to be in the current working directory. 

	./start
	./stop
	./restart

These scripts should be pretty self explanatory.  When started, a log will
be written to "log.txt"


## Why?

I wrote this because I have a Linux server that hosts many legacy virtual hosts using
Apache and PHP.
The Apache+PHP sites work great and I wanted to just leave them as they are, but I also
wanted a way to deploy new Node servers on the same host that can share port 80
without forcing the Node servers to suffer by making their traffic go through
Apache first.

So the idea is that forker listens on port 80 and acts as a "fork in the road".
Traffic is split based on the hostname in "Host:" and goes either to Apache, or to some
other destination based on what's in the configuration file called.

Anyone interested in making improvements is welcome to send pull requests.
Note that I'm most interested in making it robust and reliable, versus adding
features, options, flexibility, etc.


## License

	Copyright 2017 Sleepless Software Inc. All rights reserved.

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
