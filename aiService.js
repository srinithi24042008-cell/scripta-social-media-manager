// AI Service — delegates to Gemini.
// Requires GEMINI_API_KEY in .env.
// Gemini key: https://aistudio.google.com/apikey

const geminiService = require('./geminiService');

module.exports = {
  generatePosts: geminiService.generatePosts,
  aiStudioAction: geminiService.aiStudioAction,
  analyzeImage: geminiService.analyzeImage,
  geminiChat: geminiService.geminiChat,
  generateCaption: geminiService.generateCaption,
  generateHashtags: geminiService.generateHashtags,
  scoreContent: geminiService.scoreContent,
  generatePlatformVariants: geminiService.generatePlatformVariants,
  suggestBestTime: geminiService.suggestBestTime,
};
