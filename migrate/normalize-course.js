require("dotenv").config();
const mongoose = require("mongoose");

// Load compiled schema
const { CourseSchema } = require("../dist/course/schema/course.schema");
mongoose.model("Course", CourseSchema);

async function connectDB() {
  const uri = process.env.DATABASE_URL;
  if (!uri) throw new Error("DATABASE_URL missing!");
  await mongoose.connect(uri);
}

function normalizeArray(field) {
  if (!field) return [];

  // Case 1: Already an array but contains one string like "['CC01','CC02']"
  if (Array.isArray(field)) {
    if (field.length === 1 && typeof field[0] === "string") {
      try {
        const parsed = JSON.parse(field[0].replace(/'/g, '"'));
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {
        return field.map(String);
      }
    }
    return field.map(String);
  }

  // Case 2: Plain string like "['CC01','CC02']"
  if (typeof field === "string") {
    try {
      const parsed = JSON.parse(field.replace(/'/g, '"'));
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return [field];
    }
  }

  // Fallback
  return [String(field)];
}


function normalizeDate(field) {
  if (!field) return null;
  const d = new Date(field);
  return isNaN(d.getTime()) ? null : d;
}

(async () => {
  try {
    console.log("Connecting to DB...");
    await connectDB();
    console.log("Connected.");

    const Course = mongoose.model("Course");
    const courses = await Course.find();

    console.log(`Found ${courses.length} courses to normalize`);

    for (let course of courses) {
      const updates = {};

      // Normalize classGroups
      if (course.classGroups) {
        updates.classGroups = normalizeArray(course.classGroups);
      }

      // Normalize tutors
      if (course.tutors) {
        updates.tutors = normalizeArray(course.tutors);
      }

      // Normalize date fields
    //   updates.registrationStart = normalizeDate(course.registrationStart);
    //   updates.registrationEnd = normalizeDate(course.registrationEnd);
    //   updates.courseStart = normalizeDate(course.courseStart);
    //   updates.courseEnd = normalizeDate(course.courseEnd);
    //   updates.createdAt = normalizeDate(course.createdAt);
    //   updates.updatedAt = normalizeDate(course.updatedAt);

      // Optionally remove status and semester
      updates.$unset = {
        status: "",
        semester: ""
      };

      await Course.updateOne({ _id: course._id }, updates);
    }

    console.log("Course normalization complete.");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
