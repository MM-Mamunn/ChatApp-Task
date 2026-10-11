import { bootstrapAdminController } from "@api/controllers/auth.controller";
import { withSecurity } from "@api/middlewares/security.middleware";

const handleBootstrapAdmin = withSecurity(async (request) => {
  return bootstrapAdminController(request);
});

export async function POST(request: Request) {
  return handleBootstrapAdmin(request, {});
}

export async function OPTIONS(request: Request) {
  return handleBootstrapAdmin(request, {});
}
