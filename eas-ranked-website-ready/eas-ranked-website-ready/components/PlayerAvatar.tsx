export default function PlayerAvatar({
  name,
  avatar,
  size = "h-10 w-10",
}: {
  name?: string;
  avatar?: string | null;
  size?: string;
}) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name || "Player"}
        loading="lazy"
        decoding="async"
        className={`${size} shrink-0 rounded-full object-cover`}
      />
    );
  }

  const initial = (name || "U")[0].toUpperCase();
  return (
    <div
      className={`${size} shrink-0 flex items-center justify-center rounded-full bg-gradient-to-br from-purple-700 to-purple-900 text-xs font-black text-white select-none`}
      aria-label={name || "Unknown player"}
    >
      {initial}
    </div>
  );
}
