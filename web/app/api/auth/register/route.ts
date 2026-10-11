import { registerController } from "@api/controllers/auth.controller";
import { withSecurity } from "@api/middlewares/security.middleware";

const handleRegister = withSecurity(async (request) => {
  return registerController(request);
});

export async function POST(request: Request) {
  return handleRegister(request, {});
}

export async function OPTIONS(request: Request) {
  return handleRegister(request, {});
}
