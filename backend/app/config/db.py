import os
from motor.motor_asyncio import AsyncIOMotorClient

class MongoDBManager:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super(MongoDBManager, cls).__new__(cls, *args, **kwargs)
            cls._instance._client = None
            cls._instance._db = None
        return cls._instance

    def connect(self, uri: str = None, db_name: str = "pet_alert_db"):
        if not self._client:
            mongo_uri = uri or os.getenv("MONGODB_URI", "mongodb://localhost:27017")
            self._client = AsyncIOMotorClient(mongo_uri)
            self._db = self._client[db_name]
            print(f"Connected to MongoDB: {db_name}")

    def close(self):
        if self._client:
            self._client.close()
            self._client = None
            self._db = None
            print("MongoDB connection closed")

    @property
    def db(self):
        if not self._db:
            raise RuntimeError("Database not connected. Call connect() first.")
        return self._db

def get_db():
    return MongoDBManager().db
