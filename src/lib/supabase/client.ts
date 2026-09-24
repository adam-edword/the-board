import { createBrowserClient } from "@supabase/ssr";

// url + key are passed down from the server so nothing has to be baked in at build time
export function createClient(url: string, key: string) {
  return createBrowserClient(url, key);
}
