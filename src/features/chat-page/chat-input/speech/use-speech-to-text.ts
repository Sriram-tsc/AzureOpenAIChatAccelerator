import { showError } from "@/features/globals/global-message-store";
import {
  AudioConfig,
  AutoDetectSourceLanguageConfig,
  SpeechConfig,
  SpeechRecognizer,
} from "microsoft-cognitiveservices-speech-sdk";
import { proxy, useSnapshot } from "valtio";
import { chatStore } from "../../chat-store";
import { GetSpeechToken } from "./speech-service";

let speechRecognizer: SpeechRecognizer | undefined = undefined;

class SpeechToText {
  public isMicrophoneUsed: boolean = false;
  public isMicrophoneReady: boolean = false;

  public async startRecognition() {
    const token = await GetSpeechToken();

    if (token.error) {
      showError(token.errorMessage);
      return;
    }

    this.isMicrophoneReady = true;
    this.isMicrophoneUsed = true;

    const speechConfig = SpeechConfig.fromAuthorizationToken(
      token.token,
      token.region
    );
    // Test code change to see if the source language recognition is working fine
    // the language code has been hard-coded now. This has to be made dynamic depending on the UI requirements of the customer
    // Can be read from the app settings if there is only one language of preference 
    speechConfig.speechRecognitionLanguage = "hi-IN";
    const audioConfig = AudioConfig.fromDefaultMicrophoneInput();

    /* const autoDetectSourceLanguageConfig =
      AutoDetectSourceLanguageConfig.fromLanguages([
        "en-US",
        "zh-CN",
        "it-IT",
        "pt-BR",
      ]); */

    const recognizer = new SpeechRecognizer(speechConfig, audioConfig);
    /* const recognizer = SpeechRecognizer.FromConfig(
      speechConfig,
      autoDetectSourceLanguageConfig,
      audioConfig
    ); */

    speechRecognizer = recognizer;

    recognizer.recognizing = (s, e) => {
      chatStore.updateInput(e.result.text);
    };

    recognizer.canceled = (s, e) => {
      showError(e.errorDetails);
    };

    recognizer.startContinuousRecognitionAsync();
  }

  public stopRecognition() {
    if (speechRecognizer) {
      speechRecognizer.stopContinuousRecognitionAsync();
      this.isMicrophoneReady = false;
    }
  }

  public userDidUseMicrophone() {
    return this.isMicrophoneUsed;
  }

  public resetMicrophoneUsed() {
    this.isMicrophoneUsed = false;
  }
}
export const speechToTextStore = proxy(new SpeechToText());

export const useSpeechToText = () => {
  return useSnapshot(speechToTextStore);
};
