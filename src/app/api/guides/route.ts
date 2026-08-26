import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import type { NextRequest } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const appid = searchParams.get("appid")

  if (!appid) {
    return NextResponse.json({ error: "appid é obrigatório" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("achievement_guides")
    .select("apiname, guide_text")
    .eq("appid", appid)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Transforma em um objeto { apiname: guide_text }, mais fácil de usar na tela
  const guidesMap: Record<string, string> = {}
  for (const row of data ?? []) {
    guidesMap[row.apiname] = row.guide_text
  }

  return NextResponse.json(guidesMap)
}