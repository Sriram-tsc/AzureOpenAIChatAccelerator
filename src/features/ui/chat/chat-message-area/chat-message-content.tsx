import React, { ForwardRefRenderFunction, useEffect } from "react";
import { VideoPanel } from "../chat-videooutput-area/video-panel";
import { RenderAvatarVideo } from "@/features/ui/chat/chat-videooutput-area/video-avatar"; 

interface ChatMessageContentAreaProps {
  children?: React.ReactNode;
}

const ChatMessageContentArea: ForwardRefRenderFunction<
  HTMLDivElement,
  ChatMessageContentAreaProps
> = (props, ref) => {

  useEffect(() => {
    console.log("useEffect in the Chat-content-area file");
    const funcVideo = async () =>{
      console.log("chat-message-content use-effect");
      const videoElement = document.getElementById('video-element') as HTMLVideoElement
      const RTCPeerConnection = (
        window.RTCPeerConnection
      ).bind(window);
      RenderAvatarVideo.initializePageElements(videoElement);
      await RenderAvatarVideo.establishConnection(RTCPeerConnection);
    } 
    funcVideo().
      then(()=> console.log("completion of the promise")).
      catch((exception)=> console.log("catch block: exception:"+ exception));

  }, []);


  return (
    <div>
      <div
        ref={ref}
        className="container max-w-3xl  relative min-h-screen pb-[240px] pt-16  flex flex-col gap-16"
      >
        {props.children}        
        <VideoPanel />
      </div>
    </div>
  );
};

export default React.forwardRef(ChatMessageContentArea);











