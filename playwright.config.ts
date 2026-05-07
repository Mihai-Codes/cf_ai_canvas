import { defineConfig } from "@playwright/test";

export default defineConfig({
  timeout: 120000,
  expect: {
    timeout: 20000,
  },
});
