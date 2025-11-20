export enum AppMode {
  HOME = 'HOME',
  CHAT = 'CHAT',       // Text, Search, Maps, Thinking, Flash Lite
  LIVE = 'LIVE',       // Native Audio Live API
  STUDIO = 'STUDIO',   // Image Gen, Video Gen, TTS
  VISION = 'VISION',   // Image/Video Analysis, Image Editing
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text?: string;
  image?: string; // base64
  audio?: string; // base64
  groundingUrls?: { title: string; uri: string; type: 'search' | 'map' }[];
  isThinking?: boolean; // For UI state
  timestamp: number;
}

export interface VideoGenerationState {
  status: 'idle' | 'generating' | 'complete' | 'error';
  videoUri?: string;
}

// Veo API Key selection interface
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
    webkitAudioContext: typeof AudioContext;
  }
}
