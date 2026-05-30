"use client";

import { useState, useEffect } from "react";
import type { VettReport } from "@/lib/types";

interface PreListModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: VettReport;
  onSubmit: (formData: PreListFormData) => Promise<void>;
}

export interface PreListFormData {
  appName: string;
  shortDescription: string;
  detailedDescription: string;
  tags: string;
  appCategory: string;
  technologyStack: string[];
  price: string;
  currency: string;
  isFree: boolean;
  licenseType: string;
  liveDemo: string;
  githubRepo: string;
  documentationUrl: string;
  videoDemo: string;
  supportedPlatforms: string[];
  dependencies: string[];
  commercialUse: string;
  resaleRights: string;
  supportLevel: string;
  updateFrequency: string;
  warranty: string;
  installationSupport: string;
  screenshots: File[];
  appIcon: File | null;
}

const APP_CATEGORIES = [
  'Web Application',
  'Mobile App (React Native)',
  'Mobile App (Native iOS)',
  'Mobile App (Native Android)',
  'Desktop Application',
  'API/Backend Service',
  'Chrome Extension',
  'WordPress Plugin',
  'NPM Package/Library',
  'CLI Tool',
  'Game',
  'E-commerce Solution',
  'CMS/Blog Platform',
  'Dashboard/Admin Panel',
  'Other'
];

const LICENSE_TYPES = ["MIT License", "Apache 2.0", "GPL", "Commercial", "Proprietary", "Other"];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'UGX', 'KES', 'TZS', 'RWF'];
const SUPPORT_LEVELS = ['Community', 'Email', 'Priority', 'Enterprise'];
const UPDATE_FREQUENCIES = ['Active', 'Maintenance', 'Deprecated'];
const COMMERCIAL_USE_OPTIONS = ['Yes', 'No', 'With License'];
const RESALE_RIGHTS_OPTIONS = ['Yes', 'No', 'With License'];
const INSTALLATION_SUPPORT_OPTIONS = ['Yes', 'No', 'Paid'];
const WARRANTY_OPTIONS = ['30 days', '60 days', '90 days', '1 year', 'No warranty'];

