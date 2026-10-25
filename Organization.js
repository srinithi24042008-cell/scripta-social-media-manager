const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  _id: { type: String }, // UUID
  name: { type: String, required: true },
  description: { type: String, default: '' },
  owner: { type: String, ref: 'User', required: true },
  inviteCode: { type: String, required: true, unique: true },
  members: [
    {
      user: { type: String, ref: 'User', required: true },
      role: { type: String, enum: ['admin', 'editor', 'viewer'], required: true },
      joinedAt: { type: Date, default: Date.now }
    }
  ],
  createdBy: { type: String, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

organizationSchema.pre('findOneAndUpdate', function () {
  this.set({ updatedAt: new Date() });
});

module.exports = mongoose.model('Organization', organizationSchema);
