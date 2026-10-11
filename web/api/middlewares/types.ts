export type ApiContext = {
  params?: Record<string, string>;
  userId?: string;
  role?: "user" | "admin";
};

export type ApiHandler = (
  request: Request,
  context: ApiContext,
) => Response | Promise<Response>;
