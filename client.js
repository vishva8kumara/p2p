
var dgram = require('dgram');
var httpLib = require("http");
var os = require('os');
var qs = require('qs');
var fs = require('fs');

var config = JSON.parse(fs.readFileSync(__dirname+'/config.json', 'UTF-8'));
var udpport = 6660;//139.162.7.150

var keepAliveTimer = false;
var users = {};

//	First, find out our IP address
var host = [false, false];
var interfaces = os.networkInterfaces();
for (var k in interfaces) {
	for (var k2 in interfaces[k]) {
		var address = interfaces[k][k2];
		if (!address.internal)
			if (address.family === 'IPv4'){
				host[0] = address.address;
				if (typeof address.mac != 'undefined')
					config.username = address.mac.replace(/:/g, '');
			}
			//else if (address.family === 'IPv6')
			//	host[1] = address.address;
	}
}

//	Create UDP socket to communicate p2p
var udp = dgram.createSocket('udp4');
if (host[0] == false && host[1] == false)
	console.log('\033[91mNo connection to outside\033[0m');
else{
	udp.bind(udpport, host[0]);
}

/*
	message
		c: command
			ka: keep-alive
			cr1: connect request stage 1
			cr2: connect request stage 2
			qrq: query users - request
			qrs: query users - response
			...
		f: from
		h: host
		n: reequest reference number
		o: object (response data)
		p: port
		r: response reference number
		su: search user
		t: timestamp
		u: user
*/

//	Keep-alive with identity server which is another node similar to this
function keepAlive(){
	//	Only if this node has upstream servers - not a top level introducer
	if (config.servers.length > 0){
		var message = JSON.stringify({c: 'ka', u: config.username, h: host[0]});
		//console.log('Sending keep-alive');
		//
		for (var i = 0; i < config.servers.length; i++)
			udpSend(message, config.servers[i], udpport);
		//
		keepAliveTimer = setTimeout(function(){
			keepAlive();
		}, config.keepAliveFreq);
	}
}
keepAlive();

//	Send a one off UDP message
function udpSend(message, host, port){
	udp.send(new Buffer(message), 0, message.length,
		port, host, function(err, bytes){
			if (err)
				console.log('\033[91m'+err+'\033[0m');
		});
}

//	Handler to process a UDP request expecting a response
//	and routing back to a callback - maintains reference numbers
var udpt = new (function(){
	var capsule = this;
	var spool = {};
	this.ref = 0;
	this.request = function(host, port, msg, callback){
		if (capsule == this)
			return new udpt.request(host, port, msg, callback);
		//
		if (capsule.ref > 99999)
			capsule.ref = 0;
		//	Create a reference number to handle response
		var ref = (capsule.ref += 1);
		msg.n = ref;
		//	Store the callback with reference to call back when response cones
		spool[ref] = [host, port, callback];
		msg = JSON.stringify(msg);
		udpSend(msg, host, port);
		new (function(ref){
			spool[ref][3] = setTimeout(function(){
				spool[ref][2](false, '');
				delete spool[ref];
			}, config.UDPTimeout);
		})(ref);
	};
	//	Dispatch response to callback
	this.dispatch = function(host, port, message){
		if (typeof spool[message.r] != 'undefined'){
			clearTimeout(spool[message.r][3]);
			//	Verify if the response comes from where the request is sent to
			if (spool[message.r][0] != host || spool[message.r][1] != port)
				console.log('\033[91mResponder and origin mismatch\033[0m');
			var callback = spool[message.r][2];
			//	Remove the reference from index
			delete spool[message.r];
			delete message.r;
			//	Callback
			callback(false, message);
		}
	};
	//	Handle p2p sessions
	var p2pSpool = {};
	this.p2p = function(username, connectionMatrix){
		if (capsule == this)
			return new udpt.request(host, port, msg, callback);
		//this.isLAN = null;
		this.peer = [false, false];
		var _self = this;
		//
		p2pSpool[username] = this;
		var fails = 0;
		//	Attempt UDP hole punching
		//	First try as a LAN peer
		new udpt.request(connectionMatrix[0], connectionMatrix[1], {c: 'cr3', f: config.username},
			function(err, msg){
				if (!err)
					startKeepAlive(connectionMatrix[0], connectionMatrix[1]);
				else
					oneFailed();
			});
		//	Then try as an outside peer
		new udpt.request(connectionMatrix[2], connectionMatrix[3], {c: 'cr3', f: config.username},
			function(err, msg){
				if (!err)
					startKeepAlive(connectionMatrix[2], connectionMatrix[3]);
				else
					oneFailed();
			});
		//	Display error if both methods failed
		var oneFailed = function(){
			fails += 1;
			if (fails == 2)
				console.log('\033[91mCannot reach host of \''+username+'\'. We blame it on your router, ISP or network admin.\033[0m');
		}
		//	Send keep alive messages to peer
		var p2pKeepAliveTimer = false;
		var startKeepAlive = function(host, port){
			if (p2pKeepAliveTimer == false){
				_self.peer = [host, port];
				p2pKeepAlive();
			}
		}
		var p2pKeepAlive = function(){
			udpSend(JSON.stringify({c: 'ka', u: config.username, h: host[0], t: (new Date().getTime())}), _self.peer[0], _self.peer[1]);
			p2pKeepAliveTimer = setTimeout(function(){
				p2pKeepAlive();
			}, config.keepAliveFreq);
		}
		//	Close the connection, stop keep-alive and clear any trace of this
		this.close = function(){
			clearTimeout(p2pKeepAliveTimer);
			delete p2pSpool[username];
			delete _self;
		}
		//	START P2P SESSION - p2pHandler
	}
})();

