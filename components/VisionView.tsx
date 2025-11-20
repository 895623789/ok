import React, { useState } from 'react';
import { analyzeImage, analyzeVideo, editImage, transcribeAudio } from '../services/geminiService';

export const VisionView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analyze' | 'edit' | 'audio'>('analyze');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState<string | null>(null); // Text for analyze/audio, Image URL for edit
  const [loading, setLoading] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) {
          setFile(f);
          const reader = new FileReader();
          reader.onloadend = () => setPreview(reader.result as string);
          
          if (f.type.startsWith('image')) {
              reader.readAsDataURL(f);
          } else if (f.type.startsWith('video')) {
              reader.readAsDataURL(f);
          } else {
              setPreview(null); // Audio file
              reader.readAsDataURL(f);
          }
          setOutput(null);
      }
  };

  const handleAction = async () => {
      if (!file || !preview) return;
      setLoading(true);
      try {
          const base64 = preview;
          
          if (activeTab === 'analyze') {
              if (file.type.startsWith('image')) {
                  const txt = await analyzeImage(base64, prompt);
                  setOutput(txt);
              } else if (file.type.startsWith('video')) {
                  const txt = await analyzeVideo(base64, prompt);
                  setOutput(txt);
              }
          } else if (activeTab === 'edit') {
              // Works for Image (Flash Image)
              const img = await editImage(base64, prompt || "Enhance this image");
              setOutput(img);
          } else if (activeTab === 'audio') {
                // Need just base64 data part
                const data = base64.split(',')[1];
                const txt = await transcribeAudio(data);
                setOutput(txt);
          }
          
      } catch (e) {
          console.error(e);
          setOutput("Error processing request. " + e);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="h-full p-6 max-w-4xl mx-auto flex flex-col">
        <div className="flex gap-2 mb-6 bg-white/50 p-1 rounded-xl w-fit">
             <button onClick={() => {setActiveTab('analyze'); setOutput(null);}} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'analyze' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>Analyze Media</button>
             <button onClick={() => {setActiveTab('edit'); setOutput(null);}} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'edit' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>Edit Image</button>
             <button onClick={() => {setActiveTab('audio'); setOutput(null);}} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'audio' ? 'bg-brand-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>Transcribe Audio</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
            {/* Input Column */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-y-auto">
                <div className={`border-2 border-dashed border-gray-300 rounded-2xl flex-1 min-h-[200px] flex flex-col items-center justify-center p-4 transition-colors relative overflow-hidden ${!file ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white border-brand-300'}`}>
                    {preview && file?.type.startsWith('image') ? (
                        <img src={preview} alt="Preview" className="max-h-full object-contain rounded-lg" />
                    ) : preview && file?.type.startsWith('video') ? (
                        <video src={preview} controls className="max-h-full max-w-full rounded-lg" />
                    ) : file ? (
                        <div className="text-center">
                            <div className="text-5xl mb-3">🎵</div>
                            <p className="font-medium text-gray-700">{file.name}</p>
                        </div>
                    ) : (
                        <label className="cursor-pointer absolute inset-0 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-brand-100 text-brand-500 rounded-full flex items-center justify-center mb-4 shadow-sm">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                            </div>
                            <span className="text-gray-900 font-bold text-lg">Click to Upload</span>
                            <span className="text-gray-500 text-sm mt-1">
                                {activeTab === 'audio' ? 'MP3, WAV' : activeTab === 'edit' ? 'PNG, JPG' : 'Image or Video'}
                            </span>
                            <input 
                                type="file" 
                                accept={activeTab === 'audio' ? "audio/*" : activeTab === 'edit' ? "image/*" : "image/*,video/*"} 
                                className="hidden" 
                                onChange={handleFile} 
                            />
                        </label>
                    )}
                    
                    {file && (
                        <button onClick={() => {setFile(null); setPreview(null);}} className="absolute top-2 right-2 bg-gray-900/50 text-white p-1 rounded-full hover:bg-black/70">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    )}
                </div>

                <div className="mt-6 space-y-4">
                    {activeTab !== 'audio' && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Prompt</label>
                            <textarea 
                                value={prompt}
                                onChange={e => setPrompt(e.target.value)}
                                placeholder={activeTab === 'edit' ? "Ex: Add a sunset background, make it cyberpunk..." : "Ex: What is happening in this video?"}
                                className="w-full mt-1 border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-brand-500 outline-none text-gray-700 resize-none h-24"
                            />
                        </div>
                    )}
                    <button 
                        onClick={handleAction}
                        disabled={!file || loading}
                        className="w-full bg-gray-900 text-white font-bold text-lg py-4 rounded-xl hover:bg-black shadow-lg disabled:opacity-50 transition-transform active:scale-95"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Processing...
                            </span>
                        ) : (
                            activeTab === 'edit' ? 'Edit Image' : 'Analyze'
                        )}
                    </button>
                </div>
            </div>

            {/* Output Column */}
            <div className="bg-gray-50 border border-gray-200 p-6 rounded-3xl shadow-inner flex flex-col overflow-hidden relative">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>Result</span>
                    <div className="h-px flex-1 bg-gray-200"></div>
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                            <div className="w-16 h-16 border-4 border-brand-100 border-t-brand-500 rounded-full animate-spin"></div>
                            <p className="animate-pulse text-sm font-medium">Gemini is thinking...</p>
                        </div>
                    ) : output ? (
                        activeTab === 'edit' ? (
                           <div className="flex items-center justify-center h-full">
                               <img src={output} alt="Edited" className="max-w-full max-h-full rounded-lg shadow-lg object-contain" />
                               <a href={output} download="edited-image.png" className="absolute bottom-4 right-4 bg-white shadow-md text-gray-900 px-4 py-2 rounded-full text-sm font-bold hover:bg-gray-50">Download</a>
                           </div>
                        ) : (
                           <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                               {output}
                           </div>
                        )
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                            <svg className="w-16 h-16 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                            <p>AI output will appear here</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};