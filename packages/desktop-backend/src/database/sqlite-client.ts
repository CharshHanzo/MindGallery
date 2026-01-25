import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import { LocalImage, ListOptions, SearchQuery } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class SqliteClient {
  private db: Database.Database;

  constructor(dbPath: string) {
    // Ensure directory exists
    fs.ensureDirSync(path.dirname(dbPath));
    
    this.db = new Database(dbPath);
    this.initExtensions();
    this.initSchema();
  }

  private async initExtensions() {
    try {
      // Dynamic import for ESM module
      const sqliteVss = await import('sqlite-vss');
      sqliteVss.load(this.db);
    } catch (error) {
      console.warn('Failed to load sqlite-vss extension. Vector search will be disabled.', error);
    }
  }

  private initSchema() {
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');

    const schema = `
      CREATE TABLE IF NOT EXISTS images (
        id TEXT PRIMARY KEY,
        file_path TEXT UNIQUE NOT NULL,
        file_name TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        format TEXT,
        metadata TEXT
      );

      -- Virtual table for vector search using vss0
      -- We check if the module is loaded before creating to avoid errors if load failed
      -- Note: In a real app, we might handle this conditionally.
      -- Here we assume vss0 is available if load succeeded.
    `;
    
    this.db.exec(schema);

    // Create vss table separately to handle potential missing extension gracefully
    try {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS image_vectors USING vss0(
          vector(512)
        );
      `);
    } catch (e) {
      console.warn('Could not create virtual vector table (vss0 might be missing).');
    }
  }

  // --- Image Operations ---

  addImage(image: Omit<LocalImage, 'id' | 'createdAt' | 'updatedAt'>): LocalImage {
    const id = uuidv4();
    const now = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO images (id, file_path, file_name, file_size, created_at, updated_at, width, height, format, metadata)
      VALUES (@id, @filePath, @fileName, @fileSize, @createdAt, @updatedAt, @width, @height, @format, @metadata)
    `);

    const newImage: LocalImage = {
      ...image,
      id,
      createdAt: now,
      updatedAt: now,
      metadata: image.metadata || {}
    };

    stmt.run({
      ...newImage,
      metadata: JSON.stringify(newImage.metadata)
    });

    return newImage;
  }

  getImages(options: ListOptions): LocalImage[] {
    const { limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;
    
    // Whitelist sort columns to prevent injection
    const validSortCols = ['createdAt', 'file_name', 'file_size'];
    const sortCol = validSortCols.includes(sortBy) ? sortBy : 'created_at'; // map camelCase to snake_case if needed, but schema uses created_at
    const dbSortCol = sortCol === 'createdAt' ? 'created_at' : (sortCol === 'fileSize' ? 'file_size' : 'file_name');

    const stmt = this.db.prepare(`
      SELECT * FROM images
      ORDER BY ${dbSortCol} ${sortOrder.toUpperCase()}
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(limit, offset) as any[];
    return rows.map(this.mapRowToImage);
  }

  getImageByPath(filePath: string): LocalImage | undefined {
    const stmt = this.db.prepare('SELECT * FROM images WHERE file_path = ?');
    const row = stmt.get(filePath) as any;
    return row ? this.mapRowToImage(row) : undefined;
  }

  deleteImages(ids: string[]) {
    const deleteImage = this.db.prepare('DELETE FROM images WHERE id = ?');
    const deleteVector = this.db.prepare('DELETE FROM image_vectors WHERE rowid = (SELECT rowid FROM images WHERE id = ?)'); // This logic depends on how we link vectors. Usually by rowid.

    const transaction = this.db.transaction((imageIds: string[]) => {
      for (const id of imageIds) {
        // Need to handle vector deletion logic correctly based on vss implementation
        // For vss0, usually we manage rowids. If we don't sync rowids explicitly, deletion might be tricky.
        // Simplified: just delete from images for now.
        deleteImage.run(id);
      }
    });

    transaction(ids);
  }

  // --- Vector Operations ---

  addVector(imageId: string, embedding: number[]) {
    // We need the rowid of the image to link it.
    // Or we store the imageId in the vector table if supported, but vss0 usually takes rowid.
    // Strategy: Use the same rowid for images and image_vectors if possible, or store a mapping.
    // Simple strategy: Get rowid from images table.
    const row = this.db.prepare('SELECT rowid FROM images WHERE id = ?').get(imageId) as { rowid: number };
    if (!row) return;

    const stmt = this.db.prepare('INSERT INTO image_vectors(rowid, vector) VALUES (?, ?)');
    stmt.run(row.rowid, JSON.stringify(embedding));
  }

  searchByVector(embedding: number[], limit: number = 20): LocalImage[] {
    // vss search
    try {
      const stmt = this.db.prepare(`
        SELECT images.*, v.distance
        FROM image_vectors v
        JOIN images ON images.rowid = v.rowid
        WHERE v.vector MATCH ?
        ORDER BY v.distance
        LIMIT ?
      `);
      
      const rows = stmt.all(JSON.stringify(embedding), limit) as any[];
      return rows.map(this.mapRowToImage);
    } catch (e) {
      console.error('Vector search failed:', e);
      return [];
    }
  }

  // --- Stats ---
  
  getStats() {
    const count = this.db.prepare('SELECT COUNT(*) as count FROM images').get() as { count: number };
    const size = this.db.prepare('SELECT SUM(file_size) as size FROM images').get() as { size: number };
    
    return {
      totalImages: count.count,
      totalSize: size.size || 0,
      lastScan: Date.now() // Placeholder
    };
  }

  private mapRowToImage(row: any): LocalImage {
    return {
      id: row.id,
      filePath: row.file_path,
      fileName: row.file_name,
      fileSize: row.file_size,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      width: row.width,
      height: row.height,
      format: row.format,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }
}
