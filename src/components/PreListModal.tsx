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
  projectName: string;
  projectDescription: string;
  detailedDescription: string;
  category: string;
  subCategory: string;
  tags: string;
  regularPrice: string;
  salePrice: string;
  licenseType: string;
  demoUrl: string;
  documentationUrl: string;
  videoUrl: string;
  features: string[];
  images: File[];
}

const CATEGORIES = {
  "Web Applications": ["SaaS", "E-commerce", "CMS", "Dashboard", "Landing Page", "Portfolio"],
  "Mobile Applications": ["iOS", "Android", "React Native", "Flutter", "Hybrid"],
  "Desktop Applications": ["Windows", "macOS", "Linux", "Cross-platform"],
  "APIs & Backend": ["REST API", "GraphQL", "Microservices", "Authentication", "Database"],
  "Libraries & Packages": ["npm Package", "Python Package", "Component Library", "Utility Library"],
  "Scripts & Automation": ["Build Tools", "CLI Tools", "Automation Scripts", "DevOps"],
  "Games": ["Web Games", "Mobile Games", "Desktop Games", "Game Engines"],
  "AI & ML": ["Machine Learning", "Data Science", "NLP", "Computer Vision"],
};

const LICENSE_TYPES = ["MIT", "Apache 2.0", "GPL", "Commercial", "Proprietary", "Other"];

