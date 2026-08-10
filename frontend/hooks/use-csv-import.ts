import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadCsvFile } from "@/services/csv-import.service";

export function useUploadCsv() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadCsvFile(file),
    onSuccess: () => {
      // Invalidate products query so newly created/updated products refresh on /products
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
