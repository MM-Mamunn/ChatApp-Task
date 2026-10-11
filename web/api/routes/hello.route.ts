import { helloController } from "../controllers/hello.controller";
import { withSecurity } from "../middlewares/security.middleware";
import type { ApiHandler } from "../middlewares/types";

/** GET /api/hello wrapped with security headers & CORS origin checks */
export const handleHelloGet: ApiHandler = withSecurity(async () => {
  return helloController();
});
