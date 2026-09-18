/**
 * `.md` files import as a plain string — wrangler's `[[rules]]` entry in
 * wrangler.toml (`type = "Text"`) bundles them that way. Confirmed against
 * this exact wrangler version (4.132.0) with a throwaway Worker that
 * imported `docs/PLAYBOOK.md` and served its length; the built bundle
 * carried the real Thai content, not an empty module (`pnpm dev` bundles
 * the same way `wrangler deploy` does, so this is the same path M2's Gate
 * runs on).
 */
declare module '*.md' {
  const content: string;
  export default content;
}
