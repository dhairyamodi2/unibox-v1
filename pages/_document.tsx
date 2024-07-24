import { UserProvider } from "@auth0/nextjs-auth0/client";
import { Html, Head, Main, NextScript } from "next/document";
import { Toaster } from "react-hot-toast";

export default function Document() {
  return (
    <Html lang="en">
      <UserProvider>
        <Toaster position="top-center"></Toaster>
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </UserProvider>
    </Html>
  );
}
