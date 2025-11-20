import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decodeAudioData, arrayBufferToBase64, float32ToPCM16 } from '../utils/audioUtils';

export const LiveView: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState('Disconnected');
  const [audioVolume, setAudioVolume] = useState(0);
  
  // Refs for audio handling to avoid closure staleness
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  
  // Helper to handle mic stream
  const startAudioStream = async (sessionPromise: Promise<any>) => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = ctx.createMediaStreamSource(stream);
    
    // Simple visualizer
    const analyzer = ctx.createAnalyser();
    source.connect(analyzer);
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    const updateVol = () => {
        if (ctx.state === 'closed') return;
        analyzer.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a,b) => a+b) / dataArray.length;
        setAudioVolume(avg);
        requestAnimationFrame(updateVol);
    }
    updateVol();

    // Processor for sending data
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = float32ToPCM16(inputData);
        const base64 = arrayBufferToBase64(pcm16);
        
        sessionPromise.then(session => {
            session.sendRealtimeInput({
                media: {
                    mimeType: 'audio/pcm;rate=16000',
                    data: base64
                }
            });
        });
    };

    source.connect(processor);
    processor.connect(ctx.destination);
    
    return () => {
        stream.getTracks().forEach(t => t.stop());
        processor.disconnect();
        source.disconnect();
        ctx.close();
    };
  };

  const connect = async () => {
    try {
        setStatus('Connecting...');
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Output Context (24kHz)
        const outCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
        audioContextRef.current = outCtx;
        nextStartTimeRef.current = 0;

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
                },
                systemInstruction: "You are a helpful, friendly AI assistant. Keep responses concise and conversational."
            },
            callbacks: {
                onopen: async () => {
                    setStatus('Live');
                    setIsConnected(true);
                    // Start Input Stream
                    await startAudioStream(sessionPromise);
                },
                onmessage: async (msg: LiveServerMessage) => {
                    const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                    if (audioData && audioContextRef.current) {
                        const ctx = audioContextRef.current;
                        const buffer = await decodeAudioData(
                             // Standard helper expects Uint8Array
                             new Uint8Array(atob(audioData).split('').map(c => c.charCodeAt(0))), 
                             ctx, 
                             24000, 
                             1
                        );
                        
                        const source = ctx.createBufferSource();
                        source.buffer = buffer;
                        source.connect(ctx.destination);
                        
                        const now = ctx.currentTime;
                        // Basic scheduler
                        const start = Math.max(now, nextStartTimeRef.current);
                        source.start(start);
                        nextStartTimeRef.current = start + buffer.duration;
                    }
                },
                onclose: () => {
                    setStatus('Disconnected');
                    setIsConnected(false);
                },
                onerror: (e) => {
                    console.error(e);
                    setStatus('Error');
                    setIsConnected(false);
                }
            }
        });
        sessionPromiseRef.current = sessionPromise;

    } catch (e) {
        console.error(e);
        setStatus('Failed to connect');
    }
  };

  const disconnect = () => {
      if (sessionPromiseRef.current) {
          sessionPromiseRef.current.then(s => s.close());
      }
      if (audioContextRef.current) {
          audioContextRef.current.close();
      }
      setIsConnected(false);
      setStatus('Disconnected');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className={`relative w-64 h-64 rounded-full flex items-center justify-center transition-all duration-700 ${isConnected ? 'bg-brand-50 shadow-[0_0_60px_-15px_rgba(14,165,233,0.3)]' : 'bg-gray-200'}`}>
        
        {/* Ripple Effect */}
        {isConnected && (
            <>
             <div className="absolute inset-0 rounded-full border-2 border-brand-200 animate-ping opacity-20"></div>
             <div className="absolute inset-4 rounded-full border border-brand-300 animate-pulse opacity-40"></div>
            </>
        )}

        {/* Core Orb */}
        <div 
            className={`w-40 h-40 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 z-10 ${isConnected ? 'bg-gradient-to-tr from-brand-500 to-purple-600 scale-110' : 'bg-gray-400 scale-100'}`}
            style={{ transform: isConnected ? `scale(${1 + audioVolume/255})` : 'scale(1)' }}
        >
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path></svg>
        </div>
      </div>

      <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Conversational AI</h2>
          <p className="text-gray-500 mb-8">{status}</p>
          
          <button
            onClick={isConnected ? disconnect : connect}
            className={`px-10 py-4 rounded-full font-bold text-lg shadow-lg transition-transform hover:scale-105 active:scale-95 ${isConnected ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-black hover:bg-gray-800 text-white'}`}
          >
              {isConnected ? 'End Call' : 'Start Talking'}
          </button>
      </div>
    </div>
  );
};