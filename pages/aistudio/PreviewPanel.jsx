import React from 'react';
import { useAIStudio } from './AIStudioContext';
import ImagePreview from './previews/ImagePreview';
import VideoPreview from './previews/VideoPreview';
import AudioPreview from './previews/AudioPreview';
import TextPreview from './previews/TextPreview';

export default function PreviewPanel() {
  const {
    previewTab, setPreviewTab,
    generatedImages, imageIndex, setImageIndex,
    generatedVideos, generatedAudios,
    generatedText, setGeneratedText
  } = useAIStudio();

  return (
    <div className="w-96 bg-white border-l border-slate-100 flex flex-col h-full shrink-0 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] relative z-20">
      
      {/* Preview Tabs */}
      <div className="p-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 mb-3">Preview & Assets</h3>
        <div className="flex bg-slate-100/60 p-1 rounded-xl select-none text-[11px] font-bold gap-1 relative z-10">
          {[
            { id: 'images', label: 'Images' },
            { id: 'videos', label: 'Videos' },
            { id: 'audio', label: 'Audio' },
            { id: 'text', label: 'Text' }
          ].map(pt => (
            <button
              key={pt.id}
              onClick={() => setPreviewTab(pt.id)}
              className={`flex-1 py-1.5 rounded-lg text-center transition-all relative z-10 ${
                previewTab === pt.id 
                  ? 'bg-white text-indigo-600 shadow-sm font-bold' 
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              {pt.label}
              {previewTab === pt.id && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-[2px] bg-indigo-600 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Content Area */}
      <div className="flex-1 overflow-y-auto p-5">
        {previewTab === 'images' && (
          <ImagePreview 
            images={generatedImages} 
            imageIndex={imageIndex} 
            setImageIndex={setImageIndex} 
          />
        )}
        
        {previewTab === 'videos' && (
          <VideoPreview videos={generatedVideos} />
        )}

        {previewTab === 'audio' && (
          <AudioPreview audios={generatedAudios} />
        )}

        {previewTab === 'text' && (
          <TextPreview 
            text={generatedText} 
            setText={setGeneratedText} 
          />
        )}
      </div>

    </div>
  );
}
