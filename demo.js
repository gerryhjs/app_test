/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

'use strict';

const startButton = document.getElementById('startButton');
const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');
callButton.disabled = true;
hangupButton.disabled = true;
startButton.addEventListener('click', start);
callButton.addEventListener('click', call);
hangupButton.addEventListener('click', hangup);

let startTime;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

localVideo.addEventListener('loadedmetadata', function() {
  console.log(`Local video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('loadedmetadata', function() {
  console.log(`Remote video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
});

remoteVideo.addEventListener('resize', () => {
  console.log(`Remote video size changed to ${remoteVideo.videoWidth}x${remoteVideo.videoHeight}`);
  // We'll use the first onsize callback as an indication that video has started
  // playing out.
  if (startTime) {
    const elapsedTime = window.performance.now() - startTime;
    console.log('Setup time: ' + elapsedTime.toFixed(3) + 'ms');
    startTime = null;
  }
});

let localStream;
let pc1;
let pc2;
const offerOptions = {
  offerToReceiveAudio: 1,
  offerToReceiveVideo: 1
};

function getName(pc) {
  return (pc === pc1) ? 'pc1' : 'pc2';
}

function getOtherPc(pc) {
  return (pc === pc1) ? pc2 : pc1;
}

async function start() {
  console.log('Requesting local stream');
  startButton.disabled = true;
   var oMediaConfigure = { audio: true, 
                                video: {
                                    mandatory: {
                                        minWidth: 640,
                                        minHeight: 480,
                                        maxWidth: 640,
                                        maxHeight: 480
                                    }
                                } 
                            };
  try {
    const stream = await navigator.mediaDevices.getUserMedia(oMediaConfigure);
    console.log('Received local stream');
    localVideo.srcObject = stream;
    localStream = stream;
    callButton.disabled = false;
  } catch (e) {
    alert(`getUserMedia() error: ${e.name}`);
  }
}

function getSelectedSdpSemantics() {
  const sdpSemanticsSelect = document.querySelector('#sdpSemantics');
  const option = sdpSemanticsSelect.options[sdpSemanticsSelect.selectedIndex];
  return option.value === '' ? {} : {sdpSemantics: option.value};
}

async function call() {
  callButton.disabled = true;
  hangupButton.disabled = false;
  console.log('Starting call');
  startTime = window.performance.now();
  const videoTracks = localStream.getVideoTracks();
  const audioTracks = localStream.getAudioTracks();
  if (videoTracks.length > 0) {
    console.log(`Using video device: ${videoTracks[0].label}`);
  }
  if (audioTracks.length > 0) {
    console.log(`Using audio device: ${audioTracks[0].label}`);
  }
  const configuration = getSelectedSdpSemantics();
  console.log('RTCPeerConnection configuration:', configuration);
  pc1 = new RTCPeerConnection(configuration);
  console.log('Created local peer connection object pc1');
  pc1.addEventListener('icecandidate', e => onIceCandidate(pc1, e));
  pc2 = new RTCPeerConnection(configuration);
  console.log('Created remote peer connection object pc2');
  pc2.addEventListener('icecandidate', e => onIceCandidate(pc2, e));
  pc1.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc1, e));
  pc2.addEventListener('iceconnectionstatechange', e => onIceStateChange(pc2, e));
  pc2.addEventListener('track', gotRemoteStream);
  pc1.ontrack = (e) => getRemoteStream(e);

  localStream.getTracks().forEach(track => pc1.addTrack(track, localStream));
  console.log('Added local stream to pc1');

  try {
    console.log('pc1 createOffer start');
    const offer = await pc1.createOffer(offerOptions);
    console.log('pc1 offer sdp: '+offer.sdp);
    console.log('===================================================');
    
    if (1) {
        var videoPart = SDPUtils.getMediaSections(offer.sdp)[1];
        var match = videoPart.match(/a=ssrc:(\d+) cname:(.*)\r\n/);
        var msid = videoPart.match(/a=ssrc:(\d+) msid:(.*)\r\n/);
        var lines = offer.sdp.trim().split('\r\n');
        var removed = lines.splice(lines.length - 4, 4);
        var videoSSRC1 = parseInt(match[1]);
        var rtxSSRC1 = SDPUtils.matchPrefix(videoPart, 'a=ssrc-group:FID ')[0].split(' ')[2];
        var videoSSRC2 = videoSSRC1 + 1;
        var rtxSSRC2 = videoSSRC1 + 2;
        var videoSSRC3 = videoSSRC1 + 3;
        var rtxSSRC3 = videoSSRC1 + 4;

        lines.push(removed[0]);
        lines.push(removed[1]);

        lines.push('a=ssrc:' + videoSSRC2 + ' cname:' + match[2]);
        lines.push('a=ssrc:' + videoSSRC2 + ' msid:' + msid[2]);
        lines.push('a=ssrc:' + rtxSSRC2 + ' cname:' + match[2]);
        lines.push('a=ssrc:' + rtxSSRC2 + ' msid:' + msid[2]);

        lines.push('a=ssrc:' + videoSSRC3 + ' cname:' + match[2]);
        lines.push('a=ssrc:' + videoSSRC3 + ' msid:' + msid[2]);
        lines.push('a=ssrc:' + rtxSSRC3 + ' cname:' + match[2]);
        lines.push('a=ssrc:' + rtxSSRC3 + ' msid:' + msid[2]);

        lines.push('a=ssrc-group:FID ' + videoSSRC2 + ' ' + rtxSSRC2);
        lines.push('a=ssrc-group:FID ' + videoSSRC3 + ' ' + rtxSSRC3);
        lines.push('a=ssrc-group:SIM ' + videoSSRC1 + ' ' + videoSSRC2 + ' ' + videoSSRC3);
        offer.sdp = lines.join('\r\n') + '\r\n';
        console.log('pc1 new offer sdp: '+offer.sdp);
        console.log('===================================================');
    }
    
    await onCreateOfferSuccess(offer);
  } catch (e) {
    onCreateSessionDescriptionError(e);
  }
}

