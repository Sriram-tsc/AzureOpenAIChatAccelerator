import { log } from "console";
import { proxy, useSnapshot } from "valtio";
//import PeerConnection from "rtcpeerconnection";

/* const RTCPeerConnection = (
    window.RTCPeerConnection
  ).bind(window); */

let peerConnection: RTCPeerConnection;
let streamId: any;
let sessionId: any;
let sessionClientAnswer;
let statsIntervalId: string | number | NodeJS.Timeout | undefined;
let videoIsPlaying: boolean;
let lastBytesReceived: number;
let maxRetryCount: number = 3;
let maxDelaySec: number = 4;
let DID_API_KEY: string;
let DID_API_SERVICE: string;
let DID_API_URL: string;
let videoElement: HTMLVideoElement;
let PeerConnection: any;
/*const RTCPeerConnection = (
    window.RTCPeerConnection
).bind(window);*/

/* const videoElement = document.getElementById('video-element') as HTMLVideoElement;
const peerStatusLabel = document.getElementById('peer-status-label');
const iceStatusLabel = document.getElementById('ice-status-label');
const iceGatheringStatusLabel = document.getElementById('ice-gathering-status-label');
const signalingStatusLabel = document.getElementById('signaling-status-label');
const streamingStatusLabel = document.getElementById('streaming-status-label'); */

//videoElement.setAttribute('playsinline', '');

class SyntheticVideoService {
    constructor() {
        console.log("instantiating the SyntheticVideoService service");
        DID_API_KEY = "Z3NyaXJhbWl0QGdtYWlsLmNvbQ:kd2X6REXgMTVoWUJJn3_V";
        DID_API_SERVICE = "talks";
        DID_API_URL = "https://api.d-id.com";
        //this.establishConnection();
    }

    public initializePageElements(_videoElement: HTMLVideoElement) {
        videoElement = _videoElement;
    }

    private initializeAvatarFrameContents() {
        const presenterInputByService = {
            talks: {
                source_url: 'https://d-id-public-bucket.s3.amazonaws.com/or-roman.jpg',
            },
            clips: {
                presenter_id: 'rian-lZC6MmWfC1',
                driver_id: 'mXra4jY38i'
            }
        };
    }

