#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Configuration
const CONFIG = {
  // Directories to process
  sourceDirectories: [
    "./src",
    "./components",
    // Add more directories as needed
  ],

  // File extensions to process
  fileExtensions: [".js", ".jsx", ".ts", ".tsx"],

  // Files/directories to ignore
  ignore: ["node_modules", "dist", "build", ".git", "*.test.*", "*.spec.*"],

  // Backup options
  createBackup: true,
  backupSuffix: ".backup",
};

/**
 * Check if jscodeshift is installed
 */
function checkDependencies() {
  try {
    require.resolve("jscodeshift");
    console.log("✅ jscodeshift is installed");
  } catch (error) {
    console.error("❌ jscodeshift is not installed");
    console.log("Please install it by running: npm install -g jscodeshift");
    process.exit(1);
  }
}

/**
 * Get all files to process
 */
function getFilesToProcess() {
  const files = [];

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) {
      console.warn(`⚠️  Directory ${dir} does not exist, skipping...`);
      return;
    }

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      // Skip ignored files/directories
      if (
        CONFIG.ignore.some((pattern) => {
          if (pattern.includes("*")) {
            return item.match(new RegExp(pattern.replace(/\*/g, ".*")));
          }
          return item === pattern;
        })
      ) {
        continue;
      }

      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (CONFIG.fileExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }
  }

  CONFIG.sourceDirectories.forEach((dir) => {
    scanDirectory(dir);
  });

  return files;
}

/**
 * Create backup of files
 */
function createBackups(files) {
  if (!CONFIG.createBackup) return;

  console.log("📦 Creating backups...");
  files.forEach((file) => {
    const backupFile = file + CONFIG.backupSuffix;
    fs.copyFileSync(file, backupFile);
  });
  console.log(`✅ Created ${files.length} backup files`);
}

/**
 * Run the codemod transformation
 */
function runTransformation() {
  const codemodeFile = path.join(__dirname, "ui-migration-codemod.js");

  // Check if codemod file exists
  if (!fs.existsSync(codemodeFile)) {
    console.error(`❌ Codemod file not found: ${codemodeFile}`);
    console.log(
      "Please make sure the codemod file is in the same directory as this script"
    );
    process.exit(1);
  }

  const targetPaths = CONFIG.sourceDirectories.join(" ");
  const extensions = CONFIG.fileExtensions
    .map((ext) => ext.replace(".", ""))
    .join(",");

  const command = `jscodeshift -t ${codemodeFile} ${targetPaths} --extensions=${extensions} --ignore-pattern="node_modules/**/*"`;

  console.log("🚀 Running transformation...");
  console.log(`Command: ${command}`);

  try {
    execSync(command, { stdio: "inherit" });
    console.log("✅ Transformation completed successfully!");
  } catch (error) {
    console.error("❌ Transformation failed:", error.message);
    process.exit(1);
  }
}

/**
 * Clean up backup files
 */
function cleanupBackups() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question("Do you want to remove backup files? (y/N): ", (answer) => {
    if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
      const files = getFilesToProcess();
      files.forEach((file) => {
        const backupFile = file + CONFIG.backupSuffix;
        if (fs.existsSync(backupFile)) {
          fs.unlinkSync(backupFile);
        }
      });
      console.log("🗑️  Backup files removed");
    }
    rl.close();
  });
}

/**
 * Main execution function
 */
function main() {
  console.log("🔄 UI Library Migration Script");
  console.log("================================");

  // Check dependencies
  checkDependencies();

  // Get files to process
  const files = getFilesToProcess();
  console.log(`📁 Found ${files.length} files to process`);

  if (files.length === 0) {
    console.log("No files found to process. Exiting...");
    return;
  }

  // Show files that will be processed
  console.log("Files to be processed:");
  files.forEach((file) => console.log(`  - ${file}`));

  // Create backups
  createBackups(files);

  // Run transformation
  runTransformation();

  // Offer to clean up backups
  if (CONFIG.createBackup) {
    cleanupBackups();
  }

  console.log("🎉 Migration completed!");
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main, CONFIG };
