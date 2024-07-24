import { NextRequest, NextResponse } from "next/server";
import { getSession, withApiAuthRequired } from '@auth0/nextjs-auth0'
import { google } from 'googleapis'
import { supabase } from "@/lib";
import { NextApiRequest, NextApiResponse } from "next";


//@ts-ignore
export default withApiAuthRequired(async function myApiRoute(req: NextApiRequest, res: NextApiResponse) {
    //@ts-ignore
    const { user } = await getSession(req, res);

    const { data: userData, error: userError } = await supabase.from('User').select('*').eq('email', user.email).single()
    if (userError) {
        console.log(userError)
        return res.json({
            error: "Somethign went wrong!"
        })
    }
    const code = req.query.code as string
    console.log(req.query.code)
    const oauth2 = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3000/oauth/gmail'
    )
    try {
        const { tokens } = await oauth2.getToken(code);
        console.log('reff token ')
        console.log(tokens)
        const { data: accountData, error: accountError } = await supabase.from('Account').select('*').eq('user_id', userData.id).single()
        if (accountError) {
            const { error } = await supabase.from('Account').insert({
                user_id: userData.id,
                google_refresh_token: tokens.refresh_token
            })
            if (error) {
                console.log(error)
                return res.json({
                    error: "Error creating an account!"
                })
            }
        }
        else {
            const { error } = await supabase.from('Account').update({ google_refresh_token: tokens.refresh_token }).eq('user_id', userData.id)
            if (error) {
                console.log('error updating the account!')
                return res.json({
                    error: "Error updating an account!"
                })
            }
        }

        //save access token and refresh token
        return res.json({
            success: true,
            message: "Gmail account connected successfully!"
        })
    } catch (error) {
        console.log('google auth error')
        console.log(error)
        return res.json({
            error: "Invalid grant! Please try again!"
        })
    }
});