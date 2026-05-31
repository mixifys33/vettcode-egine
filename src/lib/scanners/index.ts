/**
 * Scanner Index
 * Exports all scanner modules for easy integration
 */

export { scanWithNpmAudit, type NpmAuditResult } from "./npm-audit-scanner";
export { scanWithSnyk, type SnykResult } from "./snyk-scanner";
export { scanWithSonarJS, type SonarJSResult } from "./sonarjs-scanner";
export { scanWithClinic, type ClinicResult } from "./clinic-scanner";
export { scanWithArtillery, type ArtilleryResult } from "./artillery-scanner";
export { scanWithAutocannon, type AutocannonResult } from "./autocannon-scanner";

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
