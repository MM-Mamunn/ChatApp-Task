import { helloController } from "../controllers/hello.controller";

/** GET /api/hello */
export async function handleHelloGet(): Promise<Response> {
  return helloController();
}
