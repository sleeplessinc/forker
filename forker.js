/*
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
*/

var net = require("net")
var http = require("http")
var fs = require("fs")
var util = require("util"), insp = util.inspect
var log5 = require("log5"), log = log5.mkLog("fork:")
var chopper = require("chopper")

var j2o = function(j) { try { return JSON.parse(j) } catch(e) { return null } }
var o2j = function(o) { return JSON.stringify(o) }

String.prototype.lower = function() { return this.toLowerCase() }
String.prototype.abbr = String.prototype.abbr || function(l) {
	return this.length > l ? this.substring(0, l - 4)+" ..." : this
}

process.on("uncaughtException", function(e) {
	log(0, "******* "+e.stack);
})

var defaultConfig = {
	logLevel: 1,
	port: 80,
	forks:{
		"default":	{ "host":"sleepless.com",	"port":80 }
	}
}
var config = defaultConfig

function getDest(h) {
	var dest = config.forks[h]
	if(!dest) {
		dest = config.forks["default"]
	}
	if(!dest) {
		dest = defaultConfig.forks["default"]
	}
	return dest
}

function connect(srv, host) {
	var dest = getDest(host)
	var rhost = dest.host
	var rport = dest.port
	log(1, host+" -> "+rhost+":"+rport)
	srv.connect(rport, rhost)
}

function accept(cli) {
	log(3, "(accept)")

	var chop = new Chopper("\n")
	var connected = false
	var out = []
	var hh = null
	var hdone = false

	cli.setEncoding("utf8")


	var srv = new net.Socket()
	srv.on("connect", function() {
		log(3, "(connect)")
		connected = true
		// push out buffered data
		if(out.length > 0)
			log(1, hh+": "+out[0].trim().abbr(70))
		while(out.length > 0) {
			var s = out.shift()
			log(3, ">>> "+s.trim())
			if(srv.writable)
				srv.write(s)
		}
	})
	srv.on("data", function(data) {
		log(3, "(data from srv) ")
		if(cli.writable) {
			// xxx chop for headers and inject my own here??
			cli.write(data, 'binary')
		}
	})
	srv.on("end", function() {
		log(3, "(srv end)")
		cli.end()
	})


	cli.on("end", function() {
		log(3, "(cli end)")
		srv.end()
	})
	cli.on("close", function() {
		log(3, "(cli close)")
		srv.end()
	})
	cli.on('data', function(data) {

		log(3, "(data from cli)"+data)
		if(connected) {
			// end of headers found, socket connected, buffered data pushed out
			if(srv.writable)
				srv.write(data)
			else
				srv.destroy()
		}
		else {
			if(hdone) {
				// found end of headers, but remote sock still not connected
				log(3, "hdone write")
				out.push(data) 
			}
			else {
				// still looking for end of headers
				chop.next(data, function(s) {
					// this callback may be summoned more than once per call to chop.next()
					if(hdone) {
						// end of headers found.  any first chopped bits are part of body
						log(3, "body: "+s)
						out.push(s+"\n") }
					else {
						// still looking for end of headers
						var s = s.trim()
						log(3, "hdr: "+s)
						if(s === "") {
							// empty line - end of headers
							log(3, "end of headers")
							hdone = true
							if(!hh) {
								log(3, "no host header. using 'default' ?")
								hh = "default"		// there was no Host: header
							}
							connect(srv, hh)
						}
						else {
							// Look for a Host: header
							var m = s.lower().match(/^host: ([^:]+)(:(\d+))?$/i) 
							if(m) {
								// found it ... make a note of the hostname
								hh = m[1]
								s = "Host: "+hh
							}
						}
						out.push(s+"\r\n")
					}
				})
			}
		}
	})
}

function start() {
	log(config.logLevel)
	net.createServer(accept).listen(config.port, config.host)
	log(2, "Listening on "+(config.host || "*")+":"+config.port)
}

fs.readFile("config.json", function(e, s) {
	if(e)
		config = defaultConfig
	else
		config = j2o(s)
	start()
})

fs.writeFileSync("PID", ""+process.pid)


