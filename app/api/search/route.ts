import { source } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

// A static index, built once and searched in the browser.
export const revalidate = false;
export const { staticGET: GET } = createFromSource(source, { language: "english" });
