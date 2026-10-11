import { handleHelloGet } from "@api/routes/hello.route";

export async function GET() {
  return handleHelloGet();
}
