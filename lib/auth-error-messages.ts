type AuthFailure = {
  code?: string;
  message?: string;
  status?: number;
};

export function getLoginErrorMessage(error: unknown) {
  const failure = typeof error === "object" && error ? error as AuthFailure : {};
  if (
    failure.status === 429 ||
    ["over_request_rate_limit", "too_many_requests"].includes(failure.code ?? "")
  ) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }
  if (failure.code === "invalid_credentials" || failure.message === "Invalid login credentials") {
    return "E-mail ou senha inválidos.";
  }
  return "Não foi possível concluir o login.";
}
