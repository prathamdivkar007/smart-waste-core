import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WasteFlow — Smart Waste Control Room" },
      { name: "description", content: "Live bin fill levels, collection vehicles and alerts for urban local bodies." },
      { property: "og:title", content: "WasteFlow — Smart Waste Control Room" },
      { property: "og:description", content: "Live bin fill levels, collection vehicles and alerts for urban local bodies." },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});
