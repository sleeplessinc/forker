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
var log5 = require("log5"), log = log5.mkLog("forker:")

var j2o = function(j) { try { return JSON.parse(j) } catch(e) { return null } }
var o2j = function(o) { return JSON.stringify(o) }


process.on("uncaughtException", function(e) {
	log(0, "UNCAUGHTEXCEPTION "+e.stack);
})


var defaultFork = { "host": "localhost", "port":8080 }
var cfgFile = "cfg.json"
var cfg = defaultConfig = {
	"logLevel": 2,
	"port": 80,
	"host": "0.0.0.0",
	"forks":{
		"localhost":			{ "host":"sleepless.com",	"port":8080 },
		"default":				{ "host":"sleepless.com",	"port":80 }
	}
}

var root = process.getuid() == 0;
var seq = 0

function pi10(s) {
	return parseInt((""+s).trim(), 10) || 0
}

function r500(req, res) {
	res.writeHead(500, "Error")
	res.end()
}

function request(req, res) {

	seq++

	var hdrs = req.headers
	var p_hdrs = (new Array(hdrs))[0]		// clone 

	var hh = (hdrs.host || "default").trim().toLowerCase()

	var fork = null;
	//var m = hh.match(/^([-\.a-z0-9]+)(:([0-9]+))?$/)
	var m = hh.match(/^([-\.a-z0-9]+)$/)
	if(m) {
		var lu = m[1]  // + ":" + (m[2] ? m[2] : 80)
		fork = cfg.forks[ lu ]
	}
	else {
	}
	fork = fork || cfg.forks["default"] || defaultFork
	var p_hh = fork.host  // + ":" + fork.port

	log(2, seq+": routing "+req.method+" "+hh+req.url+" to "+fork.host+":"+fork.port);

	p_hdrs.host = p_hh

	p_req = http.createClient(fork.port, fork.host).request(req.method, req.url, p_hdrs)

	p_req.on('response', function(p_res) {

		var hl = p_res.headers["location"] || p_res.headers["Location"]
		if(hl) {
			log(3, "fixing 301 ...")
			var re = new RegExp("^(https?://)"+p_hh+"(.*)", "i")
			var m = re.exec(hl)
			if(m) {
				p_res.headers.location = m[1] + hh + m[2];
			}
		}

		res.writeHead(p_res.statusCode, p_res.headers)
		util.pump(p_res, res)
		p_res.on('end', function() {
			p_req.end()
			res.end()
		})
	})
	req.on('data', function(chunk) {
		p_req.write(chunk)
	})
	req.on('end', function() {
		p_req.end()
	})
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
		if(!root && cfg.port < 1024)
			log(1, "Configured to listen on port "+cfg.port+" but user not root")
		else 
			log(1, "ERROR "+e.stack)
	})

	server.on("request", request)

	log(2, cfg.host+":"+cfg.port)
	server.listen(cfg.port, cfg.host, function() {

		if(root) {
			try {
				process.setgid('nobody')
				process.setuid('nobody')
			}
			catch(e) {
				log(1, "WARNING: Can't downgrade uid/gid to 'nobody': "+e)
			}
		}

		var a = server.address()
		log(2, "listening "+(a.address || "*")+":"+a.port)

	})
}


fs.writeFileSync("PID", ""+process.pid)

fs.readFile(cfgFile, start)

