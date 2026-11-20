import { customAlphabet } from "nanoid";
const nano = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 14);
/** Prefixed, URL-safe ids: ses_, seg_, tho_, con_, rel_, mod_, ver_, chg_, scn_, ast_, act_, evt_ */
export const newId = (prefix: string) => `${prefix}_${nano()}`;
export const nowIso = () => new Date().toISOString();
