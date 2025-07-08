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
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set up event handlers to track speech state
    utterance.onend = () => {
      console.log('Speech finished');
    };
    
    utterance.onerror = (event) => {
      console.error('Speech error:', event);
    };
    
    window.speechSynthesis.speak(utterance);
    
    // Return a function to cancel the speech
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing speech when component unmounts
      window.speechSynthesis.cancel();
    };
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
    // Cancel any ongoing speech when stopping listening
    window.speechSynthesis.cancel();
    
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