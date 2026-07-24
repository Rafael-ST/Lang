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

export function fetchCurrentUser() {
  return apiRequest("/usuarios/me/");
}

export function updateCurrentUser({ firstName, lastName }) {
  return apiRequest("/usuarios/me/", {
    method: "PATCH",
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
    }),
  });
}

export function deleteCurrentUser() {
  return apiRequest("/usuarios/me/", {
    method: "DELETE",
  });
}

export function uploadCurrentUserPhoto(asset) {
  const formData = new FormData();
  formData.append("photo", {
    uri: asset.uri,
    name: asset.fileName || "profile-photo.jpg",
    type: asset.mimeType || "image/jpeg",
  });

  return apiRequest("/usuarios/me/photo/", {
    method: "POST",
    body: formData,
  });
}

export function deleteCurrentUserPhoto() {
  return apiRequest("/usuarios/me/photo/", {
    method: "DELETE",
  });
}
