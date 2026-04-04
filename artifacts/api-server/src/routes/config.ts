import { Router } from "express";

const router = Router();

router.get("/config", (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "",
    groqApiKey: process.env.GROQ_API_KEY || "",
  });
});

export default router;
