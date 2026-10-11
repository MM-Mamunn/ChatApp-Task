import { refreshController } from "@api/controllers/auth.controller";
import { withSecurity } from "@api/middlewares/security.middleware";

const handleRefresh = withSecurity(async (request) => {
  return refreshController(request);
});

export async function POST(request: Request) {
  return handleRefresh(request, {});
}

export async function OPTIONS(request: Request) {
  return handleRefresh(request, {});
}
