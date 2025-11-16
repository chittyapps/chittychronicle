/**
 * Marie Kondo Evidence Importer
 *
 * Intelligent evidence organization inspired by the KonMari method:
 * - Categorize by type and relevance
 * - Eliminate duplicates
 * - Create order from chaos
 * - Maintain chain of custody
 *
 * "Does this evidence spark legal victory?" - Marie Kondo (probably)
 */

import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';
import crypto from 'crypto';
import { createAIClient } from '../lib/cloudflare-ai';

interface EvidenceFile {
  path: string;
  name: string;
  type: string;
  size: number;
  hash: string;
  created_at: string;
  modified_at: string;
  category?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  metadata?: any;
}

interface OrganizationResult {
  total_files: number;
  organized: number;
  duplicates: number;
  errors: number;
  categories: { [key: string]: number };
  processing_time_ms: number;
}

interface OrganizeOptions {
  source_path: string;
  auto_categorize: boolean;
  detect_duplicates: boolean;
  analyze_contradictions: boolean;
  dry_run?: boolean;
}

/**
 * Marie Kondo Evidence Importer
 * "Tidying up evidence is about choosing joy... and winning cases."
 */
export class MarieKondoImporter {
  private config: any;
  private ai: any;
  private fileHashes: Map<string, string[]> = new Map();
  private categories: Map<string, string[]> = new Map();

  constructor(config: any) {
    this.config = config;

    this.ai = createAIClient({
      preferCloudflare: true
    });

    console.log('[MarieKondo] Initialized evidence organizer');
  }

  /**
   * Organize evidence from source path
   * "The KonMari Method for Legal Evidence"
   */
  async organize_evidence(options: OrganizeOptions): Promise<OrganizationResult> {
    const startTime = Date.now();
    console.log('[MarieKondo] Starting evidence organization...');
    console.log('[MarieKondo] Source:', options.source_path);

    const result: OrganizationResult = {
      total_files: 0,
      organized: 0,
      duplicates: 0,
      errors: 0,
      categories: {},
      processing_time_ms: 0
    };

    try {
      // Step 1: Scan for all evidence files
      const files = await this.scan_directory(options.source_path);
      result.total_files = files.length;
      console.log(`[MarieKondo] Found ${files.length} files to organize`);

      // Step 2: Process each file
      for (const file of files) {
        try {
          // Calculate file hash
          file.hash = await this.calculate_hash(file.path);

          // Check for duplicates
          if (options.detect_duplicates) {
            if (this.is_duplicate(file.hash)) {
              result.duplicates++;
              console.log(`[MarieKondo] Duplicate found: ${file.name}`);
              continue;
            }
            this.register_hash(file.hash, file.path);
          }

          // Categorize evidence
          if (options.auto_categorize) {
            file.category = await this.ai_categorize(file);
            file.priority = this.determine_priority(file);

            // Track category counts
            result.categories[file.category] = (result.categories[file.category] || 0) + 1;

            // Store in category map
            if (!this.categories.has(file.category)) {
              this.categories.set(file.category, []);
            }
            this.categories.get(file.category)!.push(file.path);
          }

          // Extract metadata
          file.metadata = await this.extract_metadata(file);

          result.organized++;

          if (!options.dry_run) {
            // TODO: Store in database
            // await this.store_evidence(file);
          }

          console.log(`[MarieKondo] Organized: ${file.name} → ${file.category} (${file.priority})`);
        } catch (error) {
          console.error(`[MarieKondo] Error processing ${file.path}:`, error);
          result.errors++;
        }
      }

      result.processing_time_ms = Date.now() - startTime;

      // Print summary
      this.print_summary(result);

      return result;
    } catch (error) {
      console.error('[MarieKondo] Organization failed:', error);
      result.processing_time_ms = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Scan directory recursively for evidence files
   */
  private async scan_directory(dirPath: string): Promise<EvidenceFile[]> {
    const files: EvidenceFile[] = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dirPath, entry.name);

        if (entry.isDirectory()) {
          // Skip excluded directories
          if (this.should_exclude(entry.name)) {
            continue;
          }

          // Recursively scan subdirectories
          const subFiles = await this.scan_directory(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          // Check if file matches patterns
          if (this.matches_patterns(entry.name)) {
            const stats = await fs.stat(fullPath);

            files.push({
              path: fullPath,
              name: entry.name,
              type: extname(entry.name).toLowerCase(),
              size: stats.size,
              hash: '',
              created_at: stats.birthtime.toISOString(),
              modified_at: stats.mtime.toISOString()
            });
          }
        }
      }
    } catch (error) {
      console.error(`[MarieKondo] Error scanning directory ${dirPath}:`, error);
    }

    return files;
  }

