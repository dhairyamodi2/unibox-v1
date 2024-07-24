import { withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";
import { ConfidentialClientApplication } from '@azure/msal-node'


export default withApiAuthRequired(async function myApiRoute(req: NextApiRequest, res: NextApiResponse) {
    try {
        const cca = new ConfidentialClientApplication({
            auth: {
                clientId: process.env.OUTLOOK_CLIENT_ID as string,
                clientSecret: process.env.OUTLOOK_CLIENT_SECRET
            }
        })
        const authCodeUrlParameters = {
            scopes: ["Mail.Read", "offline_access"], // or ["Mail.Read", "Mail.ReadWrite"] if needed
            redirectUri: 'http://localhost:3000/oauth/outlook',

        };

        const url = await cca.getAuthCodeUrl(authCodeUrlParameters)
        res.redirect(url);
    } catch (error) {
        return res.json({
            error: "Something went wrong!"
        })
    }
})