// Receive incoming data from a client on udpport
udp.on('message', function(message, remote){
	console.log(remote.address + ':' + remote.port + ' - ' + message);
	//
	// Reply to incoming message by sending the directory. Whole directory for now
	message = JSON.parse(message);
	if (typeof message.c == 'string'){
		if (message.c == 'ka'){
			if (typeof users[message.u] != 'undefined')
				clearTimeout(users[message.u]['expire']);
			//	Add to directory
			users[message.u] = {inner: {host: message.h, port: udpport},
							outer: {host: remote.address, port: remote.port},
							timestamp: (new Date()).getTime()};
			//	Set Timeout to auto remove if inactive
			new (function(username){
				users[username]['expire'] = setTimeout(function(){
					console.log('Removing user \''+username+'\' for inactivity.');
					delete users[username];
				}, config.keepAliveTimeout);
			})(message.u);
			// ************************************************************
			/*/	Send ack - no need - it works :-) (test 1)
			message = JSON.stringify({c: 'ack', fqdn: config.fqdn});
			udp.send(new Buffer(message), 0, message.length,
				remote.port, remote.address, function(err, bytes){});*/
			// ************************************************************
		}
		//	Connection request - Stage 1	- Relay to stage 2
		if (message.c == 'cr1'){
			var fromUser = users[message.f];
			var toUserName = message.u;
			var toUser = users[message.u];
			//	Send requester connection details to destination user
			message = JSON.stringify({c: 'cr2', u: message.f,
									o: [fromUser.inner.host, fromUser.inner.port,
									fromUser.outer.host, fromUser.outer.port]});
			udpSend(message, toUser.outer.host, toUser.outer.port);
			//	Send destination connection details back to requester
			message = JSON.stringify({c: 'cr2', u: toUserName,
									o: [toUser.inner.host, toUser.inner.port,
									toUser.outer.host, toUser.outer.port]});
			udpSend(message, fromUser.outer.host, fromUser.outer.port);
		}
		//	Connection request - Stage 2
		if (message.c == 'cr2'){
			new udpt.p2p(message.u, message.o);
		}
	}
	//	Request that needs a response
	else if (typeof message.n != 'undefined'){
		output = {r: message.n};
		//	Search Users
		if (typeof message.su == 'string'){
			for (var user in users)
				if (user.indexOf(message.su) > -1)
					output[user] = users[user].timestamp;
		}
		output = JSON.stringify(output);
		udpSend(output, remote.address, remote.port);
	}
	//	Response received for a request - route it back to relevent callback
	else if (typeof message.r != 'undefined'){
		udpt.dispatch(remote.address, remote.port, message);
	}
});


