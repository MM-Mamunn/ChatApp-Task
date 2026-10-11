import { updateUserRoleController } from "@api/controllers/admin.controller";
import { withAuth } from "@api/middlewares/auth.middleware";
import { withRoles } from "@api/middlewares/authorize.middleware";
import { withSecurity } from "@api/middlewares/security.middleware";

const handlePatch = withSecurity(
  withAuth(withRoles("admin")(updateUserRoleController)),
);
const handleOptions = withSecurity(
  async () => new Response(null, { status: 204 }),
);

export async function PATCH(
  request: Request,
  props: { params: Promise<{ userEmail: string }> },
) {
  return handlePatch(request, { params: props.params });
}

export async function OPTIONS(request: Request) {
  return handleOptions(request, {});
}
