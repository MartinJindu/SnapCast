// For Oauth logins i.e google

import { createAuthClient } from "better-auth/react";

export const authClent = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BASE_URL!,
});
