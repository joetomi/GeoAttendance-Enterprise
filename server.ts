/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import sql from "mssql";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { Building2 } from "lucide-react";

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
        
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'email')
          EXEC('ALTER TABLE Employees ADD email NVARCHAR(100)');

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'avatar')
          EXEC('ALTER TABLE Employees ADD avatar NVARCHAR(MAX)');
        
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

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Notifications' AND xtype='U')
        BEGIN
          CREATE TABLE Notifications (
            id NVARCHAR(50) PRIMARY KEY,
            employeeName NVARCHAR(100),
            username NVARCHAR(100),
            department NVARCHAR(100),
            action NVARCHAR(50),
            timestamp DATETIMEOffset,
            isRead BIT DEFAULT 0
          );
        END

        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Departments' AND xtype='U')
        BEGIN
          CREATE TABLE Departments (
            id NVARCHAR(50) PRIMARY KEY,
            name NVARCHAR(100) NOT NULL,
            description NVARCHAR(255),
            color NVARCHAR(20) DEFAULT '#3B82F6'
          );
          
          -- Seed initial departments if none exist
          IF NOT EXISTS (SELECT * FROM Departments)
          BEGIN
            INSERT INTO Departments (id, name, description, color) VALUES 
            ('dept_1', 'Engineering', 'Software and Infrastructure', '#3B82F6'),
            ('dept_2', 'Marketing', 'Growth and Strategy', '#EC4899'),
            ('dept_3', 'Operations', 'Global Logistics', '#10B981');
          END
        END

        -- 4. Initialize Data
        IF NOT EXISTS (SELECT * FROM Geofence)
          INSERT INTO Geofence (latitude, longitude, radius, name) VALUES (34.0522, -118.2437, 200, 'HQ Main Entrance');

        -- Use dynamic SQL to check and insert admin to avoid "Invalid column name 'role'" during batch compile
        EXEC('
          IF NOT EXISTS (SELECT 1 FROM Employees WHERE role = ''admin'')
          BEGIN
            INSERT INTO Employees (id, name, username, password, role, status, department, avatar) 
            VALUES (''admin_1'', ''System Admin'', ''admin'', ''admin123'', ''admin'', ''Active'', ''Security'', ''https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&h=100&auto=format&fit=crop'');
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
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer });

  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // WebSocket connection handling
  wss.on("connection", (ws) => {
    console.log("Client connected to WebSocket");
    ws.on("close", () => console.log("Client disconnected from WebSocket"));
  });

  const broadcastNotification = (payload: any) => {
    const message = JSON.stringify({ type: "notification", payload });
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password } = req.body;

    // Hardcoded Developer Account
    if (username === "joetomi" && password === "sootsafeer01001") {
      return res.json({ id: "dev_1", name: "Developer", role: "dev", username: "joetomi" });
    }

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
        .query("SELECT id, name, role, username, department FROM Employees WHERE username = @username AND password = @password");

      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        
        // Log notification for successful login
        const notificationId = Math.random().toString(36).substr(2, 9);
        const timestamp = new Date();
        const payload = {
          id: notificationId,
          employeeName: user.name,
          username: user.username,
          department: user.department || "General",
          action: "Logged In",
          timestamp: timestamp.toISOString(),
          isRead: false
        };

        db.request()
          .input("id", sql.NVarChar, notificationId)
          .input("name", sql.NVarChar, payload.employeeName)
          .input("user", sql.NVarChar, payload.username)
          .input("dept", sql.NVarChar, payload.department)
          .input("action", sql.NVarChar, payload.action)
          .input("time", sql.DateTimeOffset, timestamp)
          .query("INSERT INTO Notifications (id, employeeName, username, department, action, timestamp) VALUES (@id, @name, @user, @dept, @action, @time)")
          .catch(err => console.error("Failed to log notification:", err));

        broadcastNotification(payload);

        res.json(user);
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
    
    const { name, email, department, status, avatar, username, password, role, requesterRole } = req.body;

    // Guard CEO role: Only dev can create CEO
    if (role === "ceo" && requesterRole !== "dev") {
      return res.status(403).json({ error: "Only developer can create CEO accounts" });
    }

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
      .input("avatar", sql.NVarChar(sql.MAX), avatar)
      .query("INSERT INTO Employees (id, name, username, password, role, email, department, status, avatar) VALUES (@id, @name, @username, @password, @role, @email, @department, @status, @avatar)");
    
    res.status(201).json({ id, name, username, role, email, department, status, avatar });
  });

  app.delete("/api/employees/:id", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    
    const { requesterRole } = req.query;

    try {
      // Check if employee is CEO
      const employeeRes = await db.request().input("id", sql.NVarChar, req.params.id).query("SELECT role FROM Employees WHERE id = @id");
      if (employeeRes.recordset.length > 0 && employeeRes.recordset[0].role === "ceo" && requesterRole !== "dev") {
        return res.status(403).json({ error: "CEO accounts can only be deleted by the developer" });
      }

      // Delete associated logs first
      await db.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM AttendanceLogs WHERE employeeId = @id");
      
      // Delete the employee
      await db.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM Employees WHERE id = @id");
      
      res.status(204).end();
    } catch (err) {
      console.error("Delete failed:", err);
      res.status(500).json({ error: "Failed to delete" });
    }
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

  app.get("/api/attendance/report", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json([]);
    
    const { from, to, employeeId } = req.query;
    let query = `
      SELECT l.*, e.name as employeeName, e.department, e.username
      FROM AttendanceLogs l
      LEFT JOIN Employees e ON l.employeeId = e.id
      WHERE 1=1
    `;
    
    const request = db.request();
    
    if (from) {
      request.input("from", sql.DateTime, new Date(from as string));
      query += " AND l.timestamp >= @from";
    }
    if (to) {
      // Add one day to 'to' to include the full day
      const toDate = new Date(to as string);
      toDate.setDate(toDate.getDate() + 1);
      request.input("to", sql.DateTime, toDate);
      query += " AND l.timestamp < @to";
    }
    if (employeeId && employeeId !== "all") {
      request.input("employeeId", sql.NVarChar, employeeId);
      query += " AND l.employeeId = @employeeId";
    }
    
    query += " ORDER BY l.timestamp ASC";
    
    try {
      const result = await request.query(query);
      res.json(result.recordset);
    } catch (err) {
      console.error("Report query failed:", err);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // --- Payroll & Deductions ---
  app.get("/api/payroll/config/:employeeId", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(500).json({ error: "DB connection failed" });
    const { employeeId } = req.params;
    try {
      const result = await db.request()
        .input("employeeId", sql.NVarChar, employeeId)
        .query("SELECT * FROM PayrollConfigs WHERE employeeId = @employeeId");
      
      if (result.recordset.length === 0) {
        // Return defaults if not set
        return res.json({
          employeeId,
          baseSalary: 0,
          gracePeriodMinutes: 15,
          halfDayThresholdMinutes: 30,
          fullDayThresholdMinutes: 60,
          weekends: "5,6", // Fri, Sat (example for Middle East) or 0,6 for West
          holidays: "[]"
        });
      }
      res.json(result.recordset[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch payroll config" });
    }
  });

  app.post("/api/payroll/config", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(500).json({ error: "DB connection failed" });
    const { employeeId, baseSalary, gracePeriodMinutes, halfDayThresholdMinutes, fullDayThresholdMinutes, weekends, holidays } = req.body;
    
    try {
      await db.request()
        .input("employeeId", sql.NVarChar, employeeId)
        .input("baseSalary", sql.Decimal(18, 2), baseSalary)
        .input("gracePeriodMinutes", sql.Int, gracePeriodMinutes)
        .input("halfDayThresholdMinutes", sql.Int, halfDayThresholdMinutes)
        .input("fullDayThresholdMinutes", sql.Int, fullDayThresholdMinutes)
        .input("weekends", sql.NVarChar, weekends)
        .input("holidays", sql.NVarChar, holidays)
        .query(`
          IF EXISTS (SELECT 1 FROM PayrollConfigs WHERE employeeId = @employeeId)
          BEGIN
            UPDATE PayrollConfigs SET 
              baseSalary = @baseSalary,
              gracePeriodMinutes = @gracePeriodMinutes,
              halfDayThresholdMinutes = @halfDayThresholdMinutes,
              fullDayThresholdMinutes = @fullDayThresholdMinutes,
              weekends = @weekends,
              holidays = @holidays
            WHERE employeeId = @employeeId
          END
          ELSE
          BEGIN
            INSERT INTO PayrollConfigs (employeeId, baseSalary, gracePeriodMinutes, halfDayThresholdMinutes, fullDayThresholdMinutes, weekends, holidays)
            VALUES (@employeeId, @baseSalary, @gracePeriodMinutes, @halfDayThresholdMinutes, @fullDayThresholdMinutes, @weekends, @holidays)
          END
        `);
      res.json({ status: "ok" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to save payroll config" });
    }
  });

  // Helper to ensure PayrollConfigs table exists
  async function initPayrollTable() {
    const db = await getPool();
    if (!db) return;
    await db.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PayrollConfigs' and xtype='U')
      CREATE TABLE PayrollConfigs (
          employeeId NVARCHAR(255) PRIMARY KEY,
          baseSalary DECIMAL(18, 2) DEFAULT 0.00,
          gracePeriodMinutes INT DEFAULT 15,
          halfDayThresholdMinutes INT DEFAULT 30,
          fullDayThresholdMinutes INT DEFAULT 60,
          weekends NVARCHAR(MAX) DEFAULT '5,6',
          holidays NVARCHAR(MAX) DEFAULT '[]'
      )
    `);
  }
  initPayrollTable();

  app.get("/api/attendance", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json([]);
    const result = await db.request().query(`
      SELECT TOP 50 l.*, e.name as employeeName, e.department, e.avatar, e.username, e.role
      FROM AttendanceLogs l
      LEFT JOIN Employees e ON l.employeeId = e.id
      ORDER BY l.timestamp DESC
    `);
    res.json(result.recordset);
  });

  app.get("/api/employees/online", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json([]);
    
    try {
      const result = await db.request().query(`
        WITH LatestLogs AS (
          SELECT employeeId, status, timestamp,
          ROW_NUMBER() OVER (PARTITION BY employeeId ORDER BY timestamp DESC) as rn
          FROM AttendanceLogs
        )
        SELECT e.id, e.name, e.department, e.avatar, e.username
        FROM Employees e
        JOIN LatestLogs l ON e.id = l.employeeId
        WHERE l.rn = 1 AND l.status = 'In'
      `);
      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch online users" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json({ totalEmployees: 0, activeToday: 0, onlineNow: 0, totalLogs: 0 });

    try {
      const stats = await db.request().query(`
        SELECT 
          (SELECT COUNT(*) FROM Employees) as totalEmployees,
          (SELECT COUNT(DISTINCT employeeId) FROM AttendanceLogs WHERE CAST(timestamp AS DATE) = CAST(GETDATE() AS DATE)) as activeToday,
          (SELECT COUNT(*) FROM (
            SELECT employeeId, status, ROW_NUMBER() OVER (PARTITION BY employeeId ORDER BY timestamp DESC) as rn
            FROM AttendanceLogs
          ) l WHERE rn = 1 AND status = 'In') as onlineNow,
          (SELECT COUNT(*) FROM AttendanceLogs) as totalLogs
      `);
      res.json(stats.recordset[0]);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
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
          .input("status", sql.NVarChar, "Out")
          .query("INSERT INTO AttendanceLogs (id, employeeId, timestamp, status) VALUES (@id, @employeeId, @timestamp, @status)");

        res.json({ success: true, log: { id, employeeId, timestamp, status: "Out" } });
      } else {
        res.status(400).json({ success: false, message: `Outside geofence area (Distance: ${Math.round(distanceMeter)}m)` });
      }
    } catch (err) {
      console.error("Check-out error:", err);
      res.status(500).json({ error: "Check-out failed" });
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    const db = await getPool();
    const { name, email, department, role, username, password, avatar, requesterRole } = req.body;
    
    if (!db) {
       console.log("Mock update for employee:", req.params.id);
       return res.json({ id: req.params.id, name, username, role, email, department, status: 'Active', avatar });
    }
    
    try {
      const employeeRes = await db.request().input("id", sql.NVarChar, req.params.id).query("SELECT role FROM Employees WHERE id = @id");
      if (employeeRes.recordset.length === 0) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const existingRole = employeeRes.recordset[0].role;
      if ((role === 'ceo' || existingRole === 'ceo') && requesterRole !== 'dev') {
        if (existingRole !== 'ceo' && role === 'ceo') return res.status(403).json({ error: "Only dev can assign CEO role" });
        if (existingRole === 'ceo' && role !== 'ceo') return res.status(403).json({ error: "Only dev can remove CEO role" });
        if (existingRole === 'ceo' && role === 'ceo' && requesterRole !== 'ceo') return res.status(403).json({ error: "Unauthorized access to CEO account" });
      }

      const hasPass = password && password !== "********" && password.trim() !== "";
      const request = db.request()
        .input("id", sql.NVarChar, req.params.id)
        .input("name", sql.NVarChar, name)
        .input("email", sql.NVarChar, email || `${username}@enterprise.com`)
        .input("dept", sql.NVarChar, department)
        .input("role", sql.NVarChar, role)
        .input("user", sql.NVarChar, username)
        .input("avatar", sql.NVarChar(sql.MAX), avatar);

      if (hasPass) {
        await request.input("pass", sql.NVarChar, password).query(`
          UPDATE Employees SET name=@name, email=@email, department=@dept, role=@role, username=@user, password=@pass, avatar=@avatar WHERE id=@id
        `);
      } else {
        await request.query(`
          UPDATE Employees SET name=@name, email=@email, department=@dept, role=@role, username=@user, avatar=@avatar WHERE id=@id
        `);
      }
      
      res.json({ id: req.params.id, name, username, role, email: email || `${username}@enterprise.com`, department, status: 'Active', avatar });
    } catch (err) {
      console.error("Employee update failed:", err);
      res.status(500).json({ error: "Database update error" });
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

  app.get("/api/notifications", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json([]);
    try {
      const result = await db.request().query("SELECT TOP 50 * FROM Notifications ORDER BY timestamp DESC");
      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/read", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "DB not connected" });
    const { id } = req.body;
    try {
      if (id === "all") {
        await db.request().query("UPDATE Notifications SET isRead = 1");
      } else {
        await db.request().input("id", sql.NVarChar, id).query("UPDATE Notifications SET isRead = 1 WHERE id = @id");
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // Department Routes
  app.get("/api/departments", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json([]);
    try {
      const result = await db.request().query("SELECT * FROM Departments");
      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.post("/api/departments", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "DB not connected" });
    const { id, name, description, color } = req.body;
    try {
      if (id) {
        // Update
        await db.request()
          .input("id", sql.NVarChar, id)
          .input("name", sql.NVarChar, name)
          .input("desc", sql.NVarChar, description)
          .input("color", sql.NVarChar, color)
          .query("UPDATE Departments SET name = @name, description = @desc, color = @color WHERE id = @id");
      } else {
        // Create
        const newId = `dept_${Math.random().toString(36).substr(2, 9)}`;
        await db.request()
          .input("id", sql.NVarChar, newId)
          .input("name", sql.NVarChar, name)
          .input("desc", sql.NVarChar, description)
          .input("color", sql.NVarChar, color)
          .query("INSERT INTO Departments (id, name, description, color) VALUES (@id, @name, @desc, @color)");
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to save department" });
    }
  });

  app.delete("/api/departments/:id", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "DB not connected" });
    const { id } = req.params;
    try {
      await db.request().input("id", sql.NVarChar, id).query("DELETE FROM Departments WHERE id = @id");
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete department" });
    }
  });

  app.get("/api/departments/:id/employees", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json([]);
    const { id } = req.params;
    try {
      // Get department name first
      const deptResult = await db.request().input("id", sql.NVarChar, id).query("SELECT name FROM Departments WHERE id = @id");
      if (deptResult.recordset.length === 0) return res.status(404).json({ error: "Dept not found" });
      const deptName = deptResult.recordset[0].name;

      const result = await db.request()
        .input("dept", sql.NVarChar, deptName)
        .query("SELECT id, name, username, department, avatar, role FROM Employees WHERE department = @dept");
      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch dept employees" });
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