function onCreateSessionDescriptionError(error) {
  console.error(`Failed to create session description: ${error.toString()}`);
}

async function onCreateOfferSuccess(desc) {
  //console.log(`Offer from pc1\n${desc.sdp}`);
  console.log('pc1 setLocalDescription start');
  try {
    await pc1.setLocalDescription(desc);
    onSetLocalSuccess(pc1);
  } catch (e) {
    onSetSessionDescriptionError();
  }
  
  if (1) {
    // 去掉ssrc
    var videoPart = SDPUtils.getMediaSections(desc.sdp)[1];
    var match = videoPart.match(/a=ssrc:(\d+) cname:(.*)\r\n/);
    var msid = videoPart.match(/a=ssrc:(\d+) msid:(.*)\r\n/);
    var lines = desc.sdp.trim().split('\r\n');
    var removed = lines.splice(lines.length - 4, 4);
    var videoSSRC1 = parseInt(match[1]);
    var rtxSSRC1 = SDPUtils.matchPrefix(videoPart, 'a=ssrc-group:FID ')[0].split(' ')[1];
    var videoSSRC2 = videoSSRC1 + 1;
    var rtxSSRC2 = videoSSRC1 + 2;
    var videoSSRC3 = videoSSRC1 + 3;
    var rtxSSRC3 = videoSSRC1 + 4;

    desc.sdp = desc.sdp.replace('a=ssrc-group:SIM ' + videoSSRC1 + ' ' + videoSSRC2 + ' ' + videoSSRC3 + '\r\n', '');

    desc.sdp = desc.sdp.replace('a=ssrc:' + videoSSRC1 + ' msid:' + msid[2], 'a=ssrc:' + videoSSRC1 + ' msid:low low');
    desc.sdp = desc.sdp.replace('a=ssrc:' + rtxSSRC1 + ' msid:' + msid[2], 'a=ssrc:' + rtxSSRC1 + ' msid:low low');

    desc.sdp = desc.sdp.replace('a=ssrc:' + videoSSRC2 + ' msid:' + msid[2], 'a=ssrc:' + videoSSRC2 + ' msid:mid mid');
    desc.sdp = desc.sdp.replace('a=ssrc:' + rtxSSRC2 + ' msid:' + msid[2], 'a=ssrc:' + rtxSSRC2 + ' msid:mid mid');

    desc.sdp = desc.sdp.replace('a=ssrc:' + videoSSRC3 + ' msid:' + msid[2], 'a=ssrc:' + videoSSRC3 + ' msid:hi hi');
    desc.sdp = desc.sdp.replace('a=ssrc:' + rtxSSRC3 + ' msid:' + msid[2], 'a=ssrc:' + rtxSSRC3 + ' msid:hi hi');

    console.log(desc);
    console.log('===================================================');
  }

  console.log('pc2 setRemoteDescription start');
  try {
    await pc2.setRemoteDescription(desc.sdp);
    onSetRemoteSuccess(pc2);
  } catch (e) {
    onSetSessionDescriptionError();
  }

  console.log('pc2 createAnswer start');
  // Since the 'remote' side has no media stream we need
  // to pass in the right constraints in order for it to
  // accept the incoming offer of audio and video.
  try {
    const answer = await pc2.createAnswer();
    
    if (0) {
        var videoPart = SDPUtils.getMediaSections(answer.sdp)[1];
        var match = videoPart.match(/a=ssrc:(\d+) cname:(.*)\r\n/);
        var msid = videoPart.match(/a=ssrc:(\d+) msid:(.*)\r\n/);
        var lines = answer.sdp.trim().split('\r\n');
        var removed = lines.splice(lines.length - 4, 4);
        var videoSSRC1 = parseInt(match[1]);
        var rtxSSRC1 = SDPUtils.matchPrefix(videoPart, 'a=ssrc-group:FID ')[0].split(' ')[2];
        var videoSSRC2 = videoSSRC1 + 1;
        var rtxSSRC2 = videoSSRC1 + 2;
        var videoSSRC3 = videoSSRC1 + 3;
        var rtxSSRC3 = videoSSRC1 + 4;

        lines.push(removed[0]);
        lines.push(removed[1]);

        lines.push('a=ssrc:' + videoSSRC2 + ' cname:' + match[2]);
        lines.push('a=ssrc:' + videoSSRC2 + ' msid:' + msid[2]);
        lines.push('a=ssrc:' + rtxSSRC2 + ' cname:' + match[2]);
        lines.push('a=ssrc:' + rtxSSRC2 + ' msid:' + msid[2]);

        lines.push('a=ssrc:' + videoSSRC3 + ' cname:' + match[2]);
        lines.push('a=ssrc:' + videoSSRC3 + ' msid:' + msid[2]);
        lines.push('a=ssrc:' + rtxSSRC3 + ' cname:' + match[2]);
        lines.push('a=ssrc:' + rtxSSRC3 + ' msid:' + msid[2]);

        lines.push('a=ssrc-group:FID ' + videoSSRC2 + ' ' + rtxSSRC2);
        lines.push('a=ssrc-group:FID ' + videoSSRC3 + ' ' + rtxSSRC3);
        lines.push('a=ssrc-group:SIM ' + videoSSRC1 + ' ' + videoSSRC2 + ' ' + videoSSRC3);
        answer.sdp = lines.join('\r\n') + '\r\n';
    }
        
    await onCreateAnswerSuccess(answer);
  } catch (e) {
    onCreateSessionDescriptionError(e);
  }
}

