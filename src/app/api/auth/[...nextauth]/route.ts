import NextAuth from "next-auth"
import { getAuthOptions } from "@/lib/auth"
import type { NextRequest } from "next/server"

async function handler(
  req: NextRequest,
  ctx: { params: Promise<{ nextauth: string[] }> }
) {
  const params = await ctx.params
  return NextAuth(req, { params }, getAuthOptions(req))
}

export { handler as GET, handler as POST }