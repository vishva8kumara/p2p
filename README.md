# p2p
A p2p networking layer/proxy (UDP to HTTP-REST) for VoIP, Messaging, Gaming, File sharing and almost anything p2p.

Author: Vishva Kuamra - vishva8kumara@gmail.com

## README
This has two interfaces; an HTTP/Web and a UDP for p2p. Web
interface is meant to be a user interface to manage the node,
connect to peers, view stats and manage stored data.
This does not attempt to make UDP into a reliable protocol
such as TCP in one sling shot.
The unreliable nature of UDP is left as is in some places, but on
some other places it is expanded to work in a req/resp manner,
msg fragmentation and sometimes to work very similar to TCP
as needed in each case.
This Should NOT be abstracted down for all req/resp to follow
the same level of reliability; that would defeat the whole purpose.
The idea of having various levels of UDP reliability and response
handling in various places on code - is to implement those
features as needed for that specific purpose.
For an example, a keep alive do not need a response, neither fragmentation.
Connect request do need a response and callback. But neither of these cases
need message fragmentation or buffering since these are small packets.
Only when sending real data between peers we need all stars plus more.!
Buffering, sequencing, ACK, compression, streaming, pushing, pulling,
callbacks/callforwards and more.
JSON is used as the data encapsulation. Below you will find a dictionary
that specifies JSON attribute names used in this encapsulation.
However, all UDP packets are sent out and received from the
same socket/port on one place on code each. We can later change the
encoding and/or port. Right now it is clear-text.

## Things to do:
* Implement encryption - at least base64
* User authentication from an idap server, preferably info.lk
* Device a way to protect user anonymity and/or privacy on the p2p network
* Search query throttling and provisioning to prevent over-use of server
* Buffered and sequenced (piggybacked ack) communucation between p2p links
* Enable peers to create an asymmetric encryption key pair and publish the public key
* Then re-do encryption to implement proper encryption
* Data storage and indexing
* Information publishing and lincensing

## DICTIONARY
	message
		c: command
			ka: keep-alive
			cr1: connect request stage 1
			cr2: connect request stage 2
			qrq: query peers - request
			qrs: query peers - response
			...
		f: from
		h: host
		n: reequest reference number
		o: object (response data)
		p: port
		r: response reference number
		su: search peer
		t: timestamp
		u: peer
