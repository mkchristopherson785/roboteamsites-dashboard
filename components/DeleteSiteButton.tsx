// components/DeleteSiteButton.tsx
"use client";

export default function DeleteSiteButton({
  siteId,
  siteName,
}: {
  siteId: string;
  siteName: string;
}) {
  return (
    <form
      action={`/api/sites/${siteId}/delete`}
      method="post"
      onSubmit={(e) => {
        if (!confirm(`Delete “${siteName}”? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
      style={{ display: "inline" }} // keeps it inline with the other buttons
    >
      <button
        type="submit"
        style={{
          display: "inline-block",
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid #dc2626",
          background: "#ef4444",
          color: "#fff",
          fontSize: 14,
          lineHeight: "20px",      // ✅ key to match anchor height
          verticalAlign: "middle", // ✅ aligns baseline with links
          textDecoration: "none",
          cursor: "pointer",
        }}
      >
        Delete
      </button>
    </form>
  );
}