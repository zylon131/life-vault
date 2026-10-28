import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "模拟守护接口已停用。" }, { status: 410 });
}
