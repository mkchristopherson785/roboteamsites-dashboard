// app/components/DeleteSiteButton.tsx
"use client";

type Props = { siteId: string; siteName: string };

export default function DeleteSiteButton({ siteId, siteName }: Props) {
  return (
    <form
      action={`/api/sites/${siteId}/delete`}
      method="post"
      onSubmit={(e) => {
        if (!confirm(`Are you sure you want to delete “${siteName}”? This cannot be undone.`)) {
          e.preventDefault();
        }
      }}
      style={{ display: "inline" }}
    >
      <button
        type="submit"
        style={{
          padding: "6px 12px",
          border: "1px solid #dc2626",
          background: "#fee2e2",
          color: "#991b1b",
          borderRadius: 6,
          cursor: "pointer",
          fontSize: 14,
        }}
        title="Delete this site (irreversible)"
      >
        Delete
      </button>
    </form>
  );
}