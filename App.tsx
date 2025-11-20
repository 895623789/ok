import React, { useState, useEffect } from 'react';
import { AppMode } from './types';
import { ChatView } from './components/ChatView';
import { LiveView } from './components/LiveView';
import { StudioView } from './components/StudioView';
import { VisionView } from './components/VisionView';

const App: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.HOME);
  const [needsApiKey, setNeedsApiKey] = useState(false);

  // Check for Veo API key selection requirement
  useEffect(() => {
      const checkKey = async () => {
          if (window.aistudio && window.aistudio.hasSelectedApiKey) {
              const hasKey = await window.aistudio.hasSelectedApiKey();
              setNeedsApiKey(!hasKey);
          }
      };
      checkKey();
  }, []);

  const selectKey = async () => {
      if (window.aistudio && window.aistudio.openSelectKey) {
          await window.aistudio.openSelectKey();
          // Optimistic update
          setNeedsApiKey(false);
      }
  };

  // Radically simple Home View
  const HomeView = () => (
    <div className="h-full flex flex-col items-center justify-center p-8 overflow-y-auto bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-5xl w-full space-y-10">
            <div className="text-center space-y-4">
                <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">Gemini Omni</h1>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto">Your all-in-one AI companion. Select a task to get started.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard 
                    title="Chat Assistant" 
                    desc="Answers, Search, Maps" 
                    icon="💬" 
                    color="bg-blue-50 text-blue-600 hover:ring-blue-200"
                    onClick={() => setCurrentMode(AppMode.CHAT)}
                />
                <DashboardCard 
                    title="Voice Live" 
                    desc="Real-time conversation" 
                    icon="🎙️" 
                    color="bg-red-50 text-red-600 hover:ring-red-200"
                    onClick={() => setCurrentMode(AppMode.LIVE)}
                />
                <DashboardCard 
                    title="Creative Studio" 
                    desc="Image, Video & Audio" 
                    icon="🎨" 
                    color="bg-purple-50 text-purple-600 hover:ring-purple-200"
                    onClick={() => setCurrentMode(AppMode.STUDIO)}
                />
                <DashboardCard 
                    title="Vision Center" 
                    desc="Analyze & Edit Media" 
                    icon="👁️" 
                    color="bg-emerald-50 text-emerald-600 hover:ring-emerald-200"
                    onClick={() => setCurrentMode(AppMode.VISION)}
                />
            </div>
        </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Simplified Sidebar */}
      {currentMode !== AppMode.HOME && (
          <aside className="w-20 bg-white border-r border-gray-100 flex flex-col items-center py-6 gap-6 shadow-sm z-20">
            <button onClick={() => setCurrentMode(AppMode.HOME)} className="p-3 rounded-xl bg-gray-900 text-white hover:scale-105 transition-transform">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            </button>
            
            <div className="w-full h-px bg-gray-100 my-2"></div>

            <NavIcon active={currentMode === AppMode.CHAT} onClick={() => setCurrentMode(AppMode.CHAT)} icon="💬" label="Chat" />
            <NavIcon active={currentMode === AppMode.LIVE} onClick={() => setCurrentMode(AppMode.LIVE)} icon="🎙️" label="Live" />
            <NavIcon active={currentMode === AppMode.STUDIO} onClick={() => setCurrentMode(AppMode.STUDIO)} icon="🎨" label="Studio" />
            <NavIcon active={currentMode === AppMode.VISION} onClick={() => setCurrentMode(AppMode.VISION)} icon="👁️" label="Vision" />
            
            {needsApiKey && (
                <button onClick={selectKey} className="mt-auto text-xl animate-pulse" title="Select API Key">🔑</button>
            )}
          </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {currentMode === AppMode.HOME && <HomeView />}
        {currentMode === AppMode.CHAT && <ChatView />}
        {currentMode === AppMode.LIVE && <LiveView />}
        {currentMode === AppMode.STUDIO && <StudioView />}
        {currentMode === AppMode.VISION && <VisionView />}
      </main>
    </div>
  );
};

const DashboardCard = ({ title, desc, icon, color, onClick }: any) => (
    <button onClick={onClick} className={`flex flex-col items-start p-6 rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ring-1 ring-black/5 ${color} bg-white`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-sm ${color.split(' ')[0]}`}>
            {icon}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 font-medium text-left">{desc}</p>
    </button>
);

const NavIcon = ({ active, onClick, icon, label }: any) => (
    <button 
        onClick={onClick}
        className={`p-3 rounded-xl transition-all ${active ? 'bg-brand-100 text-brand-600 shadow-inner' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}
        title={label}
    >
        <span className="text-2xl">{icon}</span>
    </button>
);

export default App;