import type { Metadata } from "next"
import { generateGlobalMetadata } from "@/lib/metadata"
import LoginClient from "./LoginClient"

export async function generateMetadata(): Promise<Metadata> {
  const baseMetadata = await generateGlobalMetadata()
  return {
    ...baseMetadata,
    title: `Admin Login - ${baseMetadata.title}`,
    description: `Admin login for ${baseMetadata.title}`,
  }
}

export default function LoginPage() {
  return <LoginClient />
}
