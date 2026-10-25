import React from 'react';
import { useAIStudio } from './AIStudioContext';
import { LANGUAGES } from './constants';

export default function SettingsPanel() {
  const {
    language, setLanguage,
    addAudio, setAddAudio,
    videoDuration, setVideoDuration
  } = useAIStudio();

  return (
    <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Video Duration</label>
          <select
            value={videoDuration}
            onChange={(e) => setVideoDuration(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white text-xs text-slate-700 focus:outline-none focus:border-indigo-500 font-semibold cursor-pointer"
          >
            <option value="5">5 seconds</option>
            <option value="8">8 seconds</option>
            <option value="10">10 seconds</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col justify-center">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={addAudio}
            onChange={(e) => setAddAudio(e.target.checked)}
            className="text-indigo-600 focus:ring-indigo-500 rounded border-slate-300 w-4 h-4 cursor-pointer"
          />
          <span className="text-xs font-bold text-slate-600">Add Voiceover</span>
        </label>
      </div>
    </div>
  );
}
