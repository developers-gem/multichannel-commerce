import { ApiResponse } from "./common";

export interface CsvRowError {
  row: number;
  sku: string;
  message: string;
}

export interface CsvImportSummary {
  totalRows: number;
  created: number;
  updated: number;
  failed: number;
  errors: CsvRowError[];
}

export type CsvImportResponse = ApiResponse<CsvImportSummary>;
