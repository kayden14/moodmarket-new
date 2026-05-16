// utils/voice.ts
//
// Cross-platform voice recognition helper.
// On Web: Uses the standard Web Speech API (webkitSpeechRecognition).
// On Native: Uses a stub for now (requires expo-speech-recognition).

import { Platform } from 'react-native';

export interface VoiceRecognitionResult {
  text: string;
  isFinal: boolean;
}

export type VoiceCallback = (result: VoiceRecognitionResult) => void;

class VoiceService {
  private recognition: any = null;
  private isListening = false;

  constructor() {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
      }
    }
  }

  start(onResult: VoiceCallback, onError: (err: any) => void) {
    if (this.isListening) return;
    
    if (Platform.OS === 'web') {
      if (!this.recognition) {
        onError('Speech recognition not supported in this browser.');
        return;
      }

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        onResult({
          text: finalTranscript || interimTranscript,
          isFinal: !!finalTranscript,
        });
      };

      this.recognition.onerror = (event: any) => {
        this.isListening = false;
        onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };

      try {
        this.recognition.start();
        this.isListening = true;
      } catch (e) {
        onError(e);
      }
    } else {
      // Native stub
      console.warn('[VoiceService] Native speech recognition requires expo-speech-recognition.');
      onError('Native voice search coming soon!');
    }
  }

  stop() {
    if (!this.isListening) return;
    if (Platform.OS === 'web' && this.recognition) {
      this.recognition.stop();
    }
    this.isListening = false;
  }
}

export const voiceService = new VoiceService();