//	Web service interface
var http = httpLib.createServer(
	function (req, res){
		//	Parse URL and query string
		var url = req.url.substring(1).split('?');
		var get = qs.parse(url[1]);
		url = url[0].split('/');
		if (url[url.length-1] == '')
			url.splice(url.length-1);
		//
		//	Deliver base template
		if (url.length == 0){
			fs.readFile(__dirname+'/views/base.html', 'utf8',
				function(err, data) {
					res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
					res.write(data);
					res.end();
				});
		}
		//	List users or search on servers
		else if (url[0] == 'users'){
			var output = {};
			res.writeHead(200, {'Content-Type': 'application/json'});
			if (url.length > 2){
				if (url[1] == 'search'){
					var progress = 0;
					//	Search on all immidiate origin servers
					for (var i = 0; i < config.servers.length; i++)
						new (function(server){
							new udpt.request(server, udpport,
								{su: url[2]},
								function(err, reply){
									//	Add to the final output/result
									if (!err)
										output[server] = reply;
									progress += 1;
									//	Write to response once we have all search results collected/aggregated
									if (progress == config.servers.length){
										res.write(JSON.stringify(output));
										res.end();
									}
								});
						})(config.servers[i]);
						// No we are not doing this in http	/*new (function(i, q){httpLib.request({port: 8080, method: 'GET', host: config.servers[i], path: '/users/'+q},function(response){handlePost(response, function(apiData){output.push(apiData);progress += 1;if (progress == config.servers.length){res.write(JSON.stringify(output));res.end();}});}).on('error', function(err){console.log(err);}).end();})(i, url[2]);*/
				}
				else if (url[1] == 'connect'){
					var user = url[2].split('@');
					if (config.username == user[0]){
						//	That would be pretty ugly :D - no srsly..
						res.write(JSON.stringify({error: 'You cannot connect p2p to yourself'}));
						res.end();
					}
					else{
						//	Initiate p2p connection chain reaction
						message = JSON.stringify({c: 'cr1', u: user[0], f: config.username});
						udpSend(message, user[1], udpport);
						res.write(JSON.stringify({message: 'Connection request sent'}));
						res.end();
					}
				}
				else if (url[1] == 'remember'){
					//	To Do: ADD THE USER TO A PHONE BOOK LIKE THING
				}
			}
			else{
				//	Just list all the users connected to this immidiate node
				for (var user in users)
					if (url.length == 1 || user.indexOf(url[1]) > -1)
						output[user] = users[user].timestamp;
				res.write(JSON.stringify(output));
				res.end();
			}
		}
		//	Deliver static resources as is - later we can look into minification and caching
		else if (url[0] == 'static'){
			fs.readFile(__dirname+'/'+url.join('/'), 'utf8',
				function(err, data) {
					if (err){
						console.log(err);
						res.writeHead(404, {'Content-Type': 'text/html'});
						res.end('<h1>404: Static File Not Found</h1>');
					}
					else
						res.end(data);
				});
		}
		//	Settings - read-only
		else if (url[0] == 'settings'){
			handlePost(req, function(data){
				//	To Do: Save to config.json ONCE authentication is done to access this web interface
				if (typeof data.settings != 'undefined')
					console.log('Settings Received:\n'+new Buffer(data.settings, 'base64').toString());
			});
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.write(JSON.stringify(config));
			res.end();
		}
		else{
			res.write(JSON.stringify({url: url, get: get}));
			res.end();
		}
		//	Default module and method
		/*if (url.length == 0 || url[0] == '')
			url[0] = 'index';
		if (url.length == 1 || url[1] == '')
			url[1] = 'index';*/
		//
	}
);
http.on('error',
	function(e){
		console.log('--------------------------------');
		console.log('\033[91m'+e.errno+'\033[0m');
	});

http.listen(config.httpport);


//	Handler for multipart POST request/response body
function handlePost(req, callback){
	req.setEncoding('utf8');
	var body = '';
	req.on('data', function (data){
		body += data;
		//	Not receiving anything over 1Mb
		if (body.length > 1e6)
			req.connection.destroy();
	});
	req.on('end', function (data){
		var post = body;
		//	Try to parse/normalize body, either xformurlencoded or jsonencoded. hereafter it wouldn't make difference to us
		try{
			post = JSON.parse(post);
		}
		catch(e){
			try{
				post = qs.parse(post);
			}
			catch(e){}
		}
		callback(post);
	});
}

