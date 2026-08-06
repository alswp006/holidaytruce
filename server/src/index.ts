import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import scriptRouter from "./routes/script";

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGINS = (process.env.CORS_ORIGINS || "https://localhost:3000").split(",").map((s) => s.trim());

// ============================================================================
// CORS Setup: Whitelist allowed origins, allow preflight, deny unauthorized
// ============================================================================
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    if (CORS_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      // Disallow this origin - do not set CORS headers
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));

// Express middleware
app.use(express.json());

// ============================================================================
// Health Check Endpoint
// ============================================================================
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

// ============================================================================
// API Routes
// ============================================================================
app.use("/api", scriptRouter);

// ============================================================================
// Server Listen (if not in test environment)
// ============================================================================
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`CORS origins: ${CORS_ORIGINS.join(", ")}`);
  });
}

export default app;
