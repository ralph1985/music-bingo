import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    ADMIN_COMMAND_SECRET: v.string(),
  },
});

export default app;
