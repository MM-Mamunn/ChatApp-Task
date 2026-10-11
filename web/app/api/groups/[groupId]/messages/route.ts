import {
  getGroupMessagesController,
  sendGroupMessageController,
} from "@api/controllers/chat.controller";
import { withAuth } from "@api/middlewares/auth.middleware";
import { withSecurity } from "@api/middlewares/security.middleware";

const handleGet = withSecurity(withAuth(getGroupMessagesController));
const handlePost = withSecurity(withAuth(sendGroupMessageController));
const handleOptions = withSecurity(
  async () => new Response(null, { status: 204 }),
);

export async function GET(
  request: Request,
  props: { params: Promise<{ groupId: string }> },
) {
  const params = await props.params;
  return handleGet(request, { params });
}

export async function POST(
  request: Request,
  props: { params: Promise<{ groupId: string }> },
) {
  const params = await props.params;
  return handlePost(request, { params });
}

export async function OPTIONS(request: Request) {
  return handleOptions(request, {});
}
