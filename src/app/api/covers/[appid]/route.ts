import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ appid: string }> }
) {
  const { appid } = await params
  const apiKey = process.env.STEAMGRIDDB_API_KEY

  try {
    const res = await fetch(
      `https://www.steamgriddb.com/api/v2/grids/steam/${appid}?dimensions=600x900`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ url: null })
    }

    const data = await res.json()
    const firstResult = data.data?.[0]

    return NextResponse.json({ url: firstResult?.url ?? null })
  } catch {
    return NextResponse.json({ url: null })
  }
}