import { GoogleGenAI, Modality, Type } from "@google/genai";

// We create a new instance per request to ensure we pick up the latest API key if changed via Veo selection
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- CHAT & GROUNDING ---

export async function sendChatMessage(
  prompt: string,
  history: any[],
  options: {
    useThinking?: boolean;
    useSearch?: boolean;
    useMaps?: boolean;
    useFast?: boolean;
    location?: { lat: number; lng: number };
  }
) {
  const ai = getAI();
  let model = 'gemini-2.5-flash'; // Default standard
  let tools: any[] = [];
  let toolConfig: any = undefined;

  if (options.useThinking) {
    model = 'gemini-3-pro-preview';
  } else if (options.useFast) {
    model = 'gemini-2.5-flash-lite-latest';
  }

  if (options.useSearch) {
    model = 'gemini-2.5-flash'; // Force flash for tools reliability with Search
    tools.push({ googleSearch: {} });
  }

  if (options.useMaps) {
    model = 'gemini-2.5-flash';
    tools.push({ googleMaps: {} });
    if (options.location) {
      toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: options.location.lat,
            longitude: options.location.lng
          }
        }
      };
    }
  }

  const config: any = {
    tools: tools.length > 0 ? tools : undefined,
    toolConfig: toolConfig,
  };

  if (options.useThinking) {
    config.thinkingConfig = { thinkingBudget: 32768 }; // Max for Pro
    // Do NOT set maxOutputTokens when thinking
  }

  // Chat session
  const chat = ai.chats.create({
    model: model,
    config: config,
    history: history
  });

  const result = await chat.sendMessage({ message: prompt });
  return result;
}

// --- IMAGE & VIDEO GENERATION ---

export async function generateImage(prompt: string, aspectRatio: string = '1:1') {
  const ai = getAI();
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: aspectRatio,
      outputMimeType: 'image/jpeg',
    },
  });
  const base64 = response.generatedImages[0].image.imageBytes;
  return `data:image/jpeg;base64,${base64}`;
}

export async function generateVideo(prompt: string, aspectRatio: '16:9' | '9:16', startImageBase64?: string) {
  const ai = getAI();
  
  // Veo Fast config
  const config: any = {
    numberOfVideos: 1,
    resolution: '720p',
    aspectRatio: aspectRatio
  };

  let operation;

  if (startImageBase64) {
     // Remove header if present
     const cleanBase64 = startImageBase64.split(',')[1] || startImageBase64;
     operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt || "Animate this", 
        image: {
            imageBytes: cleanBase64,
            mimeType: 'image/png' // Ensure PNG/JPEG compatibility
        },
        config
     });
  } else {
    operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config
    });
  }

  // Poll for completion
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s
    operation = await ai.operations.getVideosOperation({ operation: operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");
  
  // Fetch the actual video bytes
  const videoRes = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const videoBlob = await videoRes.blob();
  return URL.createObjectURL(videoBlob);
}

// --- TTS ---

export async function generateSpeech(text: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });
  
  const base64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64; // Return raw base64 to be decoded by audio context
}

// --- VISION & EDITING ---

export async function analyzeImage(imageBase64: string, prompt: string) {
  const ai = getAI();
  const cleanBase64 = imageBase64.split(',')[1];
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview', // High intelligence for analysis
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
        { text: prompt || "Describe this image in detail." }
      ]
    }
  });
  return response.text;
}

export async function analyzeVideo(videoBase64: string, prompt: string) {
  const ai = getAI();
  // Video base64 often comes with data:video/mp4;base64, prefix
  const cleanBase64 = videoBase64.split(',')[1];
  const mimeType = videoBase64.split(';')[0].split(':')[1] || 'video/mp4';

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: mimeType, data: cleanBase64 } },
        { text: prompt || "Analyze this video." }
      ]
    }
  });
  return response.text;
}

export async function editImage(imageBase64: string, prompt: string) {
    const ai = getAI();
    const cleanBase64 = imageBase64.split(',')[1];
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image', // Nano banana
        contents: {
            parts: [
                { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
                { text: prompt }
            ]
        },
        config: {
            responseModalities: [Modality.IMAGE]
        }
    });

    // The model returns an image in parts
    for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
             return `data:image/png;base64,${part.inlineData.data}`;
        }
    }
    throw new Error("No image returned");
}

export async function transcribeAudio(audioBase64: string) {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                { inlineData: { mimeType: 'audio/mp3', data: audioBase64 } }, // Assuming uploaded file type
                { text: "Transcribe this audio." }
            ]
        }
    });
    return response.text;
}