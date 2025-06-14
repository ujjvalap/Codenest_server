// Import dependencies
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const { Schema } = mongoose;

// Define User Schema
const adminSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      // unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    password: {
      type: String,
      minlength: [6, "Password must be at least 6 characters"],
      required: function () {
        return !this.isGoogleLogin; // Only require password if not a Google login
      },
    },
    isGoogleLogin: {
      type: Boolean,
      default: false, // True for Google login users
    },
    picture: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    challengesCreated: [
      {
        type: Schema.Types.ObjectId,
        ref: "Challenge",
      },
    ],
    batches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Batch" }], // created batches
  },
  {
    timestamps: true,
  }
);

// Middleware to hash password before saving user to database
adminSchema.pre("save", async function (next) {
  try {
    // If password is not modified, skip hashing
    if (!this.isModified("password")) return next();

    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare hashed password with entered password
adminSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

// Model Export
const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
