import { motion } from 'framer-motion';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

const PlatformIcons = {
  instagram: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink-500">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  ),
  facebook: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  ),
  youtube: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-600">
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/>
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/>
    </svg>
  )
};

const TypeIcons = {
  success: <CheckCircle className="text-green-500 w-5 h-5" />,
  error: <XCircle className="text-red-500 w-5 h-5" />,
  warning: <AlertTriangle className="text-yellow-500 w-5 h-5" />,
  info: <Info className="text-blue-500 w-5 h-5" />
};

export default function NotificationToast({ notification, onClose }) {
  const { _id, type, message, duration = 8000 } = notification;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    let start = Date.now();
    let rAF;

    const tick = () => {
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining > 0) {
        rAF = requestAnimationFrame(tick);
      } else {
        onClose(_id);
      }
    };
    rAF = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rAF);
  }, [duration, _id, onClose]);

  // Try to detect platform from message to show appropriate icon
  const msgLower = message.toLowerCase();
  let Icon = TypeIcons[type] || TypeIcons.info;
  if (msgLower.includes('instagram')) Icon = PlatformIcons.instagram();
  else if (msgLower.includes('facebook')) Icon = PlatformIcons.facebook();
  else if (msgLower.includes('youtube')) Icon = PlatformIcons.youtube();

  let cleanMsg = message;
  if (type === 'error' && message) {
    let text = message;
    let platform = '';
    const match = text.match(/^Publishing to ([a-zA-Z0-9_-]+)(?:\s*\([^)]+\))?\s*failed(?: permanently)?:\s*(.*)/i);
    if (match) {
      platform = match[1];
      text = match[2];
    } else {
      const match2 = text.match(/^([a-zA-Z0-9_-]+) error:\s*(.*)/i);
      if (match2 && ['instagram', 'facebook', 'linkedin', 'youtube'].includes(match2[1].toLowerCase())) {
        platform = match2[1];
        text = match2[2];
      }
    }
    text = text.replace(/^(Publishing to [a-zA-Z0-9_-]+(?: \([^)]+\))? failed(?: permanently)?: )/i, '');
    text = text.replace(/^(Instagram|Facebook|LinkedIn|YouTube) error:\s*/i, '');
    text = text.replace(/^API error:\s*/i, '');
    text = text.replace(/\s*\(code:\s*\d+\)/i, '');

    if (text.toLowerCase().includes('aspect ratio') || text.includes('36003')) {
      text = 'Incorrect aspect ratio';
    } else if (text.toLowerCase().includes('oauth') || text.toLowerCase().includes('token expired') || text.includes('190')) {
      text = 'Reconnect required';
    }
    const platformLabel = platform ? (platform.charAt(0).toUpperCase() + platform.slice(1).toLowerCase()) : '';
    if (platformLabel && !text.toLowerCase().endsWith(`with ${platformLabel.toLowerCase()}`)) {
      cleanMsg = text.startsWith('Failed:') ? text : `Failed: ${text} with ${platformLabel}`;
    } else if (!text.startsWith('Failed:') && (match || platformLabel)) {
      cleanMsg = `Failed: ${text}`;
    } else {
      cleanMsg = text;
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="relative flex items-start gap-3 w-80 sm:w-96 bg-white border border-gray-100 rounded-xl shadow-lg p-4 overflow-hidden"
    >
      <div className="flex-shrink-0 mt-0.5">
        {Icon}
      </div>
      <div className="flex-1 pr-4 min-w-0">
        <p className="text-sm text-gray-800 font-medium leading-tight break-words">
          {cleanMsg}
        </p>
      </div>
      <button
        onClick={() => onClose(_id)}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-gray-100 w-full">
        <motion.div
          className={`h-full ${
            type === 'success' ? 'bg-green-500' :
            type === 'error' ? 'bg-red-500' :
            type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </motion.div>
  );
}
