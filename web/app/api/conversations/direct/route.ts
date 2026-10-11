import {
  listDirectConversationsController,
  startDirectConversationController,
} from "@api/controllers/chat.controller";
import { withAuth } from "@api/middlewares/auth.middleware";
import { withSecurity } from "@api/middlewares/security.middleware";

const handleGet = withSecurity(withAuth(listDirectConversationsController));
const handlePost = withSecurity(withAuth(startDirectConversationController));
const handleOptions = withSecurity(
  async () => new Response(null, { status: 204 }),
);

export async function GET(request: Request) {
  return handleGet(request, {});
}

export async function POST(request: Request) {
  return handlePost(request, {});
}

export async function OPTIONS(request: Request) {
  return handleOptions(request, {});
}
