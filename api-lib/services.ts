import { ConfidentialClientApplication } from "@azure/msal-node";
import { google } from "googleapis";

export async function fetchOutlookMails(access_token: string, emailDetails: { from: string, subject: string, body: string, date?: string, outlook?: boolean, conversationId: string }[]) {
    try {
        const response = await fetch('https://graph.microsoft.com/v1.0/me/messages', {
            headers: {
                Authorization: `Bearer ${access_token}`,
                'Content-type': 'application/json',
            },
        })
        const data = await response.json()
        if (data.value) {

            for (let i = 0; i < Math.min(data.value.length, 4); i++) {
                emailDetails.push({
                    from: data.value[i].sender.emailAddress.name,
                    subject: data.value[i].subject,
                    body: data.value[i].body.content,
                    date: data.value[i].receivedDateTime,
                    conversationId: data.value[i].conversationId,
                    outlook: true
                })
            }
            return emailDetails;
        }
        return []
    } catch (error) {
        console.log(error)
        return []
    }
}

async function fetchReplies(accessToken: string, conversationId: string) {
    const url = `https://graph.microsoft.com/v1.0/me/messages?$filter=conversationId eq '${conversationId}'&$select=subject,from,receivedDateTime,body`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    const data = await response.json();
    console.log('data', data)
    return data.value;
}
function getBody(payload: any) {
    let body = '';
    if (payload.parts && payload.parts.length) {
        payload.parts.forEach((part: any) => {
            if (part.mimeType === 'text/html') {
                body = Buffer.from(part.body.data, 'base64').toString('utf-8');
            }
        });
    } else {
        body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }
    return body;
}


async function getGmailReplies(refreshToken: string, conversationId: string) {
    try {
        const oauth2 = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'http://localhost:3000/oauth/gmail'
        )
        oauth2.setCredentials({
            refresh_token: refreshToken
        })

        const gmail = await google.gmail({ auth: oauth2, version: 'v1' })


        const threadRes = await gmail.users.threads.get({
            userId: 'me',
            id: conversationId,
        });
        const replies = threadRes.data.messages?.map((reply) => {
            const replyHeaders = reply?.payload?.headers;
            const replyFrom = replyHeaders?.find(header => header.name === 'From')?.value || 'Unknown Sender';
            const replySubject = replyHeaders?.find(header => header.name === 'Subject')?.value || 'No Subject';
            const replyDate = replyHeaders?.find(header => header.name === 'Date')?.value || 'Unknown Date';
            const replyBody = getBody(reply.payload);

            return {
                from: replyFrom,
                subject: replySubject,
                date: new Date(replyDate).toString(),
                body: replyBody,
            };
        });
        return replies
    } catch (error) {
        return []
    }
}

export async function listReplies(accessToken: string, conversationId: string, outlook?: boolean) {
    try {
        if (!outlook) {
            return await getGmailReplies(accessToken, conversationId)
        }
        const cca = new ConfidentialClientApplication({
            auth: {
                clientId: process.env.OUTLOOK_CLIENT_ID as string,
                clientSecret: process.env.OUTLOOK_CLIENT_SECRET
            }
        })

        const token = await cca.acquireTokenByRefreshToken({ refreshToken: accessToken, scopes: ["Mail.Read", "offline_access"] })
        const access_token = token?.accessToken
        const replies = await fetchReplies(access_token!, conversationId);
        console.log(replies)
        const replyDetails = replies.map((reply: any) => ({
            from: reply.from?.emailAddress?.address || 'Unknown Sender',
            subject: reply.subject || 'No Subject',
            date: reply.receivedDateTime,
            outlook: true,
            body: reply.body?.content || '',
        }));
        replyDetails.sort((a: any, b: any) => b.date - a.date);

        console.log('Email Details with Replies:', replyDetails);
        return replyDetails

    } catch (error) {
        console.error('Error listing emails:', error);
    }
}