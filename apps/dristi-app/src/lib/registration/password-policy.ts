/**
 * The password policy — REG-40 to REG-44.
 *
 *   REG-40  at least 8 characters
 *   REG-41  not the person's exact mobile number
 *   REG-42  not the person's exact name
 *   REG-43  not the person's exact email address
 *   REG-44  not on a blacklist of common passwords
 *
 * Nothing else: no mandatory uppercase, digit or symbol. Each rule is its own test so
 * the sentence the screen shows and the check the form runs cannot drift apart, and
 * `passwordProblem` reports the *first* failing rule in this order — one message at a
 * time is the whole point of the live hint under the field.
 *
 * The blacklist here is the short local one; the real check belongs on the server
 * against a maintained list. Everything in it is 8+ characters, since shorter entries
 * would already fail REG-40 and never be reached.
 */

export type PasswordRule = "length" | "mobile" | "name" | "email" | "common";

export type PasswordContext = {
  mobile?: string;
  name?: string;
  email?: string;
};

export const MIN_PASSWORD_LENGTH = 8;

const COMMON_PASSWORDS = new Set<string>([
  "password",
  "password1",
  "password123",
  "passw0rd",
  "12345678",
  "123456789",
  "1234567890",
  "123123123",
  "987654321",
  "11111111",
  "00000000",
  "88888888",
  "qwerty123",
  "qwertyuiop",
  "1q2w3e4r",
  "1qaz2wsx",
  "abcd1234",
  "abc12345",
  "abcdefgh",
  "asdfghjk",
  "iloveyou",
  "letmein1",
  "welcome1",
  "welcome123",
  "sunshine",
  "princess",
  "football",
  "baseball",
  "superman",
  "trustno1",
  "whatever",
  "dragon123",
  "monkey123",
  "shadow123",
  "master123",
  "michael1",
  "jennifer",
  "computer",
  "internet",
  "starwars",
  "india123",
  "india@123",
  "kerala123",
  "admin123",
  "admin@123",
  "user1234",
  "test1234",
  "changeme",
  "pass1234",
  "p@ssw0rd",
  "secret123",
  "login123",
  "hello123",
  "google123",
  "samsung1",
  "jio12345",
  "mobile123",
  "krishna1",
  "krishna123",
  "ganesh123",
  "lakshmi1",
  "sairam123",
]);

const squash = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
const digits = (value: string) => value.replace(/\D/g, "");

function isMobile(value: string, mobile: string) {
  const number = digits(mobile);
  if (number.length !== 10) return false;
  const typed = value.trim();
  // The number as typed, with the country code, or with the code and a plus — all
  // three are "the exact mobile number" to the person who typed it.
  return typed === number || typed === `91${number}` || typed === `+91${number}`;
}

export function passwordProblem(
  value: string,
  context: PasswordContext = {},
): PasswordRule | null {
  if (value.length < MIN_PASSWORD_LENGTH) return "length";
  if (context.mobile && isMobile(value, context.mobile)) return "mobile";
  const name = context.name ? squash(context.name) : "";
  if (name && squash(value) === name) return "name";
  const email = context.email ? squash(context.email) : "";
  if (email && squash(value) === email) return "email";
  if (COMMON_PASSWORDS.has(value.toLowerCase())) return "common";
  return null;
}

export const passwordOk = (value: string, context?: PasswordContext) =>
  passwordProblem(value, context) === null;
