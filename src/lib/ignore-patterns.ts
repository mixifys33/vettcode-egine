/** Directory and file patterns excluded from vetting (deps, build output, VCS, etc.) */
export const IGNORED_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".github",
  ".svn",
  ".hg",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  "coverage",
  ".cache",
  ".turbo",
  "vendor",
  "bower_components",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".venv",
  "venv",
  "env",
  ".env",
  "target",
  "obj",
  ".gradle",
  ".idea",
  ".vscode",
  "Pods",
  "DerivedData",
  ".parcel-cache",
  ".svelte-kit",
  "storybook-static",
  ".vercel",
  "pkg",
  "deps",
  "_build",
  "elm-stuff",
  ".stack-work",
  "zig-cache",
  "zig-out",
  "test",           // Test directories
  "tests",          // Test directories
  "__tests__",      // Jest test directories
  "spec",           // Spec directories
  "specs",          // Spec directories
  "e2e",            // End-to-end test directories
  "cypress",        // Cypress test directories
  "playwright",     // Playwright test directories
  ".jest",          // Jest config directories
  ".mocha",         // Mocha config directories
]);

export const IGNORED_FILE_NAMES = new Set([
  ".DS_Store",
  "Thumbs.db",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "Cargo.lock",
  "composer.lock",
  "Gemfile.lock",
  "poetry.lock",
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "LICENSE.md",
  "CODE_OF_CONDUCT.md",
]);

export const IGNORED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".svg",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp4",
  ".mp3",
  ".wav",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".pdf",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".wasm",
  ".map",
  ".min.js",
  ".min.css",
  ".lock",
  ".pyc",
  ".class",
  ".jar",
  ".o",
  ".a",
  ".md",      // Markdown files - documentation only
  ".mdx",     // MDX files - documentation only
]);

export const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".vue",
  ".svelte",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".kts",
  ".scala",
  ".php",
  ".cs",
  ".cpp",
  ".c",
  ".h",
  ".hpp",
  ".swift",
  ".dart",
  ".lua",
  ".sh",
  ".bash",
  ".zsh",
  ".ps1",
  ".sql",
  ".graphql",
  ".gql",
  ".yaml",
  ".yml",
  ".toml",
  ".xml",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".env.example",
  ".prisma",
  ".proto",
  ".tf",
  ".hcl",
  ".dockerfile",
  ".gradle",
  ".properties",
  ".ini",
  ".cfg",
  ".conf",
  ".env.local.example",
]);

export function shouldIgnorePath(relativePath: string): boolean {
  const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
  const parts = normalized.split("/");

  for (const part of parts) {
    if (IGNORED_DIR_NAMES.has(part)) return true;
    if (part.startsWith(".") && part !== ".env.example" && part !== ".gitignore") {
      if ([".github", ".gitlab", ".circleci"].includes(part)) continue;
      if (part.length > 1 && !part.includes("env")) return true;
    }
  }

  const fileName = parts[parts.length - 1] ?? "";
  if (IGNORED_FILE_NAMES.has(fileName)) return true;

  // Ignore test files by pattern
  const testPatterns = [
    /\.test\.(ts|tsx|js|jsx)$/,      // file.test.ts
    /\.spec\.(ts|tsx|js|jsx)$/,      // file.spec.ts
    /\.test\.(py|rb|go|java|php)$/,  // file.test.py
    /\.spec\.(py|rb|go|java|php)$/,  // file.spec.py
    /_test\.(ts|tsx|js|jsx|py|go)$/, // file_test.go
    /_spec\.(ts|tsx|js|jsx|py|rb)$/, // file_spec.rb
    /test_.*\.(py|rb)$/,              // test_file.py
    /.*\.e2e\.(ts|tsx|js|jsx)$/,     // file.e2e.ts
    /.*\.integration\.(ts|tsx|js|jsx)$/, // file.integration.ts
  ];
  
  for (const pattern of testPatterns) {
    if (pattern.test(fileName)) return true;
  }

  const dot = fileName.lastIndexOf(".");
  const ext = dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
  if (ext && IGNORED_EXTENSIONS.has(ext)) return true;

  if (!ext && !fileName.includes(".")) {
    const noExtAllowed = new Set([
      "dockerfile",
      "makefile",
      "gemfile",
      "rakefile",
      "procfile",
      "vagrantfile",
    ]);
    if (!noExtAllowed.has(fileName.toLowerCase())) {
      return false;
    }
  }

  if (ext && !TEXT_EXTENSIONS.has(ext)) {
    if (!fileName.endsWith(".d.ts")) return true;
  }

  return false;
}
