type PasswordError = {
  code?: string;
  status?: number;
};

export function isPasswordRateLimit(error: PasswordError) {
  return error.status === 429 || [
    "over_request_rate_limit",
    "over_email_send_rate_limit",
    "too_many_requests",
  ].includes(error.code ?? "");
}
