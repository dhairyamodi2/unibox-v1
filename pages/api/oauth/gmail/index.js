import { NextRequest, NextResponse } from "next/server";
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0'
import { google } from 'googleapis'


export default withApiAuthRequired(async function myApiRoute(req, res) {
    const { user } = await getSession(req, res);
    const oauth2 = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3000/oauth/gmail'
    )

    const authUrl = oauth2.generateAuthUrl({
        access_type: 'offline', // Request offline access
        prompt: 'consent',
        scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/gmail.readonly'] // Specify the scopes you need
    });
    res.redirect(authUrl)
});