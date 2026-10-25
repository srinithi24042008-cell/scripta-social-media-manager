// PlatformSelector.jsx — Platform toggle buttons with icons and colors
import { FaInstagram, FaFacebook, FaLinkedin, FaYoutube } from 'react-icons/fa';
import { Check } from 'lucide-react';

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: <FaInstagram size={18} /> },
  { id: 'facebook', label: 'Facebook', icon: <FaFacebook size={18} /> },
  { id: 'linkedin', label: 'LinkedIn', icon: <FaLinkedin size={18} /> },
  { id: 'youtube', label: 'YouTube', icon: <FaYoutube size={18} /> },
];

export default function PlatformSelector({ selected, connectedPlatforms, onChange }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {PLATFORMS.map(p => {
        const isSelected = selected.includes(p.id);
        const isConnected = connectedPlatforms.includes(p.id);
        // If no connected platforms are loaded yet, we assume connected for preview purposes if in selected, 
        // but typically we should check `isConnected`. To match exact prompt specs:
        
        return (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`flex flex-col items-start justify-center h-[64px] px-4 rounded-lg border transition-all duration-200 relative ${
              isSelected 
                ? 'bg-[#4F46E5] border-[#4F46E5] text-white shadow-sm' 
                : 'bg-white border-[#E5E7EB] text-[#111827] hover:border-[#4F46E5] hover:bg-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center gap-2 w-full">
              <span className={`flex items-center justify-center shrink-0 ${isSelected ? 'text-white' : 'text-[#6B7280]'}`}>{p.icon}</span>
              <span className="font-semibold text-sm">{p.label}</span>
              {isSelected && (
                <div className="ml-auto w-5 h-5 rounded flex items-center justify-center bg-white/20">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </div>
            <span className={`text-[10px] font-medium mt-1 ${isSelected ? 'text-indigo-100' : (isConnected ? 'text-[#059669]' : 'text-[#6B7280]')}`}>
              {isConnected ? 'Connected' : 'Connect'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { PLATFORMS };
