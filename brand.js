const express = require('express');
const BrandProfile = require('../models/BrandProfile');
const { requireAuth } = require('../middleware/auth');
const { workspaceContext } = require('../middleware/workspace');

const router = express.Router();
router.use(requireAuth);
router.use(workspaceContext);

router.get('/', async (req, res) => {
  const profile = await BrandProfile.findOne(req.workspaceFilter).lean();
  res.json({ profile });
});

router.put('/', async (req, res) => {
  const { tone, audience, rules, sample_posts } = req.body;
  const orgId = req.workspace === 'personal' ? null : req.workspace;

  const filter = { ...req.workspaceFilter };

  await BrandProfile.findOneAndUpdate(
    filter,
    {
      user_id: req.userId,
      organizationId: orgId,
      tone: tone || '',
      audience: audience || '',
      rules: rules || '',
      sample_posts: sample_posts || '',
      updated_at: new Date()
    },
    { upsert: true }
  );

  const profile = await BrandProfile.findOne(req.workspaceFilter).lean();
  res.json({ profile });
});

module.exports = router;
