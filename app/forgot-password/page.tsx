import type { Metadata } from "next"
import { generateGlobalMetadata } from "@/lib/metadata"
import ForgotPasswordClient from "./ForgotPasswordClient"

export async function generateMetadata(): Promise<Metadata> {
  const baseMetadata = await generateGlobalMetadata()
  return {
    ...baseMetadata,
    title: `Reset Password - ${baseMetadata.title}`,
    description: `Reset your password for ${baseMetadata.title}`,
  }
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />
}
