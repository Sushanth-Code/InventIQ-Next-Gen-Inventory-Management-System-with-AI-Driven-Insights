import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { predictionService } from '../services/api';

interface VoiceContextProps {
  isListening: boolean;
  transcript: string;
  response: string;
  isProcessing: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  resetTranscript: () => void;
}

const VoiceContext = createContext<VoiceContextProps>({} as VoiceContextProps);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    transcript,
    listening: isListening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  const speak = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  }, []);

  const processQuery = async (query: string) => {
    setIsProcessing(true);
    try {
      const result = await predictionService.getLLMInsights(query);
      setResponse(result.insights);
      speak(result.insights);
    } catch (error) {
      console.error('Error processing voice query:', error);
      const errorMessage = 'Sorry, I had trouble processing your request.';
      setResponse(errorMessage);
      speak(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const startListening = useCallback(() => {
    if (browserSupportsSpeechRecognition && isMicrophoneAvailable) {
      resetTranscript();
      SpeechRecognition.startListening({ continuous: true });
    } else {
      alert('Your browser does not support speech recognition or microphone access is denied.');
    }
  }, [browserSupportsSpeechRecognition, isMicrophoneAvailable, resetTranscript]);

  const stopListening = useCallback(() => {
    SpeechRecognition.stopListening();
    if (transcript) {
      processQuery(transcript);
    }
  }, [transcript, processQuery]);

  return (
    <VoiceContext.Provider
      value={{
        isListening,
        transcript,
        response,
        isProcessing,
        startListening,
        stopListening,
        speak,
        resetTranscript,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => useContext(VoiceContext);