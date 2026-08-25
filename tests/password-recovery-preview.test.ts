import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("recovery request retains the form reference across the Supabase await", () => {
  const source = read("app/login/AuthForm.tsx");
  assert.match(source, /const formElement = event\.currentTarget/);
  assert.match(source, /resetPasswordForEmail\(email, \{ redirectTo \}\)/);
  assert.match(source, /formElement\.reset\(\)/);
  assert.doesNotMatch(source, /event\.currentTarget\.reset\(\)/);
});

test("new-password submission retains the form reference across updateUser", () => {
  const source = read("app/nova-senha/PasswordForm.tsx");
  assert.match(source, /const formElement = event\.currentTarget/);
  assert.match(source, /auth\.updateUser\(\{ password \}\)/);
  assert.match(source, /formElement\.reset\(\)/);
  assert.doesNotMatch(source, /event\.currentTarget\.reset\(\)/);
});

test("recovery link targets the Preview origin and reset-password route", () => {
  const request = read("app/login/AuthForm.tsx");
  const reset = read("app/nova-senha/PasswordForm.tsx");
  assert.match(request, /window\.location\.origin\}\/nova-senha/);
  assert.match(reset, /exchangeCodeForSession\(code\)/);
  assert.match(reset, /getSession\(\)/);
});
