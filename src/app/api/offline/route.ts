import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
export const dynamic = "force-dynamic";
export async function GET() {
  const [lib, template] = await Promise.all([
    readFile(
      path.join(process.cwd(), "node_modules/secrets.js-grempe/secrets.min.js"),
      "utf8",
    ),
    readFile(path.join(process.cwd(), "src/lib/offline-template.html"), "utf8"),
  ]);
  return new NextResponse(template.replace("/*__SECRETS__*/", lib), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
