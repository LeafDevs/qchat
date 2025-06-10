import { User } from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Chat messages will go here */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent/10 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">You</p>
              <p className="text-sm text-muted-foreground">Hello! How can I help you today?</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="border-t p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
