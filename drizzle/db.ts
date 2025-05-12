import { getXataClient } from "@/xata";
import { drizzle } from "drizzle-orm/xata-http";

// connect drizzle and xata
const xata = getXataClient();

export const db = drizzle(xata);
