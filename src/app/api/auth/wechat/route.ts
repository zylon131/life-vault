import { NextResponse } from "next/server";
function unavailable() {
  return NextResponse.json(
    { error: "微信登录尚未接入，请使用账号登录。" },
    { status: 503 },
  );
}
export const GET = unavailable;
export const POST = unavailable;
