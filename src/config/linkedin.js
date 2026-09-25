export const linkedinConfig = {
  clientId: process.env.LINKEDIN_CLIENT_ID,

  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,

  redirectUri: process.env.LINKEDIN_REDIRECT_URI,

  // "openid profile email" alcanza para el login/perfil. "w_member_social"
  // es el permiso que necesitamos para poder publicar en nombre del
  // cliente -- requiere tener agregado el producto "Share on LinkedIn" en
  // el LinkedIn Developer Portal de esta app (se activa solo, sin revision
  // manual de LinkedIn).
  scope: "openid profile email w_member_social",
};
