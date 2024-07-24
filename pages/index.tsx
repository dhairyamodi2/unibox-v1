import Image from "next/image";
import { Inter } from "next/font/google";
import Link from "next/link";
import Mails from "@/components/mail/Mails";
import { getSession, withPageAuthRequired } from "@auth0/nextjs-auth0";
import type { InferGetServerSidePropsType, GetServerSideProps } from 'next'
import { supabase } from "@/lib";
import { error } from "console";
import { Button } from "@/components/ui/button";
import { google } from "googleapis";
import { ConfidentialClientApplication } from '@azure/msal-node'
import { fetchOutlookMails } from '@/api-lib/services'
const inter = Inter({ subsets: ["latin"] });

interface HomeProps {
  user: { [key: string]: any } // Adjust this type as needed
  data: {
    google_connected: boolean;
    outlook_connected: boolean;
    mails?: {
      from: string
      subject: string
      body: string
      date?: string,
      outlook?: boolean,
      conversationId: string
    }[]
  } // Replace with actual type
}

export default function Home({ user, data }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (!data.google_connected && !data.outlook_connected) {
    return <div className="h-screen flex justify-center items-center">
      <div className="flex flex-col gap-4">
        <Link href={'/api/oauth/gmail'}>
          <Button>Connect Google</Button></Link>
        <Link href={'/api/oauth/outlook'}>
          <Button>Connect Outlook</Button></Link>
        {/* <Button>Connect Outlook Mail</Button> */}
        <Link href={'/api/auth/logout'}>Logout</Link>
      </div>
    </div>
  }
  return (
    <div className="p-8 flex flex-col">
      <Link href={'/api/auth/logout'} className="self-end my-2">
        <Button className="">Logout</Button>

      </Link>
      <Mails data={data} />
    </div>
  )
}
export const getServerSideProps: GetServerSideProps<HomeProps> = withPageAuthRequired({
  getServerSideProps: async (context) => {
    const { user } = await getSession(context.req, context.res) as any;
    //fetch user and it's accounts

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
    console.log('userdata here')
    console.log(userData);
    console.log(error)
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'http://localhost:3000/oauth/gmail'
    )
    //@ts-ignore
    const google_refresh_token = userData?.Account?.google_refresh_token
    console.log('refresh_token ', google_refresh_token)
    //@ts-ignore
    const outlook_refresh_token = userData?.Account?.outlook_refresh_token
    let emailDetails: { from: string, subject: string, body: string, date?: string, outlook?: boolean, conversationId: string }[] = []
    if (google_refresh_token) {
      try {
        await oauth2.setCredentials({ refresh_token: google_refresh_token })
        const gmail = await google.gmail({ auth: oauth2, version: 'v1' })
        const response = await gmail.users.messages.list({
          userId: 'me',
          q: 'in:inbox',
          maxResults: 3 // Adjust as needed
        });
        const messages = response.data.messages!
        emailDetails = await Promise.all(
          messages.map(async (message) => {
            const details = await gmail.users.messages.get({
              id: message.id!,
              userId: 'me'
            })
            const headers = details.data.payload?.headers!
            const subject = headers.find(header => header.name === 'Subject')?.value || 'No Subject';
            const from = headers.find(header => header.name === 'From')?.value || 'Unknown Sender';
            const date = headers.find(header => header.name === 'Date')?.value;
            let dateObj: string | undefined;
            if (date) {
              dateObj = new Date(date).toString()

            }
            // Decode email body
            let body = '';
            if (details.data.payload?.parts) {
              // If multipart, find the text/plain part
              const parts = details.data.payload.parts;
              const part = parts.find(part => part.mimeType === 'text/html') || parts[0];
              if (part && part.body && part.body.data) {
                body = Buffer.from(part.body.data, 'base64').toString('utf8');
              }
            } else if (details.data.payload?.body && details.data.payload.body.data) {
              // If not multipart, use the body directly
              body = Buffer.from(details.data.payload.body.data, 'base64').toString('utf8');
            }

            return {
              from,
              subject,
              body,
              date: dateObj,
              conversationId: message.threadId as string
            };
          })
        );
      } catch (error) {
        console.log(error)
      }
    }
    let allMails: typeof emailDetails = emailDetails;
    if (outlook_refresh_token) {
      const cca = new ConfidentialClientApplication({
        auth: {
          clientId: process.env.OUTLOOK_CLIENT_ID as string,
          clientSecret: process.env.OUTLOOK_CLIENT_SECRET
        }
      })

      const token = await cca.acquireTokenByRefreshToken({ refreshToken: outlook_refresh_token, scopes: ["Mail.Read", "offline_access"] })
      const access_token = token?.accessToken

      allMails = await fetchOutlookMails(access_token!, emailDetails)
    }
    return {
      props: {
        data: {
          //@ts-ignore
          google_connected: userData?.Account?.google_refresh_token != null,
          //@ts-ignore
          outlook_connected: userData?.Account?.outlook_refresh_token != null,
          mails: allMails
        }
      },

    }
  }
});