require("dotenv").config();
const mongoose = require("mongoose");

// Load schemas
const { CourseSchema } = require("../dist/course/schema/course.schema");
const { UserSchema } = require("../dist/user/schema/user.schema");

mongoose.model("Course", CourseSchema);
mongoose.model("User", UserSchema);

async function start() {
  await mongoose.connect(process.env.DATABASE_URL);
  const Course = mongoose.model("Course");
  const User = mongoose.model("User");

  console.log("Connected.");

  /* -----------------------------------------
     1) Fix Course.tutors -> convert names → ObjectId
     ----------------------------------------- */
  const tutors = await User.find({ role: "Tutor" }).lean();
  const tutorByName = Object.fromEntries(tutors.map(t => [t.name.trim(), t._id]));

  const courses = await Course.find();

  let updatedCourses = 0;
  for (let c of courses) {
    if (Array.isArray(c.tutors)) {
      const newTutors = [];

      for (let tName of c.tutors) {
        const match = tutorByName[tName.trim()];
        if (match) newTutors.push(match);
      }

      c.tutors = newTutors;
      await c.save();
      updatedCourses++;
    }
  }

  console.log("Done!");
  console.log("Updated courses:", updatedCourses);
  process.exit();
}

start();
