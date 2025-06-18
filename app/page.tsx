import { ChatLayout } from "@/components/ChatLayout";
import { getServerSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession();
  
  if (!session?.user) {
    redirect('/auth');
  }

  return (
    <ChatLayout />
  )
}
