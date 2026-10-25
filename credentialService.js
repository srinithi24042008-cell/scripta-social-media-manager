const SocialCredential = require('../models/SocialCredential');
const { decrypt } = require('./encryptionService');

/**
 * Helper to fetch and decrypt credentials for a specific user and platform.
 * Checks per-user SocialCredential.
 * Since the user requested not to use the .env file as a fallback, 
 * this does not check process.env or PlatformConfig.
 */
async function getCredentialsForUserAndPlatform(userId, platform) {
  const platformLower = platform?.toLowerCase();

  if (userId) {
    const socCred = await SocialCredential.findOne({ userId }).lean();
    if (socCred) {
      if (['facebook', 'instagram', 'threads'].includes(platformLower) && socCred.facebook?.appId && socCred.facebook?.appSecret) {
        return {
          clientId: socCred.facebook.appId,
          clientSecret: decrypt(socCred.facebook.appSecret),
          source: 'SocialCredential (user)'
        };
      }
      if (platformLower === 'linkedin' && socCred.linkedin?.clientId && socCred.linkedin?.clientSecret) {
        return {
          clientId: socCred.linkedin.clientId,
          clientSecret: decrypt(socCred.linkedin.clientSecret),
          source: 'SocialCredential (user)'
        };
      }
      if (platformLower === 'youtube' && socCred.youtube?.clientId && socCred.youtube?.clientSecret) {
        return {
          clientId: socCred.youtube.clientId,
          clientSecret: decrypt(socCred.youtube.clientSecret),
          source: 'SocialCredential (user)'
        };
      }
    }
  }

  return { clientId: null, clientSecret: null, source: 'None' };
}

module.exports = {
  getCredentialsForUserAndPlatform
};
