const DEFAULT_MAX_MB = 5;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

// PUBLIC_INTERFACE
export function validateImageFile(file, overrideMaxMb) {
  /** Validate file by type and size. */
  if (!file) return { ok: false, message: 'No file provided.' };
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return { ok: false, message: 'Unsupported file type. Please upload a JPG or PNG image.' };
  }
  const maxMb = typeof overrideMaxMb === 'number' && overrideMaxMb > 0 ? overrideMaxMb : DEFAULT_MAX_MB;
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return { ok: false, message: `File is too large. Maximum allowed is ${maxMb}MB.` };
  }
  return { ok: true };
}
