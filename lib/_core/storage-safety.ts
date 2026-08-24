export async function readStorageValue(read: () => Promise<string | null>): Promise<string | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

export async function writeStorageValue(write: () => Promise<void>): Promise<void> {
  try {
    await write();
  } catch {
    // Best-effort cache writes should not block the authenticated session.
  }
}

export async function writeRequiredStorageValue(write: () => Promise<void>): Promise<void> {
  await write();
}

export async function removeStorageValue(remove: () => Promise<void>): Promise<void> {
  try {
    await remove();
  } catch {
    // Best-effort cleanup should not block logout or local reset flows.
  }
}
