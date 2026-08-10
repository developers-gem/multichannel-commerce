import { CsvImportResponse } from "@/types/csv-import";
import { getAuthBearerHeader, handleUnauthorized } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function uploadCsvFile(file: File): Promise<CsvImportResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/csv-import/products`, {
    method: "POST",
    headers: getAuthBearerHeader(),
    body: formData,
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error("Unauthorized: Session expired");
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Failed to import CSV file");
  }

  return data;
}

export function downloadSampleCsv(): void {
  const sampleHeaders = "sku,title,description,brand,category,images,price,quantity,shippingCharge,status";

  const sampleRows = [
    'SKU-1001,Wireless Mouse,Ergonomic optical mouse,Logitech,Electronics,"https://example.com/img1.jpg,https://example.com/img2.jpg",29.99,100,5.00,ACTIVE',
    'SKU-1002,Mechanical Keyboard,RGB Backlit Gaming Keyboard,Keychron,Electronics,"https://example.com/img3.jpg",89.99,50,0.00,DRAFT',
    'SKU-1003,USB-C Hub,Multi-port adapter 7-in-1,Anker,Accessories,"https://example.com/img4.jpg",34.50,0,2.50,INACTIVE',
  ];

  const csvContent = [sampleHeaders, ...sampleRows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "products_import_sample.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
