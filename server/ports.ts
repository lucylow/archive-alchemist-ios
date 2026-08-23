export const DEFAULT_API_PORT = 3000;

export function parsePreferredPort(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) {
    return DEFAULT_API_PORT;
  }

  const port = Number(value);
  return Number.isInteger(port) && port >= 1 && port <= 65_535 ? port : DEFAULT_API_PORT;
}

