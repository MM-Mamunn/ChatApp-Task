import { helloController } from "@api/controllers/hello.controller";
import { withSecurity } from "@api/middlewares/security.middleware";

const handleHello = withSecurity(async () => {
  return helloController();
});

export async function GET(request: Request) {
  return handleHello(request, {});
}

export async function OPTIONS(request: Request) {
  return handleHello(request, {});
}
