import { NextResponse } from "next/server";
function retired() {
  return NextResponse.json(
    { error: "旧版演示接口已停用，请使用有所托的新版本。" },
    { status: 410 },
  );
}
export const GET = retired;
export const POST = retired;
