
import Event from "../models/Events.js";
import Registration from "../models/Registrations.js";
import ApprovalRequest from "../models/ApprovalRequests.js";
import Match from "../models/Matches.js";
import EventLog from "../models/EventLog.js";

export async function getDashboardStats(req, res) {
  try {
        const [
        totalEvents,
        totalRegistrations,
        activeEvents,
        pendingApprovals,
        recentActivity,
        upcomingMatches,
        events,
        registrationsByEvent,
        ] = await Promise.all([
      Event.countDocuments({
        isArchived: { $ne: true },
      }),

      Registration.countDocuments(),

      Event.countDocuments({
        status: { $in: ["upcoming", "ongoing"] },
        isArchived: { $ne: true },
      }),

        ApprovalRequest.countDocuments({
        status: "pending",
        }),

        EventLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

        Match.find({
        status: "scheduled",
        scheduledDate: { $gte: new Date() },
        })
        .sort({ scheduledDate: 1, startTime: 1 })
        .limit(5)
        .populate({
            path: "eventId",
            select: "title game isArchived",
            match: { isArchived: { $ne: true } },
        })
        .lean()
        .then((matches) =>
            matches.filter((match) => match.eventId !== null)
        ),


      Event.find({
        isArchived: { $ne: true },
      })
        .select("title game maxSlots status")
        .lean(),

      Registration.aggregate([
        {
          $match: {
            status: {
              $in: ["pending", "accepted", "rejected", "cancelled"],
            },
          },
        },
        {
          $group: {
            _id: "$eventId",
            total: { $sum: 1 },
            pending: {
              $sum: {
                $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
              },
            },
            accepted: {
              $sum: {
                $cond: [{ $eq: ["$status", "accepted"] }, 1, 0],
              },
            },
            rejected: {
              $sum: {
                $cond: [{ $eq: ["$status", "rejected"] }, 1, 0],
              },
            },
            cancelled: {
              $sum: {
                $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);


const registrationMap = new Map(
  (Array.isArray(registrationsByEvent) ? registrationsByEvent : []).map(
    (item) => [String(item._id), item]
  )
);


    const eventSummaries = (events ?? []).map((event) => {
      const registration = registrationMap.get(String(event._id));

      const total = registration?.total ?? 0;
      const accepted = registration?.accepted ?? 0;

      return {
        eventId: event._id,
        title: event.title,
        game: event.game,
        status: event.status,

        registration: {
          total,
          pending: registration?.pending ?? 0,
          accepted,
          rejected: registration?.rejected ?? 0,
          cancelled: registration?.cancelled ?? 0,
        },

        slots:
          event.maxSlots == null
            ? {
                capacity: null,
                occupied: accepted,
                remaining: null,
                unlimited: true,
              }
            : {
                capacity: event.maxSlots,
                occupied: accepted,
                remaining: Math.max(
                  0,
                  event.maxSlots - accepted,
                ),
                unlimited: false,
              },
      };
    });

    return res.json({
      stats: {
        totalEvents,
        totalRegistrations,
        activeEvents,
        pendingApprovals,
      },
      eventSummaries,
      upcomingMatches,
      recentActivity,
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);

    return res.status(500).json({
      message: "Failed to load dashboard data.",
    });
}
}
