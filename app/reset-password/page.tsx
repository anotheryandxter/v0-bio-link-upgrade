import type { Metadata } from "next"
import { generateGlobalMetadata } from "@/lib/metadata"
import ResetPasswordClient from "./ResetPasswordClient"

export async function generateMetadata(): Promise<Metadata> {
  const baseMetadata = await generateGlobalMetadata()
  return {
    ...baseMetadata,
    title: `Set New Password - ${baseMetadata.title}`,
    description: `Set a new password for ${baseMetadata.title}`,
  }
}

export default function ResetPasswordPage() {
  return <ResetPasswordClient />
}
