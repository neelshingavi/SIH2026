import 'dart:async';
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart';

class DatabaseHelper {
  static final DatabaseHelper instance = DatabaseHelper._init();
  static Database? _database;

  DatabaseHelper._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('setu_frontline.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 2,
      onCreate: _createDB,
      onUpgrade: _upgradeDB,
    );
  }

  Future _createDB(Database db, int version) async {
    await db.execute('''
      CREATE TABLE local_resources (
        id TEXT PRIMARY KEY,
        resource_type TEXT NOT NULL,
        json TEXT NOT NULL,
        version_id INTEGER NOT NULL DEFAULT 1,
        sync_status TEXT NOT NULL CHECK(sync_status IN ('SYNCED', 'PENDING', 'CONFLICT')),
        updated_at TEXT NOT NULL,
        created_by TEXT NOT NULL
      )
    ''');

    await db.execute('''
      CREATE TABLE sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resource_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK(operation IN ('CREATE', 'UPDATE', 'DELETE')),
        timestamp TEXT NOT NULL,
        FOREIGN KEY (resource_id) REFERENCES local_resources (id) ON DELETE CASCADE
      )
    ''');
  }
  
  Future _upgradeDB(Database db, int oldVersion, int newVersion) async {
    // Handle migrations here
  }

  Future<void> close() async {
    final db = await instance.database;
    db.close();
  }
}
