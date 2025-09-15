import type { Metadata } from "next"
import { generateGlobalMetadata } from "@/lib/metadata"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export async function generateMetadata(): Promise<Metadata> {
  const baseMetadata = await generateGlobalMetadata()
  return {
    ...baseMetadata,
    title: `Authentication Error - ${baseMetadata.title}`,
    description: `Authentication error for ${baseMetadata.title}`,
  }
}

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-red-600">Authentication Error</CardTitle>
          <CardDescription>There was an error processing your authentication request.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            The authentication code may have expired or been used already.
          </p>
          <Button asChild>
            <Link href="/login">Try Again</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
