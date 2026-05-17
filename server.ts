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
      
      // Initialize Schema with dynamic SQL to prevent batch compilation errors
      await pool.request().query(`
        -- 1. Ensure Table Exists
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Employees' AND xtype='U')
        BEGIN
          CREATE TABLE Employees (
            id NVARCHAR(50) PRIMARY KEY,
            name NVARCHAR(100),
            email NVARCHAR(100),
            department NVARCHAR(100),
            status NVARCHAR(50),
            avatar NVARCHAR(MAX)
          );
        END

        -- 2. Ensure modern columns exist (using dynamic SQL to avoid compilation errors)
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'username')
          EXEC('ALTER TABLE Employees ADD username NVARCHAR(100)');
        
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'password')
          EXEC('ALTER TABLE Employees ADD password NVARCHAR(100)');
        
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'role')
          EXEC('ALTER TABLE Employees ADD role NVARCHAR(20)');
        
        -- 3. Core structural tables
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Geofence' AND xtype='U')
        BEGIN
          CREATE TABLE Geofence (
            id INT PRIMARY KEY IDENTITY(1,1),
            latitude FLOAT,
            longitude FLOAT,
            radius FLOAT,
            name NVARCHAR(100)
          );
        END
        
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AttendanceLogs' AND xtype='U')
        BEGIN
          CREATE TABLE AttendanceLogs (
            id NVARCHAR(50) PRIMARY KEY,
            employeeId NVARCHAR(50),
            timestamp DATETIMEOffset,
            status NVARCHAR(10)
          );
        END

        -- 4. Initialize Data
        IF NOT EXISTS (SELECT * FROM Geofence)
          INSERT INTO Geofence (latitude, longitude, radius, name) VALUES (34.0522, -118.2437, 200, 'HQ Main Entrance');

        -- Use dynamic SQL to check and insert admin to avoid "Invalid column name 'role'" during batch compile
        EXEC('
          IF NOT EXISTS (SELECT 1 FROM Employees WHERE role = ''admin'')
          BEGIN
            INSERT INTO Employees (id, name, username, password, role, status) 
            VALUES (''admin_1'', ''System Admin'', ''admin'', ''admin123'', ''admin'', ''Active'');
          END
        ');
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
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;
    const db = await getPool();
    
    if (!db) {
       // Fallback for demo if DB not available
       if (username === "admin" && password === "admin123") {
         return res.json({ id: "admin_1", name: "System Admin", role: "admin" });
       }
       if (username === "user" && password === "user123") {
         return res.json({ id: "user_1", name: "Sarah Chen", role: "user" });
       }
       return res.status(401).json({ error: "Invalid credentials (Mock)" });
    }

    try {
      const result = await db.request()
        .input("username", sql.NVarChar, username)
        .input("password", sql.NVarChar, password)
        .query("SELECT id, name, role, username FROM Employees WHERE username = @username AND password = @password");

      if (result.recordset.length > 0) {
        res.json(result.recordset[0]);
      } else {
        res.status(401).json({ error: "Invalid username or password" });
      }
    } catch (err) {
      res.status(500).json({ error: "Database error" });
    }
  });

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
    
    const { name, email, department, status, avatar, username, password, role } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    
    await db.request()
      .input("id", sql.NVarChar, id)
      .input("name", sql.NVarChar, name)
      .input("username", sql.NVarChar, username)
      .input("password", sql.NVarChar, password)
      .input("role", sql.NVarChar, role || 'user')
      .input("email", sql.NVarChar, email)
      .input("department", sql.NVarChar, department)
      .input("status", sql.NVarChar, status)
      .input("avatar", sql.NVarChar, avatar)
      .query("INSERT INTO Employees (id, name, username, password, role, email, department, status, avatar) VALUES (@id, @name, @username, @password, @role, @email, @department, @status, @avatar)");
    
    res.status(201).json({ id, name, username, role, email, department, status, avatar });
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
    try {
      // Robust Upsert for Geofence
      await db.request()
        .input("lat", sql.Float, latitude)
        .input("lng", sql.Float, longitude)
        .input("rad", sql.Float, radius)
        .input("name", sql.NVarChar, name)
        .query(`
          IF EXISTS (SELECT 1 FROM Geofence)
            UPDATE Geofence SET latitude = @lat, longitude = @lng, radius = @rad, name = @name;
          ELSE
            INSERT INTO Geofence (latitude, longitude, radius, name) VALUES (@lat, @lng, @rad, @name);
        `);
      
      res.json({ latitude, longitude, radius, name });
    } catch (err) {
      console.error("Geofence update failed:", err);
      res.status(500).json({ error: "Failed to update configuration" });
    }
  });

  app.get("/api/attendance", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json([]);
    const result = await db.request().query(`
      SELECT TOP 50 l.*, e.name as employeeName, e.department, e.avatar
      FROM AttendanceLogs l
      LEFT JOIN Employees e ON l.employeeId = e.id
      ORDER BY l.timestamp DESC
    `);
    res.json(result.recordset);
  });

  app.get("/api/attendance/status/:employeeId", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json({ status: "Out", note: "Demo Mode" });
    
    try {
      const result = await db.request()
        .input("employeeId", sql.NVarChar, req.params.employeeId)
        .query("SELECT TOP 1 status FROM AttendanceLogs WHERE employeeId = @employeeId ORDER BY timestamp DESC");
      
      if (result.recordset.length > 0) {
        res.json({ status: result.recordset[0].status });
      } else {
        res.json({ status: "Out" });
      }
    } catch (err) {
      console.error("Status fetch failed:", err);
      res.json({ status: "Out", error: "DB Error" });
    }
  });

  app.post("/api/attendance/check-in", async (req, res) => {
    const db = await getPool();
    const { employeeId, lat, lng } = req.body;

    if (!db) {
      // Mock success for demo
      return res.json({ success: true, log: { id: "demo_"+Date.now(), employeeId, timestamp: new Date(), status: "In" } });
    }

    try {
      const fenceRes = await db.request().query("SELECT TOP 1 * FROM Geofence");
      const geofence = fenceRes.recordset[0];

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
    } catch (err) {
      console.error("Check-in error:", err);
      res.status(500).json({ error: "Check-in failed" });
    }
  });

  app.post("/api/attendance/check-out", async (req, res) => {
    const db = await getPool();
    const { employeeId, lat, lng } = req.body;

    if (!db) {
       return res.json({ success: true, log: { id: "demo_"+Date.now(), employeeId, timestamp: new Date(), status: "Out" } });
    }

    try {
      const id = Math.random().toString(36).substr(2, 9);
      const timestamp = new Date();
      
      await db.request()
        .input("id", sql.NVarChar, id)
        .input("employeeId", sql.NVarChar, employeeId)
        .input("timestamp", sql.DateTimeOffset, timestamp)
        .input("status", sql.NVarChar, "Out")
        .query("INSERT INTO AttendanceLogs (id, employeeId, timestamp, status) VALUES (@id, @employeeId, @timestamp, @status)");

      res.json({ success: true, log: { id, employeeId, timestamp, status: "Out" } });
    } catch (err) {
      console.error("Check-out error:", err);
      res.status(500).json({ error: "Check-out failed" });
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    
    const { name, department, role, username, password } = req.body;
    
    try {
      if (password) {
        await db.request()
          .input("id", sql.NVarChar, req.params.id)
          .input("name", sql.NVarChar, name)
          .input("dept", sql.NVarChar, department)
          .input("role", sql.NVarChar, role)
          .input("user", sql.NVarChar, username)
          .input("pass", sql.NVarChar, password)
          .query(`
            UPDATE Employees 
            SET name = @name, department = @dept, role = @role, username = @user, password = @pass
            WHERE id = @id
          `);
      } else {
        await db.request()
          .input("id", sql.NVarChar, req.params.id)
          .input("name", sql.NVarChar, name)
          .input("dept", sql.NVarChar, department)
          .input("role", sql.NVarChar, role)
          .input("user", sql.NVarChar, username)
          .query(`
            UPDATE Employees 
            SET name = @name, department = @dept, role = @role, username = @user
            WHERE id = @id
          `);
      }
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  app.post("/api/auth/update-password", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    
    const { adminId, currentPassword, newPassword } = req.body;
    
    try {
      // Verify current password first
      const checkResult = await db.request()
        .input("id", sql.NVarChar, adminId)
        .input("password", sql.NVarChar, currentPassword)
        .query("SELECT id FROM Employees WHERE id = @id AND password = @password AND role = 'admin'");

      if (checkResult.recordset.length === 0) {
        return res.status(401).json({ error: "Invalid current password" });
      }

      await db.request()
        .input("id", sql.NVarChar, adminId)
        .input("password", sql.NVarChar, newPassword)
        .query("UPDATE Employees SET password = @password WHERE id = @id");
      
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Database error" });
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
