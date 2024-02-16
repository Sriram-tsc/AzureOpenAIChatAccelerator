import staticAvatarImage  from './or-roman.jpg'

export const VideoPanel = () => {
  return (
    <>
      <div id="content">
        <div id="video-wrapper">
          <div>
            <video id="video-element" src={staticAvatarImage} width="400" height="400" autoPlay></video>
          </div>
        </div>
        <br />

        <div id="status">
          ICE gathering status: <label id="ice-gathering-status-label"></label><br />
          ICE status: <label id="ice-status-label"></label><br />
          Peer connection status: <label id="peer-status-label"></label><br />
          Signaling status: <label id="signaling-status-label"></label><br />
          Streaming status: <label id="streaming-status-label"></label><br />
        </div>
      </div>
    </>
  );
};
