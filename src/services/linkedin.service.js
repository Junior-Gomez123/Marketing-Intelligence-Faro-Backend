import axios from "axios";

export async function getLinkedinProfile(token) {
  const response = await axios.get(
    "https://api.linkedin.com/v2/userinfo",

    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
}
