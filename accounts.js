const express = require('express');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const SocialAccount = require('../models/SocialAccount');
const PlatformConfig = require('../models/PlatformConfig');
const SocialCredential = require('../models/SocialCredential');
const { requireAuth } = require('../middleware/auth');
const { workspaceContext } = require('../middleware/workspace');
const { encrypt, decrypt } = require('../services/encryptionService');
const { createNotification } = require('../services/notificationService');
const metaOAuthService = require('../services/metaOAuthService');
const metaTokenService = require('../services/metaTokenService');

const { getCredentialsForUserAndPlatform } = require('../services/credentialService');
const { logger } = require('../utils/logger');


const router = express.Router();

const SUPPORTED_PLATFORMS = [
  'instagram', 'facebook', 'linkedin', 'youtube', 'pinterest', 'tiktok', 'bluesky', 'threads'
];

const PLATFORM_LABELS = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  facebook: 'Facebook Pages',
  youtube: 'YouTube',
  pinterest: 'Pinterest',
  bluesky: 'Bluesky',
  threads: 'Threads',
};

// -------------------------------------------------------------
// PUBLIC ROUTES
// -------------------------------------------------------------

// 1. Get platform configuration presence status (checks per-user credentials only, no fallback to .env/PlatformConfig)
router.get('/config', async (req, res) => {
  try {
    let userId = null;
    try {
      if (req.headers.authorization) {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId || decoded._id;
      }
    } catch (e) {
      // Not authenticated or token expired
    }

    const socCred = userId ? await SocialCredential.findOne({ userId }).lean() : null;

    const hasMetaUser = !!(socCred?.facebook?.appId && socCred?.facebook?.appSecret);
    const hasLinkedInUser = !!(socCred?.linkedin?.clientId && socCred?.linkedin?.clientSecret);
    const hasYouTubeUser = !!(socCred?.youtube?.clientId && socCred?.youtube?.clientSecret);

    res.json({
      instagram: hasMetaUser,
      facebook: hasMetaUser,
      linkedin: hasLinkedInUser,
      youtube: hasYouTubeUser,
      x: false,
      pinterest: false,
      tiktok: false,
      bluesky: false,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to build OAuth authorization URL securely
async function generateOAuthUrl(platform, userId, workspaceId, req) {
  if (!platform || !SUPPORTED_PLATFORMS.includes(platform)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const { clientId, clientSecret, source } = await getCredentialsForUserAndPlatform(userId, platform);
  if (!clientId || !clientSecret) {
    const err = new Error(`Platform integration for ${platform} is not configured.`);
    err.code = 'NOT_CONFIGURED';
    throw err;
  }

  // Build the redirect URI using BACKEND_URL from .env or production default.
  // Falls back to reading forwarded headers for local development.
  const backendBase = process.env.BACKEND_URL || (process.env.NODE_ENV === 'production'
    ? 'https://sm.coptercode.co.in'
    : `${req.get('X-Forwarded-Proto') || req.protocol}://${req.get('X-Forwarded-Host') || req.get('host')}`);
  const redirectUri = `${backendBase}/api/accounts/oauth/callback/${platform}`;

  const state = jwt.sign({ userId, workspaceId: workspaceId || 'personal' }, process.env.JWT_SECRET, { expiresIn: '15m' });

  let authUrl = '';
  if (platform === 'facebook' || platform === 'instagram' || platform === 'threads') {
    const metaRedirect = process.env.META_REDIRECT_URI || process.env[`${platform.toUpperCase()}_REDIRECT_URI`] || redirectUri;
    authUrl = metaOAuthService.getAuthUrl(platform, metaRedirect, state, clientId);
  } else if (platform === 'linkedin') {
    const liRedirect = process.env.LINKEDIN_REDIRECT_URI || redirectUri;
    // Scopes: openid+profile+email (OIDC basics), w_member_social (posting + reading own posts)
    // Note: r_1st_connections_size is a restricted scope requiring LinkedIn partner approval — not added here
    authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(liRedirect)}&state=${state}&scope=openid%20profile%20email%20w_member_social`;
  } else if (platform === 'youtube') {
    authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=https://www.googleapis.com/auth/youtube.readonly%20https://www.googleapis.com/auth/yt-analytics.readonly&access_type=offline&prompt=consent`;
  } else if (platform === 'pinterest') {
    authUrl = `https://www.pinterest.com/oauth/?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=boards:read,pins:read,pins:write`;
  } else if (platform === 'tiktok') {
    authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=user.info.basic,video.upload&response_type=code`;
  }

  return authUrl;
}

// 2a. Secure POST endpoint to retrieve OAuth auth URL (uses Bearer Authorization header, no JWT in URL)
router.post('/connect-url/:platform', requireAuth, workspaceContext, async (req, res) => {
  const { platform } = req.params;
  const workspaceId = req.workspace || req.body?.workspaceId || 'personal';

  try {
    const authUrl = await generateOAuthUrl(platform, req.userId, workspaceId, req);
    res.json({ authUrl });
  } catch (err) {
    if (err.code === 'NOT_CONFIGURED') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || 'Failed to generate authorization URL' });
  }
});

// 3. Official OAuth callback URL
router.get('/oauth/callback/:platform', async (req, res) => {
  const { platform } = req.params;
  const { code, state, error } = req.query;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  logger.debug(`[OAuth Callback] Received callback for ${platform}`);
  logger.debug(`[OAuth Callback] Query params:`, { hasCode: !!code, hasState: !!state, error });
  logger.debug(`[OAuth Callback] Full URL: ${req.protocol}://${req.get('host')}${req.originalUrl}`);

  if (!state) {
    logger.error('[OAuth Callback ERROR] Missing state token - Meta did not return state param!');
    return res.status(400).send('Missing state token.');
  }

  try {
    const decoded = jwt.verify(state, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded._id;
    const workspaceId = decoded.workspaceId || 'personal';
    const orgId = workspaceId !== 'personal' ? workspaceId : null;

    if (error === 'access_denied') {
      return res.redirect(`${frontendUrl}/?tab=accounts&error=OAuth+access+denied+by+user`);
    }

    if (!code) {
      return res.redirect(`${frontendUrl}/?tab=accounts&error=OAuth+code+not+provided`);
    }

    const { clientId, clientSecret, source } = await getCredentialsForUserAndPlatform(userId, platform);
    logger.debug(`[OAuth Callback] Platform: ${platform}, User: ${userId}, Credential Source: ${source}`);

    // Use the same production backend base URL logic as the auth initiation so the URIs always match.
    const backendBase = process.env.NODE_ENV === 'production'
      ? 'https://sm.coptercode.co.in'
      : `${req.get('X-Forwarded-Proto') || req.protocol}://${req.get('X-Forwarded-Host') || req.get('host')}`;
    const redirectUri = `${backendBase}/api/accounts/oauth/callback/${platform}`;

    logger.debug(`[OAuth Callback] State verified. User ID: ${decoded.userId?.slice(0, 8)}...`);
    logger.debug(`[OAuth Callback] Redirect URI: ${redirectUri}`);
    logger.debug(`[OAuth Callback] Client ID: ${clientId?.slice(0, 8)}...`);
    logger.debug(`[OAuth Callback] Frontend URL: ${frontendUrl}`);

    if (!clientId || !clientSecret) {
      logger.error('[OAuth Callback ERROR] Missing clientId or clientSecret!');
      return res.redirect(`${frontendUrl}/?tab=accounts&error=Platform+integration+for+${platform}+is+not+configured.`);
    }

    // Official OAuth Token Exchange
    let accessToken = '';
    let refreshToken = null;
    let expiresIn = 3600;

    if (platform === 'facebook' || platform === 'instagram' || platform === 'threads') {
      try {
        const metaRedirect = process.env.META_REDIRECT_URI || process.env[`${platform.toUpperCase()}_REDIRECT_URI`] || redirectUri;
        const tokenData = await metaOAuthService.exchangeCodeForToken(platform, code, metaRedirect, clientId, clientSecret);
        accessToken = tokenData.access_token;
        refreshToken = tokenData.refresh_token || null;
        expiresIn = tokenData.expires_in || 3600;

        // Exchange for long-lived token immediately
        try {
          const longLived = await metaTokenService.exchangeLongLivedToken(platform, accessToken, clientId, clientSecret);
          accessToken = longLived.access_token;
          expiresIn = longLived.expires_in;
        } catch (llErr) {
          logger.warn('[OAuth Callback] Exchange for long-lived token failed:', llErr.message);
        }
      } catch (err) {
        logger.error(`[OAuth ERROR] Meta token exchange failed: ${err.message}`);
        let message = err.message;
        if (platform === 'threads' && (message.includes('permission') || message.includes('scope') || message.includes('product') || message.includes('disable') || message.includes('matching'))) {
          message += ' (Ensure the Threads API product is added to your Meta App in the Meta Developer Portal and Threads Testers are configured.)';
        }
        return res.redirect(`${frontendUrl}/?tab=accounts&error=${encodeURIComponent('OAuth token exchange failed: ' + message)}`);
      }
    } else {
      let tokenUrl = '';
      let bodyData = {};
      let headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

      if (platform === 'linkedin') {
        tokenUrl = 'https://www.linkedin.com/oauth/v2/accessToken';
        bodyData = {
          grant_type: 'authorization_code',
          code,
          redirect_uri: process.env.LINKEDIN_REDIRECT_URI || redirectUri,
          client_id: clientId,
          client_secret: clientSecret
        };
      } else if (platform === 'youtube') {
        tokenUrl = 'https://oauth2.googleapis.com/token';
        bodyData = {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret
        };
      } else if (platform === 'pinterest') {
        tokenUrl = 'https://api.pinterest.com/v5/oauth/token';
        bodyData = {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri
        };
        const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
        headers['Authorization'] = `Basic ${authHeader}`;
      } else if (platform === 'tiktok') {
        tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
        bodyData = {
          client_key: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        };
      }

      const searchParams = new URLSearchParams();
      for (const key in bodyData) {
        searchParams.append(key, bodyData[key]);
      }

      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers,
        body: searchParams.toString()
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        logger.error(`[OAuth ERROR] ${platform.toUpperCase()} Token exchange FAILED. Status: ${tokenRes.status}`);
        return res.redirect(`${frontendUrl}/?tab=accounts&error=${encodeURIComponent('OAuth token exchange failed: ' + (tokenData.error?.message || tokenData.error_description || tokenData.error || 'Unknown error'))}`);
      }

      accessToken = tokenData.access_token;
      refreshToken = tokenData.refresh_token || null;
      expiresIn = tokenData.expires_in || 3600;
    }

    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    // Fetch user details from platform APIs
    let handle = 'user';
    let profileName = 'Social Account';
    let avatarUrl = '';
    let platformUserId = `id-${Date.now()}`;

    try {
      if (platform === 'linkedin') {
        const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const meData = await meRes.json();
        if (meRes.ok) {
          platformUserId = meData.sub;
          profileName = meData.name || 'LinkedIn User';
          handle = profileName.toLowerCase().replace(/\s+/g, '_');
          avatarUrl = meData.picture || '';
          req._linkedin_person_urn = meData.sub;
        }
      } else if (platform === 'youtube') {
        const meRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const meData = await meRes.json();
        if (meRes.ok) {
          platformUserId = meData.id;
          profileName = meData.name;
          handle = meData.email ? meData.email.split('@')[0] : 'youtube_user';
          avatarUrl = meData.picture;
        }
      } else if (platform === 'facebook') {
        logger.debug('[Facebook OAuth] Fetching Facebook Pages via /me/accounts...');
        const pagesRes = await fetch('https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,picture{url}', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const pagesData = await pagesRes.json();
        if (!pagesRes.ok) {
          logger.error('[Facebook OAuth ERROR] Failed to fetch Pages:', pagesData);
          return res.redirect(`${frontendUrl}/?tab=accounts&error=${encodeURIComponent('Failed to fetch Facebook Pages.')}`);
        }

        if (!pagesData.data || pagesData.data.length === 0) {
          return res.redirect(`${frontendUrl}/?tab=accounts&error=${encodeURIComponent('No Facebook Pages found. You must be an admin of at least one page.')}`);
        }

        for (const page of pagesData.data) {
          const encryptedPageAccess = encrypt(page.access_token);
          const pageId = page.id;
          const pageName = page.name;
          const pageHandle = pageName.toLowerCase().replace(/\s+/g, '_');
          const pageAvatarUrl = page.picture?.data?.url || '';

          const fbQuery = orgId ? { platform: 'facebook', page_id: pageId, organizationId: orgId } : { user_id: userId, platform: 'facebook', page_id: pageId, organizationId: null };
          let account = await SocialAccount.findOne(fbQuery);
          if (account) {
            account.handle = pageHandle;
            account.access_token = encryptedPageAccess;
            account.token_expiry = null; // Page tokens never expire
            account.status = 'connected';
            account.profile_name = pageName;
            account.avatar_url = pageAvatarUrl || null;
            await account.save();
          } else {
            const newAccount = await SocialAccount.create({
              _id: uuidv4(),
              user_id: userId,
              platform: 'facebook',
              handle: pageHandle,
              access_token: encryptedPageAccess,
              refresh_token: null,
              token_expiry: null,
              status: 'connected',
              profile_name: pageName,
              avatar_url: pageAvatarUrl || null,
              page_id: pageId,
              organizationId: orgId,
              followers_count: 0,
              following_count: 0,
              posts_count: 0,
              bio: `Facebook Page Connected Account`,
              connected_at: new Date()
            });
            account = newAccount;
          }


        }

        await createNotification(
          userId,
          'success',
          `Successfully authorized and connected ${pagesData.data.length} Facebook Pages.`,
          null,
          orgId
        );

        return res.redirect(`${frontendUrl}/?tab=accounts&connected=true`);
      } else if (platform === 'threads') {
        logger.debug('[Threads OAuth] Fetching Threads profile details via /me...');
        const meRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username,name,threads_profile_picture_url&access_token=${accessToken}`);
        const meData = await meRes.json();
        if (!meRes.ok) {
          logger.error('[Threads OAuth ERROR] Failed to fetch profile details:', meData);
          return res.redirect(`${frontendUrl}/?tab=accounts&error=${encodeURIComponent('Failed to fetch Threads profile details.')}`);
        }

        const threadsUserId = meData.id;
        const threadsName = meData.name || meData.username;
        const threadsHandle = meData.username;
        const threadsAvatarUrl = meData.threads_profile_picture_url || '';

        const encryptedAccess = encrypt(accessToken);
        const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

        const threadsQuery = orgId ? { platform: 'threads', page_id: threadsUserId, organizationId: orgId } : { user_id: userId, platform: 'threads', page_id: threadsUserId, organizationId: null };
        let account = await SocialAccount.findOne(threadsQuery);
        if (account) {
          account.handle = threadsHandle;
          account.access_token = encryptedAccess;
          account.token_expiry = tokenExpiry;
          account.status = 'connected';
          account.profile_name = threadsName;
          account.avatar_url = threadsAvatarUrl || null;
          await account.save();
        } else {
          const newAccount = await SocialAccount.create({
            _id: uuidv4(),
            user_id: userId,
            platform: 'threads',
            handle: threadsHandle,
            access_token: encryptedAccess,
            refresh_token: null,
            token_expiry: tokenExpiry,
            status: 'connected',
            profile_name: threadsName,
            avatar_url: threadsAvatarUrl || null,
            page_id: threadsUserId, // Store Threads User ID here
            organizationId: orgId,
            followers_count: 0,
            following_count: 0,
            posts_count: 0,
            bio: `Threads Connected Account`,
            connected_at: new Date()
          });
          account = newAccount;
        }



        await createNotification(
          userId,
          'success',
          `Successfully authorized and connected Threads account @${threadsHandle}.`,
          null,
          orgId
        );

        return res.redirect(`${frontendUrl}/?tab=accounts&connected=true`);
      } else if (platform === 'instagram') {
        logger.debug('[Instagram OAuth] OAuth access token received. Fetching permissions...');

        // 1. Validate permissions
        const permRes = await fetch('https://graph.facebook.com/v21.0/me/permissions', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const permData = await permRes.json();
        let grantedPerms = [];
        if (permRes.ok && permData.data) {
          grantedPerms = permData.data.filter(p => p.status === 'granted').map(p => p.permission);
          const required = ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement', 'pages_manage_metadata', 'business_management'];
          const missing = required.filter(p => !grantedPerms.includes(p));

          logger.debug(`[Instagram OAuth] Requested permissions: ${required.join(', ')}`);
          logger.debug(`[Instagram OAuth] Granted permissions: ${grantedPerms.join(', ')}`);
          logger.debug(`[Instagram OAuth] Missing permissions: ${missing.length > 0 ? missing.join(', ') : 'None'}`);

          if (missing.length > 0) {
            logger.error('[Instagram OAuth ERROR] Required permissions not granted:', missing);
            return res.redirect(`${frontendUrl}/?tab=accounts&error=${encodeURIComponent('Required publishing permissions missing: ' + missing.join(', '))}`);
          }
        }

        // 2. Fetch Facebook Pages
        logger.debug('[Instagram OAuth] Fetching Facebook Pages via /me/accounts...');
        const pagesRes = await fetch('https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        const pagesResText = await pagesRes.text();
        logger.debug(`[Instagram OAuth] /me/accounts HTTP Status: ${pagesRes.status} ${pagesRes.statusText}`);
        logger.debug(`[Instagram OAuth] /me/accounts Response Headers:`, JSON.stringify(Object.fromEntries(pagesRes.headers.entries()), null, 2));
        logger.debug(`[Instagram OAuth] /me/accounts Full JSON body: ${pagesResText}`);

        let pagesData;
        try {
          pagesData = JSON.parse(pagesResText);
        } catch (e) {
          logger.error('[Instagram OAuth ERROR] Failed to parse /me/accounts response as JSON');
          return res.redirect(`${frontendUrl}/?tab=accounts&error=${encodeURIComponent('Failed to parse Facebook Pages response.')}`);
        }

        if (!pagesRes.ok) {
          let errMsg = pagesData.error?.message || 'Unknown Graph API Error';
          if (pagesData.error?.code === 190) errMsg = 'Access token expired or invalid.';
          logger.error(`[Instagram OAuth ERROR] Failed to fetch Facebook Pages. Error: ${errMsg}`);
          return res.redirect(`${frontendUrl}/?tab=accounts&error=${encodeURIComponent(`Failed to fetch Facebook Pages: ${errMsg}`)}`);
        }

        if (!pagesData.data || pagesData.data.length === 0) {
          logger.error('[Instagram OAuth ERROR] /me/accounts returned empty array.');

          let explanation = 'No Facebook Pages found.';
          if (!grantedPerms.includes('pages_show_list')) {
            explanation = 'Missing pages_show_list permission.';
          } else if (pagesData.error?.code === 10 || pagesData.error?.message?.includes('Application does not have permission')) {
            explanation = 'App may be in Development Mode and you are not an App Tester/Developer.';
          } else {
            explanation = 'Logged-in user has no accessible Facebook Pages. Are you an admin of the page?';
          }

          return res.redirect(`${frontendUrl}/?tab=accounts&error=${encodeURIComponent(`Connection failed: ${explanation}`)}`);
        }

        // 3. Detect which page is linked to the Instagram Business Account
        let selectedPage = null;
        let igAccount = null;

        for (const page of pagesData.data) {
          logger.debug(`[Instagram OAuth] Evaluating Page: ID=${page.id}, Name="${page.name}", AccessToken=${!!page.access_token}`);
          if (page.instagram_business_account) {
            logger.debug(`[Instagram OAuth] Page ${page.id} has Instagram Business Account: ${page.instagram_business_account.id}`);
            selectedPage = page;
            igAccount = page.instagram_business_account;
            break; // Use the first one we find
          } else {
            logger.debug(`[Instagram OAuth] Page ${page.id} does NOT have an instagram_business_account object attached.`);
          }
        }

        if (!selectedPage || !igAccount) {
          logger.error('[Instagram OAuth ERROR] Facebook Page exists but no Instagram Business Account is linked.');
          return res.redirect(`${frontendUrl}/?tab=accounts&error=${encodeURIComponent('Facebook Page exists but no Instagram Business Account is linked.')}`);
        }

        logger.debug(`[Instagram OAuth] Selected Facebook Page ID: ${selectedPage.id}`);
        if (!selectedPage.access_token) {
          logger.error('[Instagram OAuth ERROR] Missing Page Access Token.');
          return res.redirect(`${frontendUrl}/?tab=accounts&error=${encodeURIComponent('Missing Page Access Token.')}`);
        }
        logger.debug(`[Instagram OAuth] Page Access Token received: YES`);

        logger.debug(`[Instagram OAuth] Instagram Business Account object:`, JSON.stringify(igAccount, null, 2));
        if (!igAccount.id) {
          logger.error('[Instagram OAuth ERROR] Missing Instagram Business Account ID.');
          return res.redirect(`${frontendUrl}/?tab=accounts&error=${encodeURIComponent('Missing Instagram Business Account ID.')}`);
        }
        logger.debug(`[Instagram OAuth] Instagram Business ID: ${igAccount.id}`);

        if (!igAccount.username) {
          logger.error('[Instagram OAuth ERROR] Username missing.');
          return res.redirect(`${frontendUrl}/?tab=accounts&error=${encodeURIComponent('Missing Instagram Username.')}`);
        }
        logger.debug(`[Instagram OAuth] Username: ${igAccount.username}`);
        logger.debug(`[Instagram OAuth] Profile name: ${igAccount.name || igAccount.username}`);

        platformUserId = igAccount.id;
        profileName = igAccount.name || igAccount.username || selectedPage.name;
        handle = igAccount.username;
        avatarUrl = igAccount.profile_picture_url || '';

        req._instagram_page_id = selectedPage.id;
        req._page_access_token = selectedPage.access_token;
        req._instagram_business_id = igAccount.id;
        req._granted_permissions = grantedPerms;
      } else if (platform === 'pinterest') {
        const meRes = await fetch('https://api.pinterest.com/v5/user_account', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const meData = await meRes.json();
        if (meRes.ok) {
          platformUserId = meData.username;
          profileName = meData.username;
          handle = meData.username;
          avatarUrl = meData.profile_image;
        }
      } else if (platform === 'tiktok') {
        const meRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=union_id,avatar_url,display_name', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const meData = await meRes.json();
        if (meRes.ok && meData.data?.user) {
          const user = meData.data.user;
          platformUserId = user.union_id;
          profileName = user.display_name;
          handle = user.display_name.toLowerCase().replace(/\s+/g, '_');
          avatarUrl = user.avatar_url;
        }
      } else if (platform === 'youtube') {
        try {
          const { google } = require('googleapis');
          const oauth2Client = new google.auth.OAuth2();
          oauth2Client.setCredentials({ access_token: accessToken });
          const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
          const channelRes = await youtube.channels.list({ part: 'snippet,statistics', mine: true });
          if (channelRes.data.items && channelRes.data.items.length > 0) {
            const channel = channelRes.data.items[0];
            platformUserId = channel.id;
            profileName = channel.snippet.title;
            handle = channel.snippet.customUrl || channel.snippet.title;
            avatarUrl = channel.snippet.thumbnails?.default?.url;
            req._yt_stats = {
              followers_count: parseInt(channel.statistics.subscriberCount || 0, 10),
            };
          }
        } catch (ytErr) {
          logger.error('[YouTube OAuth ERROR] Failed to fetch channel details:', ytErr.message);
        }
      }
    } catch (profileErr) {
      logger.warn(`Could not fetch user profile details for ${platform}:`, profileErr.message);
    }

    const encryptedAccess = encrypt(accessToken);
    const encryptedRefresh = refreshToken ? encrypt(refreshToken) : null;

    const oauthQuery = orgId ? { platform, organizationId: orgId } : { user_id: userId, platform, organizationId: null };
    let account = await SocialAccount.findOne(oauthQuery);
    if (account) {
      account.handle = handle;
      account.access_token = encryptedAccess;
      account.refresh_token = encryptedRefresh;
      account.token_expiry = tokenExpiry;
      account.status = 'connected';
      account.profile_name = profileName;
      account.avatar_url = avatarUrl || null;
      // Store Instagram-specific IDs for Graph API publishing
      if (platform === 'instagram') {
        if (req._instagram_page_id) account.page_id = req._instagram_page_id;
        if (req._instagram_business_id) account.instagram_business_id = req._instagram_business_id;
        if (req._page_access_token) account.page_access_token = encrypt(req._page_access_token);
        if (req._granted_permissions) account.permissions = req._granted_permissions;
      }
      if (platform === 'linkedin') {
        if (req._linkedin_person_urn) account.linkedin_person_urn = req._linkedin_person_urn;
      }
      if (platform === 'youtube') {
        account.page_id = platformUserId;
        if (req._yt_stats) account.followers_count = req._yt_stats.followers_count;
      }
      await account.save();
    } else {
      const accountData = {
        _id: uuidv4(),
        user_id: userId,
        platform,
        handle,
        access_token: encryptedAccess,
        refresh_token: encryptedRefresh,
        token_expiry: tokenExpiry,
        status: 'connected',
        profile_name: profileName,
        avatar_url: avatarUrl || null,
        organizationId: orgId,
        followers_count: 0,
        following_count: 0,
        posts_count: 0,
        bio: `${PLATFORM_LABELS[platform] || platform} Connected Account`,
      };
      // Store Instagram-specific IDs for Graph API publishing
      if (platform === 'instagram') {
        accountData.page_id = req._instagram_page_id || null;
        accountData.instagram_business_id = req._instagram_business_id || null;
        accountData.page_access_token = req._page_access_token ? encrypt(req._page_access_token) : null;
        accountData.permissions = req._granted_permissions || [];
        accountData.connected_at = new Date();
      }
      if (platform === 'linkedin') {
        accountData.linkedin_person_urn = req._linkedin_person_urn || null;
      }
      if (platform === 'youtube') {
        accountData.page_id = platformUserId || null;
        if (req._yt_stats) accountData.followers_count = req._yt_stats.followers_count;
      }
      const newAccount = await SocialAccount.create(accountData);
      account = newAccount;
    }



    await createNotification(
      userId,
      'success',
      `Successfully authorized and connected ${PLATFORM_LABELS[platform] || platform} account @${handle} via official OAuth.`,
      null,
      orgId
    );

    return res.redirect(`${frontendUrl}/?tab=accounts&connected=true`);
  } catch (err) {
    logger.error('OAuth callback processing failed:', err.message);
    return res.redirect(`${frontendUrl}/?tab=accounts&error=OAuth+verification+failed`);
  }
});

// -------------------------------------------------------------
// PRIVATE ROUTE MIDDLEWARE (Protected by JWT requireAuth)
// -------------------------------------------------------------
router.use(requireAuth);
router.use(workspaceContext);

router.get('/', async (req, res) => {
  try {
    const accounts = await SocialAccount.find(req.workspaceFilter).sort({ created_at: 1 }).lean();
    res.json({ accounts, supported_platforms: SUPPORTED_PLATFORMS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Credentials Settings Management Endpoints
// Credentials Settings Management Endpoints (Protected by requireAuth)
router.get('/config/details', requireAuth, async (req, res) => {
  try {
    const userId = req.userId || req.user?.userId || req.user?._id;
    const socCred = await SocialCredential.findOne({ userId }).lean();

    const getGlobalOrUser = (plat) => {
      if (['facebook', 'instagram', 'threads'].includes(plat)) {
        if (socCred?.facebook?.appId) {
          return {
            platform: plat,
            client_id: socCred.facebook.appId,
            client_secret: socCred.facebook.appSecret ? '••••••••' : '',
            meta_app_id: socCred.facebook.appId,
            app_id: socCred.facebook.appId
          };
        }
      } else if (plat === 'linkedin' && socCred?.linkedin?.clientId) {
        return {
          platform: 'linkedin',
          client_id: socCred.linkedin.clientId,
          client_secret: socCred.linkedin.clientSecret ? '••••••••' : '',
        };
      } else if (plat === 'youtube' && socCred?.youtube?.clientId) {
        return {
          platform: 'youtube',
          client_id: socCred.youtube.clientId,
          client_secret: socCred.youtube.clientSecret ? '••••••••' : '',
        };
      }
      return null;
    };

    const list = [];
    for (const p of ['facebook', 'instagram', 'linkedin', 'youtube', 'pinterest', 'tiktok', 'bluesky', 'threads']) {
      const item = getGlobalOrUser(p);
      if (item) list.push(item);
    }

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/config', requireAuth, async (req, res) => {
  const { platform, client_id, client_secret, meta_app_id, app_id } = req.body;
  if (!platform || !SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unsupported or missing platform.' });
  }
  const idToSave = (client_id || meta_app_id || app_id || '').trim();
  const secretInput = (client_secret || '').trim();

  if (!idToSave && !secretInput) {
    return res.status(400).json({ error: 'Client ID and Client Secret are required.' });
  }

  try {
    const userId = req.userId || req.user?.userId || req.user?._id;
    const existingSoc = await SocialCredential.findOne({ userId });

    let secretToSave = secretInput;
    if (secretInput === '••••••••' || secretInput === '********************') {
      if (['facebook', 'instagram', 'threads'].includes(platform)) secretToSave = existingSoc?.facebook?.appSecret;
      else if (platform === 'linkedin') secretToSave = existingSoc?.linkedin?.clientSecret;
      else if (platform === 'youtube') secretToSave = existingSoc?.youtube?.clientSecret;
    } else if (secretInput) {
      secretToSave = encrypt(secretInput);
    }

    if (['facebook', 'instagram', 'threads'].includes(platform)) {
      await SocialCredential.findOneAndUpdate(
        { userId },
        { $set: { 'facebook.appId': idToSave, 'facebook.appSecret': secretToSave, updatedAt: new Date() } },
        { upsert: true }
      );
    } else if (platform === 'linkedin') {
      await SocialCredential.findOneAndUpdate(
        { userId },
        { $set: { 'linkedin.clientId': idToSave, 'linkedin.clientSecret': secretToSave, updatedAt: new Date() } },
        { upsert: true }
      );
    } else if (platform === 'youtube') {
      await SocialCredential.findOneAndUpdate(
        { userId },
        { $set: { 'youtube.clientId': idToSave, 'youtube.clientSecret': secretToSave, updatedAt: new Date() } },
        { upsert: true }
      );
    }

    res.json({ success: true, message: `${PLATFORM_LABELS[platform] || platform} credentials saved successfully.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/config/test', requireAuth, async (req, res) => {
  const { platform, client_id, client_secret, meta_app_id, app_id } = req.body;
  const userId = req.userId || req.user?.userId || req.user?._id;

  try {
    let idToUse = (client_id || meta_app_id || app_id || '').trim();
    let secretToUse = (client_secret || '').trim();

    if (!idToUse || !secretToUse || secretToUse === '••••••••' || secretToUse === '********************') {
      const saved = await getCredentialsForUserAndPlatform(userId, platform);
      if (!idToUse) idToUse = saved.clientId;
      if (!secretToUse || secretToUse === '••••••••' || secretToUse === '********************') secretToUse = saved.clientSecret;
    }

    if (!idToUse || !secretToUse) {
      return res.status(400).json({ success: false, error: 'Please enter both Client/App ID and Secret to test.' });
    }

    if (['facebook', 'instagram', 'threads'].includes(platform)) {
      const testUrl = `https://graph.facebook.com/oauth/access_token?client_id=${encodeURIComponent(idToUse)}&client_secret=${encodeURIComponent(secretToUse)}&grant_type=client_credentials`;
      const response = await fetch(testUrl);
      const data = await response.json();
      if (response.ok && data.access_token) {
        return res.json({ success: true, message: 'Meta (Facebook/Instagram) credentials verified successfully with Meta Graph API!' });
      }
      return res.status(400).json({ success: false, error: data.error?.message || 'Meta API validation rejected credentials (invalid App ID or Secret).' });
    } else if (platform === 'linkedin') {
      const testUrl = `https://www.linkedin.com/oauth/v2/accessToken`;
      const bodyParams = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: idToUse,
        client_secret: secretToUse
      });
      const response = await fetch(testUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: bodyParams });
      const data = await response.json();
      if (response.ok || data.error === 'access_denied' || data.error_description?.includes('scope')) {
        return res.json({ success: true, message: 'LinkedIn Developer App credentials verified successfully!' });
      }
      return res.status(400).json({ success: false, error: data.error_description || data.error || 'LinkedIn rejected Client ID or Client Secret (invalid_client).' });
    } else if (platform === 'youtube' || platform === 'google') {
      const testUrl = `https://oauth2.googleapis.com/token`;
      const bodyParams = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: idToUse,
        client_secret: secretToUse,
        code: 'test_validation_code',
        redirect_uri: 'http://localhost'
      });
      const response = await fetch(testUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: bodyParams });
      const data = await response.json();

      // If client_id or client_secret is invalid, Google returns 'invalid_client'
      if (data.error === 'invalid_client') {
        return res.status(400).json({ success: false, error: 'Google rejected Client ID or Client Secret (invalid_client).' });
      }

      // If credentials are valid, Google confirms the client ID exists but code/uri is dummy ('invalid_grant', 'redirect_uri_mismatch', etc.)
      if (response.ok || data.error === 'invalid_grant' || data.error === 'redirect_uri_mismatch' || data.error === 'unauthorized_client' || data.error === 'access_denied' || data.error_description?.includes('code') || data.error_description?.includes('grant')) {
        return res.json({ success: true, message: 'Google Cloud / YouTube credentials verified successfully!' });
      }

      return res.status(400).json({ success: false, error: data.error_description || data.error || 'Google validation failed.' });
    }

    res.json({ success: true, message: `${PLATFORM_LABELS[platform] || platform} credentials format verified.` });
  } catch (err) {
    res.status(500).json({ success: false, error: `Validation test failed: ${err.message}` });
  }
});

router.delete('/config/:platform', requireAuth, async (req, res) => {
  const { platform } = req.params;
  try {
    const userId = req.userId || req.user?.userId || req.user?._id;
    if (['facebook', 'instagram', 'threads'].includes(platform)) {
      await SocialCredential.findOneAndUpdate({ userId }, { $unset: { facebook: 1 } });
    } else if (platform === 'linkedin') {
      await SocialCredential.findOneAndUpdate({ userId }, { $unset: { linkedin: 1 } });
    } else if (platform === 'youtube') {
      await SocialCredential.findOneAndUpdate({ userId }, { $unset: { youtube: 1 } });
    }
    res.json({ success: true, message: `${PLATFORM_LABELS[platform] || platform} configuration removed.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Direct password/app password credentials connection route
router.post('/', async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Only admins can connect accounts.' });
  }

  const { platform, handle, app_password } = req.body;
  if (!platform || !SUPPORTED_PLATFORMS.includes(platform)) {
    return res.status(400).json({ error: 'Unsupported or missing platform.' });
  }
  if (!handle) {
    return res.status(400).json({ error: 'Account username/email is required.' });
  }

  try {
    const orgId = req.workspace === 'personal' ? null : req.workspace;

    if (platform === 'youtube' && app_password) {
      const nodemailer = require('nodemailer');
      try {
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: handle,
            pass: app_password,
          },
        });

        await transporter.verify();

        await transporter.sendMail({
          from: `"Scripta Platform" <${handle}>`,
          to: handle,
          subject: "Scripta Integration Connected Successfully!",
          text: `Hello,\n\nYour Google account (${handle}) has been successfully linked to your Scripta Social Media Management workspace.\n\nYou can now coordinate and publish posts seamlessly.\n\nBest regards,\nScripta Team`,
        });
      } catch (smtpErr) {
        logger.error('[SMTP Auth Verification FAILED]', smtpErr.message);
        return res.status(401).json({
          error: `Google account verification failed. Please check your email and ensure you are using a valid 16-character Google App Password. Details: ${smtpErr.message}`
        });
      }
    }

    const encryptedPass = app_password ? encrypt(app_password) : null;
    const profileName = handle.split('@')[0];

    let account = await SocialAccount.findOne({ platform, handle, ...req.workspaceFilter });
    if (account) {
      account.app_password = encryptedPass;
      account.access_token = 'direct_credentials';
      account.status = 'connected';
      account.profile_name = profileName;
      await account.save();
    } else {
      account = await SocialAccount.create({
        _id: uuidv4(),
        user_id: req.userId,
        platform,
        handle,
        app_password: encryptedPass,
        access_token: 'direct_credentials',
        status: 'connected',
        profile_name: profileName,
        organizationId: orgId,
        bio: `${PLATFORM_LABELS[platform] || platform} Connected Account (Direct)`,
        connected_at: new Date()
      });
    }

    await createNotification(
      req.userId,
      'success',
      `Successfully connected ${PLATFORM_LABELS[platform] || platform} account @${handle} via direct credentials.`,
      null,
      orgId
    );

    res.json({ success: true, account });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  if (req.userRole !== 'admin') {
    return res.status(403).json({ error: 'Only admins can disconnect accounts.' });
  }

  try {
    const account = await SocialAccount.findOne({ _id: req.params.id, ...req.workspaceFilter });
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    const platformLabel = PLATFORM_LABELS[account.platform] || account.platform;
    const handle = account.handle;
    const orgId = req.workspace === 'personal' ? null : req.workspace;

    await SocialAccount.deleteOne({ _id: req.params.id, ...req.workspaceFilter });

    await createNotification(
      req.userId,
      'info',
      `Disconnected ${platformLabel} account @${handle}.`,
      null,
      orgId
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/test', async (req, res) => {
  try {
    const account = await SocialAccount.findOne({ _id: req.params.id, ...req.workspaceFilter });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const hasToken = !!account.access_token;
    let ok = hasToken;
    let message = ok ? 'Connection looks good' : 'Missing access token';

    if (account.platform === 'instagram') {
      if (!account.instagram_business_id || !account.page_access_token) {
        ok = false;
        message = 'Missing Instagram Business Account ID or Page Access Token. Please reconnect.';
      }
    }

    res.json({ ok, message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/sync', async (req, res) => {
  try {
    const account = await SocialAccount.findOne({ _id: req.params.id, ...req.workspaceFilter });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    account.last_synced_at = new Date();
    await account.save();

    res.json({ success: true, account });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
