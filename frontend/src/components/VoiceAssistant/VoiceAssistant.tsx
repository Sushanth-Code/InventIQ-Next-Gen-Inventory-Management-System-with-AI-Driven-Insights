import React, { useState, useEffect } from 'react';
import { useVoice } from '../../contexts/VoiceContext';

const VoiceAssistant: React.FC = () => {
  const {
    isListening,
    transcript,
    response,
    isProcessing,
    startListening,
    stopListening,
  } = useVoice();
  
  const [isOpen, setIsOpen] = useState(false);
  
  // Close the assistant when escape key is pressed
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        if (isListening) {
          stopListening();
        }
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isListening, stopListening]);
  
  return (
    <>
      {/* Floating button removed as requested */}
      
      {/* Voice assistant panel */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Voice Assistant</h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  if (isListening) {
                    stopListening();
                  }
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg mb-4 h-64 overflow-y-auto">
              {transcript && (
                <div className="mb-4">
                  <div className="font-semibold text-gray-700 mb-1">You said:</div>
                  <div className="bg-blue-50 p-3 rounded-lg">{transcript}</div>
                </div>
              )}
              
              {isProcessing && (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              )}
              
              {response && (
                <div>
                  <div className="font-semibold text-gray-700 mb-1">Assistant:</div>
                  <div className="bg-green-50 p-3 rounded-lg">{response}</div>
                </div>
              )}
              
              {!transcript && !response && !isProcessing && (
                <div className="text-center text-gray-500 h-full flex items-center justify-center">
                  <div>
                    <div className="material-icons text-4xl mb-2">mic</div>
                    <p>Click the button below to start speaking...</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={isListening ? stopListening : startListening}
                className={`flex items-center px-6 py-3 rounded-full ${
                  isListening 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-primary hover:bg-blue-600'
                } text-white`}
              >
                <span className="material-icons mr-2">
                  {isListening ? 'stop' : 'mic'}
                </span>
                {isListening ? 'Stop Listening' : 'Start Listening'}
              </button>
            </div>
            
            <div className="mt-4 text-center text-sm text-gray-500">
              <p>Try asking questions like:</p>
              <p className="mt-1 italic">"What products are low in stock?"</p>
              <p className="italic">"How much should I restock Product A?"</p>
              <p className="italic">"What's my best-selling category?"</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAssistant;