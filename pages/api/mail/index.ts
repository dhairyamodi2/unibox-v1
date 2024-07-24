import { listReplies } from "@/api-lib/services";
import { supabase } from "@/lib";
import { getSession, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextApiRequest, NextApiResponse } from "next";

export default withApiAuthRequired(async function myApiRoute(req: NextApiRequest, res: NextApiResponse) {
    const { user } = await getSession(req, res) as any

    const { data: userData, error: userError } = await supabase.from('User').select(`
    id,
    email,
    name,
    Account (
      id,
      google_refresh_token,
      outlook_refresh_token,
      user_id
    )
  `).eq('email', user.email).single()
    const id = req.query.id;
    console.log(id)
    const type = req.query.type;
    if (!id || !type) {
        return res.json({
            error: "conversation id and type required"
        })
    }
    //@ts-ignore
    let token = userData?.Account?.google_refresh_token;
    if (type === 'outlook') {
        //@ts-ignore
        token = userData?.Account?.outlook_refresh_token;
    }
    if (!token) {
        res.json({
            error: "Error found! PLease connect account!"
        })
    }
    const replies = await listReplies(token, id as string, req.query.type === 'outlook')
    console.log(replies)
    return res.json({
        data: replies[1]
    })

})