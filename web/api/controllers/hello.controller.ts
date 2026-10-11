import { getHelloMessage } from "../services/hello.service";

export function helloController(): Response {
  const body = getHelloMessage();
  return Response.json(body);
}
