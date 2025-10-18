import { dirname } from 'path';

/**
 * Get the current directory name, handling both production and test environments.
 */
export function getCurrentDirname(): string {
  // In test environment, use process.cwd() as fallback
  if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
    return process.cwd();
  }
  
  try {
    // Use dynamic import to avoid TypeScript compilation issues
    const { fileURLToPath } = eval('require')('url');
    const metaUrl = eval('import.meta.url');
    const filename = fileURLToPath(metaUrl);
    return dirname(filename);
  } catch (error) {
    // Fallback for any environment issues
    return process.cwd();
  }
}