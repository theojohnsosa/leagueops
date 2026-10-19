export function isPubliclyVisible(event) {
  if (!event) return false;

  return (
    event.approvalStatus === "approved" &&
    event.isArchived !== true &&
    !["archived", "expired"].includes(event.archiveStatus)
  );
}

export function publicEventFilter() {
  return {
    approvalStatus: "approved",
    isArchived: { $ne: true },
    archiveStatus: { $nin: ["archived", "expired"] },
  };
}
