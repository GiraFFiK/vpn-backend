import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import subscriptionRoutes from "./routes/subscription.routes";
import referralRoutes from "./routes/referral.routes";
import activationRoutes from "./routes/activation.routes";
import starsRoutes from "./routes/stars.routes";

const app = express();

app.use(cors());
app.use(express.json());

// API Routes (с /api)
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/activation", activationRoutes);


// 👇 ДОБАВЬТЕ ЭТИ СТРОКИ - поддержка без /api
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/subscription", subscriptionRoutes);
app.use("/referral", referralRoutes);
app.use("/activation", activationRoutes);

// Добавьте после других маршрутов
app.use("/api/stars", starsRoutes);
app.use("/stars", starsRoutes); // для обратной совместимости

app.get("/health", (_, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

export default app;