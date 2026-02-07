export function formatErrorResponse(message: string, details: Record<string, unknown> = {}) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            error: message,
            ...details,
          },
          null,
          2
        ),
      },
    ],
  };
}
