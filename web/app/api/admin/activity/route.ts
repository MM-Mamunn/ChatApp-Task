import { listActivityLogsController } from "@api/controllers/admin.controller";
import { withAuth } from "@api/middlewares/auth.middleware";
import { withRoles } from "@api/middlewares/authorize.middleware";
import { withSecurity } from "@api/middlewares/security.middleware";

const handleGet = withSecurity(
  withAuth(withRoles("admin")(listActivityLogsController)),
);
const handleOptions = withSecurity(
  async () => new Response(null, { status: 204 }),
);

export async function GET(request: Request) {
  return handleGet(request, {});
}

export async function OPTIONS(request: Request) {
  return handleOptions(request, {});
}
