import { ClerkProvider } from "@clerk/nextjs"
import { Inter } from "next/font/google"

import '../globals.css'


import React from "react"
//import RootLayout from "../(root)/layout"

export const metadata = {
    title: 'Threads',
    discription: 'A Next.js Meta Threads Application',
    
}

const inter = Inter({subsets: ["latin"]})


export default function RootLayout ({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <ClerkProvider>
            <html lang="en">
                <body className={`${inter.className} bg-dark-1`}>
                    {children}
                </body>
            </html>
        </ClerkProvider>
    )
}