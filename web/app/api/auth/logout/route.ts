import { logoutController } from "@api/controllers/auth.controller";
import { withSecurity } from "@api/middlewares/security.middleware";

const handleLogout = withSecurity(async (request) => {
  return logoutController(request);
});

export async function POST(request: Request) {
  return handleLogout(request, {});
}

export async function OPTIONS(request: Request) {
  return handleLogout(request, {});
}