  /**
   * Check if directory should be excluded
   */
  private should_exclude(name: string): boolean {
    const excludePatterns = this.config.business.evidence.source_paths[0]?.exclude_patterns || [];

    return excludePatterns.some((pattern: string) => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(name);
    });
  }

  /**
   * Check if file matches inclusion patterns
   */
  private matches_patterns(filename: string): boolean {
    const patterns = this.config.business.evidence.source_paths[0]?.patterns || [];

    return patterns.some((pattern: string) => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filename);
    });
  }

  /**
   * Calculate file hash for duplicate detection
   */
  private async calculate_hash(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
      console.error(`[MarieKondo] Error hashing ${filePath}:`, error);
      return '';
    }
  }

  /**
   * Check if file is duplicate based on hash
   */
  private is_duplicate(hash: string): boolean {
    return this.fileHashes.has(hash);
  }

  /**
   * Register file hash
   */
  private register_hash(hash: string, path: string): void {
    if (!this.fileHashes.has(hash)) {
      this.fileHashes.set(hash, []);
    }
    this.fileHashes.get(hash)!.push(path);
  }

  /**
   * AI-powered evidence categorization
   * "Does this evidence spark legal victory?"
   */
  private async ai_categorize(file: EvidenceFile): Promise<string> {
    try {
      // Use filename and type as context for categorization
      const context = `
File: ${file.name}
Type: ${file.type}
Size: ${file.size} bytes
Path: ${file.path}
`;

      const message = await this.ai.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        temperature: 0.1,
        messages: [{
          role: 'user',
          content: `You are a legal document categorization expert.

Categorize this evidence file for the case: ${this.config.business.case.name}

${context}

Available categories:
- financial_records: Bank statements, transactions, wire transfers, checks
- property_documentation: Deeds, titles, mortgages, leases, real estate
- communication_records: Emails, texts, messages, letters, correspondence
- court_filings: Petitions, motions, responses, orders, judgments
- sworn_statements: Affidavits, depositions, testimony, sworn declarations
- contradictory_evidence: Documents showing contradictions or false statements
- supporting_documentation: Receipts, invoices, contracts, agreements

Return ONLY the category name (e.g., "financial_records").`
        }]
      });

      const category = (message.content[0] as any).text.trim().toLowerCase().replace(/[^a-z_]/g, '');

      // Validate category
      const validCategories = this.config.business.evidence.categories.map((c: any) => c.name);
      if (validCategories.includes(category)) {
        return category;
      }

      return 'supporting_documentation'; // Default category
    } catch (error) {
      console.error('[MarieKondo] AI categorization failed:', error);
      return 'uncategorized';
    }
  }

  /**
   * Determine evidence priority based on category and keywords
   */
  private determine_priority(file: EvidenceFile): 'critical' | 'high' | 'medium' | 'low' {
    const category = file.category || '';

    // Find category config
    const categoryConfig = this.config.business.evidence.categories.find(
      (c: any) => c.name === category
    );

    if (!categoryConfig) {
      return 'low';
    }

    // Check if filename contains priority keywords
    const filename = file.name.toLowerCase();
    const keywords = categoryConfig.keywords || [];

    const matchCount = keywords.filter((keyword: string) =>
      filename.includes(keyword.toLowerCase())
    ).length;

    // Determine priority based on category priority and keyword matches
    const basePriority = categoryConfig.priority || 'medium';

    if (basePriority === 'critical' || matchCount >= 3) {
      return 'critical';
    } else if (basePriority === 'high' || matchCount >= 2) {
      return 'high';
    } else if (basePriority === 'medium' || matchCount >= 1) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Extract metadata from evidence file
   */
  private async extract_metadata(file: EvidenceFile): Promise<any> {
    // TODO: Implement comprehensive metadata extraction
    // - OCR for scanned documents
    // - EXIF data for images
    // - Document properties for PDFs/Word docs
    // - Email headers for .eml/.msg files

    return {
      original_path: file.path,
      file_type: file.type,
      file_size: file.size,
      hash: file.hash,
      created_at: file.created_at,
      modified_at: file.modified_at,
      category: file.category,
      priority: file.priority
    };
  }

  /**
   * Scan for new files in source paths
   */
  async scan_for_new_files(): Promise<string[]> {
    const sourcePath = this.config.business.evidence.source_paths[0]?.path;
    if (!sourcePath) {
      return [];
    }

    const files = await this.scan_directory(sourcePath);

    // Filter only new files (not in fileHashes)
    const newFiles: string[] = [];

    for (const file of files) {
      const hash = await this.calculate_hash(file.path);
      if (!this.is_duplicate(hash)) {
        newFiles.push(file.path);
      }
    }

    return newFiles;
  }

  /**
   * Validate evidence integrity using stored hashes
   */
  async validate_hashes(): Promise<boolean> {
    console.log('[MarieKondo] Validating evidence integrity...');

    let valid = true;

    for (const [hash, paths] of this.fileHashes.entries()) {
      for (const path of paths) {
        try {
          const currentHash = await this.calculate_hash(path);
          if (currentHash !== hash) {
            console.error(`[MarieKondo] INTEGRITY VIOLATION: ${path}`);
            valid = false;
          }
        } catch (error) {
          console.error(`[MarieKondo] Error validating ${path}:`, error);
          valid = false;
        }
      }
    }

    console.log(`[MarieKondo] Integrity validation: ${valid ? 'PASSED' : 'FAILED'}`);
    return valid;
  }

  /**
   * Print organization summary
   * "The life-changing magic of tidying up legal evidence"
   */
  private print_summary(result: OrganizationResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('  ✨ Marie Kondo Evidence Organization Summary ✨');
    console.log('='.repeat(60));
    console.log(`Total Files:       ${result.total_files}`);
    console.log(`Organized:         ${result.organized}`);
    console.log(`Duplicates:        ${result.duplicates}`);
    console.log(`Errors:            ${result.errors}`);
    console.log(`Processing Time:   ${result.processing_time_ms}ms`);
    console.log('\nCategories:');

    for (const [category, count] of Object.entries(result.categories)) {
      console.log(`  - ${category.padEnd(30)} ${count} files`);
    }

    console.log('='.repeat(60));
    console.log('  "A place for everything, and everything in its place."');
    console.log('='.repeat(60) + '\n');
  }
}

export default MarieKondoImporter;
