export const ENV = {
  // Database
  databaseUrl: process.env.DATABASE_URL ?? "",

  // Auth (JWT indipendente)
  cookieSecret: process.env.JWT_SECRET ?? "change-me-in-production",

  // OpenAI (per LLM e Vision)
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o",

  // Cloudinary (per storage immagini)
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY ?? "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET ?? "",

  // App
  isProduction: process.env.NODE_ENV === "production",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",

  // Legacy Manus (non usati su Railway, mantenuti per compatibilità)
  appId: "",
  oAuthServerUrl: "",
  ownerOpenId: "",
  forgeApiUrl: "",
  forgeApiKey: "",
};
