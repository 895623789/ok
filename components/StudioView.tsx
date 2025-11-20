import React, { useState } from 'react';
import { generateImage, generateVideo, generateSpeech } from '../services/geminiService';
import { decodeAudioData } from '../utils/audioUtils';

type StudioMode = 'image' | 'video' | 'tts';

export const StudioView: React.FC = () => {
  const [mode, setMode] = useState<StudioMode>('image');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null); // URL or base64
  const [aspectRatio, setAspectRatio] = useState('1:1');

  // Video specific
  const [startImage, setStartImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt && mode !== 'video') return; 
    setLoading(true);
    setResult(null);

    try {
        if (mode === 'image') {
            const res = await generateImage(prompt, aspectRatio);
            setResult(res);
        } else if (mode === 'video') {
            const res = await generateVideo(prompt, aspectRatio as '16:9' | '9:16', startImage || undefined);
            setResult(res);
        } else if (mode === 'tts') {
            const base64 = await generateSpeech(prompt);
            setResult(null); // No visual result
            // Play immediately
            const ctx = new (window.AudioContext || window.webkitAudioContext)({sampleRate: 24000});
            const buffer = await decodeAudioData(
                new Uint8Array(atob(base64 || '').split('').map(c => c.charCodeAt(0))), 
                ctx, 24000, 1
            );
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start();
        }
    } catch (e) {
        alert("Generation failed. Check permissions or API key.");
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => setStartImage(reader.result as string);
          reader.readAsDataURL(file);
      }
  };

  return (
    <div className="h-full p-6 overflow-y-auto max-w-4xl mx-auto">
        <div className="flex gap-4 mb-8 bg-white p-2 rounded-xl shadow-sm w-fit mx-auto">
            {[
                { id: 'image', label: 'Image Gen', icon: '🖼️' },
                { id: 'video', label: 'Veo Video', icon: '🎥' },
                { id: 'tts', label: 'Speak', icon: '🔊' }
            ].map(m => (
                <button 
                    key={m.id}
                    onClick={() => { setMode(m.id as any); setResult(null); setPrompt(''); }}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${mode === m.id ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <span className="mr-2">{m.icon}</span> {m.label}
                </button>
            ))}
        </div>

        <div className="bg-white rounded-3xl shadow-lg p-8 min-h-[400px] flex flex-col">
            
            {/* Controls */}
            <div className="space-y-6 mb-8">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-bold text-gray-700 ml-1">Prompt</label>
                    <textarea 
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder={mode === 'image' ? "A robot holding a red skateboard..." : mode === 'video' ? "A neon hologram cat driving..." : "Type text to speak..."}
                        className="w-full border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-brand-500 outline-none resize-none h-32 text-lg"
                    />
                </div>

                <div className="flex flex-wrap gap-6 items-center">
                     {/* Aspect Ratio Control for Image/Video */}
                    {mode !== 'tts' && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Aspect Ratio</label>
                            <div className="flex gap-2 mt-2">
                                {['1:1', '16:9', '9:16', '3:4', '4:3'].map(r => (
                                    (mode === 'video' && !['16:9', '9:16'].includes(r)) ? null :
                                    <button 
                                        key={r} 
                                        onClick={() => setAspectRatio(r)}
                                        className={`px-3 py-1 rounded-md text-sm border ${aspectRatio === r ? 'bg-brand-50 border-brand-500 text-brand-700' : 'border-gray-200 text-gray-600'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Image Upload for Veo */}
                    {mode === 'video' && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Frame (Optional)</label>
                            <div className="mt-2">
                                <label className="cursor-pointer flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm text-gray-600">
                                    <span>{startImage ? 'Change Image' : 'Upload Image'}</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                </label>
                            </div>
                        </div>
                    )}
                </div>
                
                {startImage && mode === 'video' && (
                    <div className="w-32 h-32 relative rounded-lg overflow-hidden border">
                        <img src={startImage} alt="Start frame" className="w-full h-full object-cover" />
                        <button onClick={() => setStartImage(null)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-5 h-5 text-xs">×</button>
                    </div>
                )}

                <button 
                    onClick={handleGenerate}
                    disabled={loading || (mode !== 'video' && !prompt)}
                    className="w-full bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold text-lg py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                >
                    {loading ? 'Generating...' : 'Create Magic ✨'}
                </button>
            </div>

            {/* Result Display */}
            <div className="flex-1 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex items-center justify-center overflow-hidden relative min-h-[300px]">
                {loading ? (
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-500 animate-pulse">{mode === 'video' ? 'Dreaming up a video... (this takes a moment)' : 'Creating...'}</p>
                    </div>
                ) : result ? (
                    mode === 'video' ? (
                        <video src={result} controls autoPlay loop className="max-w-full max-h-[500px] rounded-lg shadow-md" />
                    ) : (
                        <img src={result} alt="Generated" className="max-w-full max-h-[500px] object-contain rounded-lg shadow-md" />
                    )
                ) : (
                    <p className="text-gray-400 text-sm">Your creation will appear here</p>
                )}
            </div>

        </div>
    </div>
  );
};