    //const connectButton = document.getElementById('connect-button');
    public async establishConnection(_pc : any) {
        PeerConnection = _pc;
        console.log("establish server connection");
        if (peerConnection && peerConnection.connectionState === 'connected') {
            return;
        }

        this.stopAllStreams();
        this.closePC();
        console.log("calling streams api:" + `${DID_API_URL}/${DID_API_SERVICE}/streams`);
        const sessionResponse = await this.fetchWithRetries(`${DID_API_URL}/${DID_API_SERVICE}/streams`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${DID_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source_url: 'https://d-id-public-bucket.s3.amazonaws.com/or-roman.jpg'
            }),
        });

        const { id: newStreamId, offer, ice_servers: iceServers, session_id: newSessionId } = await sessionResponse.json();
        streamId = newStreamId;
        sessionId = newSessionId;
        console.log("stream id:" + streamId);
        console.log("session id:" + sessionId);

        try {
            console.log("creating peer connection")
            sessionClientAnswer = await this.createPeerConnection(offer, iceServers);
        } catch (e) {
            console.log('error during streaming setup', e);
            this.stopAllStreams();
            this.closePC();
            return;
        }

        const sdpResponse = await fetch(`${DID_API_URL}/${DID_API_SERVICE}/streams/${streamId}/sdp`, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${DID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                answer: sessionClientAnswer,
                session_id: sessionId,
            }),
        });
    };

    //const startButton = document.getElementById('start-button');
    public async startVideoStream(textToSpeak: string) {
        console.log("In Start video stream method: message received:" + textToSpeak);
        // connectionState not supported in firefox
        if (peerConnection?.signalingState === 'stable' || peerConnection?.iceConnectionState === 'connected') {
            const playResponse = await this.fetchWithRetries(`${DID_API_URL}/${DID_API_SERVICE}/streams/${streamId}`, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${DID_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    script: {
                        type: 'text',
                        "provider": {
                            "type": "microsoft",
                            "voice_id": "en-US-JennyNeural"
                        },
                        input: textToSpeak
                    },
                    config: {
                        stitch: true,
                    },
                    session_id: sessionId,
                }),
            });
            console.log("play response:" + playResponse);
        }
    };

    private async destroyVideoStream() {
        await fetch(`${DID_API_URL}/${DID_API_SERVICE}/streams/${streamId}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Basic ${DID_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ session_id: sessionId }),
        });

        this.stopAllStreams();
        this.closePC();
    };


    private onIceGatheringStateChange() {
        console.log("onIceGatheringStateChange:" + peerConnection.iceGatheringState);
        //iceGatheringStatusLabel.className = 'iceGatheringState-' + peerConnection.iceGatheringState;
    }

    private onIceCandidate(event) {
        console.log('onIceCandidate', event);
        if (event.candidate) {
            const { candidate, sdpMid, sdpMLineIndex } = event.candidate;

            fetch(`${DID_API_URL}/${DID_API_SERVICE}/streams/${streamId}/ice`, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${DID_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    candidate,
                    sdpMid,
                    sdpMLineIndex,
                    session_id: sessionId,
                }),
            });
        }
    }

    private onIceConnectionStateChange() {
        console.log("onIceConnectionStateChange:" + peerConnection.iceConnectionState);
        //iceStatusLabel.className = 'iceConnectionState-' + peerConnection.iceConnectionState;
        if (peerConnection.iceConnectionState === 'failed' || peerConnection.iceConnectionState === 'closed') {
            this.stopAllStreams();
            this.closePC();
        }
    }
    private onConnectionStateChange() {
        // not supported in firefox
        console.log("onConnectionStateChange:" + peerConnection.connectionState);
        //peerStatusLabel.className = 'peerConnectionState-' + peerConnection.connectionState;
    }
    private onSignalingStateChange() {
        console.log("onSignalingStateChange:" + peerConnection.signalingState);
        //signalingStatusLabel.className = 'signalingState-' + peerConnection.signalingState;
    }    

    private onTrack(event) {
        /**
         * The following code is designed to provide information about wether currently there is data
         * that's being streamed - It does so by periodically looking for changes in total stream data size
         *
         * This information in our case is used in order to show idle video while no video is streaming.
         * To create this idle video use the POST https://api.d-id.com/talks (or clips) endpoint with a silent audio file or a text script with only ssml breaks
         * https://docs.aws.amazon.com/polly/latest/dg/supportedtags.html#break-tag
         * for seamless results use `config.fluent: true` and provide the same configuration as the streaming video
         */

        if (!event.track) return;

        statsIntervalId = setInterval(async () => {
            const stats = await peerConnection.getStats(event.track);
            stats.forEach((report) => {
                if (report.type === 'inbound-rtp' && report.mediaType === 'video') {
                    const videoStatusChanged = videoIsPlaying !== report.bytesReceived > lastBytesReceived;

                    if (videoStatusChanged) {
                        videoIsPlaying = report.bytesReceived > lastBytesReceived;
                        console.log(" calling the event handler onVideoStatusChange from the OnTrack event handler");
                        //this.onVideoStatusChange(videoIsPlaying, event.streams[0]);
                        if (videoIsPlaying) {
                           console.log("streaming");
                            const remoteStream = event.streams[0];
                            this.setVideoElement(remoteStream);
                        } else {
                            console.log("onVideoStatusChange: video not playing")
                            this.playIdleVideo();
                        }
                    }
                    lastBytesReceived = report.bytesReceived;
                }
            });
        }, 500);
    }

    private onVideoStatusChange(videoIsPlaying: boolean, stream: any) {
        let status;
        if (videoIsPlaying) {
            status = 'streaming';
            const remoteStream = stream;
            this.setVideoElement(remoteStream);
        } else {
            status = 'empty';
            console.log("onVideoStatusChange: video not playing")
            this.playIdleVideo();
        }
        console.log("onVideoStatusChange:" + status);
        //streamingStatusLabel.className = 'streamingState-' + status;
    }

    private async createPeerConnection(offer, iceServers: any) {
        if (!peerConnection) {
            console.log("createPeerConnection method: iceServers:" + JSON.stringify(iceServers));
            peerConnection = new PeerConnection({ iceServers });
            peerConnection.addEventListener('icegatheringstatechange', this.onIceGatheringStateChange, true);
            peerConnection.addEventListener('icecandidate', this.onIceCandidate, true);
            peerConnection.addEventListener('iceconnectionstatechange', this.onIceConnectionStateChange, true);
            peerConnection.addEventListener('connectionstatechange', this.onConnectionStateChange, true);
            peerConnection.addEventListener('signalingstatechange', this.onSignalingStateChange, true);
            peerConnection.addEventListener('track', this.onTrack, true);
        }

        await peerConnection.setRemoteDescription(offer);
        console.log('set remote sdp OK');

        const sessionClientAnswer = await peerConnection.createAnswer();
        console.log('create local sdp OK');

        await peerConnection.setLocalDescription(sessionClientAnswer);
        console.log('set local sdp OK');

        return sessionClientAnswer;
    }

    private setVideoElement(stream: any) {
        console.log("setVideoElement method");
        if (!stream) return;
        videoElement.srcObject = stream;
        videoElement.loop = false;

    }

    private playIdleVideo() {
        //videoElement.srcObject = undefined;
        videoElement.src = DID_API_SERVICE == 'clips' ? 'rian_idle.mp4' : 'or_idle.mp4';
        videoElement.loop = true;
    }

    private stopAllStreams() {
        if (videoElement.srcObject) {
            console.log('stopping video streams');
            videoElement.srcObject.getTracks().forEach((track) => track.stop());
            videoElement.srcObject = null;
        }
    }

    closePC(pc = peerConnection) {
        if (!pc) return;
        console.log('stopping peer connection');
        pc.close();
        pc.removeEventListener('icegatheringstatechange', this.onIceGatheringStateChange, true);
        pc.removeEventListener('icecandidate', this.onIceCandidate, true);
        pc.removeEventListener('iceconnectionstatechange', this.onIceConnectionStateChange, true);
        pc.removeEventListener('connectionstatechange', this.onConnectionStateChange, true);
        pc.removeEventListener('signalingstatechange', this.onSignalingStateChange, true);
        pc.removeEventListener('track', this.onTrack, true);
        clearInterval(statsIntervalId);
        console.log('stopped peer connection');
        if (pc === peerConnection) {
            console.log(" peer connection needs to be made null");
            //peerConnection = null;
        }
    }



    private async fetchWithRetries(url: string | URL | Request, options, retries = 1) {
        console.log(" fetch called with url:" + url + " options:" + options)
        try {
            return await fetch(url, options);
        } catch (err) {
            if (retries <= maxRetryCount) {
                const delay = Math.min(Math.pow(2, retries) / 4 + Math.random(), maxDelaySec) * 1000;

                await new Promise((resolve) => setTimeout(resolve, delay));

                console.log(`Request failed, retrying ${retries}/${maxRetryCount}. Error ${err}`);
                return this.fetchWithRetries(url, options, retries + 1);
            } else {
                throw new Error(`Max retries exceeded. error: ${err}`);
            }
        }
    }

}

export const RenderAvatarVideo = proxy(new SyntheticVideoService());

export const useVideoService = () => {
    return useSnapshot(RenderAvatarVideo, { sync: true });
};
