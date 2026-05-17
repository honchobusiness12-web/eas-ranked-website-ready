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
        className={`${size} rounded-full object-cover shrink-0`}
        loading="lazy"
      />
    );
  }

  const initial = (name || "?")[0].toUpperCase();
  // Generate a consistent color from the name
  const colors = [
    "bg-orange-700",
    "bg-purple-700",
    "bg-blue-700",
    "bg-green-700",
    "bg-red-700",
    "bg-teal-700",
    "bg-pink-700",
    "bg-indigo-700",
  ];
  const colorIndex = name ? name.charCodeAt(0) % colors.length : 0;
  const bgColor = colors[colorIndex];

  return (
    <div className={`flex ${size} shrink-0 items-center justify-center rounded-full ${bgColor} text-white font-black text-sm select-none`}>
      {initial}
    </div>
  );
}