export function PreListModal({ isOpen, onClose, report, onSubmit }: PreListModalProps) {
  const [formData, setFormData] = useState<PreListFormData>({
    appName: report.metadata?.projectName || "Untitled Application",
    shortDescription: report.summary || "",
    detailedDescription: "",
    tags: "",
    appCategory: "",
    technologyStack: [],
    price: "",
    currency: "USD",
    isFree: false,
    licenseType: "MIT License",
    liveDemo: "",
    githubRepo: "",
    documentationUrl: "",
    videoDemo: "",
    supportedPlatforms: [],
    dependencies: [],
    commercialUse: "Yes",
    resaleRights: "No",
    supportLevel: "Community",
    updateFrequency: "Active",
    warranty: "30 days",
    installationSupport: "Yes",
    screenshots: [],
    appIcon: null,
  });

  const [screenshotPreview, setScreenshotPreview] = useState<string[]>([]);
  const [appIconPreview, setAppIconPreview] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill tags and technology stack from scan with enhanced logic
  useEffect(() => {
    if (isOpen) {
      const languages = extractLanguages(report);
      const frameworks = extractFrameworks(report);

      // Generate intelligent tags from scan results
      const autoTags = [
        ...languages,
        ...frameworks,
        // Add category-based tags based on findings
        report.findings.some(f => f.category === 'security') ? 'secure' : '',
        report.findings.some(f => f.category === 'performance') ? 'performant' : '',
        report.findings.some(f => f.category === 'code-quality') ? 'clean-code' : '',
        report.score >= 80 ? 'production-ready' : '',
      ].filter(Boolean).join(", ");

      const autoTechStack = [...languages, ...frameworks];

      // Auto-detect app category based on technology stack
      let detectedCategory = formData.appCategory;
      if (!detectedCategory) {
        if (languages.includes('JavaScript') || languages.includes('TypeScript')) {
          if (frameworks.includes('React') || frameworks.includes('Next.js')) {
            detectedCategory = 'Web Application';
          } else if (frameworks.includes('React Native')) {
            detectedCategory = 'Mobile App (React Native)';
          } else if (frameworks.includes('Node.js')) {
            detectedCategory = 'API/Backend Service';
          }
        } else if (languages.includes('Python')) {
          detectedCategory = 'API/Backend Service';
        } else if (languages.includes('Java') || languages.includes('Kotlin')) {
          detectedCategory = 'Mobile App (Native Android)';
        } else if (languages.includes('Swift')) {
          detectedCategory = 'Mobile App (Native iOS)';
        }
      }

      // Auto-detect supported platforms based on technology
      let detectedPlatforms = formData.supportedPlatforms;
      if (detectedPlatforms.length === 0) {
        detectedPlatforms = ['Web']; // Default to web
        if (frameworks.includes('React Native')) {
          detectedPlatforms = ['iOS', 'Android'];
        } else if (languages.includes('Swift')) {
          detectedPlatforms = ['iOS'];
        } else if (languages.includes('Java') || languages.includes('Kotlin')) {
          detectedPlatforms = ['Android'];
        }
      }

      setFormData(prev => ({
        ...prev,
        tags: autoTags,
        technologyStack: autoTechStack.length > 0 ? autoTechStack : prev.technologyStack,
        appCategory: detectedCategory || prev.appCategory,
        supportedPlatforms: detectedPlatforms.length > 0 ? detectedPlatforms : prev.supportedPlatforms,
      }));
    }
  }, [isOpen, report, formData.appCategory, formData.supportedPlatforms]);

  const extractLanguages = (report: VettReport): string[] => {
    const languages = new Set<string>();
    
    report.findings.forEach((finding) => {
      if (finding.file) {
        const ext = finding.file.split('.').pop()?.toLowerCase();
        if (ext) {
          const langMap: Record<string, string> = {
            'js': 'JavaScript',
            'jsx': 'JavaScript',
            'ts': 'TypeScript',
            'tsx': 'TypeScript',
            'py': 'Python',
            'java': 'Java',
            'cpp': 'C++',
            'c': 'C',
            'cs': 'C#',
            'go': 'Go',
            'rb': 'Ruby',
            'php': 'PHP',
            'swift': 'Swift',
            'kt': 'Kotlin',
            'rs': 'Rust',
          };
          if (langMap[ext]) {
            languages.add(langMap[ext]);
          }
        }
      }
    });
    
    return Array.from(languages);
  };

  const extractFrameworks = (report: VettReport): string[] => {
    const frameworks = new Set<string>();
    const codeText = report.findings.map(f => f.evidence?.toLowerCase() || "").join(" ");
    
    const frameworkPatterns = [
      { name: "React", pattern: /react/i },
      { name: "Next.js", pattern: /next/i },
      { name: "Vue", pattern: /vue/i },
      { name: "Angular", pattern: /angular/i },
      { name: "Express", pattern: /express/i },
      { name: "Django", pattern: /django/i },
      { name: "Flask", pattern: /flask/i },
      { name: "Laravel", pattern: /laravel/i },
      { name: "Spring", pattern: /spring/i },
      { name: "Node.js", pattern: /node/i },
    ];

    frameworkPatterns.forEach(({ name, pattern }) => {
      if (pattern.test(codeText)) frameworks.add(name);
    });

    return Array.from(frameworks);
  };

  const handleInputChange = (field: keyof PreListFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleTechnologyStackChange = (index: number, value: string) => {
    const newStack = [...formData.technologyStack];
    newStack[index] = value;
    setFormData(prev => ({ ...prev, technologyStack: newStack }));
  };

  const addTechnologyStack = () => {
    setFormData(prev => ({ ...prev, technologyStack: [...prev.technologyStack, ""] }));
  };

  const removeTechnologyStack = (index: number) => {
    const newStack = formData.technologyStack.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, technologyStack: newStack.length > 0 ? newStack : [""] }));
  };

  const handleSupportedPlatformsChange = (index: number, value: string) => {
    const newPlatforms = [...formData.supportedPlatforms];
    newPlatforms[index] = value;
    setFormData(prev => ({ ...prev, supportedPlatforms: newPlatforms }));
  };

  const addSupportedPlatform = () => {
    setFormData(prev => ({ ...prev, supportedPlatforms: [...prev.supportedPlatforms, ""] }));
  };

  const removeSupportedPlatform = (index: number) => {
    const newPlatforms = formData.supportedPlatforms.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, supportedPlatforms: newPlatforms.length > 0 ? newPlatforms : [""] }));
  };

  const handleDependenciesChange = (index: number, value: string) => {
    const newDependencies = [...formData.dependencies];
    newDependencies[index] = value;
    setFormData(prev => ({ ...prev, dependencies: newDependencies }));
  };

  const addDependency = () => {
    setFormData(prev => ({ ...prev, dependencies: [...prev.dependencies, ""] }));
  };

  const removeDependency = (index: number) => {
    const newDependencies = formData.dependencies.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, dependencies: newDependencies.length > 0 ? newDependencies : [""] }));
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + formData.screenshots.length > 5) {
      setError("Maximum 5 screenshots allowed");
      return;
    }

    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > MAX_IMAGE_SIZE);
    if (oversizedFiles.length > 0) {
      setError(`Image too large. Maximum size is 5MB per image. Found: ${oversizedFiles.map(f => `${f.name} (${Math.round(f.size / 1024 / 1024)}MB)`).join(', ')}`);
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      setError(`Invalid file type. Only JPG, PNG, WebP, and GIF images are allowed.`);
      return;
    }

    setFormData(prev => ({ ...prev, screenshots: [...prev.screenshots, ...files] }));

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeScreenshot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      screenshots: prev.screenshots.filter((_, i) => i !== index)
    }));
    setScreenshotPreview(prev => prev.filter((_, i) => i !== index));
  };

  const handleAppIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
    if (file.size > MAX_IMAGE_SIZE) {
      setError("App icon too large. Maximum size is 2MB.");
      return;
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError("Invalid file type. Only JPG, PNG, and WebP images are allowed for app icon.");
      return;
    }

    setFormData(prev => ({ ...prev, appIcon: file }));

    const reader = new FileReader();
    reader.onloadend = () => {
      setAppIconPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeAppIcon = () => {
    setFormData(prev => ({ ...prev, appIcon: null }));
    setAppIconPreview("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.appName.trim()) {
      setError("Application name is required");
      return;
    }
    if (!formData.shortDescription.trim()) {
      setError("Short description is required");
      return;
    }
    if (!formData.appCategory) {
      setError("Please select an application category");
      return;
    }
    if (!formData.isFree && !formData.price) {
      setError("Please set a price or mark as free");
      return;
    }
    if (formData.screenshots.length === 0) {
      setError("Please upload at least one screenshot");
      return;
    }
    if (!formData.appIcon) {
      setError("Please upload an app icon");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.8)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      padding: "1rem",
      overflowY: "auto"
    }}>
      <div style={{
        background: "var(--bg)",
        borderRadius: "12px",
        maxWidth: "900px",
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto",
        padding: "2rem",
        position: "relative"
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "transparent",
            border: "none",
            fontSize: "1.5rem",
            cursor: "pointer",
            color: "var(--text)"
          }}
        >
          ×
        </button>

        <h2 style={{
          fontSize: "1.75rem",
          fontWeight: 700,
          marginBottom: "0.5rem",
          background: "linear-gradient(90deg, var(--accent), var(--primary))",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent"
        }}>
          Complete Your Pre-Listing
        </h2>
        <p style={{ color: "var(--muted)", marginBottom: "2rem" }}>
          Fill in application details to prepare for launch
        </p>

        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid var(--danger)",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1rem",
            color: "var(--danger)"
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Basic Information */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Basic Information
            </h3>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Application Name *
              </label>
              <input
                type="text"
                value={formData.appName}
                onChange={(e) => handleInputChange('appName', e.target.value)}
                placeholder="Enter application name"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Short Description * (max 200 characters)
              </label>
              <textarea
                value={formData.shortDescription}
                onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                placeholder="Brief description of your application"
                maxLength={200}
                rows={2}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              />
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", textAlign: "right" }}>
                {formData.shortDescription.length}/200
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Detailed Description *
              </label>
              <textarea
                value={formData.detailedDescription}
                onChange={(e) => handleInputChange('detailedDescription', e.target.value)}
                placeholder="Detailed description of your application, features, and use cases"
                rows={5}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Application Category *
              </label>
              <select
                value={formData.appCategory}
                onChange={(e) => handleInputChange('appCategory', e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              >
                <option value="">Select category</option>
                {APP_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Tags
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                placeholder="e.g., react, typescript, api"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              />
            </div>
          </div>

          {/* Technology Stack */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Technology Stack
            </h3>
            
            {formData.technologyStack.map((tech, index) => (
              <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <input
                  type="text"
                  value={tech}
                  onChange={(e) => handleTechnologyStackChange(index, e.target.value)}
                  placeholder="Technology or framework"
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    borderRadius: "6px",
                    border: "1px solid var(--border)",
                    background: "var(--bg-secondary)",
                    color: "var(--text)"
                  }}
                />
                {formData.technologyStack.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTechnologyStack(index)}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--danger)",
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "var(--danger)",
                      cursor: "pointer"
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addTechnologyStack}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                border: "1px dashed var(--border)",
                background: "transparent",
                color: "var(--primary)",
                cursor: "pointer"
              }}
            >
              + Add Technology
            </button>
          </div>

          {/* Pricing */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Pricing
            </h3>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem", fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={formData.isFree}
                  onChange={(e) => handleInputChange('isFree', e.target.checked)}
                  style={{ width: "auto" }}
                />
                This application is free
              </label>
            </div>

            {!formData.isFree && (
              <>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                    Price *
                  </label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      style={{
                        flex: 1,
                        padding: "0.75rem",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "var(--bg-secondary)",
                        color: "var(--text)"
                      }}
                    />
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange('currency', e.target.value)}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "var(--bg-secondary)",
                        color: "var(--text)"
                      }}
                    >
                      {CURRENCIES.map(currency => (
                        <option key={currency} value={currency}>{currency}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                License Type *
              </label>
              <select
                value={formData.licenseType}
                onChange={(e) => handleInputChange('licenseType', e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              >
                {LICENSE_TYPES.map(license => (
                  <option key={license} value={license}>{license}</option>
                ))}
              </select>
            </div>
          </div>

          {/* URLs & Links */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              URLs & Links
            </h3>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Live Demo URL
              </label>
              <input
                type="url"
                value={formData.liveDemo}
                onChange={(e) => handleInputChange('liveDemo', e.target.value)}
                placeholder="https://"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                GitHub Repository URL
              </label>
              <input
                type="url"
                value={formData.githubRepo}
                onChange={(e) => handleInputChange('githubRepo', e.target.value)}
                placeholder="https://github.com/"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Documentation URL
              </label>
              <input
                type="url"
                value={formData.documentationUrl}
                onChange={(e) => handleInputChange('documentationUrl', e.target.value)}
                placeholder="https://"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Video Demo URL
              </label>
              <input
                type="url"
                value={formData.videoDemo}
                onChange={(e) => handleInputChange('videoDemo', e.target.value)}
                placeholder="https://youtube.com/"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              />
            </div>
          </div>

          {/* Platform & Dependencies */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Platform & Dependencies
            </h3>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Supported Platforms
              </label>
              {formData.supportedPlatforms.map((platform, index) => (
                <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <input
                    type="text"
                    value={platform}
                    onChange={(e) => handleSupportedPlatformsChange(index, e.target.value)}
                    placeholder="e.g., Windows, macOS, Linux"
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--bg-secondary)",
                      color: "var(--text)"
                    }}
                  />
                  {formData.supportedPlatforms.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSupportedPlatform(index)}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "6px",
                        border: "1px solid var(--danger)",
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "var(--danger)",
                        cursor: "pointer"
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addSupportedPlatform}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  border: "1px dashed var(--border)",
                  background: "transparent",
                  color: "var(--primary)",
                  cursor: "pointer"
                }}
              >
                + Add Platform
              </button>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Dependencies
              </label>
              {formData.dependencies.map((dep, index) => (
                <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <input
                    type="text"
                    value={dep}
                    onChange={(e) => handleDependenciesChange(index, e.target.value)}
                    placeholder="e.g., node >= 14, python >= 3.8"
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      borderRadius: "6px",
                      border: "1px solid var(--border)",
                      background: "var(--bg-secondary)",
                      color: "var(--text)"
                    }}
                  />
                  {formData.dependencies.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDependency(index)}
                      style={{
                        padding: "0.75rem",
                        borderRadius: "6px",
                        border: "1px solid var(--danger)",
                        background: "rgba(239, 68, 68, 0.1)",
                        color: "var(--danger)",
                        cursor: "pointer"
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addDependency}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  border: "1px dashed var(--border)",
                  background: "transparent",
                  color: "var(--primary)",
                  cursor: "pointer"
                }}
              >
                + Add Dependency
              </button>
            </div>
          </div>

          {/* Commercial Terms */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Commercial Terms
            </h3>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Commercial Use
              </label>
              <select
                value={formData.commercialUse}
                onChange={(e) => handleInputChange('commercialUse', e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              >
                {COMMERCIAL_USE_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Resale Rights
              </label>
              <select
                value={formData.resaleRights}
                onChange={(e) => handleInputChange('resaleRights', e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              >
                {RESALE_RIGHTS_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Support Level
              </label>
              <select
                value={formData.supportLevel}
                onChange={(e) => handleInputChange('supportLevel', e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              >
                {SUPPORT_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Update Frequency
              </label>
              <select
                value={formData.updateFrequency}
                onChange={(e) => handleInputChange('updateFrequency', e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              >
                {UPDATE_FREQUENCIES.map(freq => (
                  <option key={freq} value={freq}>{freq}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Warranty
              </label>
              <select
                value={formData.warranty}
                onChange={(e) => handleInputChange('warranty', e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              >
                {WARRANTY_OPTIONS.map(warranty => (
                  <option key={warranty} value={warranty}>{warranty}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Installation Support
              </label>
              <select
                value={formData.installationSupport}
                onChange={(e) => handleInputChange('installationSupport', e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              >
                {INSTALLATION_SUPPORT_OPTIONS.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Visual Assets */}
          <div style={{ marginBottom: "2rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Visual Assets
            </h3>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                App Icon * (Max 2MB, JPG/PNG/WebP)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleAppIconChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              />
              {appIconPreview && (
                <div style={{ marginTop: "1rem", position: "relative" }}>
                  <img
                    src={appIconPreview}
                    alt="App Icon Preview"
                    style={{
                      width: "100px",
                      height: "100px",
                      objectFit: "cover",
                      borderRadius: "12px",
                      border: "2px solid var(--border)"
                    }}
                  />
                  <button
                    type="button"
                    onClick={removeAppIcon}
                    style={{
                      position: "absolute",
                      top: "-8px",
                      right: "-8px",
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "var(--danger)",
                      color: "white",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "0.75rem"
                    }}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
                Screenshots * (Max 5, Max 5MB each, JPG/PNG/WebP/GIF)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                multiple
                onChange={handleScreenshotChange}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-secondary)",
                  color: "var(--text)"
                }}
              />
              {screenshotPreview.length > 0 && (
                <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))", gap: "0.5rem" }}>
                  {screenshotPreview.map((preview, index) => (
                    <div key={index} style={{ position: "relative" }}>
                      <img
                        src={preview}
                        alt={`Screenshot ${index + 1}`}
                        style={{
                          width: "100%",
                          aspectRatio: "16/9",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "2px solid var(--border)"
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeScreenshot(index)}
                        style={{
                          position: "absolute",
                          top: "-8px",
                          right: "-8px",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "var(--danger)",
                          color: "white",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.75rem"
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: "1rem",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text)",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontSize: "1rem",
                fontWeight: 600
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: "1rem",
                borderRadius: "8px",
                border: "none",
                background: "linear-gradient(135deg, var(--accent), var(--primary))",
                color: "white",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontSize: "1rem",
                fontWeight: 600,
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              {isSubmitting ? "Submitting..." : "Submit Pre-Listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}