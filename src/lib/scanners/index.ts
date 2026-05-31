/**
 * Scanner Index
 * Exports all scanner modules for easy integration
 */

import { type NpmAuditResult } from "./npm-audit-scanner";
import { type SnykResult } from "./snyk-scanner";
import { type SonarJSResult } from "./sonarjs-scanner";
import { type ClinicResult } from "./clinic-scanner";
import { type ArtilleryResult } from "./artillery-scanner";
import { type AutocannonResult } from "./autocannon-scanner";

export { scanWithNpmAudit } from "./npm-audit-scanner";
export { scanWithSnyk } from "./snyk-scanner";
export { scanWithSonarJS } from "./sonarjs-scanner";
export { scanWithClinic } from "./clinic-scanner";
export { scanWithArtillery } from "./artillery-scanner";
export { scanWithAutocannon } from "./autocannon-scanner";

export type { NpmAuditResult, SnykResult, SonarJSResult, ClinicResult, ArtilleryResult, AutocannonResult };

export interface ScannerConfig {
  enableNpmAudit: boolean;
  enableSnyk: boolean;
  enableSonarJS: boolean;
  enableClinic: boolean;
  enableArtillery: boolean;
  enableAutocannon: boolean;
}

export const defaultScannerConfig: ScannerConfig = {
  enableNpmAudit: true,
  enableSnyk: true,
  enableSonarJS: true,
  enableClinic: true,
  enableArtillery: true,
  enableAutocannon: true,
};

export interface CombinedScannerResults {
  npmAudit?: NpmAuditResult;
  snyk?: SnykResult;
  sonarJS?: SonarJSResult;
  clinic?: ClinicResult;
  artillery?: ArtilleryResult;
  autocannon?: AutocannonResult;
}
