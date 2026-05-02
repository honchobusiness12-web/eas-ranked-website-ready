export default function PlayerAvatar({
  name,
  avatar,
  size = "h-11 w-11",
}: {
  name?: string;
  avatar?: string | null;
  size?: string;
}) {
  if (avatar) {
    return <img src={avatar} alt={name || "Player"} className={`${size} rounded-full object-cover`} />;
  }

  return (
    <div className={`flex ${size} items-center justify-center rounded-full bg-purple-800 font-black`}>
      {(name || "U")[0]}
    </div>
  );
}
