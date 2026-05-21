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

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === "production";

// Database Configuration
const dbConfig: sql.config = {
  server: process.env.DB_SERVER || "SQL1004.site4now.net",
  database: process.env.DB_NAME || "db_ac972b_attendance",
  user: process.env.DB_USER || "db_ac972b_attendance_admin",
  password: process.env.DB_PASSWORD || "ghmS4fkiqd@seaU",
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
        
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'companyId')
          EXEC('ALTER TABLE Employees ADD companyId NVARCHAR(50)');

        -- 3. Core structural tables
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Geofence' AND xtype='U')
        BEGIN
          CREATE TABLE Geofence (
            id INT PRIMARY KEY IDENTITY(1,1),
            latitude FLOAT,
            longitude FLOAT,
            radius FLOAT,
            name NVARCHAR(100),
            startTime NVARCHAR(10) DEFAULT '08:00',
            endTime NVARCHAR(10) DEFAULT '17:00'
          );
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Geofence') AND name = 'startTime')
          EXEC('ALTER TABLE Geofence ADD startTime NVARCHAR(10) DEFAULT ''08:00''');
        
        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Geofence') AND name = 'endTime')
          EXEC('ALTER TABLE Geofence ADD endTime NVARCHAR(10) DEFAULT ''17:00''');

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Geofence') AND name = 'companyId')
          EXEC('ALTER TABLE Geofence ADD companyId NVARCHAR(50)');
        
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AttendanceLogs' AND xtype='U')
        BEGIN
          CREATE TABLE AttendanceLogs (
            id NVARCHAR(50) PRIMARY KEY,
            employeeId NVARCHAR(50),
            timestamp DATETIMEOffset,
            status NVARCHAR(10)
          );
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AttendanceLogs') AND name = 'companyId')
          EXEC('ALTER TABLE AttendanceLogs ADD companyId NVARCHAR(50)');

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
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Departments') AND name = 'companyId')
          EXEC('ALTER TABLE Departments ADD companyId NVARCHAR(50)');

        -- New Company table
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Companies' AND xtype='U')
        BEGIN
          CREATE TABLE Companies (
            id NVARCHAR(50) PRIMARY KEY,
            name NVARCHAR(100),
            domain NVARCHAR(100),
            logo NVARCHAR(MAX),
            createdAt DATETIMEOffset
          );
        END

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Companies') AND name = 'planName')
          EXEC('ALTER TABLE Companies ADD planName NVARCHAR(100) DEFAULT ''Standard''');

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Companies') AND name = 'maxEmployees')
          EXEC('ALTER TABLE Companies ADD maxEmployees INT DEFAULT 10');

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Companies') AND name = 'features')
          EXEC('ALTER TABLE Companies ADD features NVARCHAR(MAX) DEFAULT ''Geofences,Departments,Employees''');

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Companies') AND name = 'subDurationMonths')
          EXEC('ALTER TABLE Companies ADD subDurationMonths INT DEFAULT 12');

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Companies') AND name = 'subStartDate')
          EXEC('ALTER TABLE Companies ADD subStartDate NVARCHAR(100) DEFAULT ''''');

        IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Companies') AND name = 'subEndDate')
          EXEC('ALTER TABLE Companies ADD subEndDate NVARCHAR(100) DEFAULT ''''');

        -- Subscription plans table
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='SubscriptionPlans' AND xtype='U')
        BEGIN
          CREATE TABLE SubscriptionPlans (
            id NVARCHAR(50) PRIMARY KEY,
            name NVARCHAR(100),
            durationMonths INT,
            maxEmployees INT,
            features NVARCHAR(MAX),
            createdAt DATETIMEOffset
          );
        END

        -- 4. Initialize Data
        EXEC('
          IF NOT EXISTS (SELECT 1 FROM Companies WHERE id = ''comp-default'')
          BEGIN
            INSERT INTO Companies (id, name, domain, logo, createdAt, planName, maxEmployees, features) 
            VALUES (''comp-default'', ''HQ Main Enterprise'', ''main-hq'', '''', GETDATE(), ''Premium'', 100, ''Geofences,Departments,Employees,HR_Management'');
          END
        ');

        -- Seed initial plans if none exist
        EXEC('
          IF NOT EXISTS (SELECT 1 FROM SubscriptionPlans WHERE id = ''plan-standard'')
          BEGIN
            INSERT INTO SubscriptionPlans (id, name, durationMonths, maxEmployees, features, createdAt)
            VALUES (''plan-standard'', ''Standard Plan / الباقة الأساسية'', 12, 15, ''Geofences,Departments,Employees'', GETDATE());
          END
          IF NOT EXISTS (SELECT 1 FROM SubscriptionPlans WHERE id = ''plan-premium'')
          BEGIN
            INSERT INTO SubscriptionPlans (id, name, durationMonths, maxEmployees, features, createdAt)
            VALUES (''plan-premium'', ''Premium Plan / الباقة البريميوم'', 12, 100, ''Geofences,Departments,Employees,HR_Management'', GETDATE());
          END
        ');

        EXEC('
          UPDATE Employees SET companyId = ''comp-default'' WHERE companyId IS NULL;
          UPDATE AttendanceLogs SET companyId = ''comp-default'' WHERE companyId IS NULL;
          UPDATE Departments SET companyId = ''comp-default'' WHERE companyId IS NULL;
          UPDATE Geofence SET companyId = ''comp-default'' WHERE companyId IS NULL;
        ');

        -- Seed initial departments if none exist for default company
        EXEC('
          IF NOT EXISTS (SELECT * FROM Departments WHERE companyId = ''comp-default'')
          BEGIN
            INSERT INTO Departments (id, name, description, color, companyId) VALUES 
            (''dept_1'', ''Engineering'', ''Software and Infrastructure'', ''#3B82F6'', ''comp-default''),
            (''dept_2'', ''Marketing'', ''Growth and Strategy'', ''#EC4899'', ''comp-default''),
            (''dept_3'', ''Operations'', ''Global Logistics'', ''#10B981'', ''comp-default'');
          END
        ');

        EXEC('
          IF NOT EXISTS (SELECT * FROM Geofence WHERE companyId = ''comp-default'')
            INSERT INTO Geofence (latitude, longitude, radius, name, startTime, endTime, companyId) VALUES (34.0522, -118.2437, 200, ''HQ Main Entrance'', ''08:00'', ''17:00'', ''comp-default'');
        ');

        -- Use dynamic SQL to check and insert admin to avoid "Invalid column name 'role'" during batch compile
        EXEC('
          IF NOT EXISTS (SELECT 1 FROM Employees WHERE role = ''admin'')
          BEGIN
            INSERT INTO Employees (id, name, username, password, role, status, department, avatar, companyId) 
            VALUES (''admin_1'', ''System Admin'', ''admin'', ''admin123'', ''admin'', ''Active'', ''Security'', ''https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&h=100&auto=format&fit=crop'', ''comp-default'');
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

function isTimeWithinWorkingHours(startTime: string = "08:00", endTime: string = "17:00"): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Tripoli',
      hour: 'numeric',
      minute: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(new Date());
    let hour = 0;
    let minute = 0;
    for (const part of parts) {
      if (part.type === 'hour') hour = parseInt(part.value, 10);
      if (part.type === 'minute') minute = parseInt(part.value, 10);
    }
    
    const [startHStr, startMStr] = startTime.split(":");
    const [endHStr, endMStr] = endTime.split(":");
    const startH = parseInt(startHStr, 10);
    const startM = parseInt(startMStr, 10);
    const endH = parseInt(endHStr, 10);
    const endM = parseInt(endMStr, 10);

    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    const currentTotal = hour * 60 + minute;

    return currentTotal >= startTotal && currentTotal <= endTotal;
  } catch (err) {
    console.error("Error checking working hours timezone:", err);
    return true; // Fallback to true on error to avoid blocking
  }
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
        .query(`
          SELECT e.id, e.name, e.role, e.username, e.department, e.avatar, e.companyId, 
                 c.name as companyName, c.planName, c.maxEmployees, c.features
          FROM Employees e
          LEFT JOIN Companies c ON e.companyId = c.id
          WHERE e.username = @username AND e.password = @password
        `);

      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        
        // Empty existing notifications list upon successful login as requested by the user
        try {
          await db.request().query("DELETE FROM Notifications");
        } catch (clearErr) {
          console.error("Failed to empty notifications on login:", clearErr);
        }
        
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
        { id: "1", name: "Sarah Chen", email: "sarah.c@enterprise.com", department: "Operations", status: "Active", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=200&h=200&auto=format&fit=crop", companyId: "comp-default" },
        { id: "2", name: "Marcus Thompson", email: "m.thompson@enterprise.com", department: "Logistics", status: "Active", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&h=200&auto=format&fit=crop", companyId: "comp-default" }
      ]);
    }
    const companyId = req.headers["x-company-id"] || req.query.companyId;
    let query = "SELECT * FROM Employees";
    const request = db.request();
    if (companyId) {
      request.input("companyId", sql.NVarChar, companyId);
      query += " WHERE companyId = @companyId";
    }
    const result = await request.query(query);
    res.json(result.recordset);
  });

  app.post("/api/employees", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    
    const { name, email, department, status, avatar, username, password, role, requesterRole } = req.body;
    const companyId = req.headers["x-company-id"] || req.query.companyId || req.body.companyId || "comp-default";

    // Guard CEO role: Only dev can create CEO
    if (role === "ceo" && requesterRole !== "dev") {
      return res.status(403).json({ error: "Only developer can create CEO accounts" });
    }

    // 1. Username uniqueness check database-wide
    try {
      const usernameCheck = await db.request()
        .input("username", sql.NVarChar, username)
        .query("SELECT id FROM Employees WHERE username = @username");
      if (usernameCheck.recordset.length > 0) {
        return res.status(400).json({ 
          error: "اسم المستخدم مأخوذ بالفعل! الرجاء اختيار اسم مستخدم آخر وذكّور.",
          errorEn: "Username is already taken! Please choose another username." 
        });
      }
    } catch (checkErr) {
      console.error("Username uniqueness check failed:", checkErr);
    }

    // 2. Max employee limits enforcement per company
    try {
      const companyRes = await db.request()
        .input("companyId", sql.NVarChar, companyId)
        .query("SELECT maxEmployees FROM Companies WHERE id = @companyId");
      
      if (companyRes.recordset.length > 0) {
        const { maxEmployees } = companyRes.recordset[0];
        
        // Count existing employees in the company (excluding 'dev' role which doesn't count towards client quota)
        const countRes = await db.request()
          .input("companyId", sql.NVarChar, companyId)
          .query("SELECT COUNT(*) as count FROM Employees WHERE companyId = @companyId AND role <> 'dev'");
        
        const currentCount = countRes.recordset[0].count;
        if (currentCount >= maxEmployees) {
          return res.status(400).json({
            error: `لقد تجاوزت هذه المنشأة الحد الأقصى للموظفين المسموح به في باقة الاشتراك (${maxEmployees} موظف). يرجى الترقية لإضافة موظف آخر.`,
            errorEn: `This company has exceeded its subscription employee limit of ${maxEmployees}. Please upgrade subscription to add more employees.`
          });
        }
      }
    } catch (limitErr) {
      console.error("Employee limit check failed:", limitErr);
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
      .input("companyId", sql.NVarChar, companyId)
      .query("INSERT INTO Employees (id, name, username, password, role, email, department, status, avatar, companyId) VALUES (@id, @name, @username, @password, @role, @email, @department, @status, @avatar, @companyId)");
    
    res.status(201).json({ id, name, username, role, email, department, status, avatar, companyId });
  });

  app.delete("/api/employees/:id", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    
    const { requesterRole } = req.query;

    try {
      // Check target employee role
      const employeeRes = await db.request().input("id", sql.NVarChar, req.params.id).query("SELECT role FROM Employees WHERE id = @id");
      if (employeeRes.recordset.length > 0) {
        const targetRole = employeeRes.recordset[0].role;
        if (targetRole === "ceo" && requesterRole !== "dev") {
          return res.status(403).json({ error: "CEO accounts can only be deleted by the developer" });
        }
        if (targetRole === "admin" && requesterRole === "admin") {
          return res.status(403).json({ error: "لا يمكن للادمنز حذف بعضهم البعض، فقط الـ CEO يمكنه ذلك." });
        }
      }

      // Delete associated logs (safely catch any errors)
      try {
        await db.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM AttendanceLogs WHERE employeeId = @id");
      } catch (logErr) {
        console.warn("Harmless error deleting employee attendance logs:", logErr);
      }
      
      // Delete associated payroll configs (safely catch any errors)
      try {
        await db.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM PayrollConfigs WHERE employeeId = @id");
      } catch (payrollErr) {
        console.warn("Harmless error deleting employee payroll configurations:", payrollErr);
      }
      
      // Delete the employee
      await db.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM Employees WHERE id = @id");
      
      res.status(204).end();
    } catch (err: any) {
      console.error("Delete failed:", err);
      res.status(500).json({ error: `Failed to delete: ${err && err.message ? err.message : String(err)}` });
    }
  });

  app.get("/api/geofence", async (req, res) => {
    const db = await getPool();
    const companyId = req.headers["x-company-id"] || req.query.companyId || "comp-default";
    if (!db) return res.json({ latitude: 34.0522, longitude: -118.2437, radius: 200, name: "HQ Main Entrance", startTime: "08:00", endTime: "17:00", companyId });
    
    const result = await db.request()
      .input("companyId", sql.NVarChar, companyId)
      .query("SELECT TOP 1 * FROM Geofence WHERE companyId = @companyId");
    if (result.recordset.length > 0) {
      res.json({
        latitude: 34.0522,
        longitude: -118.2437,
        radius: 200,
        name: "HQ Main Entrance",
        startTime: "08:00",
        endTime: "17:00",
        ...result.recordset[0]
      });
    } else {
      res.json({ latitude: 34.0522, longitude: -118.2437, radius: 200, name: "HQ Main Entrance", startTime: "08:00", endTime: "17:00", companyId });
    }
  });

  app.post("/api/geofence", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    
    const { latitude, longitude, radius, name, startTime, endTime } = req.body;
    const companyId = req.headers["x-company-id"] || req.query.companyId || "comp-default";
    try {
      // Robust Upsert for Geofence
      await db.request()
        .input("lat", sql.Float, latitude)
        .input("lng", sql.Float, longitude)
        .input("rad", sql.Float, radius)
        .input("name", sql.NVarChar, name)
        .input("start", sql.NVarChar, startTime || "08:00")
        .input("end", sql.NVarChar, endTime || "17:00")
        .input("companyId", sql.NVarChar, companyId)
        .query(`
          IF EXISTS (SELECT 1 FROM Geofence WHERE companyId = @companyId)
            UPDATE Geofence SET latitude = @lat, longitude = @lng, radius = @rad, name = @name, startTime = @start, endTime = @end WHERE companyId = @companyId;
          ELSE
            INSERT INTO Geofence (latitude, longitude, radius, name, startTime, endTime, companyId) VALUES (@lat, @lng, @rad, @name, @start, @end, @companyId);
        `);
      
      res.json({ latitude, longitude, radius, name, startTime: startTime || "08:00", endTime: endTime || "17:00", companyId });
    } catch (err) {
      console.error("Geofence update failed:", err);
      res.status(500).json({ error: "Failed to update configuration" });
    }
  });

  app.get("/api/attendance/report", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json([]);
    
    const { from, to, employeeId } = req.query;
    const companyId = req.headers["x-company-id"] || req.query.companyId;
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
    if (companyId) {
      request.input("companyId", sql.NVarChar, companyId);
      query += " AND l.companyId = @companyId";
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
    const companyId = req.headers["x-company-id"] || req.query.companyId;
    let query = `
      SELECT TOP 50 l.*, e.name as employeeName, e.department, e.avatar, e.username, e.role
      FROM AttendanceLogs l
      LEFT JOIN Employees e ON l.employeeId = e.id
    `;
    const request = db.request();
    if (companyId) {
      request.input("companyId", sql.NVarChar, companyId);
      query += " WHERE l.companyId = @companyId";
    }
    query += " ORDER BY l.timestamp DESC";
    try {
      const result = await request.query(query);
      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch attendance logs" });
    }
  });

  app.get("/api/employees/online", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json([]);
    const companyId = req.headers["x-company-id"] || req.query.companyId;
    
    try {
      let query = `
        WITH LatestLogs AS (
          SELECT employeeId, status, timestamp, companyId,
          ROW_NUMBER() OVER (PARTITION BY employeeId ORDER BY timestamp DESC) as rn
          FROM AttendanceLogs
        )
        SELECT e.id, e.name, e.department, e.avatar, e.username
        FROM Employees e
        JOIN LatestLogs l ON e.id = l.employeeId
        WHERE l.rn = 1 AND l.status = 'In'
      `;
      const request = db.request();
      if (companyId) {
        request.input("companyId", sql.NVarChar, companyId);
        query += " AND e.companyId = @companyId AND l.companyId = @companyId";
      }
      const result = await request.query(query);
      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch online users" });
    }
  });

  app.get("/api/stats", async (req, res) => {
    const db = await getPool();
    const companyId = req.headers["x-company-id"] || req.query.companyId;
    if (!db) return res.json({ totalEmployees: 0, activeToday: 0, onlineNow: 0, totalLogs: 0 });

    try {
      let queryEmployeeCount = "SELECT COUNT(*) as value FROM Employees";
      let queryActiveToday = "SELECT COUNT(DISTINCT employeeId) as value FROM AttendanceLogs WHERE CAST(timestamp AS DATE) = CAST(GETDATE() AS DATE)";
      let queryOnlineNow = `
        SELECT COUNT(*) as value FROM (
          SELECT employeeId, status, ROW_NUMBER() OVER (PARTITION BY employeeId ORDER BY timestamp DESC) as rn, companyId
          FROM AttendanceLogs
        ) l WHERE rn = 1 AND status = 'In'
      `;
      let queryTotalLogs = "SELECT COUNT(*) as value FROM AttendanceLogs";

      if (companyId) {
        queryEmployeeCount += " WHERE companyId = @companyId";
        queryActiveToday += " AND companyId = @companyId";
        queryOnlineNow += " AND companyId = @companyId";
        queryTotalLogs += " WHERE companyId = @companyId";
      }

      const reqEmployee = db.request();
      const reqActive = db.request();
      const reqOnline = db.request();
      const reqTotal = db.request();

      if (companyId) {
        reqEmployee.input("companyId", sql.NVarChar, companyId);
        reqActive.input("companyId", sql.NVarChar, companyId);
        reqOnline.input("companyId", sql.NVarChar, companyId);
        reqTotal.input("companyId", sql.NVarChar, companyId);
      }

      const [resEmp, resAct, resOn, resTot] = await Promise.all([
        reqEmployee.query(queryEmployeeCount),
        reqActive.query(queryActiveToday),
        reqOnline.query(queryOnlineNow),
        reqTotal.query(queryTotalLogs)
      ]);

      res.json({
        totalEmployees: resEmp.recordset[0]?.value || 0,
        activeToday: resAct.recordset[0]?.value || 0,
        onlineNow: resOn.recordset[0]?.value || 0,
        totalLogs: resTot.recordset[0]?.value || 0
      });
    } catch (err) {
      console.error("Stats query failed:", err);
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

    let companyId = "comp-default";
    let geofence = { startTime: "08:00", endTime: "17:00", latitude: 34.0522, longitude: -118.2437, radius: 200, name: "HQ Main Entrance" };
    
    if (db) {
       try {
         const empRes = await db.request().input("empId", sql.NVarChar, employeeId).query("SELECT companyId FROM Employees WHERE id = @empId");
         if (empRes.recordset.length > 0 && empRes.recordset[0].companyId) {
           companyId = empRes.recordset[0].companyId;
         }
       } catch (err) {
         console.error("Failed to find employee company during check-in:", err);
       }

       try {
         const fenceRes = await db.request().input("companyId", sql.NVarChar, companyId).query("SELECT TOP 1 * FROM Geofence WHERE companyId = @companyId");
         if (fenceRes.recordset.length > 0) {
           geofence = { ...geofence, ...fenceRes.recordset[0] };
         }
       } catch (err) {
         console.error("Failed to fetch geofence for check-in:", err);
       }
    }

    if (!isTimeWithinWorkingHours(geofence.startTime, geofence.endTime)) {
      return res.status(400).json({ success: false, message: "بصمه خارج وقت العمل" });
    }

    if (!db) {
      // Mock success for demo
      return res.json({ success: true, log: { id: "demo_"+Date.now(), employeeId, timestamp: new Date(), status: "In", companyId } });
    }

    try {
      const distanceMeter = calculateHaversineDistance(geofence.latitude, geofence.longitude, lat, lng);

      if (distanceMeter <= geofence.radius) {
        const id = Math.random().toString(36).substr(2, 9);
        const timestamp = new Date();
        
        await db.request()
          .input("id", sql.NVarChar, id)
          .input("employeeId", sql.NVarChar, employeeId)
          .input("timestamp", sql.DateTimeOffset, timestamp)
          .input("status", sql.NVarChar, "In")
          .input("companyId", sql.NVarChar, companyId)
          .query("INSERT INTO AttendanceLogs (id, employeeId, timestamp, status, companyId) VALUES (@id, @employeeId, @timestamp, @status, @companyId)");

        res.json({ success: true, log: { id, employeeId, timestamp, status: "In", companyId } });
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

    let companyId = "comp-default";
    let geofence = { startTime: "08:00", endTime: "17:00", latitude: 34.0522, longitude: -118.2437, radius: 200, name: "HQ Main Entrance" };

    if (!db) {
       return res.json({ success: true, log: { id: "demo_"+Date.now(), employeeId, timestamp: new Date(), status: "Out", companyId } });
    }

    try {
      try {
        const empRes = await db.request().input("empId", sql.NVarChar, employeeId).query("SELECT companyId FROM Employees WHERE id = @empId");
        if (empRes.recordset.length > 0 && empRes.recordset[0].companyId) {
          companyId = empRes.recordset[0].companyId;
        }
      } catch (err) {
        console.error("Failed to find employee company during check-out:", err);
      }

      const fenceRes = await db.request().input("companyId", sql.NVarChar, companyId).query("SELECT TOP 1 * FROM Geofence WHERE companyId = @companyId");
      if (fenceRes.recordset.length > 0) {
        geofence = { ...geofence, ...fenceRes.recordset[0] };
      }

      const distanceMeter = calculateHaversineDistance(geofence.latitude, geofence.longitude, lat, lng);

      if (distanceMeter <= geofence.radius) {
        const id = Math.random().toString(36).substr(2, 9);
        const timestamp = new Date();
        
        await db.request()
          .input("id", sql.NVarChar, id)
          .input("employeeId", sql.NVarChar, employeeId)
          .input("timestamp", sql.DateTimeOffset, timestamp)
          .input("status", sql.NVarChar, "Out")
          .input("companyId", sql.NVarChar, companyId)
          .query("INSERT INTO AttendanceLogs (id, employeeId, timestamp, status, companyId) VALUES (@id, @employeeId, @timestamp, @status, @companyId)");

        res.json({ success: true, log: { id, employeeId, timestamp, status: "Out", companyId } });
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
      if (existingRole === 'admin' && requesterRole === 'admin' && req.params.id !== req.body.currentUserId && req.params.id !== req.body.id) {
        return res.status(403).json({ error: "لا يمكن للادمنز تعديل بعضهم البعض، فقط الـ CEO يمكنه تعديلهم." });
      }

      if ((role === 'ceo' || existingRole === 'ceo') && requesterRole !== 'dev') {
        if (existingRole !== 'ceo' && role === 'ceo') return res.status(403).json({ error: "Only dev can assign CEO role" });
        if (existingRole === 'ceo' && role !== 'ceo') return res.status(403).json({ error: "Only dev can remove CEO role" });
        if (existingRole === 'ceo' && role === 'ceo' && requesterRole !== 'ceo') return res.status(403).json({ error: "Unauthorized access to CEO account" });
      }

      // Check username uniqueness
      const usernameCheck = await db.request()
        .input("username", sql.NVarChar, username)
        .input("id", sql.NVarChar, req.params.id)
        .query("SELECT id FROM Employees WHERE username = @username AND id <> @id");
      if (usernameCheck.recordset.length > 0) {
        return res.status(400).json({ 
          error: "اسم المستخدم مأخوذ بالفعل! الرجاء اختيار اسم مستخدم آخر وذكّور.",
          errorEn: "Username is already taken! Please choose another username." 
        });
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

  // --- Developer Dashboard Route ---
  app.get("/api/dev/dashboard", async (req, res) => {
    const db = await getPool();
    if (!db) {
      // Mock stats when database is not connected
      return res.json({
        employeeCounts: [
          { companyId: "comp-default", companyName: "HQ Main Enterprise", count: 8 },
          { companyId: "comp-almarai", companyName: "Almarai Co.", count: 12 },
          { companyId: "comp-aramco", companyName: "Saudi Aramco", count: 25 },
        ],
        attendanceHistory: [
          { date: "2026-05-15", "HQ Main Enterprise": 4, "Almarai Co.": 8, "Saudi Aramco": 18 },
          { date: "2026-05-16", "HQ Main Enterprise": 5, "Almarai Co.": 10, "Saudi Aramco": 20 },
          { date: "2026-05-17", "HQ Main Enterprise": 3, "Almarai Co.": 9, "Saudi Aramco": 15 },
          { date: "2026-05-18", "HQ Main Enterprise": 6, "Almarai Co.": 11, "Saudi Aramco": 22 },
          { date: "2026-05-19", "HQ Main Enterprise": 7, "Almarai Co.": 12, "Saudi Aramco": 24 },
          { date: "2026-05-20", "HQ Main Enterprise": 8, "Almarai Co.": 12, "Saudi Aramco": 25 },
        ],
        recentLogs: [
          { id: "101", employeeId: "emp-1", employeeName: "Ahmad Al-Qahtani", department: "Engineering", timestamp: "2026-05-20T08:05:00Z", status: "In", companyId: "comp-aramco" },
          { id: "102", employeeId: "emp-2", employeeName: "Faris Salem", department: "Logistics", timestamp: "2026-05-20T08:12:00Z", status: "In", companyId: "comp-almarai" },
          { id: "103", employeeId: "emp-3", employeeName: "Khaled Ali", department: "Operations", timestamp: "2026-05-20T08:15:00Z", status: "In", companyId: "comp-default" },
          { id: "104", employeeId: "emp-4", employeeName: "Saeed Omar", department: "Engineering", timestamp: "2026-05-20T12:01:00Z", status: "Out", companyId: "comp-aramco" },
        ],
        employeesList: [
          { id: "emp-1", name: "Ahmad Al-Qahtani", email: "a.qahtani@aramco.com", department: "Engineering", status: "Active", companyId: "comp-aramco" },
          { id: "emp-2", name: "Faris Salem", email: "f.salem@almarai.com", department: "Logistics", status: "Active", companyId: "comp-almarai" },
          { id: "emp-3", name: "Khaled Ali", email: "k.ali@hq.com", department: "Operations", status: "Active", companyId: "comp-default" },
        ]
      });
    }

    try {
      // 1. Fetch Companies so we can map names
      const compRes = await db.request().query("SELECT * FROM Companies");
      const companies = compRes.recordset;

      // 2. Count Employees per company
      const empCountRes = await db.request().query(`
        SELECT companyId, COUNT(*) as count 
        FROM Employees 
        GROUP BY companyId
      `);
      const empCountsRaw = empCountRes.recordset;

      // Map counts with corporate names
      const employeeCounts = companies.map(c => {
        const found = empCountsRaw.find(r => r.companyId === c.id);
        return {
          companyId: c.id,
          companyName: c.name,
          count: found ? found.count : 0
        };
      });

      // 3. Attendance Logs timeline grouping
      const timelineRes = await db.request().query(`
        SELECT 
          CONVERT(VARCHAR(10), l.timestamp, 120) as date, 
          l.companyId, 
          COUNT(*) as loginCount
        FROM AttendanceLogs l
        WHERE l.status = 'In'
        GROUP BY CONVERT(VARCHAR(10), l.timestamp, 120), l.companyId
        ORDER BY date ASC
      `);
      const timelineRaw = timelineRes.recordset;

      // Reorganize formatting to make it chart-friendly (e.g. { date: '2026-05-19', 'Company A': 5, 'Company B': 7 })
      const distinctDates = Array.from(new Set(timelineRaw.map(r => r.date))).sort();
      const attendanceHistory = distinctDates.map(date => {
        const entry: any = { date };
        companies.forEach(comp => {
          const match = timelineRaw.find(r => r.date === date && r.companyId === comp.id);
          entry[comp.name] = match ? match.loginCount : 0;
        });
        return entry;
      });

      // 4. Recent flat logs for all companies
      const logsRes = await db.request().query(`
        SELECT TOP 100 l.id, l.employeeId, l.timestamp, l.status, l.companyId, 
               e.name as employeeName, e.department, e.avatar
        FROM AttendanceLogs l
        LEFT JOIN Employees e ON l.employeeId = e.id
        ORDER BY l.timestamp DESC
      `);
      const recentLogs = logsRes.recordset;

      // 5. Employees flat list for filtering inside details
      const employeesRes = await db.request().query("SELECT id, name, email, department, status, avatar, companyId FROM Employees");
      const employeesList = employeesRes.recordset;

      res.json({
        employeeCounts,
        attendanceHistory,
        recentLogs,
        employeesList
      });
    } catch (err) {
      console.error("Failed to construct dev dashboard stats:", err);
      res.status(500).json({ error: "Failed to generate developer dashboard metrics" });
    }
  });

  // --- Companies Routes ---
  app.get("/api/companies", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json([{ id: "comp-default", name: "HQ Main Enterprise", domain: "main-hq", logo: "" }]);
    try {
      const result = await db.request().query("SELECT * FROM Companies ORDER BY createdAt DESC");
      res.json(result.recordset);
    } catch (err) {
      console.error("Failed to fetch companies:", err);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.post("/api/companies", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    const { 
      name, 
      domain, 
      logo, 
      planName = "Standard", 
      maxEmployees = 15, 
      features = "Geofences,Departments,Employees", 
      subDurationMonths = 12, 
      subStartDate = new Date().toISOString().split("T")[0], 
      subEndDate = "" 
    } = req.body;
    
    let calculatedEndDate = subEndDate;
    if (!calculatedEndDate && subStartDate && subDurationMonths) {
      try {
        const start = new Date(subStartDate);
        start.setMonth(start.getMonth() + parseInt(String(subDurationMonths), 10));
        calculatedEndDate = start.toISOString().split("T")[0];
      } catch (e) {
        calculatedEndDate = "";
      }
    }

    const id = "comp-" + Math.random().toString(36).substr(2, 9);
    try {
      await db.request()
        .input("id", sql.NVarChar, id)
        .input("name", sql.NVarChar, name)
        .input("domain", sql.NVarChar, domain)
        .input("logo", sql.NVarChar(sql.MAX), logo || "")
        .input("plan", sql.NVarChar, planName)
        .input("maxEmp", sql.Int, parseInt(String(maxEmployees), 10))
        .input("feats", sql.NVarChar, features)
        .input("dur", sql.Int, parseInt(String(subDurationMonths), 10))
        .input("start", sql.NVarChar, subStartDate)
        .input("end", sql.NVarChar, calculatedEndDate)
        .query(`
          INSERT INTO Companies (
            id, name, domain, logo, createdAt, planName, maxEmployees, features, subDurationMonths, subStartDate, subEndDate
          ) VALUES (
            @id, @name, @domain, @logo, GETDATE(), @plan, @maxEmp, @feats, @dur, @start, @end
          )
        `);
      
      // Auto-create a default geofence configuration for this new company so they have one
      await db.request()
        .input("companyId", sql.NVarChar, id)
        .query("INSERT INTO Geofence (latitude, longitude, radius, name, startTime, endTime, companyId) VALUES (34.0522, -118.2437, 200, 'HQ Main Entrance', '08:00', '17:00', @companyId)");

      res.status(201).json({ id, name, domain, logo, planName, maxEmployees, features, subDurationMonths, subStartDate, subEndDate: calculatedEndDate });
    } catch (err) {
      console.error("Failed to create company:", err);
      res.status(500).json({ error: "Failed to create company" });
    }
  });

  app.put("/api/companies/:id", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    const { 
      name, 
      domain, 
      logo, 
      planName = "Standard", 
      maxEmployees = 15, 
      features = "Geofences,Departments,Employees", 
      subDurationMonths = 12, 
      subStartDate = new Date().toISOString().split("T")[0], 
      subEndDate = "" 
    } = req.body;

    let calculatedEndDate = subEndDate;
    if (!calculatedEndDate && subStartDate && subDurationMonths) {
      try {
        const start = new Date(subStartDate);
        start.setMonth(start.getMonth() + parseInt(String(subDurationMonths), 10));
        calculatedEndDate = start.toISOString().split("T")[0];
      } catch (e) {
        calculatedEndDate = "";
      }
    }

    try {
      await db.request()
        .input("id", sql.NVarChar, req.params.id)
        .input("name", sql.NVarChar, name)
        .input("domain", sql.NVarChar, domain)
        .input("logo", sql.NVarChar(sql.MAX), logo || "")
        .input("plan", sql.NVarChar, planName)
        .input("maxEmp", sql.Int, parseInt(String(maxEmployees), 10))
        .input("feats", sql.NVarChar, features)
        .input("dur", sql.Int, parseInt(String(subDurationMonths), 10))
        .input("start", sql.NVarChar, subStartDate)
        .input("end", sql.NVarChar, calculatedEndDate)
        .query(`
          UPDATE Companies SET 
            name = @name, 
            domain = @domain, 
            logo = @logo,
            planName = @plan,
            maxEmployees = @maxEmp,
            features = @feats,
            subDurationMonths = @dur,
            subStartDate = @start,
            subEndDate = @end
          WHERE id = @id
        `);
      res.json({ id: req.params.id, name, domain, logo, planName, maxEmployees, features, subDurationMonths, subStartDate, subEndDate: calculatedEndDate });
    } catch (err) {
      console.error("Failed to update company:", err);
      res.status(500).json({ error: "Failed to update company" });
    }
  });

  app.delete("/api/companies/:id", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    try {
      // Delete child records bound to this companyId to maintain database integrity
      await db.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM Employees WHERE companyId = @id");
      await db.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM AttendanceLogs WHERE companyId = @id");
      await db.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM Departments WHERE companyId = @id");
      await db.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM Geofence WHERE companyId = @id");
      await db.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM Companies WHERE id = @id");
      res.status(204).end();
    } catch (err) {
      console.error("Failed to delete company:", err);
      res.status(500).json({ error: "Failed to delete company" });
    }
  });

  // --- Subscription Plans Routes ---
  app.get("/api/subscription-plans", async (req, res) => {
    const db = await getPool();
    if (!db) {
      return res.json([
        { id: "plan-standard", name: "Standard Plan / الباقة الأساسية", durationMonths: 12, maxEmployees: 15, features: "Geofences,Departments,Employees" },
        { id: "plan-premium", name: "Premium Plan / الباقة البريميوم", durationMonths: 12, maxEmployees: 100, features: "Geofences,Departments,Employees,HR_Management" }
      ]);
    }
    try {
      const result = await db.request().query("SELECT * FROM SubscriptionPlans ORDER BY createdAt DESC");
      res.json(result.recordset);
    } catch (err) {
      console.error("Failed to fetch subscription plans:", err);
      res.status(500).json({ error: "Failed to fetch subscription plans" });
    }
  });

  app.post("/api/subscription-plans", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    const { name, durationMonths, maxEmployees, features } = req.body;
    const id = "plan-" + Math.random().toString(36).substr(2, 9);
    try {
      await db.request()
        .input("id", sql.NVarChar, id)
        .input("name", sql.NVarChar, name)
        .input("durationMonths", sql.Int, parseInt(String(durationMonths), 10) || 12)
        .input("maxEmployees", sql.Int, parseInt(String(maxEmployees), 10) || 10)
        .input("features", sql.NVarChar, features || "Geofences,Departments,Employees")
        .query("INSERT INTO SubscriptionPlans (id, name, durationMonths, maxEmployees, features, createdAt) VALUES (@id, @name, @durationMonths, @maxEmployees, @features, GETDATE())");
      
      res.status(201).json({ id, name, durationMonths, maxEmployees, features });
    } catch (err) {
      console.error("Failed to create subscription plan:", err);
      res.status(500).json({ error: "Failed to create subscription plan" });
    }
  });

  app.put("/api/subscription-plans/:id", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    const { name, durationMonths, maxEmployees, features } = req.body;
    try {
      await db.request()
        .input("id", sql.NVarChar, req.params.id)
        .input("name", sql.NVarChar, name)
        .input("durationMonths", sql.Int, parseInt(String(durationMonths), 10) || 12)
        .input("maxEmployees", sql.Int, parseInt(String(maxEmployees), 10) || 10)
        .input("features", sql.NVarChar, features || "Geofences,Departments,Employees")
        .query("UPDATE SubscriptionPlans SET name = @name, durationMonths = @durationMonths, maxEmployees = @maxEmployees, features = @features WHERE id = @id");
      
      res.json({ id: req.params.id, name, durationMonths, maxEmployees, features });
    } catch (err) {
      console.error("Failed to update subscription plan:", err);
      res.status(500).json({ error: "Failed to update subscription plan" });
    }
  });

  app.delete("/api/subscription-plans/:id", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "Database not connected" });
    try {
      await db.request().input("id", sql.NVarChar, req.params.id).query("DELETE FROM SubscriptionPlans WHERE id = @id");
      res.status(204).end();
    } catch (err) {
      console.error("Failed to delete subscription plan:", err);
      res.status(500).json({ error: "Failed to delete subscription plan" });
    }
  });

  // Department Routes
  app.get("/api/departments", async (req, res) => {
    const db = await getPool();
    if (!db) return res.json([]);
    const companyId = req.headers["x-company-id"] || req.query.companyId;
    try {
      let query = "SELECT * FROM Departments";
      const request = db.request();
      if (companyId) {
        request.input("companyId", sql.NVarChar, companyId);
        query += " WHERE companyId = @companyId";
      }
      const result = await request.query(query);
      res.json(result.recordset);
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  });

  app.post("/api/departments", async (req, res) => {
    const db = await getPool();
    if (!db) return res.status(503).json({ error: "DB not connected" });
    const { id, name, description, color } = req.body;
    const companyId = req.headers["x-company-id"] || req.query.companyId || req.body.companyId || "comp-default";
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
          .input("companyId", sql.NVarChar, companyId)
          .query("INSERT INTO Departments (id, name, description, color, companyId) VALUES (@id, @name, @desc, @color, @companyId)");
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

  if (typeof PORT === "string" && PORT.startsWith("\\\\.\\pipe\\")) {
    httpServer.listen(PORT, () => {
      console.log(`Server listening on IIS named pipe: ${PORT}`);
    });
  } else {
    httpServer.listen(Number(PORT), "0.0.0.0", () => {
      console.log(`Server running at http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();
