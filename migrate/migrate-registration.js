/**
 * migrate/migrate-registration.js
 * ----------------------------------
 * Convert registration.course (string courseCode) → ObjectId (Course._id)
 * Convert registration.tutor (string name) → ObjectId (User._id)
 */

require("dotenv").config();
const mongoose = require("mongoose");

console.log("🚀 Starting migration...");

// --------------------------------------------
// 1️⃣ CONNECT TO DATABASE
// --------------------------------------------
async function connectDB() {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  }
}

// --------------------------------------------
// 2️⃣ DEFINE SCHEMAS (simple versions work fine)
// --------------------------------------------
const CourseSchema = new mongoose.Schema(
  { courseCode: String },
  { collection: "courses" }
);

const RegistrationSchema = new mongoose.Schema(
  {
    course: mongoose.Types.ObjectId,
    courseCode: String,
    classGroup: String,
    tutor: String,
  },
  { collection: "registrations" }
);

const UserSchema = new mongoose.Schema(
  { name: String, role: String },
  { collection: "users" }
);

// Create Models
const Course = mongoose.model("Course", CourseSchema);
const Registration = mongoose.model("Registration", RegistrationSchema);
const User = mongoose.model("User", UserSchema);

// --------------------------------------------
// 3️⃣ MAIN MIGRATION FUNCTION
// --------------------------------------------
async function migrate() {
  await connectDB();

  console.log("🔍 Loading data...");
  const courses = await Course.find().lean();
  const tutors = await User.find({ role: "Tutor" }).lean();
  const registrations = await Registration.find();

  console.log(`📘 Courses: ${courses.length}`);
  console.log(`👨‍🏫 Tutors: ${tutors.length}`);
  console.log(`📄 Registrations: ${registrations.length}`);

  // Build lookup tables
  const courseMap = {};
  courses.forEach((c) => (courseMap[c.courseCode] = c._id));

  const tutorMap = {};
  tutors.forEach((t) => (tutorMap[t.name] = t._id));

  // --------------------------------------------
  // 4️⃣ UPDATE EACH REGISTRATION
  // --------------------------------------------
  for (let reg of registrations) {
    let changed = false;

    // 🔹 Fix course reference → ObjectId
    if (courseMap[reg.courseCode]) {
      reg.course = courseMap[reg.courseCode];
      changed = true;
    }

    // 🔹 Fix tutor reference → ObjectId
    if (reg.tutor && tutorMap[reg.tutor]) {
      reg.tutor = tutorMap[reg.tutor];
      changed = true;
    }

    if (changed) {
      await reg.save();
      console.log(`✔ Updated registration ${reg._id}`);
    }
  }

  console.log("🎉 Migration complete!");
  mongoose.disconnect();
  process.exit();
}

migrate();
