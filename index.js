//window.desktopCapturer = require('electron').desktopCapturer;

const bitrateSeries = {};
const bitrateGraphs = {};
const framerateSeries = {};
const framerateGraphs = {};
let lastSendResult;
let lastRecvResult;
const changeBtn = document.getElementById('changeBtn');
const startBtn = document.getElementById('startBtn');
// unified-plan plan-b
const pc1 = new RTCPeerConnection({sdpSemantics: 'plan-b'});
const pc2 = new RTCPeerConnection({sdpSemantics: 'plan-b'});
const pc3 = new RTCPeerConnection(); // 发送端的第二个peerconnection
const pc4 = new RTCPeerConnection(); // 接收端的第二个peerconnection

var screenChrome = false;

pc1.onicecandidate = (e) => {
    console.log("p1 onicecandidate: " + JSON.stringify(e.candidate));
    pc2.addIceCandidate(e.candidate);
}
pc2.onicecandidate = (e) => {
    console.log("p2 onicecandidate: " + JSON.stringify(e.candidate));
    pc1.addIceCandidate(e.candidate);
    
}
pc1.ontrack = (e) => {
    console.log("p1 ontrack id: " + e.streams[0].id);
    var stream_id = e.streams[0].id;
    e.streams[0].onaddtrack = (e) => {
        console.log(">>> pc1 remote stream onaddtrack.");
    };
    e.streams[0].onremovetrack = (e) => {
        console.log(">>> pc1 remote stream onremovetrack: "+stream_id);
        document.getElementById('remotes').removeChild(document.getElementById(stream_id + 'Container'));
    };
    show(e.streams[0], true, true);
}

pc2.ontrack = (e) => {
    console.log("p2 ontrack id: " + e.streams[0].id);
    e.streams[0].onaddtrack = (e) => {
        console.log(">>> pc2 remote stream onaddtrack.");
    };
    show(e.streams[0], true, true);
}

pc3.onicecandidate = (e) => pc4.addIceCandidate(e.candidate);
pc4.onicecandidate = (e) => pc3.addIceCandidate(e.candidate);
pc4.ontrack = (e) => show(e.streams[0], true, false);
    
//changeBtn.addEventListener('click', changeBtnClick);
startBtn.addEventListener('click', startBtnClick); 

function changeBtnClick() {
    
    return;
}

var screenStream;
var screenSender;

if (screenChrome) {
    navigator.mediaDevices.getDisplayMedia({ video: true })
        .then(stream => {
            console.log("get screen capture success");
            show(stream, false);
            screenStream = stream;
            var aoTrack = stream.getVideoTracks();
            let supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
        }, error => {
            console.log("Unable to acquire screen capture", error);
        });
}

var changeNum = 0;

function simplify_sdp( o_sdp )
{
    
}

var videoLowStream;
navigator.mediaDevices.getUserMedia({video: {width: 320, height: 180}})
        .then((stream) => {
            videoLowStream = stream;
            show(stream, false);
        }).catch(e => console.error(e));
        
   
