import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { getAuthOptions } from "@/lib/auth"
import type { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const session = await getServerSession(getAuthOptions(req))

  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const steamId = (session.user as any).steamId
  const apiKey = process.env.STEAM_SECRET

  const res = await fetch(
    `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=true&include_played_free_games=true`
  )

  const data = await res.json()
  return NextResponse.json(data.response?.games ?? [])
}