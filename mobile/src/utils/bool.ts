/**
 * Normalize any value to a strict boolean.
 * Prevents "expected dynamic type 'boolean', but had type 'string'" errors
 * in expo-video and other native modules with Fabric/new architecture.
 */
export function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') return v === 'true';
  if (typeof v === 'number') return v !== 0;
  return !!v;
}
