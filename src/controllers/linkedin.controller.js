import axios from "axios";
import { getLinkedinProfile } from "../services/linkedin.service.js";
import LinkedInConnection from "../models/LinkedInConnection.js";


export const linkedinCallback = async (req, res) => {
  try {
    const { code } = req.query;

    console.log("Código recibido:", code);

    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",

      null,

      {
        params: {
          grant_type: "authorization_code",

          code: code,

          client_id: process.env.LINKEDIN_CLIENT_ID,

          client_secret: process.env.LINKEDIN_CLIENT_SECRET,

          redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
        },
      },
    );
    const accessToken = tokenResponse.data.access_token;

    console.log("TOKEN:", accessToken);

    const profile = await getLinkedinProfile(accessToken);

    await LinkedInConnection.findOneAndUpdate(
      {
        email: profile.email,
      },

      {
        linkedinId: profile.sub,

        name: profile.name,

        email: profile.email,

        picture: profile.picture,

        accessToken: accessToken,

        permissions: ["openid", "profile", "email"],

        lastSync: new Date(),
      },

      {
        upsert: true,
        new: true,
      },
    );

    res.redirect(
      `${process.env.FRONTEND_URL}/dashboard?profile=${encodeURIComponent(JSON.stringify(profile))}`,
    );
  } catch (error) {
    console.log(error.response?.data || error.message);

    res.status(500).json({
      error: "Error conectando LinkedIn",
    });
  }
};
