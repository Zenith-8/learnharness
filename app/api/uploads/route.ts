/** POST /api/uploads — browser files become server paths (web-pwa fork). */
import { uploadsResponse } from "@/src/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	return uploadsResponse(request);
}
