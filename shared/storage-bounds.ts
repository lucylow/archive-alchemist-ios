export const MAX_MEMORY_STORAGE_LENGTH = 64 * 1024;
export const MAX_HISTORY_STORAGE_LENGTH = 256 * 1024;
export const MAX_PLATFORMS_STORAGE_LENGTH = 4 * 1024;
export const MAX_ARCHIVE_STORAGE_LENGTH = 512 * 1024;

export function isWithinStorageLimit(value: string, limit: number): boolean {
  return value.length <= limit;
}
