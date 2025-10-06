// components/DeleteSiteButton.tsx
"use client";

import * as React from "react";
import { SubmitButton } from "./AdminLayout";

export default function DeleteSiteButton({
  siteId,
  siteName,
}: { siteId: string; siteName: string }) {
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
      <SubmitButton type="submit" variant="danger" style={{ padding: "6px 12px", fontSize: 14 }}>
        Delete
      </SubmitButton>
    </form>
  );
}