const mongoose = require("mongoose");
require("dotenv").config();

async function start() {
  console.log("Connecting...");
  await mongoose.connect(process.env.DATABASE_URL);
  console.log("Connected.");

  // Minimal schema (no validation!)
  const CourseSchema = new mongoose.Schema({}, { strict: false });
  const Course = mongoose.model("Course", CourseSchema);

  const courses = await Course.find().lean();
  let updates = 0;

  for (const c of courses) {
    // skip those already having semester
    if (c.semester) continue;

    const startDate = new Date(c.courseStart);
    if (isNaN(startDate)) {
      console.warn(`⚠ Skipped course with invalid date: ${c._id}`);
      continue;
    }

    const month = startDate.getUTCMonth() + 1;
    const year = startDate.getUTCFullYear();

    const semester = month <= 6 ? `${year} Spring` : `${year} Fall`;

    await Course.updateOne(
      { _id: c._id },
      { $set: { semester } }
    );

    updates++;
  }

  console.log(`✔ Restored semester for ${updates} course(s).`);
  await mongoose.disconnect();
  console.log("Done.");
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
