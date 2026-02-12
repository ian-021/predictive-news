"use client";

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
}

export function BookmarkButton({
  isBookmarked,
  onClick,
  size = "sm",
}: BookmarkButtonProps) {
  const sizes = { sm: 18, md: 22 };
  const iconSize = sizes[size];

  return (
    <button
      onClick={onClick}
      aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
      title={isBookmarked ? "Remove from My Questions" : "Add to My Questions"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: iconSize + 12,
        height: iconSize + 12,
        borderRadius: "var(--radius-sm)",
        transition: "background-color var(--transition-fast)",
        backgroundColor: isBookmarked ? "var(--accent-yellow-bg)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!isBookmarked) {
          (e.target as HTMLElement).style.backgroundColor = "var(--bg-card-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isBookmarked) {
          (e.target as HTMLElement).style.backgroundColor = "transparent";
        }
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={isBookmarked ? "var(--accent-yellow)" : "none"}
        stroke={isBookmarked ? "var(--accent-yellow)" : "var(--text-muted)"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
