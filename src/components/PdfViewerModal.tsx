import React from "react";
import { X } from "lucide-react";
import { useNotes } from "../application/context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

export function PdfViewerModal() {
  const activePdf = useNotes((s) => s.activePdf);
  const setActivePdf = useNotes((s) => s.setActivePdf);

  return (
    <Dialog
      open={!!activePdf}
      onOpenChange={(open) => !open && setActivePdf(null)}
    >
      <DialogContent className="max-w-6xl h-[90vh] p-0 flex flex-col overflow-hidden gap-0 bg-card rounded-xl border-border sm:rounded-xl">
        <DialogHeader className="px-4 py-3 border-b border-border flex flex-row justify-between items-center bg-background m-0 space-y-0">
          <DialogTitle className="font-semibold text-gray-700 dark:text-gray-300">
            PDF Viewer
          </DialogTitle>
          <DialogDescription className="sr-only">
            View PDF document
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 bg-gray-100 dark:bg-black/50">
          <iframe
            src={activePdf || ""}
            title="PDF Viewer"
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-none"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
