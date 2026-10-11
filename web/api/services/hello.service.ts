export type HelloResult = {
  success: true;
  message: string;
};

export function getHelloMessage(): HelloResult {
  return {
    success: true,
    message: "Hello World",
  };
}
