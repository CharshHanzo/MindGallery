import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs-extra';
import * as lancedb from '@lancedb/lancedb';
import { LocalImage, ListOptions } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class SqliteClient {
  private db: Database.Database;
  private lanceDbPath: string;
  private lance: lancedb.Connection | null = null;
  private vectorTable: lancedb.Table | null = null;

  constructor(dbPath: string) {
    // Ensure directory exists
    fs.ensureDirSync(path.dirname(dbPath));
    
    this.db = new Database(dbPath);
    this.initSchema();
    this.lanceDbPath = path.join(path.dirname(dbPath), 'vectors');
  }

  async init() {
    try {
      this.lance = await lancedb.connect(this.lanceDbPath);
      const tableNames = await this.lance.tableNames();
      if (tableNames.includes('image_vectors')) {
        this.vectorTable = await this.lance.openTable('image_vectors');
      }
    } catch (error) {
      console.error('Failed to initialize LanceDB:', error);
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
        hash TEXT,
        metadata TEXT,
        title TEXT,
        description TEXT
      );
      
      CREATE INDEX IF NOT EXISTS idx_images_hash ON images(hash);

      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS image_tags (
        image_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (image_id, tag_id),
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS albums (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        cover_image_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS album_images (
        album_id TEXT NOT NULL,
        image_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (album_id, image_id),
        FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE CASCADE,
        FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE
      );
    `;

    this.db.exec(schema);

    // Add missing columns to existing images table
    try {
      // Check if title column exists
      const columns = this.db.prepare('PRAGMA table_info(images)').all() as Array<{ name: string }>;
      const columnNames = columns.map(col => col.name);
      
      // Add title column if it doesn't exist
      if (!columnNames.includes('title')) {
        console.log('Adding title column to images table...');
        this.db.exec('ALTER TABLE images ADD COLUMN title TEXT');
        console.log('Title column added successfully');
      } else {
        console.log('Title column already exists');
      }
      
      // Add description column if it doesn't exist
      if (!columnNames.includes('description')) {
        console.log('Adding description column to images table...');
        this.db.exec('ALTER TABLE images ADD COLUMN description TEXT');
        console.log('Description column added successfully');
      } else {
        console.log('Description column already exists');
      }
    } catch (error) {
      console.log('Error checking/adding columns:', error);
    }
  }

  // --- Image Operations ---

  addImage(image: Omit<LocalImage, 'id' | 'createdAt' | 'updatedAt'>): LocalImage {
    const id = uuidv4();
    const now = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO images (id, file_path, file_name, file_size, created_at, updated_at, width, height, format, hash, metadata)
      VALUES (@id, @filePath, @fileName, @fileSize, @createdAt, @updatedAt, @width, @height, @format, @hash, @metadata)
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

  getImageByHash(hash: string): LocalImage | undefined {
    const stmt = this.db.prepare('SELECT * FROM images WHERE hash = ?');
    const row = stmt.get(hash) as any;
    return row ? this.mapRowToImage(row) : undefined;
  }

  getImages(options: ListOptions): LocalImage[] {
    const { limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc', tags } = options;
    
    // Whitelist sort columns to prevent injection
    const validSortCols = ['createdAt', 'file_name', 'file_size'];
    const sortCol = validSortCols.includes(sortBy) ? sortBy : 'created_at'; // map camelCase to snake_case if needed, but schema uses created_at
    const dbSortCol = sortCol === 'createdAt' ? 'created_at' : (sortCol === 'fileSize' ? 'file_size' : 'file_name');

    let query = '';
    let params: any[] = [];

    if (tags && tags.length > 0) {
      // 使用JOIN和GROUP BY实现标签筛选
      query = `
        SELECT i.* FROM images i
        JOIN image_tags it ON i.id = it.image_id
        JOIN tags t ON it.tag_id = t.id
        WHERE t.name IN (${tags.map(() => '?').join(',')})
        GROUP BY i.id
        HAVING COUNT(DISTINCT t.name) = ?
        ORDER BY ${dbSortCol} ${sortOrder.toUpperCase()}
        LIMIT ? OFFSET ?
      `;
      params = [...tags, tags.length, limit, offset];
    } else {
      // 普通查询
      query = `
        SELECT * FROM images
        ORDER BY ${dbSortCol} ${sortOrder.toUpperCase()}
        LIMIT ? OFFSET ?
      `;
      params = [limit, offset];
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];
    return rows.map((row) => this.mapRowToImage(row));
  }

  getImageByPath(filePath: string): LocalImage | undefined {
    const stmt = this.db.prepare('SELECT * FROM images WHERE file_path = ?');
    const row = stmt.get(filePath) as any;
    return row ? this.mapRowToImage(row) : undefined;
  }

  getImageById(id: string): LocalImage | undefined {
    const stmt = this.db.prepare('SELECT * FROM images WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToImage(row) : undefined;
  }

  // 更新图片信息
  updateImage(id: string, data: {
    filename?: string;
    title?: string;
    description?: string;
    tags?: string[];
    albumIds?: string[];
  }) {
    const now = Date.now();
    const updates: any[] = [];
    const params: any[] = [];

    // 构建更新语句
    if (data.filename) {
      updates.push('file_name = ?');
      params.push(data.filename);
    }

    if (data.title !== undefined) {
      updates.push('title = ?');
      params.push(data.title);
    }

    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }

    // 总是更新updated_at
    updates.push('updated_at = ?');
    params.push(now);

    // 添加id参数
    params.push(id);

    if (updates.length > 1) { // 至少有updated_at
      const sql = `UPDATE images SET ${updates.join(', ')} WHERE id = ?`;
      this.db.prepare(sql).run(...params);
    }

    // 处理标签更新
    if (data.tags !== undefined) {
      // 1. 删除当前图片的所有标签关联
      this.db.prepare('DELETE FROM image_tags WHERE image_id = ?').run(id);
      
      // 2. 为每个标签创建新的关联
      for (const tagName of data.tags) {
        // 查找或创建标签
        const tagResult = this.db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName) as any;
        let tagId = tagResult?.id;
        if (!tagId) {
          // 如果标签不存在，创建它
          tagId = this.createTag(tagName).id;
        }
        // 创建图片-标签关联
        this.db.prepare('INSERT INTO image_tags (image_id, tag_id, created_at) VALUES (?, ?, ?)').run(id, tagId, now);
      }
    }

    // 如果有相册更新，这里可以添加相册处理逻辑

    // 返回更新后的图片
    return this.getImageById(id);
  }

  // --- Tag Operations ---

  getTags() {
    const tags = this.db.prepare('SELECT * FROM tags ORDER BY updated_at DESC').all() as any[];
    // 为每个标签计算使用次数
    return tags.map(tag => {
      const countResult = this.db.prepare('SELECT COUNT(*) as count FROM image_tags WHERE tag_id = ?').get(tag.id) as any;
      const count = countResult?.count || 0;
      return {
        id: tag.id,
        name: tag.name,
        count: count
      };
    });
  }

  createTag(name: string) {
    const id = uuidv4();
    const now = Date.now();
    this.db.prepare('INSERT INTO tags (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(id, name, now, now);
    return { id, name, createdAt: now, updatedAt: now };
  }

  updateTag(id: string, name: string) {
    const now = Date.now();
    this.db.prepare('UPDATE tags SET name = ?, updated_at = ? WHERE id = ?').run(name, now, id);
    return this.db.prepare('SELECT * FROM tags WHERE id = ?').get(id);
  }

  deleteTag(id: string) {
    this.db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    return { success: true };
  }

  // --- Album Operations ---

  getAlbums() {
    const albums = this.db.prepare('SELECT * FROM albums ORDER BY updated_at DESC').all() as any[];
    // Get image count for each album
    return albums.map(album => {
      const count = this.db.prepare('SELECT COUNT(*) as count FROM album_images WHERE album_id = ?').get(album.id) as { count: number };
      return { ...album, imageCount: count.count };
    });
  }

  createAlbum(name: string, description?: string) {
    const id = uuidv4();
    const now = Date.now();
    this.db.prepare('INSERT INTO albums (id, name, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, name, description || null, now, now);
    return { id, name, description, createdAt: now, updatedAt: now, imageCount: 0 };
  }

  updateAlbum(id: string, name: string, description?: string) {
    const now = Date.now();
    this.db.prepare('UPDATE albums SET name = ?, description = ?, updated_at = ? WHERE id = ?').run(name, description || null, now, id);
    return this.db.prepare('SELECT * FROM albums WHERE id = ?').get(id);
  }

  deleteAlbum(id: string) {
    this.db.prepare('DELETE FROM albums WHERE id = ?').run(id);
    return { success: true };
  }

  getAlbumById(id: string) {
    const album = this.db.prepare('SELECT * FROM albums WHERE id = ?').get(id) as any;
    if (!album) return null;
    const count = this.db.prepare('SELECT COUNT(*) as count FROM album_images WHERE album_id = ?').get(id) as { count: number };
    return { ...album, imageCount: count.count };
  }

  addImagesToAlbum(albumId: string, imageIds: string[]) {
    const now = Date.now();
    const stmt = this.db.prepare('INSERT OR IGNORE INTO album_images (album_id, image_id, created_at) VALUES (?, ?, ?)');
    const transaction = this.db.transaction((ids: string[]) => {
      for (const imgId of ids) {
        stmt.run(albumId, imgId, now);
      }
    });
    transaction(imageIds);
    return { success: true };
  }

  removeImagesFromAlbum(albumId: string, imageIds: string[]) {
    const stmt = this.db.prepare('DELETE FROM album_images WHERE album_id = ? AND image_id = ?');
    const transaction = this.db.transaction((ids: string[]) => {
      for (const imgId of ids) {
        stmt.run(albumId, imgId);
      }
    });
    transaction(imageIds);
    return { success: true };
  }

  async deleteImages(ids: string[]) {
    const deleteImage = this.db.prepare('DELETE FROM images WHERE id = ?');

    const transaction = this.db.transaction((imageIds: string[]) => {
      for (const id of imageIds) {
        deleteImage.run(id);
      }
    });

    transaction(ids);

    // Delete from LanceDB
    if (this.vectorTable && ids.length > 0) {
      try {
        const idList = ids.map(id => `'${id}'`).join(', ');
        await this.vectorTable.delete(`id IN (${idList})`);
      } catch (e) {
        console.error('Failed to delete vectors from LanceDB:', e);
      }
    }
  }

  // --- Vector Operations ---

  async addVector(imageId: string, embedding: number[]) {
    if (!this.lance) return;

    const data = [{ id: imageId, vector: embedding }];
    
    try {
      if (!this.vectorTable) {
        const tableNames = await this.lance.tableNames();
        if (tableNames.includes('image_vectors')) {
          this.vectorTable = await this.lance.openTable('image_vectors');
          await this.vectorTable.add(data);
        } else {
          this.vectorTable = await this.lance.createTable('image_vectors', data);
        }
      } else {
        await this.vectorTable.add(data);
      }
    } catch (e) {
      console.error('Failed to add vector to LanceDB:', e);
    }
  }

  async searchByVector(embedding: number[], limit: number = 20, modelName: string = 'taiyi'): Promise<LocalImage[]> {
    if (!this.lance) return [];

    try {
      // 构建动态表名
      const tableName = `image_vectors_${modelName}`;
      const fallbackTableName = 'image_vectors'; // 旧表名作为回退

      // 检查表是否存在
      const tableNames = await this.lance.tableNames();
      let actualTableName = tableName;
      
      // 如果请求的表不存在，尝试回退表
      if (!tableNames.includes(tableName)) {
        if (tableNames.includes(fallbackTableName)) {
          actualTableName = fallbackTableName;
          console.log(`Table ${tableName} not found, falling back to ${actualTableName}`);
        } else {
          return [];
        }
      }

      // 打开表并执行搜索
      const table = await this.lance.openTable(actualTableName);
      const results = await table.search(embedding).limit(limit).toArray();
      
      if (results.length === 0) return [];

      const ids = results.map(r => r.id as string);
      
      // Fetch from SQLite
      const placeholders = ids.map(() => '?').join(',');
      const stmt = this.db.prepare(`SELECT * FROM images WHERE id IN (${placeholders})`);
      const rows = stmt.all(...ids) as any[];
      const images = rows.map((row) => this.mapRowToImage(row));

      // Reorder to match search results
      const imageMap = new Map(images.map(img => [img.id, img]));
      return ids.map(id => imageMap.get(id)).filter(img => img !== undefined) as LocalImage[];

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
    const metadata = row.metadata ? JSON.parse(row.metadata) : {};
    // 过滤掉可能导致序列化问题的字段，如 exif 数据
    if (metadata.exif) {
      delete metadata.exif;
    }
    
    // 获取图片的标签
    const tags = this.db.prepare(`
      SELECT t.name 
      FROM tags t
      JOIN image_tags it ON t.id = it.tag_id
      WHERE it.image_id = ?
    `).all(row.id).map((tag: any) => tag.name);
    
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
      hash: row.hash,
      metadata,
      tags
    };
  }
}
