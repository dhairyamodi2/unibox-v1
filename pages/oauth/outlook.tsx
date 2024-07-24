import Loader from "@/components/loader"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import toast, { Toaster } from "react-hot-toast"

export default function GmailRedirect() {
    const [loader, setLoader] = useState(true)
    const router = useRouter()
    useEffect(() => {
        async function oauth() {
            const response = await fetch('/api/oauth/outlook/callback?code=' + router.query.code)
            const data = await response.json();
            if (data.error) {
                toast.error(data.error)
                setTimeout(() => {
                    router.replace("/")
                }, 3000)
                return
            }
            toast.success("Google account connected successfully!")
        }
        if (router.query.code) {
            setLoader(true)
            oauth().then(() => {
                setLoader(false)
                setTimeout(() => {
                    router.replace("/")
                }, 3000)
            }).catch((err) => {
                setLoader(false)
                toast.error("Something went wrong")
            })

        }
    }, [router.query.code])
    if (loader) {
        return <div className="h-screen flex justify-center items-center">
            <Loader />
        </div>
    }
    return (
        <div>
            <Toaster position="top-center"></Toaster>
        </div>
    )
}