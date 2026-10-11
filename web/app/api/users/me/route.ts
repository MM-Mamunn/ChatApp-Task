import {
  getOwnProfileController,
  updateOwnProfileController,
} from "@api/controllers/users.controller";
import { withAuth } from "@api/middlewares/auth.middleware";
import { withSecurity } from "@api/middlewares/security.middleware";

const handleGet = withSecurity(withAuth(getOwnProfileController));
const handlePatch = withSecurity(withAuth(updateOwnProfileController));
const handleOptions = withSecurity(
  async () => new Response(null, { status: 204 }),
);

export async function GET(request: Request) {
  return handleGet(request, {});
}

export async function PATCH(request: Request) {
  return handlePatch(request, {});
}

export async function OPTIONS(request: Request) {
  return handleOptions(request, {});
}
