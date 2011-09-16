

var net = require("net")
var http = require("http")
var fs = require("fs")
var util = require("util"), insp = util.inspect
var log5 = require("log5"), log = log5.mkLog("fork:")
var chopper = require("chopper")


var j2o = function(j) { try { return JSON.parse(j) } catch(e) { return null } }

String.prototype.lower = function() { return this.toLowerCase() }
String.prototype.cap = String.prototype.cap || function() {
	return this.substring(0,1).toUpperCase() + this.substring(1)
}
String.prototype.abbr = String.prototype.abbr || function(l) {
	return this.length > l ? this.substring(0, l - 4)+" ..." : this
}



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
	if(!dest) 
		dest = config.forks["default"]
	if(!dest) 
		dest = defaultConfig.forks["default"]
	return dest
}

function connect(srv, host) {
	var dest = getDest(host)
	var rhost = dest.host
	var rport = dest.port
	log(2, host+" -> "+rhost+":"+rport)
	srv.connect(rport, rhost)
	//return "Host: "+host+":"+rport
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
			srv.write(s)
		}
	})
	srv.on("data", function(data) {
		log(3, "(data from srv) ")
		if(cli.writable)
			cli.write(data, 'binary')
	})
	srv.on("end", function() {
		log(3, "((((((( srv end ))))))")
		cli.end()
	})


	cli.on("end", function() {
		log(3, "-----< cli end >-----")
		srv.end()
	})
	cli.on("close", function() {
		log(3, "-----< cli close >-----")
		srv.end()
	})
	cli.on('data', function(data) {

		log(3, "(data from cli)"+data)
		if(connected) {
			// end of headers found, socket connected, buffered data pushed out
			srv.write(data)
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
							if(!hh)
								hh = "default"		// there was no Host: header
							connect(srv, hh)
						}
						else {
							var m = s.lower().match(/^host: ([^:]+):(\d+)$/i) 
							if(m) {
								hh = m[1]
								s = "Host: "+hh
							}
						}
						out.push(s+"\r\n")		// write out header
					}
				})
			}
		}
	})
}


function start() {
	log(config.logLevel)
	log(6, insp(config))
	net.createServer(accept).listen(config.port)
	log(2, "Listening on "+config.port)
}


fs.readFile("config.json", function(e, s) {
	if(e)
		config = defaultConfig
	else
		config = j2o(s)
	start()
})


