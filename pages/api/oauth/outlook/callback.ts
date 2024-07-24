import { supabase } from "@/lib";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { ConfidentialClientApplication } from "@azure/msal-node";
import { NextApiRequest, NextApiResponse } from "next";

export default withApiAuthRequired(async function myApiRoute(req: NextApiRequest, res: NextApiResponse) {
    try {
        //@ts-ignore
        const { user } = await getSession(req, res)

        const { data: userData, error: userError } = await supabase.from('User').select('*').eq('email', user.email).single()
        if (userError) {
            console.log(userError)
            return res.json({
                error: "Somethign went wrong!"
            })
        }
        const tokenRequest = {
            code: req.query.code as string,
            scopes: ["Mail.Read", "offline_access"],
            redirectUri: 'http://localhost:3000/oauth/outlook',
        };

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
        const response = await cca.acquireTokenByCode(tokenRequest)
        const { RefreshToken } = JSON.parse(cca.getTokenCache().serialize())
        const refresh_token = RefreshToken[Object.keys(RefreshToken)[0]].secret

        const { data: accountData, error: accountError } = await supabase.from('Account').select('*').eq('user_id', userData.id).single()
        if (accountError) {
            const { error } = await supabase.from('Account').insert({
                user_id: userData.id,
                outlook_refresh_token: refresh_token
            })
            if (error) {
                console.log(error)
                return res.json({
                    error: "Error creating an account!"
                })
            }
        }
        else {
            const { error } = await supabase.from('Account').update({ outlook_refresh_token: refresh_token }).eq('user_id', userData.id)
            if (error) {
                console.log('error updating the account!')
                return res.json({
                    error: "Error updating an account!"
                })
            }
        }
        return res.json({
            success: true,
            message: "Outlook account setup successfully!"
        })
    } catch (error) {
        return res.json({
            error: "error connecting outlook account!"
        })
    }
})