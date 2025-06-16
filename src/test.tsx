import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@/generated/schema";

export default function UserAvatar(props: { user: User; className?: string }) {
  const { user, className } = props;
  return (
    <NewButton class={className}>
      {user?.imageUrl && (
        <AvatarImage
          src={user?.imageUrl}
          alt="avatar"
          className="object-cover"
        />
      )}
      <NewInput>
        {`${user?.firstName.charAt(0)}${user?.lastName.charAt(
          0
        )}`.toUpperCase()}
      </NewInput>
    </NewButton>
  );
}
