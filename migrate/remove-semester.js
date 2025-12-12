const mongoose = require("mongoose");

// Load Registration schema from compiled dist (works with NestJS)
const {
  RegistrationSchema,
} = require("../dist/matching/schema/registration.schema");

// Register model
mongoose.model("Registration", RegistrationSchema);

async function start() {
  console.log("Connecting to DB...");
  
  require("dotenv").config();
  await mongoose.connect(process.env.DATABASE_URL);

  console.log("Connected.");

  const Registration = mongoose.model("Registration");

  // Remove the semester field from all docs
  const result = await Registration.updateMany(
    {},
    { $unset: { semester: "" } }
  );

  console.log("Semester removed from registrations:", result);

  await mongoose.disconnect();
  console.log("Done.");
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
