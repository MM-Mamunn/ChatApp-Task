import { loginController } from "@api/controllers/auth.controller";
import { withSecurity } from "@api/middlewares/security.middleware";

const handleLogin = withSecurity(async (request) => {
  return loginController(request);
});

export async function POST(request: Request) {
  return handleLogin(request, {});
}

export async function OPTIONS(request: Request) {
  return handleLogin(request, {});
}
