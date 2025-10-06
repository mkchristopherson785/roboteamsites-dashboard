// components/AdminLayout.tsx
import Link from "next/link";
import * as React from "react";

type Props = {
  title: string;
  subtitle?: React.ReactNode;
  rightActions?: React.ReactNode;
  children: React.ReactNode;
};

export default function AdminLayout({ title, subtitle, rightActions, children }: Props) {
  return (
    <main
      style={{
        maxWidth: "min(90%, 1000px)",
        margin: "3rem auto",
        padding: "0 2rem",
        fontFamily: "system-ui",
        lineHeight: 1.5,
        wordWrap: "break-word",
        overflowWrap: "break-word",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>{title}</h1>
          {subtitle ? <div style={{ marginTop: 6 }}>{subtitle}</div> : null}
        </div>
        {rightActions ?? null}
      </header>

      {children}
    </main>
  );
}

/** Reusable button styles */
export const buttonStyle = {
  base: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    textDecoration: "none",
    background: "#fff",
    color: "#111827",
    cursor: "pointer",
    fontWeight: 600,
  } as React.CSSProperties,
  primary: {
    background: "#0b6",
    border: "1px solid #0b6",
    color: "#fff",
  } as React.CSSProperties,
  danger: {
    background: "#ef4444",
    border: "1px solid #ef4444",
    color: "#fff",
  } as React.CSSProperties,
};

export function ButtonLink(props: React.ComponentProps<typeof Link>) {
  return <Link {...props} style={{ ...buttonStyle.base, ...(props.style || {}) }} />;
}

export function AButton(props: React.ComponentProps<"a">) {
  return <a {...props} style={{ ...buttonStyle.base, ...(props.style || {}) }} />;
}

export function SubmitButton(
  props: React.ComponentProps<"button"> & { variant?: "primary" | "danger" | "default" }
) {
  const { variant = "default", style, ...rest } = props;
  const theme =
    variant === "primary" ? buttonStyle.primary :
    variant === "danger"  ? buttonStyle.danger  : {};
  return <button {...rest} style={{ ...buttonStyle.base, ...theme, ...(style || {}) }} />;
}