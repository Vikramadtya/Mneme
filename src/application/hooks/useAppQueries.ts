import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ipc } from "../../ipc";
import { useVaultStore } from "../store/vaultStore";
import { useNotesStore } from "../store/notesStore";
import { useReviewStore } from "../store/reviewStore";

export function useAppQueries() {
  const queryClient = useQueryClient();
  const vaultPath = useVaultStore((state) => state.vaultPath);
  const setProjects = useNotesStore((state) => state.setProjects);
  const setAllNotesMap = useNotesStore((state) => state.setAllNotesMap);
  const setGraphSelectedProjects = useNotesStore(
    (state) => state.setGraphSelectedProjects,
  );
  const setActivityLogs = useReviewStore((state) => state.setActivityLogs);
  const setVaultSettings = useVaultStore((state) => state.setVaultSettings);
  const setIsSyncingVault = useVaultStore((state) => state.setIsSyncingVault);

  const vaultQuery = useQuery({
    queryKey: ["vault", vaultPath],
    queryFn: async () => {
      if (!vaultPath) return null;
      setIsSyncingVault(true);
      await ipc.syncFromVault(vaultPath);
      const dbRes = await ipc.getInitialState(vaultPath);
      const logsRes = await ipc.getActivityLogs(vaultPath);
      const settingsRes = await ipc.getSettings();

      if (dbRes.success && dbRes.data) {
        setProjects(dbRes.data.projects || []);
        setAllNotesMap(dbRes.data.allNotesMap || {});
        setGraphSelectedProjects(
          new Set(
            (dbRes.data.projects || [])
              .filter((p: any) => p.type === "book" || p.type === "course")
              .map((p: any) => p.id),
          ),
        );
      }
      setActivityLogs(logsRes?.data || []);
      if (settingsRes?.success) setVaultSettings(settingsRes.data || {});

      setIsSyncingVault(false);
      return dbRes.data;
    },
    enabled: !!vaultPath,
  });

  const saveNoteMutation = useMutation({
    mutationFn: async (note: any) => {
      if (!vaultPath) throw new Error("No vault selected");
      return ipc.saveNote(vaultPath, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vault", vaultPath] });
    },
  });

  return {
    vaultQuery,
    saveNoteMutation,
  };
}
