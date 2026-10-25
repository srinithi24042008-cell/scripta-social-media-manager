// Shared per-platform identity used across Compose, Dashboard, Calendar,
// and Onboarding so the same platform always reads the same color at a
// glance.
export const PLATFORM_LABELS = {
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  youtube: 'YouTube',
  discord: 'Discord',
  reddit: 'Reddit',
  pinterest: 'Pinterest',
  bluesky: 'Bluesky',
  tumblr: 'Tumblr',
  snapchat: 'Snapchat',
};

export const PLATFORM_RATIOS = {
  instagram: '4:5',
  linkedin: '1.91:1',
  facebook: '1.91:1',
  youtube: '16:9',
  discord: '16:9',
  reddit: '4:5',
  pinterest: '2:3',
  bluesky: '16:9',
  tumblr: '4:5',
  snapchat: '9:16',
};

// Official brand colors from each platform, used inline for badges, tags,
// and indicator dots across Calendar, Compose, Accounts, and Dashboard.
export const PLATFORM_HEX = {
  instagram: '#E4405F',
  linkedin: '#0A66C2',
  facebook: '#1877F2',
  youtube: '#FF0000',
  discord: '#5865F2',
  reddit: '#FF4500',
  pinterest: '#E60023',
  bluesky: '#0085FF',
  tumblr: '#35465C',
  snapchat: '#FFFC00',
};

export const ALL_PLATFORMS = Object.keys(PLATFORM_LABELS);

// Instagram, Facebook, LinkedIn, and YouTube are the actively supported platforms.
export const ACTIVE_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'youtube'];
export const COMING_SOON_PLATFORMS = ALL_PLATFORMS.filter(p => !ACTIVE_PLATFORMS.includes(p));
