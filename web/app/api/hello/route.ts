import { handleHelloGet } from "@api/routes/hello.route";

export async function GET(request: Request) {
  return handleHelloGet(request, {});
}

export async function OPTIONS(request: Request) {
  return handleHelloGet(request, {});
}
