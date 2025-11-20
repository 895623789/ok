import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../services/geminiService';
import { Message } from '../types';

export const ChatView: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: 'init', role: 'model', text: "Hello! I'm your AI assistant. I can help with complex problems, finding places, or searching the web.", timestamp: Date.now() }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'fast' | 'smart' | 'search' | 'maps'>('smart');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      let location;
      if (mode === 'maps') {
         // Simple browser geolocation
         try {
             const pos: GeolocationPosition = await new Promise((resolve, reject) => 
                 navigator.geolocation.getCurrentPosition(resolve, reject)
             );
             location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
         } catch (e) {
             console.warn("Location denied");
         }
      }

      const result = await sendChatMessage(
        userMsg.text || '',
        [], // Simplification: not sending full history for this stateless-ish view demo
        {
            useThinking: mode === 'smart',
            useSearch: mode === 'search',
            useMaps: mode === 'maps',
            useFast: mode === 'fast',
            location
        }
      );

      // Parse grounding
      const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
      let urls: { title: string; uri: string; type: 'search' | 'map' }[] = [];
      
      if (groundingChunks) {
          groundingChunks.forEach((chunk: any) => {
              if (chunk.web) urls.push({ title: chunk.web.title, uri: chunk.web.uri, type: 'search' });
              if (chunk.maps) urls.push({ title: chunk.maps.title, uri: chunk.maps.uri, type: 'map' });
          });
      }

      const modelMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: result.text,
        groundingUrls: urls,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, modelMsg]);

    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Something went wrong. Please try again.", timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto p-4">
      {/* Header / Mode Selector */}
      <div className="bg-white p-2 rounded-2xl shadow-sm mb-4 flex justify-around items-center">
          {[
              { id: 'fast', label: 'Fast ⚡', desc: 'Flash Lite' },
              { id: 'smart', label: 'Thinking 🧠', desc: 'Gemini 3 Pro' },
              { id: 'search', label: 'Search 🌐', desc: 'Google Data' },
              { id: 'maps', label: 'Maps 🗺️', desc: 'Places' }
          ].map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id as any)}
                className={`flex flex-col items-center px-4 py-2 rounded-xl transition-all ${mode === m.id ? 'bg-brand-100 text-brand-900 ring-2 ring-brand-500' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                  <span className="font-bold text-sm">{m.label}</span>
                  <span className="text-[10px] opacity-70">{m.desc}</span>
              </button>
          ))}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-6 p-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-5 ${msg.role === 'user' ? 'bg-brand-600 text-white rounded-br-none' : 'bg-white shadow-sm border border-gray-100 rounded-bl-none'}`}>
              <div className="prose prose-sm dark:prose-invert leading-relaxed whitespace-pre-wrap">
                {msg.text}
              </div>
              
              {/* Grounding Chips */}
              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                      {msg.groundingUrls.map((url, idx) => (
                          <a key={idx} href={url.uri} target="_blank" rel="noreferrer" className="inline-flex items-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1 rounded-full transition-colors">
                             {url.type === 'map' ? '📍' : '🔗'} <span className="ml-1 truncate max-w-[150px]">{url.title}</span>
                          </a>
                      ))}
                  </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-3">
                    <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-brand-500 rounded-full animate-bounce delay-150"></div>
                    <span className="text-xs text-gray-400 font-medium ml-2">
                        {mode === 'smart' ? 'Deep Thinking...' : 'Generating...'}
                    </span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="mt-4 bg-white p-2 rounded-full shadow-lg border border-gray-100 flex items-center">
        <input
            type="text"
            className="flex-1 bg-transparent outline-none px-6 py-3 text-gray-800 placeholder-gray-400"
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-brand-600 hover:bg-brand-700 text-white p-3 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
        </button>
      </div>
    </div>
  );
};