var answerSDP;
var videoArr = [];
var bDeleteDouble = false;
function startBtnClick() {
  navigator.mediaDevices.getUserMedia({video: {width: 640, height: 360}})
        .then((stream) => {
            console.log("media id: " + stream.id);
            
            /*
            pc1.addTransceiver(stream.getVideoTracks()[0], {
                direction: "sendrecv",
                streams: [stream],
                sendEncodings: [
                    { rid: "h", active: true, maxBitrate: 900000 },
                    { rid: "m", active: true, maxBitrate: 300000, scaleResolutionDownBy: 2 },
                    { rid: "l", active: true, maxBitrate: 100000, scaleResolutionDownBy: 4 }
                ]
            });
            
            pc2.addTransceiver(stream.getVideoTracks()[0], {
                direction: "sendrecv",
                streams: [stream],
                sendEncodings: [
                { rid: "h", active: true, maxBitrate: 900000 },
                { rid: "m", active: true, maxBitrate: 300000,scaleResolutionDownBy: 2 },
                { rid: "l", active: true, maxBitrate: 100000,scaleResolutionDownBy: 4 }
                ]
            });*/

            //pc1.addStream(stream);

            pc1.addTrack(stream.getVideoTracks()[0], stream);
            //pc1.addTrack(videoLowStream.getVideoTracks()[0], videoLowStream);
            //pc2.addTrack(stream.getVideoTracks()[0], stream);
            pc2.addTrack(videoLowStream.getVideoTracks()[0], videoLowStream);

            //pc1.addTransceiver(stream.getVideoTracks()[0], {streams: [stream]});
            //pc2.addTransceiver(stream.getVideoTracks()[0], {streams: [stream]});
            //pc2.addTransceiver(stream.getVideoTracks()[0], {streams: [stream]});
            //if (screenChrome)
                //screenSender = pc1.addTrack(screenStream.getVideoTracks()[0], screenStream);

            show(stream, false);

            return pc1.createOffer({simulcast: true});
        })
        .then((offer) => {
            console.log("p1 createOffer sdp: " + offer.sdp);
            
            /* electron 1.6.17 */
            /*
            offer.sdp = offer.sdp.replace('a=rtpmap:100 VP8/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:100 goog-remb\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:100 transport-cc\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:100 ccm fir\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:100 nack\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:100 nack pli\r\n', '');
            
            offer.sdp = offer.sdp.replace('a=rtpmap:101 VP9/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:101 goog-remb\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:101 transport-cc\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:101 ccm fir\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:101 nack\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:101 nack pli\r\n', '');
            
            offer.sdp = offer.sdp.replace('a=rtpmap:96 rtx/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=fmtp:96 apt=100\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtpmap:97 rtx/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=fmtp:97 apt=101\r\n', '');
            
            offer.sdp = offer.sdp.replace('a=rtpmap:116 red/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtpmap:117 ulpfec/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtpmap:98 rtx/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=fmtp:98 apt=116\r\n', '');
            
            offer.sdp = offer.sdp.replace('m=video 9 RTP/AVPF 100 101 107 116 117 96 97 99 98\r\n', 
                                'm=video 9 RTP/AVPF 107 99\r\n');
            */
            
            // chrome 80
            offer.sdp = offer.sdp.replace('a=rtpmap:96 VP8/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:96 goog-remb\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:96 transport-cc\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:96 ccm fir\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:96 nack\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:96 nack pli\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtpmap:97 rtx/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=fmtp:97 apt=96\r\n', '');
            
            offer.sdp = offer.sdp.replace('a=rtpmap:98 VP9/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:98 goog-remb\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:98 transport-cc\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:98 ccm fir\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:98 nack\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:98 nack pli\r\n', '');
            offer.sdp = offer.sdp.replace('a=fmtp:98 profile-id=0\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtpmap:99 rtx/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=fmtp:99 apt=98\r\n', '');
            
            offer.sdp = offer.sdp.replace('a=rtpmap:100 VP9/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:100 goog-remb\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:100 transport-cc\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:100 ccm fir\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:100 nack\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtcp-fb:100 nack pli\r\n', '');
            offer.sdp = offer.sdp.replace('a=fmtp:100 profile-id=2\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtpmap:101 rtx/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=fmtp:101 apt=100\r\n', '');
            
            offer.sdp = offer.sdp.replace('a=rtpmap:124 red/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtpmap:120 rtx/90000\r\n', '');
            offer.sdp = offer.sdp.replace('a=fmtp:120 apt=124\r\n', '');
            offer.sdp = offer.sdp.replace('a=rtpmap:123 ulpfec/90000\r\n', '');
            
            offer.sdp = offer.sdp.replace('m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 122 127 121 125 107 108 109 124 120 123\r\n', 
                                'm=video 9 RTP/AVPF 100 101 102 122 127 121 125 107 108 109\r\n');
            
            offer.sdp = offer.sdp.replace('m=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126\r\n', 
                                'm=audio 9 RTP/AVPF 111 103 104 9 0 8 106 105 13 110 112 113 126\r\n');
            
            
            var lines = offer.sdp.trim().split('\r\n');
            var len = lines.length;
            for (var i=0;i<len;i++) {
                if (lines[i].indexOf("a=fingerprint:sha-256") != -1) {
                    lines.splice(i, 1);
                    i--;len--;
                }
            }
            offer.sdp = lines.join('\r\n') + '\r\n';
            
            console.log("pc1.setLocalDescription sdp: " + offer.sdp);
            
            var offer2 = {
                type: 'offer',
                sdp: offer.sdp,
            };
            //offer2.sdp = offer2.sdp.replace('a=rid:h send', 'a=rid:h recv');
            //offer2.sdp = offer2.sdp.replace('a=rid:m send', 'a=rid:m recv');
            //offer2.sdp = offer2.sdp.replace('a=rid:l send', 'a=rid:l recv');
            //offer2.sdp = offer2.sdp.replace('a=simulcast:send h;m;l', 'a=simulcast:recv h;m;l');

            return Promise.all([
                pc1.setLocalDescription(offer),
                pc2.setRemoteDescription(offer2),
            ]);

        })
        .then(() => {
            console.log(">>> set pc1 local sdp: "+pc1.localDescription.sdp);
            return pc2.createAnswer({simulcast: true});
        })
        .then(answer => {
            console.log( "pc2 createAnswer sdp: " + answer.sdp);
            answerSDP = {
                type: 'answer',
                sdp: answer.sdp,
            };
            
            //var video_info = lines.slice(video_index, audio_index);
            //lines.splice(video_index, audio_index - video_index);
            //lines = lines.concat(video_info);
            
            return Promise.all([
                pc2.setLocalDescription(answer),
                pc1.setRemoteDescription(answerSDP),
            ]);
        })
        .then(() => {
            console.log(">>> set pc2 local sdp: "+pc2.localDescription.sdp);
            
        })
        .catch(e => console.error(e));
}

