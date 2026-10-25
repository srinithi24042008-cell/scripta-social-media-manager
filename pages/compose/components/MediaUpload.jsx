// MediaUpload.jsx — Drag-and-drop media upload with preview, progress, and AI analysis trigger
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image, Film, AlertCircle, Loader2, CheckCircle, Eye } from 'lucide-react';

const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/webm';
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

export default function MediaUpload({ media, mediaBusy, mediaError, uploadProgress, onUpload, onClear, imageAnalysis, imageAnalysisBusy, onApplyCaption }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndUpload(file);
  }, []);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);

  const validateAndUpload = (file) => {
    if (file.size > MAX_SIZE) {
      alert('File too large. Maximum size is 50MB.');
      return;
    }
    onUpload(file);
  };

  const mediaUrl = media?.url || media?.originalUrl || media?.secure_url;
  const isVideo = media?.mediaType === 'video' || mediaUrl?.match(/\.(mp4|mov|webm|avi)$/i);

  return (
    <div className="space-y-3">
      {/* Drop Zone or Preview */}
      <AnimatePresence mode="wait">
        {mediaUrl ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group"
          >
            {isVideo ? (
              <video src={mediaUrl} className="w-full max-h-64 object-cover rounded-2xl" controls />
            ) : (
              <img src={mediaUrl} alt="Upload preview" className="w-full max-h-64 object-cover rounded-2xl" />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 rounded-2xl" />
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClear}
                className="bg-red-500 text-white rounded-full p-1.5 shadow-lg"
              >
                <X size={14} />
              </motion.button>
            </div>
            <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-lg flex items-center gap-1">
              {isVideo ? <Film size={11} /> : <Image size={11} />}
              <span>{isVideo ? 'Video' : 'Image'} uploaded</span>
              <CheckCircle size={11} className="text-green-400" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !mediaBusy && inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? 'border-violet-400 bg-violet-50'
                : mediaBusy
                ? 'border-slate-300 bg-slate-50 cursor-not-allowed'
                : 'border-slate-300 bg-slate-50 hover:border-violet-400 hover:bg-violet-50'
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => e.target.files?.[0] && validateAndUpload(e.target.files[0])}
            />

            {mediaBusy ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-violet-500" size={32} />
                <p className="text-sm font-medium text-slate-600">Uploading...</p>
                <div className="w-48 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-violet-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(10, uploadProgress)}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className={`p-3 rounded-2xl ${isDragging ? 'bg-violet-100' : 'bg-white border border-slate-200'}`}>
                  <Upload size={24} className={isDragging ? 'text-violet-600' : 'text-slate-400'} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {isDragging ? 'Drop it here!' : 'Drag & drop or click to upload'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">JPG, PNG, GIF, WebP, MP4, MOV — max 50MB</p>
                </div>
                <p className="text-xs text-violet-600 font-medium">📸 AI will auto-analyze your image</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Error */}
      {mediaError && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2"
        >
          <AlertCircle size={13} />
          <span>{mediaError}</span>
        </motion.div>
      )}

      {/* AI Image Analysis Result */}
      <AnimatePresence>
        {imageAnalysisBusy && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 flex items-center gap-2"
          >
            <Loader2 size={13} className="animate-spin text-violet-600" />
            <span className="text-xs text-violet-700 font-medium">Analyzing your image with AI...</span>
          </motion.div>
        )}
        {imageAnalysis && !imageAnalysisBusy && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700">
                <Eye size={12} />
                <span>AI Image Analysis</span>
              </div>
              {onApplyCaption && imageAnalysis.description && (
                <button
                  type="button"
                  onClick={() => onApplyCaption(imageAnalysis.description)}
                  className="text-[10px] font-bold uppercase tracking-wider bg-violet-600 hover:bg-violet-700 text-white px-2 py-1 rounded shadow-sm transition-colors"
                >
                  Use as Caption
                </button>
              )}
            </div>
            {imageAnalysis.description && (
              <p className="text-xs text-slate-700 leading-relaxed">{imageAnalysis.description}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {imageAnalysis.mood && (
                <span className="text-xs bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">Mood: {imageAnalysis.mood}</span>
              )}
              {(imageAnalysis.subjects || []).slice(0, 4).map((s, i) => (
                <span key={i} className="text-xs bg-white text-slate-600 border border-slate-200 rounded-full px-2 py-0.5">{s}</span>
              ))}
              {(imageAnalysis.colors || []).slice(0, 3).map((c, i) => (
                <span key={i} className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{c}</span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