function onSetLocalSuccess(pc) {
  console.log(`${getName(pc)} setLocalDescription complete`);
}

function onSetRemoteSuccess(pc) {
  console.log(`${getName(pc)} setRemoteDescription complete`);
}

function onSetSessionDescriptionError(error) {
  console.error(`Failed to set session description: ${error.toString()}`);
}

function gotRemoteStream(e) {
  if (remoteVideo.srcObject !== e.streams[0]) {
    remoteVideo.srcObject = e.streams[0];
    console.log('pc2 received remote stream');
  }
}

function getRemoteStream(e) {
  //if (remoteVideo.srcObject !== e.streams[0]) {
    //remoteVideo.srcObject = e.streams[0];
    console.log('>>>>> pc1 received remote stream');
  //}
}

async function onCreateAnswerSuccess(desc) {
  //console.log(`Answer from pc2:\n${desc.sdp}`);
  console.log('pc2 setLocalDescription start');
  try {
    await pc2.setLocalDescription(desc);
    onSetLocalSuccess(pc2);
  } catch (e) {
    onSetSessionDescriptionError(e);
  }
  console.log('pc1 setRemoteDescription start');
  try {
    await pc1.setRemoteDescription(desc);
    onSetRemoteSuccess(pc1);
  } catch (e) {
    onSetSessionDescriptionError(e);
  }
}

async function onIceCandidate(pc, event) {
  try {
    await (getOtherPc(pc).addIceCandidate(event.candidate));
    onAddIceCandidateSuccess(pc);
  } catch (e) {
    onAddIceCandidateError(pc, e);
  }
  console.log(`${getName(pc)} ICE candidate:\n${event.candidate ? event.candidate.candidate : '(null)'}`);
}

function onAddIceCandidateSuccess(pc) {
  //console.log(`${getName(pc)} addIceCandidate success`);
}

function onAddIceCandidateError(pc, error) {
  console.log(`${getName(pc)} failed to add ICE Candidate: ${error.toString()}`);
}

function onIceStateChange(pc, event) {
  if (pc) {
    console.log(`${getName(pc)} ICE state: ${pc.iceConnectionState}`);
    console.log('ICE state change event: ', event);
  }
}

function hangup() {
  console.log('Ending call');
  pc1.close();
  pc2.close();
  pc1 = null;
  pc2 = null;
  hangupButton.disabled = true;
  callButton.disabled = false;
}