function clearRemoteVideo() {
    
    var el = document.getElementById('remotes');
    
    var childs = el.childNodes; 
    for(var i = childs .length - 1; i >= 0; i--) {
        el.removeChild(childs[i]);
    }

}

var aoRemoteStream = [];

function show(stream, isRemote, isfirst) {
    console.log("is remote: " + isRemote + ", isfirst: " + isfirst+", stream id: "+stream.id);
    const id = isRemote ? stream.id : 'local';

    const container = document.createElement('div');
    container.id = id + 'Container';
    document.getElementById(isRemote ? 'remotes' : 'local').appendChild(container);
    
    if (isRemote) {
        aoRemoteStream.push(stream);
    }

    const v = document.createElement('video');
    v.autoplay = true;
    v.srcObject = stream;
    v.onresize = () => {
        v.title = 'video dimensions: ' + v.videoWidth + 'x' + v.videoHeight;
        console.log("stream id: "+v.srcObject.id+" video dimensions: " + v.videoWidth + "x" + v.videoHeight);
    }
    container.appendChild(v);

    /*
    const bitrateCanvas = document.createElement('canvas');
    bitrateCanvas.id = id + 'BitrateCanvas';
    bitrateCanvas.title = 'Bitrate';
    container.appendChild(bitrateCanvas);

    const bitrateGraph = new TimelineGraphView(id + 'Container', id + 'BitrateCanvas');
    bitrateGraph.updateEndDate();

    bitrateSeries[id] = new TimelineDataSeries();
    bitrateGraphs[id] = bitrateGraph;

    const framerateCanvas = document.createElement('canvas');
    framerateCanvas.id = id + 'FramerateCanvas';
    framerateCanvas.title = 'Framerate';
    container.appendChild(framerateCanvas);

    const framerateGraph = new TimelineGraphView(id + 'Container', id + 'FramerateCanvas');
    framerateGraph.updateEndDate();

    framerateSeries[id] = new TimelineDataSeries();
    framerateGraphs[id] = framerateGraph;
    */
}



    
