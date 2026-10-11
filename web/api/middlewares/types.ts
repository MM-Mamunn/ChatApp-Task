export type ApiContext = {
  params?:
    | Record<string, string | string[] | undefined>
    | Promise<Record<string, string | string[] | undefined>>
    | Promise<Record<string, never>>;
  userId?: string;
  role?: "user" | "admin";
};

export type ApiHandler = (
  request: Request,
  context: ApiContext,
) => Response | Promise<Response>;
