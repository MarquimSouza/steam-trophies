import NextAuth from "next-auth"
import Steam from "next-auth-steam"
import type { NextRequest } from "next/server"

async function handler(
  req: NextRequest,
  ctx: { params: { nextauth: string[] } }
) {
  return NextAuth(req, ctx, {
    providers: [
      Steam(req, {
        clientSecret: process.env.STEAM_SECRET!,
      }),
    ],
    secret: process.env.NEXTAUTH_SECRET,
  })
}

export { handler as GET, handler as POST }