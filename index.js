const SemanticSDP = MediaServerClient.SemanticSDP;
const SDPInfo = SemanticSDP.SDPInfo;

class TestNamespace
{
	constructor()
	{
		this.callbacks = {};
	}
	cmd(name,data) 
	{
		switch(name)
		{
			case "create" : 
				//Answer it
				return {
					id		: 1,
					dtls		: {
						"setup"	      : "PASSIVE",
						"hash"        : "sha-256",
						"fingerprint" : "F2:AA:0E:C3:22:59:5E:14:95:69:92:3D:13:B4:84:24:2C:C2:A2:C0:3E:FD:34:8E:5E:EA:6F:AF:52:CE:E6:0F"
					},
					ice		: {
						"ufrag" : "af46F",
						"pwd"   : "a34FasdS++jdfofdslkjsd\/SDV"
					},
					candidates	: [{
						"foundation"	: 1,
						"componentId"	: 1,
						"transport"	: "udp",
						"priority"	: 2122260223,
						"address"	: "192.168.0.196",
						"port"		: 56143,
						"type"		: "host"
					}],
					capabilities	: {
						audio : {
							codecs		: ["opus"],
							extensions	: ["urn:ietf:params:rtp-hdrext:ssrc-audio-level","http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01"],
						},
						video : {
							codecs		: ["vp9"],
							rtx		: true,
							rtcpfbs		:  [
								{ "id": "transport-cc"},
								{ "id": "ccm", "params": ["fir"]},
								{ "id": "nack"},
								{ "id": "nack", "params": ["pli"]}
							],
							extensions	: [ "urn:3gpp:video-orientation", "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01"]
						}
					}
				};
		}
	}
	event(name,data)
	{
		console.log(name,data);
	}
	on(name,callback)
	{
		this.callbacks[name] = callback;
		return this;
	}
	
	fire (name,data)
	{
		this.callbacks[name] && this.callbacks[name](data);
	}
}

const ns = new TestNamespace();
const tm = {
	namespace : ()=>ns
};


function createLocalStream(i)
{
	//Create new canvs
	const canvas = document.createElement("canvas");
	//Fix width and height so encoding is not too expensive
	canvas.height = 64;
	canvas.width = 64;
	
	//Draw number
	var ctx = canvas.getContext("2d");
	
	//Periodically update it
	let num = 0;
	canvas.timer = setInterval(()=>{
		var ctx = canvas.getContext("2d");
		ctx.beginPath();
		ctx.fillStyle = "white";
		ctx.fillRect(0,0,64,64);
		ctx.fillStyle = "red";
		ctx.font = "32pt Arial";
		ctx.fillText(i,20,48);
		ctx.lineWidth = 6;
		ctx.strokeStyle = 'white';
		ctx.arc(32,32,20,0,2*Math.PI);
		ctx.stroke();
		ctx.beginPath();
		ctx.lineWidth = 4;
		ctx.strokeStyle = 'black';
		ctx.arc(32,32,20,-Math.PI/2,-Math.PI/2 + (num++%11)*Math.PI/5);
		ctx.stroke();
	},100);
	
	return canvas;
}


let pc;
let streams  = 0;
const AudioContext = window.AudioContext || window.webkitAudioContext;

//Create normal stream
addStream = async ()=>{
	//Create new canvas
	const canvas = createLocalStream(streams++);
	//Get stream
	const stream = canvas.captureStream();
	//Get video track
	const videoTrack = stream.getVideoTracks()[0];

	//Create audio track
	var audioContext = new AudioContext();
	var oscilator = audioContext.createOscillator();
	var audioTrack = audioContext.createMediaStreamDestination().stream.getAudioTracks()[0];

	//Add to stream
	stream.addTrack(audioTrack);
	//Add to pc
	const [audioSender,videoSender] = await Promise.all([pc.addTrack(audioTrack,stream),pc.addTrack(videoTrack,stream)]);

	return [audioSender,videoSender];
};

async function connect()
{
	//Create client
	const client = new MediaServerClient(tm);
	//Connect
	pc = await client.createManagedPeerConnection();
	
	pc.ontrack	= (event) => { console.log(event);}
	pc.ontrackended = (event) => { console.log(event);}
	
	for (let i=0; i<16; ++i)
		await addStream();
	
	setTimeout(dump,1000);
}

function dump()
{
	document.body.innerHTML = "<pre>" +pc.pc.localDescription.sdp + "</pre>";
}
//Test connection
connect();