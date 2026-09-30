export interface AssemblyStep {
  step_number: number;
  title: string;
  tools_needed: string[];
  parts_needed: string[];
  substeps: string[];
  check: string;
  warning?: string;
  /** PDF page numbers this step was derived from (1-indexed). Optional for backwards compat. */
  source_pages?: number[];
}
