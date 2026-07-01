import os
import sqlite3
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# We get the database file path. By default, it will be created in the backend folder
DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "pet_alert_db.db")

class SQLiteManager:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(SQLiteManager, cls).__new__(cls, *args, **kwargs)
            cls._instance._connection = None
        return cls._instance

    def connect(self):
        if not self._connection:
            # Connect to SQLite file database
            self._connection = sqlite3.connect(DB_FILE, check_same_thread=False)
            
            # Row factory to return rows as dictionaries
            def dict_factory(cursor, row):
                d = {}
                for idx, col in enumerate(cursor.description):
                    d[col[0]] = row[idx]
                return d
            self._connection.row_factory = dict_factory
            
            # Enable foreign keys
            self._connection.execute("PRAGMA foreign_keys = ON")
            print(f"Connected to SQLite Embedded Database: {DB_FILE}")
            self._create_tables()

    def _create_tables(self):
        cursor = self._connection.cursor()
        
        # Users
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                lat REAL,
                lon REAL
            )
        """)
        
        # Caretakers
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS caretakers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                role TEXT NOT NULL,
                lat REAL,
                lon REAL,
                species_accepted TEXT,
                sizes_accepted TEXT,
                administers_medication BOOLEAN,
                is_verified BOOLEAN,
                alert_notifications_enabled BOOLEAN,
                id_document TEXT
            )
        """)
        
        # Lost Pets
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS lost_pets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                species TEXT NOT NULL,
                breed TEXT NOT NULL,
                description TEXT,
                lat REAL,
                lon REAL,
                photo TEXT,
                status TEXT DEFAULT 'lost',
                owner_id TEXT
            )
        """)
        
        # Sightings
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sightings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                lost_pet_id INTEGER,
                lat REAL,
                lon REAL,
                photo TEXT,
                description TEXT,
                FOREIGN KEY (lost_pet_id) REFERENCES lost_pets(id) ON DELETE CASCADE
            )
        """)
        
        # Notifications
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recipient_id TEXT,
                recipient_type TEXT,
                type TEXT,
                message TEXT,
                lost_pet_id TEXT,
                is_read BOOLEAN DEFAULT 0
            )
        """)
        
        # Reviews
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                caretaker_id INTEGER,
                score INTEGER,
                comment TEXT,
                reviewer_name TEXT,
                verified BOOLEAN,
                FOREIGN KEY (caretaker_id) REFERENCES caretakers(id) ON DELETE CASCADE
            )
        """)
        
        # Searchable Pets (Image Search catalog)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS searchable_pets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                species TEXT,
                breed TEXT,
                source_type TEXT,
                source_name TEXT,
                age TEXT,
                photo TEXT,
                description TEXT
            )
        """)
        
        self._connection.commit()

    def close(self):
        if self._connection:
            self._connection.close()
            self._connection = None
            print("SQLite connection closed")

    @property
    def conn(self):
        if not self._connection:
            self.connect()
        return self._connection

def get_db():
    manager = SQLiteManager()
    manager.connect()
    # Return cursor-like connection. In SQLite, we commit on updates.
    # To keep code consistent, we can return the connection itself
    return manager.conn
