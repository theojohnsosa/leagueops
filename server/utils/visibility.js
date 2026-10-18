export function isPubliclyVisible(event) {
  return (
    event.approvalStatus === "approved" &&
    event.isArchived !== true &&
    event.archiveStatus !== "archived" &&
    event.archiveStatus !== "expired"
  );
}

export function publicEventFilter() {
  return {
    approvalStatus: "approved",
    isArchived: { $ne: true },
    archiveStatus: { $nin: ["archived", "expired"] },
  };
}
