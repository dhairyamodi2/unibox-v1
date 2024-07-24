import { supabase } from '@/lib';
import { AfterCallback, getSession, handleAuth, handleCallback } from '@auth0/nextjs-auth0';
import { NextApiRequest, NextApiResponse } from 'next';

const afterCallback: AfterCallback = async function (req, res, session, state) {
    const user = session.user;
    console.log(user)
    const { error } = await supabase.from('User').upsert({
        email: user.email,
        name: user.name
    })
    console.log(error)
    if (error && error.code !== '23505') {
        throw new Error(error.hint);
    }


    return session;
}

const handler = handleAuth({
    async callback(req: NextApiRequest, res: NextApiResponse) {
        try {
            await handleCallback(req, res, { afterCallback: afterCallback })
            res.redirect("/")
        } catch (error) {
            res.status(500).json({
                success: false,
                error: error
            })
        }
    }
})


export default handler;