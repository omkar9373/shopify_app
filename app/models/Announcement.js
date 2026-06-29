import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema(
  {
    announcement: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Announcement ||
  mongoose.model("Announcement", AnnouncementSchema);
