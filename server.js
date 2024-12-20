require("dotenv").config();
const cluster = require("cluster");
const os = require("os");
const express = require("express");
const path = require("path");
const { logger, logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const corsOptions = require("./config/corsOptions");
const connectDB = require("./config/dbConn");
const mongoose = require("mongoose");
const metricsMiddleware = require("./middleware/metricsMiddleware");
const { initializeSocket } = require("./config/socketConfig");

const PORT = process.env.PORT || 3500;

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;
  console.log(`Master ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork();
  });
} else {
  // Workers can share any TCP connection
  // In this case, it is an HTTP server
  connectDB();

  const app = express();
  const server = require("http").createServer(app);
  initializeSocket(server);

  const client = require("prom-client");
  const collectDefaultMetrics = client.collectDefaultMetrics;
  collectDefaultMetrics();

  app.use(metricsMiddleware);

  app.use(logger);
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(cookieParser());
  app.use("/", express.static(path.join(__dirname, "public")));
  app.use("/", require("./routes/root"));
  app.use("/metrics", require("./admin/adminRoutes"));
  app.use("/uploads", require("./routes/uploadsRoutes"));
  app.use("/auth", require("./routes/authRoutes"));

  app.use("/api/temp", require("./routes/tempstudentRoutes"));

  app.use("/students", require("./routes/studentRoutes"));
  app.use("/alumni", require("./routes/alumniRoutes"));
  app.use("/graduate", require("./routes/graduateRoutes"));
  app.use("/staff", require("./routes/staffRoutes"));
  app.use("/intakegroups", require("./routes/intakeGroupRoutes"));
  app.use("/campuses", require("./routes/campusRoutes"));
  app.use("/guardian", require("./routes/guardianRoutes"));
  app.use("/accommodations", require("./routes/accomodationRoutes"));
  app.use("/fileUploads", require("./routes/fileUploadRoutes"));
  app.use("/download", require("./routes/fileDownloadRoutes"));
  app.use("/assignments", require("./routes/assignmentRoutes"));
  app.use("/attendance", require("./routes/attendanceRoutes"));
  app.use("/learning-material", require("./routes/learningMaterialRoutes"));
  app.use("/wel", require("./routes/welRoutes"));
  app.use("/results", require("./routes/resultsRoute"));
  app.use("/qualifications", require("./routes/qualificationRoutes"));
  app.use("/events", require("./routes/eventRoutes"));
  app.use("/outcomes", require("./routes/outcomeRoutes"));
  app.use("/finance", require("./routes/financeRoutes"));
  app.use("/roles", require("./routes/rolesRoutes"));
  app.use("/reports", require("./routes/reportsRoute"));
  app.use("/api/files", require("./routes/fileRoute"));
  app.use("/search", require("./routes/searchRoute"));
  app.use("/notifications", require("./routes/notification"));
  app.use(
    "/update-student-intakegroup",
    require("./routes/updateStudentIntakegroupRoute")
  );
  app.use("/mark-assignment", require("./routes/markAssignmentRoute"));
  app.use("/guardian-profile", require("./routes/guardianProfileRoutes"));
  app.use("/api/push", require("./routes/pushRoutes"));
  app.use("/api/test", require("./testNotifications.js"));

  app.all("*", (req, res) => {
    res.status(404);
    if (req.accepts("html")) {
      res.sendFile(path.join(__dirname, "views", "404.html"));
    } else if (req.accepts("json")) {
      res.json({ message: "404 Not Found" });
    } else {
      res.type("txt").send("404 Not Found");
    }
  });

  app.use(errorHandler);

  mongoose.connection.once("open", () => {
    console.log("Connected to MongoDB");
    server.listen(PORT, () =>
      console.log(`Worker ${process.pid} running on port: ${PORT}`)
    );
    initializeSocket(server);
  });

  mongoose.connection.on("error", (err) => {
    console.log(err);
    logEvents(
      `${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`,
      "mongoErrLog.log"
    );
  });

  console.log(`Worker ${process.pid} started`);
}
