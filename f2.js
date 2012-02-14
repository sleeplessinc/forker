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
	log(0, "F "+e.stack);
})



var cfgFile = "cfg.json"
var cfg = defaultConfig = {
	logLevel: 5,
	port: 8888,
	forks:{
		"default":	{ "host":"sleepless.com",	"port":8080 }
	}
}

var seq = 0


function getDest(h) {
	var dest = cfg.forks[h]
	if(!dest) {
		dest = cfg.forks["default"]
	}
	if(!dest) {
		dest = defaultConfig.forks["default"]
	}
	log(4, "getDest("+h+") returns "+insp(dest))
	return dest
}


function accept(cli) {

	var cid = ++seq

	var ra = cli.remoteAddress+":"+cli.remotePort
	var la = cli.address()
	log(4, "C-"+cid+" accept RMT="+ra+" LOC="+la.address+":"+la.port)

	var held = []
	var heldLen = 0
	var srv = null

	cli.setNoDelay(true)		// disable nagle

	var cx = function() {
		cli.destroy()
		if(srv)
			srv.destroy()
	}

	cli.setTimeout(30*1000, function() {
		log(3, "C-"+cid+" timeout")
		cx()
	})

	cli.on("error", function() {
		log(2, "C-"+cid+" timeout")
		cx()
	})

	cli.on("end", function() {		// FIN 
		log(4, "C-"+cid+" end")
		pumpIt()
		if(srv && srv.writable)
			srv.end()					// FIN
	})

	cli.on("close", function(hadError) {
		log(4, "C-"+cid+" close "+hadError)
	})

	cli.on('data', function(data) {
		log(5, "C-"+cid+" data "+data.length+" bytes")
		pumpIt(data)
	})

	var flushHeld = function() {
		// write held buffers
		while(held.length > 0) {
			var d = held.shift()
			log(5, "C-"+cid+" flushing held "+d.length+" "+d)
			if(srv.writable)
				srv.write(d)
			else
				log(2, "C-"+cid+" flush held: srv not writable?")
		}
	}

	var pumpIt = function(data) {

		if(srv) {
			if(data) {
				log(5, "C-"+cid+"  pumping through "+data.length)
				// just write it back out
				if(srv.writable)
					srv.write(data)
				else
					log(2, "C-"+cid+" stream: srv not writable?")
			}
			else {
				flushHeld()
			}
			return
		}

		// Connection to remote server not yet established
	
		if(data) {
			// 0 1
			log(5, "C-"+cid+" held "+held.length+" "+heldLen)
			held.push(data);
			heldLen += data.length
		}

		// find host header in held buffers
		log(3, "C-"+cid+" looking for host "+heldLen)
		var s = "";
		held.forEach(function(v) {
			s += v.toString("utf8")
		})
		log(4, "C-"+cid+" hdrs "+s);
		var fhost = "default"
		var m = s.match(/\nhost: ([-\.a-z0-9]+(:([0-9]+))?) \r?\n/i)
		if(m)
			fhost = m[1]

		var dest = getDest(fhost)
		var rhost = dest.host
		var rport = dest.port
		log(2, "S-"+cid+" forking "+fhost+" -> "+rhost+":"+rport)

		//s = s.replace(/\nhost: ([-\.a-z0-9]+(:([0-9]+))?) \r?\n/i, "\nHost: "+rhost+"\r\n")
		s = s.replace(/ost: [-\.a-z0-9:]+/i, "ost: "+rhost+":"+rport);
		held = [s]


		// established connection to remote host
		srv = new net.Socket()

		srv.setNoDelay(true)			// disable nagle

		srv.on("error", function(e) {
			log(1, "S-"+cid+" error "+insp(e))
			cx()
		})

		srv.on("end", function() {		// FIN
			log(3, "S-"+cid+" end ")
			cli.end()					// FIN
			cx()
		})

		srv.on("data", function(data) {
			log(5, "S-"+cid+" data "+data.length)
			if(cli.writable) {
				cli.write(data)
			}
			else {
				log(2, "S-"+cid+" discarded - cli not writable")
			}
		})

		srv.on("connect", function() {
			var ra = srv.remoteAddress+":"+cli.remotePort
			var la = srv.address()
			log(3, "S-"+cid+" connect LOC="+la.address+":"+la.port+" RMT="+ra)

			flushHeld()
		})
		
		srv.connect(rport, rhost)
	}
}


var start = function(e, s) {
	if(!e) {
		cfg = j2o(s)
	}
	if(!cfg) {
		cfg = defaultConfig
	}

	log(cfg.logLevel)

	server = net.createServer()

	server.on("error", function(e) {
		log(1, "F error "+e.stack+")")
	})

	server.on("connection", accept)

	server.on("listening", function() {
		var a = server.address()
		log(2, "F listening "+(a.address || "*")+":"+a.port)
	})

	server.listen(cfg.port, cfg.host)
}


fs.writeFileSync("PID", ""+process.pid)

fs.readFile(cfgFile, start)



