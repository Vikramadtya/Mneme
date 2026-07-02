import { Folder } from "lucide-react";
interface WelcomeScreenProps {
  onSelectVault: () => void;
}

export function WelcomeScreen({ onSelectVault }: WelcomeScreenProps) {
  return (
    <div className="flex h-screen w-full bg-background items-center justify-center">
      <div className="bg-card rounded-2xl shadow-lg border border-border p-10 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">
          Welcome to Memoriser
        </h1>
        <p className="text-muted-foreground mb-8">
          To get started, please select a folder on your computer where your
          markdown notes and images will be stored.
        </p>
        <button
          onClick={onSelectVault}
          className="flex items-center justify-center space-x-2 w-full bg-[#E57B5D] hover:bg-[#d46a4c] text-white px-6 py-3 rounded-lg transition-colors shadow-md hover:shadow-lg"
        >
          <Folder size={20} />
          <span>Select Vault Folder</span>
        </button>
      </div>
    </div>
  );
}
