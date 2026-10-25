const mongoose = require('mongoose');

const SocialCredentialSchema = new mongoose.Schema({
  userId: { type: String, ref: 'User', required: true, unique: true },
  facebook: {
    appId: { type: String },
    appSecret: { type: String } // stored encrypted via encryptionService
  },
  linkedin: {
    clientId: { type: String },
    clientSecret: { type: String } // stored encrypted via encryptionService
  },
  youtube: {
    clientId: { type: String },
    clientSecret: { type: String } // stored encrypted via encryptionService
  },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SocialCredential', SocialCredentialSchema);
