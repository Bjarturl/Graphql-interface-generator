function submitForm(event, endpoint, redirectParam, authorizationField = "") {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector("button");
  button.disabled = true;
  button.querySelector(".loading-spinner").style.display = "inline-block";

  const formData = new FormData(form);
  const paramValue = formData.get(redirectParam);
  const overwrite = formData.get(form.id === "prismic" ? "overwrite" : "overwrite_prismic") === "on";
  const body = JSON.stringify({
    [redirectParam]: paramValue,
    overwrite: overwrite,
    accessToken: formData.get("accessToken") || null,
  })
  if (authorizationField) {
    body.Authorization = formData.get(authorizationField);
  }
  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  })
    .then((response) => {
      if (response.ok) {
        window.location.href = "/graphql?url=" + encodeURIComponent(paramValue);
      } else {
        alert("Failed to set endpoint.");
      }
    })
    .catch((error) => {
      console.error("There was an error:", error);
      alert("An error occurred while submitting the form.");
    })
    .finally(() => {
      button.disabled = false;
      button.querySelector(".loading-spinner").style.display = "none";
    });
}