export function PreListModal({ isOpen, onClose, report, onSubmit }: PreListModalProps) {
  const [formData, setFormData] = useState<PreListFormData>({
    projectName: report.metadata?.projectName || "Untitled Project",
    projectDescription: report.summary || "",
    detailedDescription: "",
    category: "",
    subCategory: "",
    tags: "",
    regularPrice: "",
    salePrice: "",
    licenseType: "Commercial",
    demoUrl: "",
    documentationUrl: "",
    videoUrl: "",
    features: [""],
    images: [],
  });

  const [imagePreview, setImagePreview] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill tags from scan
  useEffect(() => {
    if (isOpen && !formData.tags) {
      const languages = extractLanguages(report);
      const frameworks = extractFrameworks(report);
      const autoTags = [...languages, ...frameworks].join(", ");
      setFormData(prev => ({ ...prev, tags: autoTags }));
    }
  }, [isOpen, report]);

  const extractLanguages = (report: VettReport): string[] => {
    const languages = new Set<string>();
    
    // Extract from file extensions
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

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = value;
    setFormData(prev => ({ ...prev, features: newFeatures }));
  };

  const addFeature = () => {
    setFormData(prev => ({ ...prev, features: [...prev.features, ""] }));
  };

  const removeFeature = (index: number) => {
    const newFeatures = formData.features.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, features: newFeatures.length > 0 ? newFeatures : [""] }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + formData.images.length > 5) {
      setError("Maximum 5 images allowed");
      return;
    }

    // Validate file sizes (max 5MB per image)
    const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
    const oversizedFiles = files.filter(file => file.size > MAX_IMAGE_SIZE);
    if (oversizedFiles.length > 0) {
      setError(`Image too large. Maximum size is 5MB per image. Found: ${oversizedFiles.map(f => `${f.name} (${Math.round(f.size / 1024 / 1024)}MB)`).join(', ')}`);
      return;
    }

    // Validate file types
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    if (invalidFiles.length > 0) {
      setError(`Invalid file type. Only JPG, PNG, WebP, and GIF images are allowed.`);
      return;
    }

    setFormData(prev => ({ ...prev, images: [...prev.images, ...files] }));

    // Generate previews
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    setImagePreview(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.projectName.trim()) {
      setError("Project name is required");
      return;
    }
    if (!formData.category || !formData.subCategory) {
      setError("Please select category and subcategory");
      return;
    }
    if (!formData.regularPrice || !formData.salePrice) {
      setError("Please set both regular and sale price");
      return;
    }
    if (parseFloat(formData.salePrice) > parseFloat(formData.regularPrice)) {
      setError("Sale price cannot be higher than regular price");
      return;
    }
    if (formData.images.length === 0) {
      setError("Please upload at least one product image");
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

  const subCategories = formData.category ? CATEGORIES[formData.category as keyof typeof CATEGORIES] || [] : [];

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
        maxWidth: "800px",
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto",
        border: "2px solid var(--border)",
        boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5)"
      }}>
        {/* Header */}
        <div style={{
          padding: "1.5rem",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          background: "var(--bg)",
          zIndex: 1
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
                Complete Your Pre-Listing
              </h2>
              <p style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                Fill in product details to prepare for launch
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "var(--muted)",
                padding: "0.5rem"
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: "1.5rem" }}>
          {error && (
            <div style={{
              padding: "1rem",
              background: "rgba(244, 63, 94, 0.1)",
              border: "1px solid var(--danger)",
              borderRadius: "8px",
              color: "var(--danger)",
              marginBottom: "1.5rem"
            }}>
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Basic Information
            </h3>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                Project Name *
              </label>
              <input
                type="text"
                value={formData.projectName}
                onChange={(e) => handleInputChange("projectName", e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "0.95rem"
                }}
                required
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                Short Description *
              </label>
              <textarea
                value={formData.projectDescription}
                onChange={(e) => handleInputChange("projectDescription", e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "0.95rem",
                  resize: "vertical"
                }}
                required
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                Detailed Description
              </label>
              <textarea
                value={formData.detailedDescription}
                onChange={(e) => handleInputChange("detailedDescription", e.target.value)}
                rows={5}
                placeholder="Provide a comprehensive description of your codebase, its features, and use cases..."
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "0.95rem",
                  resize: "vertical"
                }}
              />
            </div>
          </div>

          {/* Category */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Category
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    handleInputChange("category", e.target.value);
                    handleInputChange("subCategory", "");
                  }}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "0.95rem"
                  }}
                  required
                >
                  <option value="">Select category</option>
                  {Object.keys(CATEGORIES).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                  Subcategory *
                </label>
                <select
                  value={formData.subCategory}
                  onChange={(e) => handleInputChange("subCategory", e.target.value)}
                  disabled={!formData.category}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "0.95rem",
                    opacity: formData.category ? 1 : 0.5
                  }}
                  required
                >
                  <option value="">Select subcategory</option>
                  {subCategories.map(sub => (
                    <option key={sub} value={sub}>{sub}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginTop: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => handleInputChange("tags", e.target.value)}
                placeholder="React, TypeScript, API, Authentication"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "0.95rem"
                }}
              />
            </div>
          </div>

          {/* Pricing */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Pricing
            </h3>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                  Regular Price (USD) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.regularPrice}
                  onChange={(e) => handleInputChange("regularPrice", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "0.95rem"
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                  Sale Price (USD) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.salePrice}
                  onChange={(e) => handleInputChange("salePrice", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "0.95rem"
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                  License Type
                </label>
                <select
                  value={formData.licenseType}
                  onChange={(e) => handleInputChange("licenseType", e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "0.95rem"
                  }}
                >
                  {LICENSE_TYPES.map(license => (
                    <option key={license} value={license}>{license}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Features */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Key Features
            </h3>
            
            {formData.features.map((feature, index) => (
              <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => handleFeatureChange(index, e.target.value)}
                  placeholder={`Feature ${index + 1}`}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "6px",
                    color: "var(--text)",
                    fontSize: "0.95rem"
                  }}
                />
                {formData.features.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    style={{
                      padding: "0.75rem 1rem",
                      background: "transparent",
                      border: "1px solid var(--danger)",
                      borderRadius: "6px",
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
              onClick={addFeature}
              style={{
                padding: "0.75rem 1rem",
                background: "transparent",
                border: "1px solid var(--accent)",
                borderRadius: "6px",
                color: "var(--accent)",
                cursor: "pointer",
                fontSize: "0.9rem"
              }}
            >
              + Add Feature
            </button>
          </div>

          {/* Links */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Links (Optional)
            </h3>
            
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                Demo URL
              </label>
              <input
                type="url"
                value={formData.demoUrl}
                onChange={(e) => handleInputChange("demoUrl", e.target.value)}
                placeholder="https://demo.example.com"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "0.95rem"
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                Documentation URL
              </label>
              <input
                type="url"
                value={formData.documentationUrl}
                onChange={(e) => handleInputChange("documentationUrl", e.target.value)}
                placeholder="https://docs.example.com"
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "0.95rem"
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", fontWeight: 500 }}>
                Video URL (YouTube, Vimeo, etc.)
              </label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => handleInputChange("videoUrl", e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                  fontSize: "0.95rem"
                }}
              />
            </div>
          </div>

          {/* Images */}
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1rem" }}>
              Product Images * (Max 5)
            </h3>
            
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              style={{ display: "none" }}
              id="image-upload"
            />
            
            <label
              htmlFor="image-upload"
              style={{
                display: "block",
                padding: "2rem",
                border: "2px dashed var(--border)",
                borderRadius: "8px",
                textAlign: "center",
                cursor: "pointer",
                background: "var(--bg-secondary)",
                marginBottom: "1rem"
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📸</div>
              <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                Click to upload images (PNG, JPG, WebP)
              </div>
            </label>

            {imagePreview.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: "1rem" }}>
                {imagePreview.map((preview, index) => (
                  <div key={index} style={{ position: "relative" }}>
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "120px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        border: "1px solid var(--border)"
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      style={{
                        position: "absolute",
                        top: "0.5rem",
                        right: "0.5rem",
                        background: "var(--danger)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        width: "24px",
                        height: "24px",
                        cursor: "pointer",
                        fontSize: "0.8rem"
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: "0.75rem 1.5rem",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: "0.95rem",
                fontWeight: 600
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "0.75rem 2rem",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                border: "none",
                borderRadius: "8px",
                color: "#fff",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                fontSize: "0.95rem",
                fontWeight: 600,
                opacity: isSubmitting ? 0.6 : 1
              }}
            >
              {isSubmitting ? "Submitting..." : "Pre-List My Code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
