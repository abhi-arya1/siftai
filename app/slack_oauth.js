const express = require('express');
const axios = require('axios');
const qs = require('qs');

const app = express();

app.get('/auth/slack/callback', async (req, res) => {
    const { code, error } = req.query;
    const clientId = '7906164823108.7891603819943';
    const clientSecret = '4cd4649f28472fb5d5299f85e8696ed0';
    const redirect_url = 'http://localhost:3000/auth/slack/callback';

    try {
        // Exchange code for access token
        const response = await axios.post('https://slack.com/api/oauth.v2.access', 
            qs.stringify({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri // Include if you specified it in the original OAuth call
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        // Verify Slack's response
        if (!response.data.ok) {
            console.error('Slack API error:', response.data.error);
            return res.status(400).json({ error: 'Failed to obtain access token' });
        }

        // Store the tokens securely in your database here
        const { access_token, team } = response.data;

        // Redirect to success page or return success response
        res.json({
            success: true,
            team: team.name,
            message: 'Successfully authenticated with Slack!'
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});