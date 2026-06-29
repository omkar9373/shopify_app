import { connectMongo } from "../mongodb.server";
import Announcement from "../models/Announcement";

export async function action({ request }) {
  await connectMongo();

  const body = await request.json();

  const announcement = await Announcement.create({
    announcement: body.announcement,
  });

  return Response.json({
    success: true,
    data: announcement,
  });
}
