import { apiRequest } from "../../../services/apiClient";

export function createUser({ email, firstName, lastName, password }) {
  return apiRequest("/usuarios/", {
    method: "POST",
    body: JSON.stringify({
      username: email,
      email,
      first_name: firstName,
      last_name: lastName,
      password,
    }),
  });
}
