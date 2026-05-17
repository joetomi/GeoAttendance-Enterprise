/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import sql from "mssql";

const PORT = 3000;
const isProd = process.env.NODE_ENV === "production";

// Database Configuration
const dbConfig: sql.config = {
  server: process.env.DB_SERVER || "SQL1004.site4now.net",
  database: process.env.DB_NAME || "db_ac972b_attendance",
  user: process.env.DB_USER || "db_ac972b_attendance_admin",
  password: process.env.DB_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

let pool: sql.ConnectionPool | null = null;

async function getPool() {
  if (!pool) {
    if (!dbConfig.password) {
      console.warn("DB_PASSWORD is not set. Database features will be limited.");
      return null;
    }
    try {
      pool = await sql.connect(dbConfig);
      console.log("Connected to SQL Server");
      
      // Initialize Tables (Optional - standard for applet setup)
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Employees' AND xtype='U')
        CREATE TABLE Employees (
          id NVARCHAR(50) PRIMARY KEY,
          name NVARCHAR(100),
          email NVARCHAR(100),
          department NVARCHAR(100),
          status NVARCHAR(50),
          avatar NVARCHAR(MAX)
        );
        
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Geofence' AND xtype='U')
        CREATE TABLE Geofence (
          id INT PRIMARY KEY IDENTITY(1,1),
          latitude FLOAT,
          longitude FLOAT,
          radius FLOAT,
          name NVARCHAR(100)
        );
        
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AttendanceLogs' AND xtype='U')
        CREATE TABLE AttendanceLogs (
          id NVARCHAR(50) PRIMARY KEY,
          employeeId NVARCHAR(50),
          timestamp DATETIMEOffset,
          status NVARCHAR(10)
        );

        -- Initialize Default Geofence if empty
        IF NOT EXISTS (SELECT * FROM Geofence)
        INSERT INTO Geofence (latitude, longitude, radius, name) VALUES (34.0522, -118.2437, 200, 'HQ Main Entrance');
      `);
    } catch (err) {
      console.error("Database connection failed:", err);
      return null;
    }
  }
  return pool;
}

// Haversine Distance Calculation (Refined)
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const deltaP = (lat2 - lat1) * Math.PI / 180;
  const deltaL = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaP / 2) * Math.sin(deltaP / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(deltaL / 2) * Math.sin(deltaL / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get("/api/employees", async (req, res) => {
    const db = await getPool();
    if (!db) {
       // Fallback mock for UI demo if no DB
       return res.json([
        { id: "1", name: "Sarah Chen", email: "sarah.c@enterprise.com", department: "Operations", status: "Active", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&h=200&auto=format&fit=crop" },
        { id: "2", name: "Marcus Thompson", email: "m.thompson@enterprise.com", department: "Logistics", status: "Active", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&h=200&auto=format&fit=crop" }
      ]);
    }
    const result = await db.request().query("SELECT * FROM Employees");
    res.json(result.recordset);
  });

  app.post("/api/employees", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    
    const { name, email, department, status, avatar } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    
    await db.request()
      .input("id", sql.NVarChar, id)
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("department", sql.NVarChar, department)
      .input("status", sql.NVarChar, status)
      .input("avatar", sql.NVarChar, avatar)
      .query("INSERT INTO Employees (id, name, email, department, status, avatar) VALUES (@id, @name, @email, @department, @status, @avatar)");
    
    res.status(201).json({ id, name, email, department, status, avatar });
  });

  app.delete("/api/employees/:id", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    await db.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM Employees WHERE id = @id");
    res.status(204).end();
  });

  app.get("/api/geofence", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json({ latitude: 34.0522, longitude: -118.2437, radius: 200, name: "HQ Main Entrance" });
    
    const result = await db.request().query("SELECT TOP 1 * FROM Geofence");
    res.json(result.recordset[0]);
  });

  app.post("/api/geofence", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    
    const { latitude, longitude, radius, name } = req.body;
    await db.request()
      .input("lat", sql.Float, latitude)
      .input("lng", sql.Float, longitude)
      .input("rad", sql.Float, radius)
      .input("name", sql.NVarChar, name)
      .query("UPDATE Geofence SET latitude = @lat, longitude = @lng, radius = @rad, name = @name");
    
    res.json({ latitude, longitude, radius, name });
  });

  app.get("/api/attendance", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json([]);
    const result = await db.request().query("SELECT TOP 50 * FROM AttendanceLogs ORDER BY timestamp DESC");
    res.json(result.recordset);
  });

  app.post("/api/attendance/check-in", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });

    const { employeeId, lat, lng } = req.body;
    
    // Fetch Current Geofence
    const fenceRes = await db.request().query("SELECT TOP 1 * FROM Geofence");
    const geofence = fenceRes.recordset[0];

    // Haversine Calculation
    const distanceMeter = calculateHaversineDistance(geofence.latitude, geofence.longitude, lat, lng);

    if (distanceMeter <= geofence.radius) {
      const id = Math.random().toString(36).substr(2, 9);
      const timestamp = new Date();
      
      await db.request()
        .input("id", sql.NVarChar, id)
        .input("employeeId", sql.NVarChar, employeeId)
        .input("timestamp", sql.DateTimeOffset, timestamp)
        .input("status", sql.NVarChar, "In")
        .query("INSERT INTO AttendanceLogs (id, employeeId, timestamp, status) VALUES (@id, @employeeId, @timestamp, @status)");

      res.json({ success: true, log: { id, employeeId, timestamp, status: "In" } });
    } else {
      res.status(400).json({ success: false, message: `Outside geofence area (Distance: ${Math.round(distanceMeter)}m)` });
    }
  });

  app.post("/api/ai/attendance-summary", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: "Gemini API key not found" });
      
      const db = await getPool();
      let logs = [];
      if (db) {
        const result = await db.request().query("SELECT TOP 20 * FROM AttendanceLogs ORDER BY timestamp DESC");
        logs = result.recordset;
      }
      
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
      });
      
      const prompt = `Based on these attendance logs for today: ${JSON.stringify(logs)}.
      Provide a very brief 1-sentence analytical summary for a manager dashboard.`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      res.json({ summary: response.text });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite/Prod Setup
  if (!isProd) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
