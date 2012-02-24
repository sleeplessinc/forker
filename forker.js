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

var j2o = function(j) { try { return JSON.parse(j) } catch(e) { return null } }
var o2j = function(o) { return JSON.stringify(o) }


process.on("uncaughtException", function(e) {
	log(0, "F "+e.stack);
})


var cfgFile = "cfg.json"
var cfg = defaultConfig = {
	logLevel: 1,
	port: 80,
	forks:{
		"default": { "host": "localhost", "port":8080 }
	}
}

var seq = 0

function pi10(s) {
	return parseInt((""+s).trim(), 10) || 0
}

function r500(req, res) {
	res.writeHead(500, "Error")
	res.end()
}

function request(req, res) {

	var hdrs = req.headers

	var hh = hdrs.host || "default"
	hh = hh.trim().toLowerCase()
	log("hh="+hh);

	var p_host = "localhost"
	var p_port = 80

	var a = hh.split(":")
	switch(a.length) {
	case 2:
		p_port = pi10(a[1])
		if(p_port < 1)
			p_port = 80
		log("p_port="+p_port);
		// fall through
	case 1:
		p_host = a[0].trim()
		log("p_host.."+p_host);
		if(/[^-\.a-z0-9]/.test(p_host))
			p_host = "localhost"
		log("p_host="+p_host);
		break
	}

	log("routing "+req.method+" "+req.url+" to "+p_host+":"+p_port+"\n");

	p_hdrs = (new Array(hdrs))[0]		// clone array
	var opts = {
		host: p_host,
		hostname: p_host,
		port: p_port,
		method: req.method,
		path: req.url,
		headers: p_headers
	}
	p_req = http.request(opts, function(p_res) {
		util.pump(p_res, p_res, function(e) {
			log("back pump stopped: "+e)
			res.end();
		})
	})
	util.pump(req, p_req, function(e) {
		log("fwd pump stopped: "+e)
	})

/*

	var cid = ++seq

	var ra = cli.remoteAddress+":"+cli.remotePort
	log(2, "C-"+cid+" request RMT="+ra)

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
		if(srv && srv.writable) {
			srv.end()					// FIN
			srv = null
		}
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
			if(srv && srv.writable)
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
		log(5, "C-"+cid+" looking for route")
		var s = "";
		held.forEach(function(v) {
			s += v.toString("utf8")
		})
		log(4, "C-"+cid+" hdrs "+s);
		var fhost = "default"
		var m = s.match(/Host: ([-\.a-z0-9]+) ?\r?\n/i)
		if(m) {
			fhost = m[1]
			log(5, "C-"+cid+" route found "+fhost)
		}

		var dest = cfg.forks[fhost]
		if(!dest) {
			dest = cfg.forks["default"]
		}
		if(!dest) {
			dest = defaultConfig.forks["default"]
		}
		log(4, "getDest("+fhost+") returns "+insp(dest))


		var rhost = dest.host
		var rport = dest.port
		log(3, "S-"+cid+" forking "+fhost+" -> "+rhost+":"+rport)

		//s = s.replace(/\nhost: ([-\.a-z0-9]+(:([0-9]+))?) \r?\n/i, "\nHost: "+rhost+"\r\n")
		s = s.replace(/ost: [-\.a-z0-9:]+/i, "ost: "+rhost);
		held = [s]


		// established connection to remote host
		srv = new net.Socket()

		srv.setNoDelay(true)			// disable nagle

		srv.on("error", function(e) {
			log(1, "S-"+cid+" error "+e.stack)
			cx()
		})

		srv.on("end", function() {		// FIN
			log(5, "S-"+cid+" end ")
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
			flushHeld()
		})
		
		srv.connect(rport, rhost)
	}
*/
}


var start = function(e, s) {
	if(!e) {
		cfg = j2o(s)
	}
	if(!cfg) {
		cfg = defaultConfig
	}

	log(cfg.logLevel)

	server = http.createServer()

	server.on("error", function(e) {
		log(1, "F error "+e.stack)
	})

	server.on("request", request)

	server.listen(cfg.port, cfg.host, function() {
		var a = server.address()
		log(2, "F listening "+(a.address || "*")+":"+a.port)
	})
}


fs.writeFileSync("PID", ""+process.pid)

fs.readFile(cfgFile, start)

